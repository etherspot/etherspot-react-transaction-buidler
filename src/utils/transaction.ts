import {
  AccountTypes,
  Sdk as EtherspotSdk,
  WalletProviderLike,
  Web3WalletProvider,
} from 'etherspot';
import {
  BigNumber,
  ethers,
} from 'ethers';
import { uniqueId } from 'lodash';
import { ERC20TokenContract } from 'etherspot/dist/sdk/contract/internal/erc20-token.contract';

import { ExecuteAccountTransactionDto } from 'etherspot/dist/sdk/dto/execute-account-transaction.dto';

import { ContractNames, getContractAbi } from '@etherspot/contracts';

import { AddedTransactionBlock } from '../providers/TransactionBuilderContextProvider';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import {
  addressesEqual,
  isValidEthereumAddress,
  isZeroAddress,
} from './validation';
import {
  nativeAssetPerChainId,
  supportedChains,
} from './chain';
import { parseEtherspotErrorMessageIfAvailable } from './etherspot';
import { getNativeAssetPriceInUsd } from '../services/coingecko';
import { bridgeServiceIdToDetails } from './bridge';
import { swapServiceIdToDetails } from './swap';


interface AssetTransfer {
  address: string;
  decimals: number;
  symbol: string;
  amount: string;
  iconUrl?: string;
  usdPrice?: number;
}

interface AssetBridgeActionPreview {
  fromChainId: number;
  toChainId: number;
  fromAsset: AssetTransfer;
  toAsset: AssetTransfer;
  providerName: string;
  providerIconUrl: string | undefined;
}

interface SendAssetActionPreview {
  chainId: number;
  asset: AssetTransfer;
  fromAddress: string;
  receiverAddress: string;
  isFromEtherspotWallet: boolean;
}

interface AssetSwapActionPreview {
  chainId: number;
  fromAsset: AssetTransfer;
  toAsset: AssetTransfer;
  providerName: string;
  providerIconUrl: string | undefined;
  receiverAddress?: string;
}

export type CrossChainActionPreview = AssetBridgeActionPreview
  | SendAssetActionPreview
  | AssetSwapActionPreview;

export interface CrossChainActionTransaction extends ExecuteAccountTransactionDto {}

export interface CrossChainActionEstimation {
  gasCost?: BigNumber | null;
  usdPrice?: number | null;
  errorMessage?: string;
}

export interface CrossChainAction {
  id: string;
  chainId: number;
  submitTimestamp: number;
  finishTimestamp?: number;
  type: string;
  preview: CrossChainActionPreview;
  transactions: CrossChainActionTransaction[];
  isEstimating: boolean;
  estimated: CrossChainActionEstimation | null;
  useWeb3Provider?: boolean;
  status?: string;
  batchHash?: string;
  transactionHash?: string;
}

export const buildCrossChainAction = async (
  sdk: EtherspotSdk,
  transactionBlock: AddedTransactionBlock,
): Promise<{ errorMessage?: string; crossChainAction?: CrossChainAction; }> => {
  const submitTimestamp = +new Date();
  const crossChainActionId = uniqueId(`${submitTimestamp}-`);

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE
    && !!transactionBlock?.values?.fromChainId
    && !!transactionBlock?.values?.toChainId
    && !!transactionBlock?.values?.toAssetAddress
    && !!transactionBlock?.values?.fromAssetAddress
    && !!transactionBlock?.values?.fromAssetDecimals
    && !!transactionBlock?.values?.amount) {
    try {
      const {
        values: {
          amount,
          fromChainId,
          toChainId,
          fromAssetAddress: fromTokenAddress,
          fromAssetIconUrl,
          fromAssetDecimals,
          toAssetAddress: toTokenAddress,
          toAssetIconUrl,
          toAssetUsdPrice,
        },
      } = transactionBlock;

      const amountBN = ethers.utils.parseUnits(amount, fromAssetDecimals);

      let quote;
      if (!transactionBlock?.values?.quote) {
        const { items } = await sdk.getCrossChainQuotes({
          fromChainId,
          toChainId,
          fromAmount: amountBN,
          fromTokenAddress,
          toTokenAddress,
        });
        ([quote] = items);
      } else {
        quote = transactionBlock.values.quote;
      }

      const bridgeServiceDetails = bridgeServiceIdToDetails[quote.provider];

      const preview = {
        fromChainId,
        toChainId,
        providerName: bridgeServiceDetails.title ?? 'Unknown provider',
        providerIconUrl: bridgeServiceDetails?.iconUrl,
        fromAsset: {
          address: quote.estimate.data.fromToken.address,
          decimals: quote.estimate.data.fromToken.decimals,
          symbol: quote.estimate.data.fromToken.symbol,
          amount: quote.estimate.fromAmount,
          iconUrl: fromAssetIconUrl,
        },
        toAsset: {
          address: quote.estimate.data.toToken.address,
          decimals: quote.estimate.data.toToken.decimals,
          symbol: quote.estimate.data.toToken.symbol,
          amount: quote.estimate.toAmount,
          iconUrl: toAssetIconUrl,
          usdPrice: toAssetUsdPrice,
        },
      };

      const bridgeTransaction = {
        to: quote.transaction.to,
        value: quote.transaction.value,
        data: quote.transaction.data,
        chainId: fromChainId
      };

      let transactions: CrossChainActionTransaction[] = [bridgeTransaction];

      const approvalAddress = quote?.approvalData?.approvalAddress;
      const approvalAmount = quote?.approvalData?.amount;
      const assetContractAddress = quote.estimate.data.fromToken.address;
      if (approvalAddress
        && approvalAmount
        && ethers.utils.isAddress(assetContractAddress)
        && !isZeroAddress(assetContractAddress)) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, assetContractAddress);
        const approvalTransactionRequest = erc20Contract?.encodeApprove?.(approvalAddress, approvalAmount);
        if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
          return { errorMessage: 'Failed build bridge approval transaction!' };
        }

        const approvalTransaction = {
          to: approvalTransactionRequest.to,
          data: approvalTransactionRequest.data,
          value: 0,
        };

        transactions = [approvalTransaction, ...transactions];
      }

      const crossChainAction: CrossChainAction = {
        id: crossChainActionId,
        chainId: fromChainId,
        submitTimestamp,
        type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE,
        preview,
        transactions,
        isEstimating: false,
        estimated: null,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get bridge quote!' };
    }
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET
    && !!transactionBlock?.values?.chainId
    && !!transactionBlock?.values?.assetAddress
    && !!transactionBlock?.values?.assetDecimals
    && !!transactionBlock?.values?.assetSymbol
    && !!transactionBlock?.values?.receiverAddress
    && !!transactionBlock?.values?.fromAddress
    && transactionBlock?.values?.isFromEtherspotWallet !== undefined
    && !!transactionBlock?.values?.amount) {
    try {
      const {
        values: {
          chainId,
          assetAddress,
          assetDecimals,
          assetSymbol,
          assetIconUrl,
          assetUsdPrice,
          receiverAddress,
          amount,
          fromAddress,
          isFromEtherspotWallet,
        },
      } = transactionBlock;

      const amountBN = ethers.utils.parseUnits(amount, assetDecimals);

      const preview = {
        chainId,
        receiverAddress,
        fromAddress,
        isFromEtherspotWallet,
        asset: {
          address: assetAddress,
          decimals: assetDecimals,
          symbol: assetSymbol,
          amount: amountBN.toString(),
          iconUrl: assetIconUrl,
          usdPrice: assetUsdPrice,
        },
      };

      let transferTransaction: CrossChainActionTransaction = {
        to: receiverAddress,
        value: amountBN,
      };

      if (ethers.utils.isAddress(assetAddress) && !addressesEqual(assetAddress, ethers.constants.AddressZero)) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, assetAddress);
        const transferTransactionRequest = erc20Contract?.encodeTransfer?.(receiverAddress, amountBN);
        if (!transferTransactionRequest || !transferTransactionRequest.to) {
          return { errorMessage: 'Failed build transfer transaction!' };
        }

        transferTransaction = {
          ...transferTransaction,
          to: transferTransactionRequest.to,
          data: transferTransactionRequest.data,
          value: 0,
        }
      }

      const crossChainAction: CrossChainAction = {
        id: crossChainActionId,
        chainId,
        submitTimestamp,
        type: TRANSACTION_BLOCK_TYPE.SEND_ASSET,
        preview,
        transactions: [transferTransaction],
        isEstimating: false,
        estimated: null,
        useWeb3Provider: !isFromEtherspotWallet,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get create asset transfer!' };
    }
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP
    && !!transactionBlock?.values?.chainId
    && !!transactionBlock?.values?.fromAssetAddress
    && !!transactionBlock?.values?.fromAssetDecimals
    && !!transactionBlock?.values?.fromAssetSymbol
    && !!transactionBlock?.values?.toAssetAddress
    && !!transactionBlock?.values?.toAssetDecimals
    && !!transactionBlock?.values?.toAssetSymbol
    && !!transactionBlock?.values?.amount
    && !!transactionBlock?.values?.offer) {
    try {
      const {
        values: {
          amount,
          chainId,
          fromAssetAddress,
          fromAssetDecimals,
          fromAssetSymbol,
          fromAssetIconUrl,
          toAssetAddress,
          toAssetDecimals,
          toAssetSymbol,
          toAssetIconUrl,
          offer,
          receiverAddress,
          toAssetUsdPrice,
        },
      } = transactionBlock;

      const fromAmountBN = ethers.utils.parseUnits(amount, fromAssetDecimals);

      const swapServiceDetails = swapServiceIdToDetails[offer.provider];

      let preview = {
        chainId,
        fromAsset: {
          address: fromAssetAddress,
          decimals: fromAssetDecimals,
          symbol: fromAssetSymbol,
          amount: fromAmountBN.toString(),
          iconUrl: fromAssetIconUrl,
        },
        toAsset: {
          address: toAssetAddress,
          decimals: toAssetDecimals,
          symbol: toAssetSymbol,
          amount: offer.receiveAmount.toString(),
          iconUrl: toAssetIconUrl,
          usdPrice: toAssetUsdPrice,
        },
        providerName: swapServiceDetails.title ?? 'Unknown provider',
        providerIconUrl: swapServiceDetails?.iconUrl,
        receiverAddress,
      };

      let transactions: CrossChainActionTransaction[] = offer.transactions.map((transaction) => ({
        ...transaction,
        chainId,
      }));

      // not native asset and no erc20 approval transaction included
      if (fromAssetAddress && !addressesEqual(fromAssetAddress, nativeAssetPerChainId[chainId].address) && transactions.length === 1) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
        const approvalTransactionRequest = erc20Contract?.encodeApprove?.(transactions[0].to, fromAmountBN);
        if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
          return { errorMessage: 'Failed build bridge approval transaction!' };
        }

        const approvalTransaction = {
          to: approvalTransactionRequest.to,
          data: approvalTransactionRequest.data,
          chainId,
          value: 0,
        };

        transactions = [approvalTransaction, ...transactions];
      }

      if (receiverAddress && isValidEthereumAddress(receiverAddress)) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
        const transferTransactionRequest = erc20Contract?.encodeTransfer?.(receiverAddress, offer.receiveAmount);
        if (!transferTransactionRequest || !transferTransactionRequest.to) {
          return { errorMessage: 'Failed build transfer transaction!' };
        }

        const transferTransaction = {
          to: transferTransactionRequest.to,
          data: transferTransactionRequest.data,
          value: 0,
        }

        transactions = [...transactions, transferTransaction];
      }

      const crossChainAction: CrossChainAction = {
        id: crossChainActionId,
        chainId,
        submitTimestamp,
        type: TRANSACTION_BLOCK_TYPE.ASSET_SWAP,
        preview,
        transactions,
        isEstimating: false,
        estimated: null,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to build swap transaction!' };
    }
  }

  return { errorMessage: 'Failed to build transaction!' }
}

export const estimateCrossChainAction = async (
  sdk: EtherspotSdk | null,
  crossChainAction: CrossChainAction,
): Promise<CrossChainActionEstimation> => {
  // TODO: add estimations for key based

  let gasCost = null;
  let usdPrice = null;
  let errorMessage;

  if (!sdk) {
    return { errorMessage: 'Failed to estimate!' };
  }

  try {
    if (!sdk?.state?.account?.type || sdk.state.account.type === AccountTypes.Key) {
      await sdk.computeContractAccount({ sync: true });
    }

    sdk.clearGatewayBatch();

    // sequential
    for (const transactionsToSend of crossChainAction.transactions) {
      const { to, value, data } = transactionsToSend;
      await sdk.batchExecuteAccountTransaction({ to, value, data });
    }

    const { estimation: gatewayBatchEstimation } = await sdk.estimateGatewayBatch();
    gasCost = gatewayBatchEstimation.estimatedGasPrice.mul(gatewayBatchEstimation.estimatedGas);
  } catch (e) {
    errorMessage = parseEtherspotErrorMessageIfAvailable(e);
    if (!errorMessage && e instanceof Error) {
      errorMessage = e?.message;
    }
  }

  try {
    usdPrice = await getNativeAssetPriceInUsd(crossChainAction.chainId);
  } catch (e) {
    //
  }

  return { gasCost, errorMessage, usdPrice }
}

export const submitTransactions = async (
  sdk: EtherspotSdk,
  web3Provider: WalletProviderLike | Web3WalletProvider | null,
  transactions: ExecuteAccountTransactionDto[],
  providerAddress: string | null,
  useWeb3Provider: boolean = false,
): Promise<{
  transactionHash?: string;
  batchHash?: string;
  errorMessage?: string;
}> => {
  let errorMessage;
  let batchHash;
  let transactionHash;

  if (useWeb3Provider) {
    if (!web3Provider) {
      return { errorMessage: 'Unable to find connected Web3 provider!' };
    }

    try {
      // sequential
      for (const transaction of transactions) {
        const { to, value, data } = transaction;
        const tx = {
          from: providerAddress,
          to,
          data,
          value: ethers.BigNumber.isBigNumber(value) ? value.toHexString() : '0x0',
        };
        // @ts-ignore
        transactionHash = await web3Provider.sendRequest('eth_sendTransaction', [tx]);
      }
    } catch (e) {
      if (e instanceof Error) {
        errorMessage = e?.message;
      }
    }

    return { transactionHash, errorMessage };
  }

  try {
    if (!sdk?.state?.account?.type || sdk.state.account.type === AccountTypes.Key) {
      await sdk.computeContractAccount({ sync: true });
    }

    sdk.clearGatewayBatch();

    // sequential
    for (const transaction of transactions) {
      const { to, value, data } = transaction;
      await sdk.batchExecuteAccountTransaction({ to, value, data });
    }

    await sdk.estimateGatewayBatch();

    const result = await sdk.submitGatewayBatch();
    ({ hash: batchHash } = result);
  } catch (e) {
    errorMessage = parseEtherspotErrorMessageIfAvailable(e);
    if (!errorMessage && e instanceof Error) {
      errorMessage = e?.message;
    }
  }

  return { batchHash, errorMessage };
}

export const getTransactionExplorerLink = (chainId: number, transactionHash?: string): string | null => {
  const explorerUrl = supportedChains.find((chain) => chain.chainId === chainId)?.explorerUrl;
  if (!explorerUrl || !transactionHash) return null;
  return `${explorerUrl}${transactionHash}`;
}

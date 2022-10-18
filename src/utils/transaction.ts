import {
  AccountTypes,
  ExchangeOffer,
  Sdk as EtherspotSdk,
  WalletProviderLike,
  Web3WalletProvider,
} from 'etherspot';
import {
  BigNumberish,
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
  CHAIN_ID,
  nativeAssetPerChainId,
  supportedChains,
} from './chain';
import { parseEtherspotErrorMessageIfAvailable } from './etherspot';
import { getNativeAssetPriceInUsd } from '../services/coingecko';
import { bridgeServiceIdToDetails } from './bridge';
import { swapServiceIdToDetails } from './swap';
import { TransactionRequest } from 'etherspot/dist/sdk/common';
import {
  ICrossChainActionEstimation,
  ICrossChainActionTransaction,
  ICrossChainAction,
} from '../types/crossChainAction';


export const buildCrossChainAction = async (
  sdk: EtherspotSdk,
  transactionBlock: AddedTransactionBlock,
): Promise<{ errorMessage?: string; crossChainAction?: ICrossChainAction; }> => {
  const createTimestamp = +new Date();
  const crossChainActionId = uniqueId(`${createTimestamp}-`);

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE
    && !!transactionBlock?.values?.fromChainId
    && !!transactionBlock?.values?.fromAssetAddress
    && !!transactionBlock?.values?.fromAssetDecimals
    && !!transactionBlock?.values?.fromAssetSymbol
    && !!transactionBlock?.values?.amount) {
    try {
      const {
        values: {
          fromChainId,
          fromAssetAddress,
          fromAssetDecimals,
          fromAssetSymbol,
          fromAssetIconUrl,
          amount,
        },
      } = transactionBlock;

      if (fromChainId !== CHAIN_ID.POLYGON) {
        // TODO: get bridge quote
      }

      const amountBN = ethers.utils.parseUnits(amount, fromAssetDecimals);

      const offers = await sdk.getExchangeOffers({
        fromChainId,
        fromAmount: amountBN,
        fromTokenAddress: fromAssetAddress,
        toTokenAddress: '0x4e78011ce80ee02d2c3e649fb657e45898257815', // KLIMA on Polygon
      });

      const bestOffer = offers.reduce((best: ExchangeOffer | null, offer) => {
        if (!best || best.receiveAmount.lt(offer.receiveAmount)) return offer;
        return best;
      }, null);

      if (!bestOffer) {
        return { errorMessage: 'Failed build KLIMA swap transaction!' };
      }

      let transactions: ICrossChainActionTransaction[] = bestOffer.transactions.map((transaction) => ({
        ...transaction,
        chainId: fromChainId,
      }));

      // not native asset and no erc20 approval transaction included
      if (fromAssetAddress && !addressesEqual(fromAssetAddress, nativeAssetPerChainId[fromChainId].address) && transactions.length === 1) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
        const approvalTransactionRequest = erc20Contract?.encodeApprove?.(transactions[0].to, amountBN);
        if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
          return { errorMessage: 'Failed build bridge approval transaction!' };
        }

        const approvalTransaction = {
          to: approvalTransactionRequest.to,
          data: approvalTransactionRequest.data,
          chainId: fromChainId,
          value: 0,
        };

        transactions = [approvalTransaction, ...transactions];
      }

      const abi = getContractAbi(ContractNames.ERC20Token);
      const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, '0x4e78011ce80ee02d2c3e649fb657e45898257815'); // Klima ojn Polygon
      const klimaApprovalTransactionRequest = erc20Contract?.encodeApprove?.('0x4D70a031Fc76DA6a9bC0C922101A05FA95c3A227', bestOffer.receiveAmount); // Klima staking
      if (!klimaApprovalTransactionRequest || !klimaApprovalTransactionRequest.to) {
        return { errorMessage: 'Failed build bridge approval transaction!' };
      }

      const klimaApprovalTransaction = {
        to: klimaApprovalTransactionRequest.to,
        data: klimaApprovalTransactionRequest.data,
        chainId: fromChainId,
        value: 0,
      };

      const klimaStakingAbi = [
        "function stake(uint256 value)",
      ];
      const klimaStakingContract = sdk.registerContract<{ encodeStake: (amount: BigNumberish) => TransactionRequest }>('klimaStakingContract', klimaStakingAbi, '0x4D70a031Fc76DA6a9bC0C922101A05FA95c3A227'); // Klima ojn Polygon
      const klimaStakeTransactionRequest = klimaStakingContract.encodeStake?.(bestOffer.receiveAmount); // Klima staking
      console.log({ klimaStakeTransactionRequest })
      if (!klimaStakeTransactionRequest || !klimaStakeTransactionRequest.to) {
        return { errorMessage: 'Failed build bridge approval transaction!' };
      }

      const klimaStakinglTransaction = {
        to: klimaStakeTransactionRequest.to,
        data: klimaStakeTransactionRequest.data,
        chainId: fromChainId,
        value: 0,
      };

      transactions = [...transactions, klimaApprovalTransaction, klimaStakinglTransaction];

      const preview = {
        fromChainId,
        fromAsset: {
          address: fromAssetAddress,
          decimals: fromAssetDecimals,
          symbol: fromAssetSymbol,
          amount: amountBN.toString(),
          iconUrl: fromAssetIconUrl,
        },
      };

      const crossChainAction: ICrossChainAction = {
        id: crossChainActionId,
        chainId: fromChainId,
        createTimestamp,
        type: TRANSACTION_BLOCK_TYPE.KLIMA_STAKE,
        preview,
        transactions,
        isEstimating: false,
        estimated: null,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get KLIMA staking transaction!' };
    }
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE
    && !!transactionBlock?.values?.fromChainId
    && !!transactionBlock?.values?.toChainId
    && !!transactionBlock?.values?.toAssetAddress
    && !!transactionBlock?.values?.fromAssetAddress
    && !!transactionBlock?.values?.fromAssetDecimals
    && !!transactionBlock?.values?.amount
    && !!transactionBlock?.values?.route) {
    try {
      const {
        values: {
          fromChainId,
          toChainId,
          fromAssetIconUrl,
          toAssetIconUrl,
          toAssetUsdPrice,
          route,
        },
      } = transactionBlock;

      const [fistStep] = route.steps;
      const bridgeServiceDetails = bridgeServiceIdToDetails[fistStep?.toolDetails?.key ?? ''];

      const preview = {
        fromChainId,
        toChainId,
        providerName: fistStep?.toolDetails?.name ?? bridgeServiceDetails?.title ?? 'LiFi',
        providerIconUrl: fistStep?.toolDetails?.logoURI ?? bridgeServiceDetails?.iconUrl,
        fromAsset: {
          address: route.fromToken.address,
          decimals: route.fromToken.decimals,
          symbol: route.fromToken.symbol,
          amount: route.fromAmount,
          iconUrl: fromAssetIconUrl,
        },
        toAsset: {
          address: route.toToken.address,
          decimals: route.toToken.decimals,
          symbol: route.toToken.symbol,
          amount: route.toAmount,
          iconUrl: toAssetIconUrl,
          usdPrice: toAssetUsdPrice,
        },
        receiverAddress: transactionBlock?.values?.receiverAddress,
      };

      const { items: advancedRouteSteps } = await sdk.getStepTransaction({ route });

      let transactions: ICrossChainActionTransaction[] = advancedRouteSteps.map(({
        to,
        value,
        data,
        chainId ,
      }) => ({
        to: to as string,
        value,
        data,
        chainId: chainId ?? fromChainId,
      }));

      if (ethers.utils.isAddress(route.fromToken.address)
        && !addressesEqual(route.fromToken.address, nativeAssetPerChainId[fromChainId].address)
        && transactions.length === 1
        && route.fromAmount) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, route.fromToken.address);
        const approvalTransactionRequest = erc20Contract?.encodeApprove?.(transactions[0].to, route.fromAmount);
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

      const crossChainAction: ICrossChainAction = {
        id: crossChainActionId,
        chainId: fromChainId,
        createTimestamp,
        type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE,
        preview,
        transactions,
        isEstimating: false,
        estimated: null,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get bridge route!' };
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

      let transferTransaction: ICrossChainActionTransaction = {
        to: receiverAddress,
        value: amountBN,
      };

      if (ethers.utils.isAddress(assetAddress) && !isZeroAddress(assetAddress)) {
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

      const crossChainAction: ICrossChainAction = {
        id: crossChainActionId,
        chainId,
        createTimestamp,
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

      let transactions: ICrossChainActionTransaction[] = offer.transactions.map((transaction) => ({
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

      const crossChainAction: ICrossChainAction = {
        id: crossChainActionId,
        chainId,
        createTimestamp,
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
  crossChainAction: ICrossChainAction,
): Promise<ICrossChainActionEstimation> => {
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

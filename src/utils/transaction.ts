import { AccountTypes, ExchangeOffer, Sdk as EtherspotSdk, WalletProviderLike, Web3WalletProvider } from 'etherspot';
import { BigNumberish, ethers } from 'ethers';
import { uniqueId } from 'lodash';
import { ERC20TokenContract } from 'etherspot/dist/sdk/contract/internal/erc20-token.contract';

import { ExecuteAccountTransactionDto } from 'etherspot/dist/sdk/dto/execute-account-transaction.dto';

import { ContractNames, getContractAbi } from '@etherspot/contracts';

import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { addressesEqual, isValidEthereumAddress, isZeroAddress } from './validation';
import { CHAIN_ID, changeToChain, nativeAssetPerChainId, supportedChains } from './chain';
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
import { CROSS_CHAIN_ACTION_STATUS } from '../constants/transactionDispatcherConstants';
import { ITransactionBlock } from '../types/transactionBlock';

export const buildCrossChainAction = async (
  sdk: EtherspotSdk,
  transactionBlock: ITransactionBlock,
): Promise<{ errorMessage?: string; crossChainAction?: ICrossChainAction }> => {
  const createTimestamp = +new Date();
  const crossChainActionId = uniqueId(`${createTimestamp}-`);

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE &&
    !!transactionBlock?.values?.fromChainId &&
    !!transactionBlock?.values?.fromAssetAddress &&
    !!transactionBlock?.values?.fromAssetDecimals &&
    !!transactionBlock?.values?.fromAssetSymbol &&
    !!transactionBlock?.values?.amount
  ) {
    // TODO: hude try-catch anti-pattern. needs to be refactored
    try {
      const {
        values: { fromChainId, fromAssetAddress, fromAssetDecimals, fromAssetSymbol, fromAssetIconUrl, amount },
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
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      }));

      // not native asset and no erc20 approval transaction included
      if (
        fromAssetAddress &&
        !addressesEqual(fromAssetAddress, nativeAssetPerChainId[fromChainId].address) &&
        transactions.length === 1
      ) {
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
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        };

        transactions = [approvalTransaction, ...transactions];
      }

      const abi = getContractAbi(ContractNames.ERC20Token);
      const erc20Contract = sdk.registerContract<ERC20TokenContract>(
        'erc20Contract',
        abi,
        '0x4e78011ce80ee02d2c3e649fb657e45898257815',
      ); // Klima ojn Polygon
      const klimaApprovalTransactionRequest = erc20Contract?.encodeApprove?.(
        '0x4D70a031Fc76DA6a9bC0C922101A05FA95c3A227',
        bestOffer.receiveAmount,
      ); // Klima staking
      if (!klimaApprovalTransactionRequest || !klimaApprovalTransactionRequest.to) {
        return { errorMessage: 'Failed build bridge approval transaction!' };
      }

      const klimaApprovalTransaction = {
        to: klimaApprovalTransactionRequest.to,
        data: klimaApprovalTransactionRequest.data,
        chainId: fromChainId,
        value: 0,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      };

      const klimaStakingAbi = ['function stake(uint256 value)'];
      const klimaStakingContract = sdk.registerContract<{
        encodeStake: (amount: BigNumberish) => TransactionRequest;
      }>('klimaStakingContract', klimaStakingAbi, '0x4D70a031Fc76DA6a9bC0C922101A05FA95c3A227'); // Klima ojn Polygon
      const klimaStakeTransactionRequest = klimaStakingContract.encodeStake?.(bestOffer.receiveAmount); // Klima staking
      if (!klimaStakeTransactionRequest || !klimaStakeTransactionRequest.to) {
        return { errorMessage: 'Failed build bridge approval transaction!' };
      }

      const klimaStakinglTransaction = {
        to: klimaStakeTransactionRequest.to,
        data: klimaStakeTransactionRequest.data,
        chainId: fromChainId,
        value: 0,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
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
        relatedTransactionBlockId: transactionBlock.id,
        chainId: fromChainId,
        type: TRANSACTION_BLOCK_TYPE.KLIMA_STAKE,
        preview,
        transactions,
        isEstimating: false,
        estimated: null,
        multiCallData: transactionBlock?.multiCallData,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get KLIMA staking transaction!' };
    }
  }

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE &&
    !!transactionBlock?.values?.fromChain &&
    !!transactionBlock?.values?.toChain &&
    !!transactionBlock?.values?.toAsset &&
    !!transactionBlock?.values?.fromAsset &&
    !!transactionBlock?.values?.amount &&
    !!transactionBlock?.values?.route
  ) {
    try {
      const {
        values: {
          fromChain: { chainId: fromChainId },
          toChain: { chainId: toChainId },
          fromAsset: { logoURI: fromAssetIconUrl },
          toAsset: { logoURI: toAssetIconUrl, assetPriceUsd: toAssetUsdPrice },
          route,
          accountType,
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
          usdPrice: toAssetUsdPrice ?? undefined,
        },
        receiverAddress: transactionBlock?.values?.receiverAddress,
        route,
      };

      const { items: advancedRouteSteps } = await sdk.getStepTransaction({ route });

      let transactions: ICrossChainActionTransaction[] = advancedRouteSteps.map(
        ({ to, value, data, chainId }) => ({
          to: to as string,
          value,
          data,
          chainId: chainId ?? fromChainId,
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        }),
      );

      if (
        ethers.utils.isAddress(route.fromToken.address) &&
        !addressesEqual(route.fromToken.address, nativeAssetPerChainId[fromChainId].address) &&
        transactions.length === 1 &&
        route.fromAmount
      ) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>(
          'erc20Contract',
          abi,
          route.fromToken.address,
        );
        const approvalTransactionRequest = erc20Contract?.encodeApprove?.(transactions[0].to, route.fromAmount);
        if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
          return { errorMessage: 'Failed build bridge approval transaction!' };
        }

        const approvalTransaction = {
          to: approvalTransactionRequest.to,
          data: approvalTransactionRequest.data,
          value: 0,
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        };

        transactions = [approvalTransaction, ...transactions];
      }

      const crossChainAction: ICrossChainAction = {
        id: crossChainActionId,
        relatedTransactionBlockId: transactionBlock.id,
        chainId: fromChainId,
        type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE,
        preview,
        transactions,
        isEstimating: false,
        estimated: null,
        useWeb3Provider: accountType === AccountTypes.Key,
        multiCallData: transactionBlock?.multiCallData,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get bridge route!' };
    }
  }

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET &&
    !!transactionBlock?.values?.chain &&
    !!transactionBlock?.values?.selectedAsset &&
    !!transactionBlock?.values?.receiverAddress &&
    !!transactionBlock?.values?.fromAddress &&
    transactionBlock?.values?.isFromEtherspotWallet !== undefined &&
    !!transactionBlock?.values?.amount
  ) {
    try {
      const {
        values: {
          chain: { chainId },
          selectedAsset: {
            address: assetAddress,
            decimals: assetDecimals,
            symbol: assetSymbol,
            logoURI: assetIconUrl,
            assetPriceUsd: assetUsdPrice,
          },
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
          usdPrice: assetUsdPrice ?? undefined,
        },
      };

      let transferTransaction: ICrossChainActionTransaction = {
        to: receiverAddress,
        value: amountBN,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
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
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        };
      }

      const crossChainAction: ICrossChainAction = {
        id: crossChainActionId,
        relatedTransactionBlockId: transactionBlock.id,
        chainId,
        type: TRANSACTION_BLOCK_TYPE.SEND_ASSET,
        preview,
        transactions: [transferTransaction],
        isEstimating: false,
        estimated: null,
        useWeb3Provider: !isFromEtherspotWallet,
        multiCallData: transactionBlock?.multiCallData,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get create asset transfer!' };
    }
  }

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP &&
    !!transactionBlock?.values?.chain &&
    !!transactionBlock?.values?.fromAsset &&
    !!transactionBlock?.values?.toAsset &&
    !!transactionBlock?.values?.amount &&
    !!transactionBlock?.values?.offer
  ) {
    try {
      const {
        values: {
          amount,
          chain: { chainId },
          fromAsset: {
            address: fromAssetAddress,
            symbol: fromAssetSymbol,
            decimals: fromAssetDecimals,
            logoURI: fromAssetIconUrl,
          },
          toAsset: {
            address: toAssetAddress,
            symbol: toAssetSymbol,
            decimals: toAssetDecimals,
            logoURI: toAssetIconUrl,
          },
          offer,
          receiverAddress,
          accountType,
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
        },
        providerName: swapServiceDetails.title ?? 'Unknown provider',
        providerIconUrl: swapServiceDetails?.iconUrl,
        receiverAddress,
      };

      let transactions: ICrossChainActionTransaction[] = offer.transactions.map((transaction) => ({
        ...transaction,
        chainId,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      }));

      // not native asset and no erc20 approval transaction included
      if (
        fromAssetAddress &&
        !addressesEqual(fromAssetAddress, nativeAssetPerChainId[chainId].address) &&
        transactions.length === 1
      ) {
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
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        };

        transactions = [approvalTransaction, ...transactions];
      }

      if (receiverAddress && isValidEthereumAddress(receiverAddress)) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
        const transferTransactionRequest = erc20Contract?.encodeTransfer?.(
          receiverAddress,
          offer.receiveAmount,
        );
        if (!transferTransactionRequest || !transferTransactionRequest.to) {
          return { errorMessage: 'Failed build transfer transaction!' };
        }

        const transferTransaction = {
          to: transferTransactionRequest.to,
          data: transferTransactionRequest.data,
          value: 0,
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        };

        transactions = [...transactions, transferTransaction];
      }

      const crossChainAction: ICrossChainAction = {
        id: crossChainActionId,
        relatedTransactionBlockId: transactionBlock.id,
        chainId,
        type: TRANSACTION_BLOCK_TYPE.ASSET_SWAP,
        preview,
        transactions,
        isEstimating: false,
        estimated: null,
        useWeb3Provider: accountType === AccountTypes.Key,
        multiCallData: transactionBlock?.multiCallData,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to build swap transaction!' };
    }
  }

  return { errorMessage: 'Failed to build transaction!' };
};

export const submitEtherspotTransactionsBatch = async (
  sdk: EtherspotSdk,
  transactions: ExecuteAccountTransactionDto[],
): Promise<{
  batchHash?: string;
  errorMessage?: string;
}> => {
  let errorMessage;
  let batchHash;

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
};

export const submitWeb3ProviderTransaction = async (
  web3Provider: WalletProviderLike | Web3WalletProvider | null,
  transaction: ExecuteAccountTransactionDto,
  chainId: number,
  providerAddress: string | null,
): Promise<{
  transactionHash?: string;
  errorMessage?: string;
}> => {
  let transactionHash;
  let errorMessage;

  if (!web3Provider) {
    return { errorMessage: 'Unable to find connected Web3 provider!' };
  }

  // TODO: check against current
  if (chainId !== 1) {
    const changed = await changeToChain(chainId);
    if (!changed) return { errorMessage: 'Unable to change to selected network!' };
  }

  try {
    const { to, value, data } = transaction;
    const tx = {
      from: providerAddress,
      to,
      data,
      value: prepareValueForRpcCall(value),
    };
    // @ts-ignore
    transactionHash = await web3Provider.sendRequest('eth_sendTransaction', [tx]);
  } catch (e) {
    if (e instanceof Error) {
      errorMessage = e?.message;
    }
  }

  return { transactionHash, errorMessage };
};

const prepareValueForRpcCall = (rawValue: any): string | undefined => {
  let value;

  try {
    const valueBN = ethers.BigNumber.isBigNumber(rawValue)
      ? rawValue
      : ethers.BigNumber.from(rawValue);
    if (!valueBN.isZero()) value = valueBN.toHexString();
  } catch (e) {
    //
  }

  return value;
};

export const estimateCrossChainAction = async (
  sdk: EtherspotSdk | null,
  web3Provider: WalletProviderLike | Web3WalletProvider | null,
  crossChainAction: ICrossChainAction,
  providerAddress?: string | null,
): Promise<ICrossChainActionEstimation> => {
  let gasCost = null;
  let usdPrice = null;
  let errorMessage;

  if (!sdk || (crossChainAction.useWeb3Provider && !web3Provider)) {
    return { errorMessage: 'Failed to estimate!' };
  }

  if (crossChainAction.useWeb3Provider) {
    let gasLimit = ethers.BigNumber.from(0);

    try {
      for (const transactionsToSend of crossChainAction.transactions) {
        const { to, data, value } = transactionsToSend;
        // @ts-ignore
        const estimatedTx = await web3Provider.sendRequest('eth_estimateGas', [
          {
            from: providerAddress,
            to,
            value: prepareValueForRpcCall(value),
            data,
          },
        ]);
        gasLimit = gasLimit.add(estimatedTx);
      }
      if (!gasLimit.isZero()) gasCost = gasLimit;
    } catch (e) {
      if (e instanceof Error) {
        errorMessage = e?.message;
      }
    }

    try {
      usdPrice = await getNativeAssetPriceInUsd(crossChainAction.chainId);
    } catch (e) {
      //
    }
  } else {
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
  }

  try {
    usdPrice = await getNativeAssetPriceInUsd(crossChainAction.chainId);
  } catch (e) {
    //
  }

  return { gasCost, errorMessage, usdPrice };
};

export const getTransactionExplorerLink = (chainId: number, transactionHash?: string): string | null => {
  const explorerUrl = supportedChains.find((chain) => chain.chainId === chainId)?.explorerUrl;
  if (!explorerUrl || !transactionHash) return null;
  return `${explorerUrl}${transactionHash}`;
};

// 0,10 – first 4 bytes
const ERC20ApprovalMethodId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('approve(address,uint256)')).slice(0, 10);

export const isERC20ApprovalTransactionData = (data: string | undefined): boolean => {
  if (!data) return false;
  return data.toLowerCase().startsWith(ERC20ApprovalMethodId.toLowerCase());
};

export const getFirstCrossChainActionByStatus = (
  crossChainActions: ICrossChainAction[],
  status: string,
): ICrossChainAction | undefined =>
  crossChainActions.find(({ transactions }) => transactions.find((transaction) => transaction.status === status));

export const getCrossChainActionTransactionsByStatus = (
  crossChainActionTransactions: ICrossChainActionTransaction[],
  status: string,
): ICrossChainActionTransaction[] =>
  crossChainActionTransactions.filter((transaction) => transaction.status === status);

export const updateCrossChainActionsTransactionsStatus = (
  crossChainActions: ICrossChainAction[],
  status: string,
): ICrossChainAction[] =>
  crossChainActions.map((crossChainActionToDispatch) => ({
    ...crossChainActionToDispatch,
    transactions: crossChainActionToDispatch.transactions.map((transaction) => ({
      ...transaction,
      status,
    })),
  }));
export const rejectUnsentCrossChainActionsTransactions = (
  crossChainActions: ICrossChainAction[],
): ICrossChainAction[] =>
  crossChainActions.map((crossChainActionToDispatch) => ({
    ...crossChainActionToDispatch,
    transactions: crossChainActionToDispatch.transactions.map((transaction) => {
      if (transaction.status !== CROSS_CHAIN_ACTION_STATUS.UNSENT) return transaction;
      return { ...transaction, status: CROSS_CHAIN_ACTION_STATUS.REJECTED_BY_USER };
    }),
  }));

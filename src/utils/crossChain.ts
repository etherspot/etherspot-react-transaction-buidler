import { AccountTypes, LiFiStatus, Sdk as EtherspotSdk, WalletProviderLike, Web3WalletProvider } from 'etherspot';
import { ethers } from 'ethers';

// Type
import type {
  ICrossChainActionEstimation,
  ICrossChainActionTransaction,
  ICrossChainAction,
} from '../types/crossChainAction';

// Constant
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { CROSS_CHAIN_ACTION_STATUS } from '../constants/transactionDispatcherConstants';

// Service
import { getAssetPriceInUsd, getNativeAssetPriceInUsd } from '../services/coingecko';

// Local
import { addressesEqual, isZeroAddress } from './validation';
import { parseEtherspotErrorMessageIfAvailable } from './etherspot';

export const getCrossChainStatusByHash = async (
  fromChainId: number,
  toChainId: number,
  hash: string
): Promise<LiFiStatus | null> => {
  try {
    const options = { method: 'GET', headers: { accept: 'application/json' } };

    const result = await (
      await fetch(`https://li.quest/v1/status?fromChain=${fromChainId}&toChain=${toChainId}&txHash=${hash}`, options)
    ).json();

    return {
      receivingTxnHash: result.receiving?.txHash,
      sendingTxnHash: result.sending?.txHash,
      bridgeExplorerLink: result['bridgeExplorerLink'],
      status: result.status,
      subStatus: result.substatus,
      subStatusMsg: result.substatusMessage,
    };
  } catch (err) {
    return null;
  }
};

export const estimateCrossChainAction = async (
  sdk: EtherspotSdk | null,
  web3Provider: WalletProviderLike | Web3WalletProvider | null,
  crossChainAction: ICrossChainAction,
  providerAddress?: string | null,
  accountAddress?: string | null
): Promise<ICrossChainActionEstimation> => {
  let gasCost = null;
  let usdPrice = null;
  let errorMessage;
  let feeAmount = null;

  if (!sdk || (crossChainAction.useWeb3Provider && !web3Provider)) {
    return { errorMessage: 'Failed to estimate!' };
  }
  let feeAssetBalanceBN = ethers.BigNumber.from(0);
  try {
    const balancesForAddress = crossChainAction.useWeb3Provider && providerAddress ? providerAddress : accountAddress;
    const getAccountBalancesTokens =
      !crossChainAction.gasTokenAddress || isZeroAddress(crossChainAction?.gasTokenAddress)
        ? undefined
        : [crossChainAction.gasTokenAddress];
    const { items: balances } = await sdk.getAccountBalances({
      account: balancesForAddress as string,
      tokens: getAccountBalancesTokens,
      chainId: crossChainAction.chainId,
    });

    const feeAssetBalance = balances.find(
      (balance) =>
        (!isZeroAddress(crossChainAction.gasTokenAddress) &&
          addressesEqual(balance.token, crossChainAction.gasTokenAddress)) ||
        (isZeroAddress(crossChainAction.gasTokenAddress) && balance.token === null)
    );

    if (feeAssetBalance) feeAssetBalanceBN = feeAssetBalance.balance;

    crossChainAction.transactions.map((transactionsToSend) => {
      const { value } = transactionsToSend;
      if (!value) return;

      // sub value from balance if native asset
      if (isZeroAddress(crossChainAction.gasTokenAddress)) {
        feeAssetBalanceBN = feeAssetBalanceBN.sub(value);
        return;
      }

      const outgoingAsset =
        crossChainAction.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET
          ? crossChainAction.preview.asset
          : crossChainAction.preview.fromAsset;

      // sub outgoing erc20 only if it matches gas token address
      if (outgoingAsset.address && !addressesEqual(crossChainAction.gasTokenAddress, outgoingAsset.address)) return;
      feeAssetBalanceBN = feeAssetBalanceBN.sub(outgoingAsset.amount);
    });
  } catch (e) {
    //
  }

  // @ts-ignore
  if (crossChainAction.useWeb3Provider && web3Provider?.type !== 'WalletConnect') {
    let gasLimit = ethers.BigNumber.from(0);

    try {
      for (const transactionsToSend of crossChainAction.transactions) {
        const { to, data, value } = transactionsToSend;
        // @ts-ignore
        const estimatedTx = await sendWeb3ProviderRequest(
          web3Provider,
          'eth_estimateGas',
          [
            {
              from: providerAddress,
              to,
              value: prepareValueForRpcCall(value),
              data,
            },
          ],
          crossChainAction.chainId
        );
        gasLimit = gasLimit.add(estimatedTx);
      }
      if (!gasLimit.isZero()) gasCost = gasLimit;
    } catch (e) {
      if (e instanceof Error) {
        errorMessage = e?.message;
      }
    }
  } else if (!crossChainAction.useWeb3Provider) {
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

      const feeToken =
        !crossChainAction.gasTokenAddress || isZeroAddress(crossChainAction.gasTokenAddress)
          ? undefined
          : crossChainAction.gasTokenAddress;

      const { estimation: gatewayBatchEstimation } = await sdk.estimateGatewayBatch({ feeToken });
      gasCost = gatewayBatchEstimation.estimatedGasPrice.mul(gatewayBatchEstimation.estimatedGas);
      feeAmount = feeToken ? gatewayBatchEstimation.feeAmount : null;
    } catch (e) {
      errorMessage = parseEtherspotErrorMessageIfAvailable(e);
      if (!errorMessage && e instanceof Error) {
        errorMessage = e?.message;
      }
    }
  }

  if (
    feeAssetBalanceBN.isZero() ||
    (!feeAmount && gasCost && feeAssetBalanceBN.lt(gasCost)) ||
    (feeAmount && feeAssetBalanceBN.lt(feeAmount))
  ) {
    return { errorMessage: 'Not enough gas!' };
  }

  try {
    usdPrice =
      feeAmount && crossChainAction.gasTokenAddress
        ? await getAssetPriceInUsd(crossChainAction.chainId, crossChainAction.gasTokenAddress)
        : await getNativeAssetPriceInUsd(crossChainAction.chainId);
  } catch (e) {
    //
  }

  return { gasCost, errorMessage, usdPrice, feeAmount };
};

export const getFirstCrossChainActionByStatus = (
  crossChainActions: ICrossChainAction[],
  status: string
): ICrossChainAction | undefined =>
  crossChainActions.find(({ transactions }) => transactions.find((transaction) => transaction.status === status));

export const filterCrossChainActionsByStatus = (
  crossChainActions: ICrossChainAction[],
  status: string
): ICrossChainAction[] =>
  crossChainActions.filter(({ transactions }) => transactions.find((transaction) => transaction.status === status));

export const getCrossChainActionTransactionsByStatus = (
  crossChainActionTransactions: ICrossChainActionTransaction[],
  status: string
): ICrossChainActionTransaction[] =>
  crossChainActionTransactions.filter((transaction) => transaction.status === status);

export const updateCrossChainActionsTransactionsStatus = (
  crossChainActions: ICrossChainAction[],
  status: string
): ICrossChainAction[] =>
  crossChainActions.map((crossChainActionToDispatch) =>
    updateCrossChainActionTransactionsStatus(crossChainActionToDispatch, status)
  );

export const updateCrossChainActionTransactionsStatus = (
  crossChainAction: ICrossChainAction,
  status: string
): ICrossChainAction => ({
  ...crossChainAction,
  transactions: crossChainAction.transactions.map((transaction) => ({
    ...transaction,
    status: transaction.status === CROSS_CHAIN_ACTION_STATUS.CONFIRMED ? CROSS_CHAIN_ACTION_STATUS.CONFIRMED : status,
  })),
});

export const rejectUnsentCrossChainActionsTransactions = (
  crossChainActions: ICrossChainAction[]
): ICrossChainAction[] =>
  crossChainActions.map((crossChainActionToDispatch) => ({
    ...crossChainActionToDispatch,
    transactions: crossChainActionToDispatch.transactions.map((transaction) => {
      if (transaction.status !== CROSS_CHAIN_ACTION_STATUS.UNSENT) return transaction;
      return { ...transaction, status: CROSS_CHAIN_ACTION_STATUS.REJECTED_BY_USER };
    }),
  }));

const prepareValueForRpcCall = (rawValue: any): string | undefined => {
  let value;

  try {
    const valueBN = ethers.BigNumber.isBigNumber(rawValue) ? rawValue : ethers.BigNumber.from(rawValue);
    if (!valueBN.isZero()) value = valueBN.toHexString();
  } catch (e) {
    //
  }

  return value;
};

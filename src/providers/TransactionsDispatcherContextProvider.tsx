import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccountTypes } from 'etherspot';

import { TransactionsDispatcherContext } from '../contexts';
import {
  CrossChainAction,
  CrossChainActionTransaction,
} from '../utils/transaction';
import { DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS } from '../constants/TransactionDispatcherConstants';
import {
  useEtherspot,
  useTransactionBuilderModal,
} from '../hooks';
import { parseEtherspotErrorMessageIfAvailable } from '../utils/etherspot';

export interface DispatchedCrossChainActionTransaction extends CrossChainActionTransaction {
  id: number;
  status: string;
  batchHash?: string;
  transactionHash?: string;
}

export interface DispatchedCrossChainAction extends CrossChainAction {
  transactions: DispatchedCrossChainActionTransaction[];
}

const TransactionsDispatcherContextProvider = ({ children }: { children: ReactNode }) => {
  const context = useContext(TransactionsDispatcherContext);

  if (context.initialized) {
    throw new Error('<TransactionsDispatcherContextProvider /> has already been declared.')
  }

  const initialized = useMemo(() => true, []);

  const [processingDispatched, setProcessingDispatched] = useState<boolean>(false);
  const [crossChainActions, setCrossChainActions] = useState<DispatchedCrossChainAction[]>([]);

  const { getSdkForChainId } = useEtherspot();
  const { showAlertModal } = useTransactionBuilderModal();

  const dispatchCrossChainActions = useCallback((crossChainActionsToDispatch: CrossChainAction[]) => {
    // TODO: store locally
    setCrossChainActions(crossChainActionsToDispatch.map((crossChainActionToDispatch) => ({
      ...crossChainActionToDispatch,
      transactions: crossChainActionToDispatch.transactions.map((crossChainActionToDispatchTransaction, id) => ({
        ...crossChainActionToDispatchTransaction,
        id,
        status: DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.UNSENT,
      })),
    })));
  }, [setCrossChainActions]);

  const resetCrossChainActions = useCallback((errorMessage?: string) => {
    setProcessingDispatched(false);
    setCrossChainActions([]);

    if (!errorMessage) return;
    showAlertModal(errorMessage)
  }, []);

  const processDispatchedTransactions = useCallback(async () => {
    if (!crossChainActions?.length) return;

    const hasPending = crossChainActions.some(({ transactions }) => transactions.some(({ status }) => status === DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING))
    if (hasPending) return;

    const firstUnsentCrossChainAction = crossChainActions.find(({ transactions }) => transactions.some(({ status }) => status === DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.UNSENT));
    if (!firstUnsentCrossChainAction) return;

    if (processingDispatched) return;
    setProcessingDispatched(true);

    const unsentCrossChainActionTransactions = firstUnsentCrossChainAction.transactions.filter(({ status }) => status === DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.UNSENT);
    const targetChainId = unsentCrossChainActionTransactions[0].chainId;

    if (!targetChainId) {
      resetCrossChainActions('Unable to find target chain ID!')
      return;
    }

    let chainTransactions: DispatchedCrossChainActionTransaction[] = [];

    // sequentially select first unsent within same chain
    unsentCrossChainActionTransactions.every((unsentCrossChainActionTransaction) => {
      // do not add to this iteration if next tx is on other chain
      if (unsentCrossChainActionTransaction.chainId !== targetChainId) return false;

      chainTransactions = [...chainTransactions, unsentCrossChainActionTransaction];

      return true;
    });

    const sdkForChain = getSdkForChainId(targetChainId);

    if (!sdkForChain) {
      resetCrossChainActions('Unable to reach Etherspot SDK!')
      return;
    }

    let batchHash: string = '';
    let errorMessage;

    try {
      if (!sdkForChain?.state?.account?.type || sdkForChain.state.account.type === AccountTypes.Key) {
        await sdkForChain.computeContractAccount({ sync: true });
      }

      sdkForChain.clearGatewayBatch();

      // sequential
      for (const chainTransaction of chainTransactions) {
        const { to, value, data } = chainTransaction;
        await sdkForChain.batchExecuteAccountTransaction({ to, value, data });
      }

      await sdkForChain.estimateGatewayBatch();

      const result = await sdkForChain.submitGatewayBatch();
      ({ hash: batchHash } = result);
    } catch (e) {
      errorMessage = parseEtherspotErrorMessageIfAvailable(e);
      if (!errorMessage && e instanceof Error) {
        errorMessage = e?.message
      }
    }

    if (!batchHash) {
      resetCrossChainActions(errorMessage ?? 'Unable to send transaction!');
      return;
    }

    setCrossChainActions(crossChainActions.map((crossChainAction) => {
      const updatedTransactions = crossChainAction.transactions.map((crossChainActionTransaction, id) => {
        if (!chainTransactions.some((chainTransaction) => chainTransaction.id === id)) return crossChainActionTransaction;
        return {
          ...crossChainActionTransaction,
          status: DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING,
          batchHash,
        };
      });

      return { ...crossChainAction, transactions: updatedTransactions };
    }));

    showAlertModal('Transaction sent!');
    setProcessingDispatched(false);
  }, [crossChainActions, getSdkForChainId, processingDispatched, resetCrossChainActions]);

  useEffect(() => { processDispatchedTransactions(); }, [processDispatchedTransactions]);

  const contextData = useMemo(
    () => ({
      crossChainActions,
      dispatchCrossChainActions,
      processingDispatched,
    }),
    [
      crossChainActions,
      dispatchCrossChainActions,
      processingDispatched,
    ],
  );

  return (
    <TransactionsDispatcherContext.Provider value={{ initialized, data: contextData }}>
      {children}
    </TransactionsDispatcherContext.Provider>
  );
};

export default TransactionsDispatcherContextProvider;

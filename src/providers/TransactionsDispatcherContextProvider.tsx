import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AccountTypes,
  GatewayTransactionStates,
  NotificationTypes,
  TransactionStatuses,
} from 'etherspot';
import { map as rxjsMap } from 'rxjs/operators';

import { TransactionsDispatcherContext } from '../contexts';
import {
  CrossChainAction,
  CrossChainActionTransaction,
} from '../utils/transaction';
import { DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS } from '../constants/transactionDispatcherConstants';
import {
  useEtherspot,
  useTransactionBuilderModal,
} from '../hooks';
import { parseEtherspotErrorMessageIfAvailable } from '../utils/etherspot';
import { STORED_GROUPED_CROSS_CHAIN_ACTIONS } from '../constants/storageConstants';
import {
  getItem,
  setItem,
} from '../services/storage';
import { getTimeBasedUniqueId } from '../utils/common';

export interface DispatchedCrossChainActionTransaction extends CrossChainActionTransaction {
  id: string;
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

  const [processingCrossChainActionId, setProcessingCrossChainActionId] = useState<string | null>(null);
  const [crossChainActions, setCrossChainActions] = useState<DispatchedCrossChainAction[]>([]);
  const [dispatchId, setDispatchId] = useState<string | null>(null);

  const { getSdkForChainId } = useEtherspot();
  const { showAlertModal } = useTransactionBuilderModal();

  const dispatchCrossChainActions = useCallback((crossChainActionsToDispatch: CrossChainAction[]) => {
    const newDispatchId = getTimeBasedUniqueId();
    setCrossChainActions(crossChainActionsToDispatch.map((crossChainActionToDispatch) => ({
      ...crossChainActionToDispatch,
      transactions: crossChainActionToDispatch.transactions.map((crossChainActionToDispatchTransaction) => {
        return ({
          ...crossChainActionToDispatchTransaction,
          id: getTimeBasedUniqueId(),
          status: DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.UNSENT,
        })
      }),
    })));
    setDispatchId(newDispatchId)
  }, [setCrossChainActions]);

  const resetCrossChainActions = useCallback((errorMessage?: string) => {
    setProcessingCrossChainActionId(null);
    console.log('setCrossChainActions resetCrossChainActions =!!')
    setCrossChainActions([]);
    setDispatchId(null);

    if (!errorMessage) return;
    showAlertModal(errorMessage)
  }, []);

  const processDispatchedCrossChainActions = useCallback(async () => {
    if (!crossChainActions?.length || !dispatchId) return;

    const hasPending = crossChainActions.some(({ transactions }) => transactions.some(({ status }) => status === DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING));
    if (hasPending) return;

    const firstUnsentCrossChainAction = crossChainActions.find(({ transactions }) => transactions.some(({ status }) => status === DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.UNSENT));
    if (!firstUnsentCrossChainAction) return;

    const unsentCrossChainActionTransactions = firstUnsentCrossChainAction.transactions.filter(({ status }) => status === DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.UNSENT);
    const targetChainId = unsentCrossChainActionTransactions[0].chainId;
    const sdkForChain = getSdkForChainId(targetChainId);
    if (!sdkForChain) return;

    if (processingCrossChainActionId) return;
    setProcessingCrossChainActionId(firstUnsentCrossChainAction.id);

    if (!targetChainId) {
      resetCrossChainActions('Unable to find target chain ID!')
      return;
    }

    let crossChainActionTransactionsToSend: DispatchedCrossChainActionTransaction[] = [];

    // sequentially select first unsent within same chain
    unsentCrossChainActionTransactions.every((unsentCrossChainActionTransaction) => {
      // do not add to this iteration if next tx is on other chain
      if (unsentCrossChainActionTransaction.chainId !== targetChainId) return false;

      crossChainActionTransactionsToSend = [...crossChainActionTransactionsToSend, unsentCrossChainActionTransaction];

      return true;
    });

    let batchHash: string = '';
    let errorMessage;

    try {
      if (!sdkForChain?.state?.account?.type || sdkForChain.state.account.type === AccountTypes.Key) {
        await sdkForChain.computeContractAccount({ sync: true });
      }

      sdkForChain.clearGatewayBatch();

      // sequential
      for (const transactionsToSend of crossChainActionTransactionsToSend) {
        const { to, value, data } = transactionsToSend;
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

    if (!batchHash?.length) {
      resetCrossChainActions(errorMessage ?? 'Unable to send transaction!');
      return;
    }

    const updatedCrossChainActions = crossChainActions.map((crossChainAction) => {
      const updatedTransactions = crossChainAction.transactions.map((crossChainActionTransaction) => {
        if (!crossChainActionTransactionsToSend.some((transactionToSend) => transactionToSend.id === crossChainActionTransaction.id)) return crossChainActionTransaction;
        return {
          ...crossChainActionTransaction,
          status: DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING,
          batchHash,
        };
      });

      return { ...crossChainAction, transactions: updatedTransactions };
    });

    console.log('setCrossChainActions processDispatchedCrossChainActions!!')
    setCrossChainActions(updatedCrossChainActions);

    showAlertModal('Transaction sent!');

    setProcessingCrossChainActionId(null);
  }, [crossChainActions, getSdkForChainId, processingCrossChainActionId, resetCrossChainActions, dispatchId]);

  useEffect(() => { processDispatchedCrossChainActions(); }, [processDispatchedCrossChainActions]);

  useEffect(() => {
    if (!dispatchId || !crossChainActions?.length) return;

    try {
      const storedGroupedCrossChainActionsRaw = getItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS);
      let storedGroupedCrossChainActions = {};
      if (storedGroupedCrossChainActionsRaw) storedGroupedCrossChainActions = JSON.parse(storedGroupedCrossChainActionsRaw)
      setItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS, JSON.stringify({ ...storedGroupedCrossChainActions, [dispatchId]: crossChainActions }));
    } catch (e) {
      //
    }
  }, [crossChainActions, dispatchId]);

  const restoreProcessing = useCallback(async () => {
    let storedGroupedCrossChainActions: { [id: string]: DispatchedCrossChainAction[] } = {};

    try {
      const storedGroupedCrossChainActionsRaw = getItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS);
      if (storedGroupedCrossChainActionsRaw) storedGroupedCrossChainActions = JSON.parse(storedGroupedCrossChainActionsRaw)
    } catch (e) {
      //
    }

    const updatedStoredGroupedCrossChainActions = { ...storedGroupedCrossChainActions };

    // newest to oldest
    const storedGroupedCrossChainActionsIds = Object.keys(storedGroupedCrossChainActions)
      .sort()
      .reverse();

    await Promise.all(storedGroupedCrossChainActionsIds.map(async (id) => {
      updatedStoredGroupedCrossChainActions[id] = await Promise.all(storedGroupedCrossChainActions[id].map(async (storedCrossChainAction) => {
        const updatedTransactions = await Promise.all(storedCrossChainAction.transactions.map(async (storedCrossChainActionTransaction) => {
          const sdkForChain = getSdkForChainId(storedCrossChainActionTransaction.chainId);
          if (!sdkForChain) return storedCrossChainActionTransaction;

          let transactionHash = storedCrossChainActionTransaction.transactionHash;
          let status = storedCrossChainActionTransaction.status;

          if (storedCrossChainActionTransaction.status === DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING) {
            if (!transactionHash && storedCrossChainActionTransaction.batchHash) {
              try {
                const submittedBatch = await sdkForChain.getGatewaySubmittedBatch({ hash: storedCrossChainActionTransaction.batchHash });
                transactionHash = submittedBatch?.transaction?.hash;
              } catch (e) {
                //
              }
            } else if (transactionHash) {
              try {
                const submittedTransaction = await sdkForChain.getTransaction({ hash: transactionHash });
                if (submittedTransaction?.status === TransactionStatuses.Completed) {
                  status = DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.CONFIRMED;
                } else if (submittedTransaction?.status === TransactionStatuses.Reverted) {
                  status = DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.FAILED;
                }
              } catch (e) {
                //
              }
            }
          }

          return {
            ...storedCrossChainActionTransaction,
            transactionHash,
            status,
          };
        }));
        return { ...storedCrossChainAction, transactions: updatedTransactions };
      }));
    }));

    // find the oldest pending group for processing
    const oldestGroupedCrossChainActionsId = storedGroupedCrossChainActionsIds.find((id) =>
      storedGroupedCrossChainActions[id].some((dispatchedCrossChainAction) => dispatchedCrossChainAction.transactions.some((dispatchedCrossChainActionTransaction) => [
        DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING,
        DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.UNSENT,
      ].includes(dispatchedCrossChainActionTransaction.status))),
    );

    // set oldest pending
    if (oldestGroupedCrossChainActionsId) {
      setDispatchId(oldestGroupedCrossChainActionsId);
      console.log('setCrossChainActions restoreProcessing!!')
      setCrossChainActions(storedGroupedCrossChainActions[oldestGroupedCrossChainActionsId]);
    }

    setItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS, JSON.stringify(updatedStoredGroupedCrossChainActions));
  }, [getSdkForChainId]);

  useEffect(() => {
    const firstPendingCrossChainAction = crossChainActions.find(({ transactions }) => transactions.some(({ status }) => status === DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING));
    if (!firstPendingCrossChainAction) return;

    const pendingCrossChainActionTransaction = firstPendingCrossChainAction.transactions.find(({ status }) => status === DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING);
    if (!pendingCrossChainActionTransaction?.chainId || !pendingCrossChainActionTransaction?.batchHash) return;

    const sdkForChain = getSdkForChainId(pendingCrossChainActionTransaction.chainId);
    if (!sdkForChain) return;

    try {
      const subscription = sdkForChain.notifications$
      .pipe(rxjsMap(async (notification) => {
        //   // @ts-ignore
        //   // TODO: fix type
        if (notification?.type === NotificationTypes.GatewayBatchUpdated) {
          const submittedBatch = await sdkForChain.getGatewaySubmittedBatch({ hash: pendingCrossChainActionTransaction.batchHash as string });

          const failedStates = [
            GatewayTransactionStates.Canceling,
            GatewayTransactionStates.Canceled,
            GatewayTransactionStates.Reverted,
          ];

          let updatedStatus: string = '';
          let updatedTransactionHash: string = '';

          if (submittedBatch?.transaction?.state && failedStates.includes(submittedBatch?.transaction?.state)) {
            updatedStatus = DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.FAILED;
          } else if (submittedBatch?.transaction?.hash) {
            updatedStatus = DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.CONFIRMED;
            updatedTransactionHash = submittedBatch.transaction.hash;
          }

          if (!updatedStatus && !updatedTransactionHash) return;

          console.log('setCrossChainActions subscribe!!')
          setCrossChainActions((current) => current.map((crossChainAction) => {
            const updatedTransactions = crossChainAction.transactions.map((crossChainActionTransaction) => {
              if (pendingCrossChainActionTransaction.id !== crossChainActionTransaction.id) return crossChainActionTransaction;
              return {
                ...crossChainActionTransaction,
                status: updatedStatus,
                hash: updatedTransactionHash,
              };
            });

            return {
              ...crossChainAction,
              transactions: updatedTransactions
            };
          }));
        }
      }))
      .subscribe();

      return () => subscription.closed ? undefined : subscription.unsubscribe();
    } catch (e) {
      //
    }
  }, [crossChainActions, getSdkForChainId]);

  useEffect(() => { restoreProcessing(); }, [restoreProcessing]);

  const contextData = useMemo(
    () => ({
      dispatchedCrossChainActions: crossChainActions,
      dispatchCrossChainActions,
      processingCrossChainActionId,
    }),
    [
      crossChainActions,
      dispatchCrossChainActions,
      processingCrossChainActionId,
    ],
  );

  return (
    <TransactionsDispatcherContext.Provider value={{ initialized, data: contextData }}>
      {children}
    </TransactionsDispatcherContext.Provider>
  );
};

export default TransactionsDispatcherContextProvider;

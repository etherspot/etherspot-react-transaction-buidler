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
  TransactionStatuses,
} from 'etherspot';

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
  const [dispatchId, setDispatchId] = useState<number | null>(null);

  const { getSdkForChainId } = useEtherspot();
  const { showAlertModal } = useTransactionBuilderModal();

  const dispatchCrossChainActions = useCallback((crossChainActionsToDispatch: CrossChainAction[]) => {
    setCrossChainActions(crossChainActionsToDispatch.map((crossChainActionToDispatch) => ({
      ...crossChainActionToDispatch,
      transactions: crossChainActionToDispatch.transactions.map((crossChainActionToDispatchTransaction, id) => ({
        ...crossChainActionToDispatchTransaction,
        id,
        status: DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.UNSENT,
      })),
    })));
    setDispatchId(+new Date())
  }, [setCrossChainActions]);

  const resetCrossChainActions = useCallback((errorMessage?: string) => {
    setProcessingDispatched(false);
    setCrossChainActions([]);
    setDispatchId(null);

    if (!errorMessage) return;
    showAlertModal(errorMessage)
  }, []);

  const processDispatchedCrossChainActions = useCallback(async () => {
    if (!crossChainActions?.length || !dispatchId) return;

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

    const updatedCrossChainActions = crossChainActions.map((crossChainAction) => {
      const updatedTransactions = crossChainAction.transactions.map((crossChainActionTransaction, id) => {
        if (!chainTransactions.some((chainTransaction) => chainTransaction.id === id)) return crossChainActionTransaction;
        return {
          ...crossChainActionTransaction,
          status: DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING,
          batchHash,
        };
      });

      return { ...crossChainAction, transactions: updatedTransactions };
    })

    setCrossChainActions(updatedCrossChainActions);

    showAlertModal('Transaction sent!');

    try {
      const storedGroupedCrossChainActionsRaw = getItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS);
      let storedGroupedCrossChainActions = {};
      if (storedGroupedCrossChainActionsRaw) storedGroupedCrossChainActions = JSON.parse(storedGroupedCrossChainActionsRaw)
      setItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS, JSON.stringify({ ...storedGroupedCrossChainActions, [dispatchId]: updatedCrossChainActions }));
    } catch (e) {
      //
    }

    setProcessingDispatched(false);

  }, [crossChainActions, getSdkForChainId, processingDispatched, resetCrossChainActions, dispatchId]);

  useEffect(() => { processDispatchedCrossChainActions(); }, [processDispatchedCrossChainActions]);

  const updatePending = useCallback(async () => {
    let storedGroupedCrossChainActions: { [id: string]: DispatchedCrossChainAction[] } = {};

    try {
      const storedGroupedCrossChainActionsRaw = getItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS);
      if (storedGroupedCrossChainActionsRaw) storedGroupedCrossChainActions = JSON.parse(storedGroupedCrossChainActionsRaw)
    } catch (e) {
      //
    }

    const updatedStoredGroupedCrossChainActions = { ...storedGroupedCrossChainActions };
    const storedGroupedCrossChainActionsIds = Object.keys(storedGroupedCrossChainActions);

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

    setItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS, JSON.stringify(updatedStoredGroupedCrossChainActions));
  }, [getSdkForChainId]);

  useEffect(() => { updatePending(); }, [updatePending]);

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

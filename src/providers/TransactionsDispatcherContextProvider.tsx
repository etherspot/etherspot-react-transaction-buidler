import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  GatewayTransactionStates,
  NotificationTypes,
  TransactionStatuses,
} from 'etherspot';
import { map as rxjsMap } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { TransactionsDispatcherContext } from '../contexts';
import {
  estimateCrossChainAction,
  submitTransactions,
} from '../utils/transaction';
import { CROSS_CHAIN_ACTION_STATUS } from '../constants/transactionDispatcherConstants';
import {
  useEtherspot,
  useTransactionBuilderModal,
} from '../hooks';
import { STORED_GROUPED_CROSS_CHAIN_ACTIONS } from '../constants/storageConstants';
import {
  getItem,
  setItem,
} from '../services/storage';
import { getTimeBasedUniqueId } from '../utils/common';
import { ICrossChainAction } from '../types/crossChainAction';

const TransactionsDispatcherContextProvider = ({ children }: { children: ReactNode }) => {
  const context = useContext(TransactionsDispatcherContext);

  if (context !== null) {
    throw new Error('<TransactionsDispatcherContextProvider /> has already been declared.')
  }

  const [processingCrossChainActionId, setProcessingCrossChainActionId] = useState<string | null>(null);
  const [crossChainActions, setCrossChainActions] = useState<ICrossChainAction[]>([]);
  const [dispatchId, setDispatchId] = useState<string | null>(null);

  const { getSdkForChainId, web3Provider, providerAddress } = useEtherspot();
  const { showAlertModal } = useTransactionBuilderModal();

  const dispatchCrossChainActions = useCallback((
    crossChainActionsToDispatch: ICrossChainAction[],
    status: string = CROSS_CHAIN_ACTION_STATUS.UNSENT,
  ) => {
    const newDispatchId = getTimeBasedUniqueId();
    setCrossChainActions(crossChainActionsToDispatch.map((crossChainActionToDispatch) => ({
      ...crossChainActionToDispatch,
      status,
    })));
    setDispatchId(newDispatchId)
  }, [setCrossChainActions]);

  const updatedStoredCrossChainActions = useCallback((dispatchIdToUpdate: string, crossChainActionsToUpdate: ICrossChainAction[]) => {
    try {
      const storedGroupedCrossChainActionsRaw = getItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS);
      let storedGroupedCrossChainActions = {};
      if (storedGroupedCrossChainActionsRaw) storedGroupedCrossChainActions = JSON.parse(storedGroupedCrossChainActionsRaw)
      setItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS, JSON.stringify({ ...storedGroupedCrossChainActions, [dispatchIdToUpdate]: crossChainActionsToUpdate }));
    } catch (e) {
      //
    }
  }, []);

  const resetCrossChainActions = useCallback((errorMessage?: string) => {
    if (dispatchId && crossChainActions?.length) {
      const updatedCrossChainActions = crossChainActions.map((crossChainAction) => ({
        ...crossChainAction,
        status: CROSS_CHAIN_ACTION_STATUS.REJECTED_BY_USER,
      }));
      updatedStoredCrossChainActions(dispatchId, updatedCrossChainActions);
    }

    setCrossChainActions([]);
    setProcessingCrossChainActionId(null);
    setDispatchId(null);

    if (!errorMessage) return;
    showAlertModal(errorMessage)
  }, [dispatchId, crossChainActions]);

  const processDispatchedCrossChainActions = useCallback(async () => {
    if (!crossChainActions?.length || !dispatchId) return;

    const firstUnsentCrossChainAction = crossChainActions.find(({ status }) => status === CROSS_CHAIN_ACTION_STATUS.UNSENT);
    if (!firstUnsentCrossChainAction) return;

    const unsentCrossChainActionTransactions = firstUnsentCrossChainAction.transactions;
    const targetChainId = firstUnsentCrossChainAction.chainId;
    const sdkForChain = getSdkForChainId(targetChainId);
    if (!sdkForChain) return;

    if (processingCrossChainActionId) return;
    setProcessingCrossChainActionId(firstUnsentCrossChainAction.id);

    if (!targetChainId) {
      resetCrossChainActions('Unable to find target chain ID!')
      return;
    }

    let batchHash: string = '';
    let transactionHash: string = '';
    let errorMessage;

    const transactionsToSend = unsentCrossChainActionTransactions.map(({ to, value, data }) => ({ to, value, data }));
    ({ errorMessage, batchHash = '', transactionHash = '' } = await submitTransactions(
      sdkForChain,
      web3Provider,
      transactionsToSend,
      providerAddress,
      firstUnsentCrossChainAction.useWeb3Provider,
    ));

    if (!batchHash?.length && !transactionHash?.length) {
      resetCrossChainActions(errorMessage ?? 'Unable to send transaction!');
      return;
    }

    const updatedCrossChainActions = crossChainActions.map((crossChainAction) => {
      if (crossChainAction.id !== firstUnsentCrossChainAction.id) return crossChainAction;
      return {
        ...crossChainAction,
        status: CROSS_CHAIN_ACTION_STATUS.PENDING,
        submitTimestamp: +new Date(),
        batchHash,
        transactionHash,
      };
    });

    setCrossChainActions(updatedCrossChainActions);

    showAlertModal('Transaction sent!');

    setProcessingCrossChainActionId(null);
  }, [
    crossChainActions,
    getSdkForChainId,
    processingCrossChainActionId,
    resetCrossChainActions,
    dispatchId,
    providerAddress,
  ]);

  useEffect(() => { processDispatchedCrossChainActions(); }, [processDispatchedCrossChainActions]);

  useEffect(() => {
    if (!dispatchId || !crossChainActions?.length) return;
    updatedStoredCrossChainActions(dispatchId, crossChainActions);
  }, [crossChainActions, dispatchId]);

  const restoreProcessing = useCallback(async () => {
    let storedGroupedCrossChainActions: { [id: string]: ICrossChainAction[] } = {};

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
        const sdkForChain = getSdkForChainId(storedCrossChainAction.chainId);
        let { transactionHash, batchHash, status } = storedCrossChainAction;

        if (!sdkForChain || status !== CROSS_CHAIN_ACTION_STATUS.PENDING) return storedCrossChainAction;


        if (status === CROSS_CHAIN_ACTION_STATUS.PENDING) {
          if (!transactionHash && batchHash) {
            try {
              const submittedBatch = await sdkForChain.getGatewaySubmittedBatch({ hash: batchHash });
              transactionHash = submittedBatch?.transaction?.hash;
            } catch (e) {
              //
            }
          }

          if (transactionHash) {
            try {
              const submittedTransaction = await sdkForChain.getTransaction({ hash: transactionHash });
              if (submittedTransaction?.status === TransactionStatuses.Completed) {
                status = CROSS_CHAIN_ACTION_STATUS.CONFIRMED;
              } else if (submittedTransaction?.status === TransactionStatuses.Reverted) {
                status = CROSS_CHAIN_ACTION_STATUS.FAILED;
              }
            } catch (e) {
              //
            }
          }
        }

        return {
          ...storedCrossChainAction,
          transactionHash,
          status,
          finishTimestamp: status ? +new Date() : undefined,
        };
      }));
    }));

    // find the oldest pending group for processing
    const oldestGroupedCrossChainActionsId = storedGroupedCrossChainActionsIds.find((id) =>
      storedGroupedCrossChainActions[id].some((dispatchedCrossChainAction) => dispatchedCrossChainAction.status && [
        CROSS_CHAIN_ACTION_STATUS.PENDING,
        CROSS_CHAIN_ACTION_STATUS.UNSENT,
      ].includes(dispatchedCrossChainAction.status)),
    );

    // set oldest pending
    if (oldestGroupedCrossChainActionsId) {
      setDispatchId(oldestGroupedCrossChainActionsId);
      const crossChainActionsToRestore: ICrossChainAction[] = await Promise.all(storedGroupedCrossChainActions[oldestGroupedCrossChainActionsId].map(async (crossChainAction) => {
        if (crossChainAction.estimated) return crossChainAction;
        const estimated = await estimateCrossChainAction(getSdkForChainId(crossChainAction.chainId), crossChainAction);
        return { ...crossChainAction, estimated };
      }));
      setCrossChainActions(crossChainActionsToRestore);
    }

    setItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS, JSON.stringify(updatedStoredGroupedCrossChainActions));
  }, [getSdkForChainId]);

  useEffect(() => {
    const validPendingCrossChainActions = crossChainActions.filter((crossChainAction) => crossChainAction.chainId
      && crossChainAction.batchHash
      && crossChainAction.status === CROSS_CHAIN_ACTION_STATUS.PENDING
    );

    let subscriptions: Subscription[] = [];

    validPendingCrossChainActions.map((crossChainAction) => {
      const sdkForChain = getSdkForChainId(crossChainAction.chainId);
      if (!sdkForChain) return;

      let subscription: Subscription;

      try {
        subscription = sdkForChain.notifications$
          .pipe(rxjsMap(async (notification) => {
            if (notification?.type === NotificationTypes.GatewayBatchUpdated) {
              const submittedBatch = await sdkForChain.getGatewaySubmittedBatch({ hash: crossChainAction.batchHash as string });

              const failedStates = [
                GatewayTransactionStates.Canceling,
                GatewayTransactionStates.Canceled,
                GatewayTransactionStates.Reverted,
              ];

              let updatedStatus: string = '';
              let updatedTransactionHash: string = '';

              if (submittedBatch?.transaction?.state && failedStates.includes(submittedBatch?.transaction?.state)) {
                updatedStatus = CROSS_CHAIN_ACTION_STATUS.FAILED
              } else if (submittedBatch?.transaction?.state === GatewayTransactionStates.Sent) {
                updatedStatus = CROSS_CHAIN_ACTION_STATUS.CONFIRMED;
              }

              if (submittedBatch?.transaction?.hash) {
                updatedTransactionHash = submittedBatch.transaction.hash;
              }

              if (!updatedStatus && !updatedTransactionHash) return;

              setCrossChainActions((current) => current.map((currentCrossChainAction) => {
                if (crossChainAction.id !== currentCrossChainAction.id) return crossChainAction;
                return {
                  ...crossChainAction,
                  finishTimestamp: updatedStatus ? +new Date() : undefined,
                  status: updatedStatus || crossChainAction.status,
                  transactionHash: updatedTransactionHash || crossChainAction.transactionHash,
                };
              }));
            }
          }))
          .subscribe();

        subscriptions.push(subscription);
      } catch (e) {
        //
      }
    });

    return () => {
      subscriptions.forEach((subscription) => {
        try {
          if (subscription?.closed) return;
          subscription.unsubscribe();
        } catch (e) {
          //
        }
      });
    };
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
    <TransactionsDispatcherContext.Provider value={{ data: contextData }}>
      {children}
    </TransactionsDispatcherContext.Provider>
  );
};

export default TransactionsDispatcherContextProvider;

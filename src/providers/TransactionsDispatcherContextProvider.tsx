import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GatewayTransactionStates, NotificationTypes, Sdk, TransactionStatuses } from 'etherspot';
import { map as rxjsMap } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { TransactionsDispatcherContext } from '../contexts';
import {
  estimateCrossChainAction,
  getFirstCrossChainActionByStatus,
  getCrossChainActionTransactionsByStatus,
  submitEtherspotTransactionsBatch,
  submitWeb3ProviderTransaction,
  updateCrossChainActionsTransactionsStatus,
  rejectUnsentCrossChainActionsTransactions,
} from '../utils/transaction';
import { CROSS_CHAIN_ACTION_STATUS } from '../constants/transactionDispatcherConstants';
import { useEtherspot, useTransactionBuilderModal } from '../hooks';
import { STORED_GROUPED_CROSS_CHAIN_ACTIONS } from '../constants/storageConstants';
import { getItem, setItem } from '../services/storage';
import { getTimeBasedUniqueId } from '../utils/common';
import { ICrossChainAction, ICrossChainActionTransaction } from '../types/crossChainAction';

const TransactionsDispatcherContextProvider = ({ children }: { children: ReactNode }) => {
  const context = useContext(TransactionsDispatcherContext);

  if (context !== null) {
    throw new Error('<TransactionsDispatcherContextProvider /> has already been declared.');
  }

  const [processingCrossChainActionId, setProcessingCrossChainActionId] = useState<string | null>(null);
  const [crossChainActions, setCrossChainActions] = useState<ICrossChainAction[]>([]);
  const [dispatchId, setDispatchId] = useState<string | null>(null);

  const { getSdkForChainId, web3Provider, providerAddress, accountAddress } = useEtherspot();
  const { showAlertModal } = useTransactionBuilderModal();

  const dispatchCrossChainActions = useCallback(
    (crossChainActionsToDispatch: ICrossChainAction[], status?: string) => {
      const newDispatchId = getTimeBasedUniqueId();
      const updatedCrossChainActionsToDispatch = updateCrossChainActionsTransactionsStatus(
        crossChainActionsToDispatch,
        status || CROSS_CHAIN_ACTION_STATUS.UNSENT,
      );
      setCrossChainActions(updatedCrossChainActionsToDispatch);
      setDispatchId(newDispatchId);
    },
    [setCrossChainActions],
  );

  const updatedStoredCrossChainActions = useCallback(
    (dispatchIdToUpdate: string, crossChainActionsToUpdate: ICrossChainAction[]) => {
      try {
        const storedGroupedCrossChainActionsRaw = getItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS);
        let storedGroupedCrossChainActions = {};
        if (storedGroupedCrossChainActionsRaw)
          storedGroupedCrossChainActions = JSON.parse(storedGroupedCrossChainActionsRaw);
        setItem(
          STORED_GROUPED_CROSS_CHAIN_ACTIONS,
          JSON.stringify({
            ...storedGroupedCrossChainActions,
            [dispatchIdToUpdate]: crossChainActionsToUpdate,
          }),
        );
      } catch (e) {
        //
      }
    },
    [],
  );

  const resetCrossChainActions = useCallback(
    (errorMessage?: string) => {
      if (dispatchId && crossChainActions?.length) {
        const updatedCrossChainActions = rejectUnsentCrossChainActionsTransactions(crossChainActions);
        updatedStoredCrossChainActions(dispatchId, updatedCrossChainActions);
      }

      setCrossChainActions([]);
      setProcessingCrossChainActionId(null);
      setDispatchId(null);

      if (!errorMessage) return;
      showAlertModal(errorMessage);
    },
    [dispatchId, crossChainActions],
  );

  const processDispatchedCrossChainActions = useCallback(async () => {
    if (!crossChainActions?.length || !dispatchId) return;

    const firstUnsentCrossChainAction = getFirstCrossChainActionByStatus(
      crossChainActions,
      CROSS_CHAIN_ACTION_STATUS.UNSENT,
    );
    if (!firstUnsentCrossChainAction) return;

    let unsentCrossChainActionTransactions: ICrossChainActionTransaction[] = [];
    if (firstUnsentCrossChainAction.batchTransactions?.length) {
      firstUnsentCrossChainAction.batchTransactions.map(
        (action) =>
          (unsentCrossChainActionTransactions = [
            ...unsentCrossChainActionTransactions,
            ...getCrossChainActionTransactionsByStatus(
              action.transactions,
              CROSS_CHAIN_ACTION_STATUS.UNSENT,
            ),
          ]),
      );
    } else {
      unsentCrossChainActionTransactions = getCrossChainActionTransactionsByStatus(
        firstUnsentCrossChainAction.transactions,
        CROSS_CHAIN_ACTION_STATUS.UNSENT,
      );
    }

    const pendingCrossChainActionTransactions = getCrossChainActionTransactionsByStatus(
      firstUnsentCrossChainAction.transactions,
      CROSS_CHAIN_ACTION_STATUS.PENDING,
    );

    // if web3 pending and unsent wait before pending completes
    const hasUnsentAndPendingWeb3ProviderTransactions =
      firstUnsentCrossChainAction.useWeb3Provider &&
      !!unsentCrossChainActionTransactions?.length &&
      !!pendingCrossChainActionTransactions?.length;

    if (!unsentCrossChainActionTransactions?.length || hasUnsentAndPendingWeb3ProviderTransactions) return;

    const targetChainId = firstUnsentCrossChainAction.chainId;
    const sdkForChain = getSdkForChainId(targetChainId);
    if (!sdkForChain) return;

    if (processingCrossChainActionId) return;
    setProcessingCrossChainActionId(firstUnsentCrossChainAction.id);

    if (!targetChainId) {
      resetCrossChainActions('Unable to find target chain ID!');
      return;
    }

    const transactionsToSend = unsentCrossChainActionTransactions.map(({ to, value, data }) => ({
      to,
      value,
      data,
    }));

    const result: {
      transactionHash?: string;
      errorMessage?: string;
      batchHash?: string;
    } = firstUnsentCrossChainAction.useWeb3Provider
      ? await submitWeb3ProviderTransaction(
          web3Provider,
          transactionsToSend[0],
          firstUnsentCrossChainAction.chainId,
          providerAddress,
        )
      : await submitEtherspotTransactionsBatch(
          getSdkForChainId(firstUnsentCrossChainAction.chainId) as Sdk,
          transactionsToSend,
        );

    if (result?.errorMessage || (!result?.transactionHash?.length && !result?.batchHash?.length)) {
      resetCrossChainActions();
      return;
    }

    const { transactionHash, batchHash } = result;

    const updatedCrossChainActions = crossChainActions.map((crossChainAction) => {
      if (crossChainAction.id !== firstUnsentCrossChainAction.id
        || firstUnsentCrossChainAction.multiCallData?.id !== crossChainAction.multiCallData?.id) {
        return crossChainAction;
      }

      let isUnsentTransactionUpdated = false;
      const updatedTransactions = crossChainAction.transactions.reduce(
        (updated: ICrossChainActionTransaction[], transaction) => {
          const isUnsentTransaction = transaction.status === CROSS_CHAIN_ACTION_STATUS.UNSENT;

          const updatedTransaction = {
            ...transaction,
            status: CROSS_CHAIN_ACTION_STATUS.PENDING,
            submitTimestamp: +new Date(),
            transactionHash,
          };

          if (!crossChainAction.useWeb3Provider || (isUnsentTransaction && !isUnsentTransactionUpdated)) {
            isUnsentTransactionUpdated = true;
            return [...updated, updatedTransaction];
          }

          return [...updated, transaction];
        },
        [],
      );

      return {
        ...crossChainAction,
        transactions: updatedTransactions,
        batchHash,
      };
    });

    setCrossChainActions(updatedCrossChainActions);
    setProcessingCrossChainActionId(null);
  }, [
    crossChainActions,
    getSdkForChainId,
    processingCrossChainActionId,
    resetCrossChainActions,
    dispatchId,
    providerAddress,
  ]);

  useEffect(() => {
    processDispatchedCrossChainActions();
  }, [processDispatchedCrossChainActions]);

  useEffect(() => {
    if (!dispatchId || !crossChainActions?.length) return;
    updatedStoredCrossChainActions(dispatchId, crossChainActions);
  }, [crossChainActions, dispatchId]);

  const restoreProcessing = useCallback(async () => {
    let storedGroupedCrossChainActions: { [id: string]: ICrossChainAction[] } = {};

    try {
      const storedGroupedCrossChainActionsRaw = getItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS);
      if (storedGroupedCrossChainActionsRaw)
        storedGroupedCrossChainActions = JSON.parse(storedGroupedCrossChainActionsRaw);
    } catch (e) {
      //
    }

    const updatedStoredGroupedCrossChainActions = { ...storedGroupedCrossChainActions };

    // newest to oldest
    const storedGroupedCrossChainActionsIds = Object.keys(storedGroupedCrossChainActions).sort().reverse();

    await Promise.all(
      storedGroupedCrossChainActionsIds.map(async (id) => {
        updatedStoredGroupedCrossChainActions[id] = await Promise.all(
          storedGroupedCrossChainActions[id].map(async (storedCrossChainAction) => {
            const sdkForChain = getSdkForChainId(storedCrossChainAction.chainId);
            let { batchHash, transactions } = storedCrossChainAction;

            const firstPending = getCrossChainActionTransactionsByStatus(
              transactions,
              CROSS_CHAIN_ACTION_STATUS.PENDING,
            )[0];
            if (!sdkForChain || !firstPending) return storedCrossChainAction;

            let { status, transactionHash } = firstPending;

            if (batchHash) {
              try {
                const submittedBatch = await sdkForChain.getGatewaySubmittedBatch({ hash: batchHash });
                transactionHash = submittedBatch?.transaction?.hash;
              } catch (e) {
                //
              }
            }

            if (transactionHash) {
              try {
                const submittedTransaction = await sdkForChain.getTransaction({
                  hash: transactionHash,
                });
                if (submittedTransaction?.status === TransactionStatuses.Completed) {
                  status = CROSS_CHAIN_ACTION_STATUS.CONFIRMED;
                } else if (submittedTransaction?.status === TransactionStatuses.Reverted) {
                  status = CROSS_CHAIN_ACTION_STATUS.FAILED;
                }
              } catch (e) {
                //
              }
            }

            const updatedTransactions = transactions.map((transaction) => {
              if (
                storedCrossChainAction.useWeb3Provider &&
                transactionHash !== transaction.transactionHash
              )
                return transaction;
              return {
                ...transaction,
                transactionHash,
                status,
                finishTimestamp: status ? +new Date() : undefined,
              };
            });

            return { ...storedCrossChainAction, transactions: updatedTransactions };
          }),
        );
      }),
    );

    // find the oldest pending group for processing
    const oldestGroupedCrossChainActionsId = storedGroupedCrossChainActionsIds.find(
      (id) =>
        !!getFirstCrossChainActionByStatus(
          updatedStoredGroupedCrossChainActions[id],
          CROSS_CHAIN_ACTION_STATUS.UNSENT,
        ),
    );

    // // set oldest pending
    if (oldestGroupedCrossChainActionsId) {
      setDispatchId(oldestGroupedCrossChainActionsId);
      const crossChainActionsToRestore: ICrossChainAction[] = await Promise.all(
        updatedStoredGroupedCrossChainActions[oldestGroupedCrossChainActionsId].map(
          async (crossChainAction) => {
            if (crossChainAction.estimated) return crossChainAction;
            const estimated = await estimateCrossChainAction(
              getSdkForChainId(crossChainAction.chainId),
              web3Provider,
              crossChainAction,
              providerAddress,
              accountAddress,
            );
            return { ...crossChainAction, estimated };
          },
        ),
      );
      setCrossChainActions(crossChainActionsToRestore);
    }

    setItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS, JSON.stringify(updatedStoredGroupedCrossChainActions));

    const hasPending = storedGroupedCrossChainActionsIds.some((id) =>
      storedGroupedCrossChainActions[id].some(async (storedCrossChainAction) => {
        return !!getCrossChainActionTransactionsByStatus(
          storedCrossChainAction.transactions,
          CROSS_CHAIN_ACTION_STATUS.PENDING,
        )?.length;
      }),
    );

    if (!hasPending) return;

    setTimeout(() => {
      restoreProcessing();
    }, 3000);
  }, [getSdkForChainId, web3Provider, providerAddress, accountAddress]);

  useEffect(() => {
    const validPendingCrossChainActionsWithBatches = crossChainActions.filter(
      (crossChainAction) =>
        crossChainAction.chainId &&
        crossChainAction.batchHash &&
        getCrossChainActionTransactionsByStatus(
          crossChainAction.transactions,
          CROSS_CHAIN_ACTION_STATUS.PENDING,
        ).length,
    );

    let subscriptions: Subscription[] = [];

    validPendingCrossChainActionsWithBatches.map((crossChainAction) => {
      const sdkForChain = getSdkForChainId(crossChainAction.chainId);
      if (!sdkForChain) return;

      let subscription: Subscription;

      try {
        subscription = sdkForChain.notifications$
          .pipe(
            rxjsMap(async (notification) => {
              if (notification?.type === NotificationTypes.GatewayBatchUpdated) {
                const submittedBatch = await sdkForChain.getGatewaySubmittedBatch({
                  hash: crossChainAction.batchHash as string,
                });

                const failedStates = [
                  GatewayTransactionStates.Canceling,
                  GatewayTransactionStates.Canceled,
                  GatewayTransactionStates.Reverted,
                ];

                let updatedStatus: string = '';
                let updatedTransactionHash: string = '';

                if (
                  submittedBatch?.transaction?.state &&
                  failedStates.includes(submittedBatch?.transaction?.state)
                ) {
                  updatedStatus = CROSS_CHAIN_ACTION_STATUS.FAILED;
                } else if (submittedBatch?.transaction?.state === GatewayTransactionStates.Sent) {
                  updatedStatus = CROSS_CHAIN_ACTION_STATUS.CONFIRMED;
                }

                if (submittedBatch?.transaction?.hash) {
                  updatedTransactionHash = submittedBatch.transaction.hash;
                }

                if (!updatedStatus && !updatedTransactionHash) return;

                setCrossChainActions((current) =>
                  current.map((currentCrossChainAction) => {
                    if (crossChainAction.id !== currentCrossChainAction.id)
                      return currentCrossChainAction;

                    const updatedTransactions = currentCrossChainAction.transactions.map(
                      (transaction) => ({
                        ...transaction,
                        finishTimestamp: updatedStatus ? +new Date() : undefined,
                        status: updatedStatus || transaction.status,
                        transactionHash: updatedTransactionHash || transaction.transactionHash,
                      }),
                    );

                    return { ...crossChainAction, transactions: updatedTransactions };
                  }),
                );
              }
            }),
          )
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

  useEffect(() => {
    restoreProcessing();
  }, [restoreProcessing]);

  const contextData = useMemo(
    () => ({
      dispatchedCrossChainActions: crossChainActions,
      dispatchCrossChainActions,
      processingCrossChainActionId,
    }),
    [crossChainActions, dispatchCrossChainActions, processingCrossChainActionId],
  );

  return (
    <TransactionsDispatcherContext.Provider value={{ data: contextData }}>
      {children}
    </TransactionsDispatcherContext.Provider>
  );
};

export default TransactionsDispatcherContextProvider;

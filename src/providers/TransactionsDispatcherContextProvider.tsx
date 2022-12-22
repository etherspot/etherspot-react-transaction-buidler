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
  filterCrossChainActionsByStatus,
  updateCrossChainActionTransactionsStatus,
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

  const [processingCrossChainActionIds, setProcessingCrossChainActionIds] = useState<string[] | null>(null);
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
    (errorMessage?: string, processingIdToRemove?: string) => {
      if (dispatchId && crossChainActions?.length) {
        const updatedCrossChainActions = rejectUnsentCrossChainActionsTransactions(crossChainActions);
        updatedStoredCrossChainActions(dispatchId, updatedCrossChainActions);
      }

      setCrossChainActions([]);

      setProcessingCrossChainActionIds((current) => current && processingIdToRemove
        ? current.filter((id) => id !== processingIdToRemove)
        : null
      );

      if (!processingIdToRemove) {
        setDispatchId(null);
      }

      if (!errorMessage) return;
      showAlertModal(errorMessage);
    },
    [dispatchId, crossChainActions],
  );

  const processDispatchedCrossChainActions = useCallback(async () => {
    if (!crossChainActions?.length || !dispatchId) return;

    let updateExpired = false;

    const unsentCrossChainActions = filterCrossChainActionsByStatus(
      crossChainActions,
      CROSS_CHAIN_ACTION_STATUS.UNSENT,
    );

    console.log({ unsentCrossChainActions, processingCrossChainActionIds })

    if (!unsentCrossChainActions?.length) return;

    let updatedCrossChainActions = [...crossChainActions];

    await Promise.all(unsentCrossChainActions.map(async (unsentCrossChainAction) => {
      if (updateExpired) return;

      let unsentCrossChainActionTransactions: ICrossChainActionTransaction[] = [];

      if (unsentCrossChainAction.batchTransactions?.length) {
        unsentCrossChainAction.batchTransactions.map(
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
          unsentCrossChainAction.transactions,
          CROSS_CHAIN_ACTION_STATUS.UNSENT,
        );
      }

      const pendingCrossChainActionTransactions = getCrossChainActionTransactionsByStatus(
        unsentCrossChainAction.transactions,
        CROSS_CHAIN_ACTION_STATUS.PENDING,
      );

      console.log({ pendingCrossChainActionTransactions })

      // if web3 pending  wait before pending completes
      const hasUnsentAndPendingWeb3ProviderTransactions = unsentCrossChainAction.useWeb3Provider
        && !!pendingCrossChainActionTransactions?.length;

      if (hasUnsentAndPendingWeb3ProviderTransactions
        || !unsentCrossChainActionTransactions?.length
        || processingCrossChainActionIds?.length) return;

      const targetChainId = unsentCrossChainAction.chainId;
      if (!targetChainId) {
        resetCrossChainActions('Unable to find target chain ID!', unsentCrossChainAction.id);
        return;
      }

      const sdkForChain = getSdkForChainId(targetChainId);
      if (!sdkForChain) return;

      setProcessingCrossChainActionIds((currentIds) => [
        ...currentIds ?? [],
        unsentCrossChainAction.id,
      ]);

      const transactionsToSend = unsentCrossChainActionTransactions.map(({
        to,
        value,
        data
      }) => ({
        to,
        value,
        data,
      }));

      const result: {
        transactionHash?: string;
        errorMessage?: string;
        batchHash?: string;
      } = unsentCrossChainAction.useWeb3Provider
        ? await submitWeb3ProviderTransaction(
          web3Provider,
          transactionsToSend[0],
          unsentCrossChainAction.chainId,
          providerAddress,
        )
        : await submitEtherspotTransactionsBatch(
          getSdkForChainId(unsentCrossChainAction.chainId) as Sdk,
          transactionsToSend,
          unsentCrossChainAction.gasTokenAddress ?? undefined,
        );

      if (result?.errorMessage || (!result?.transactionHash?.length && !result?.batchHash?.length)) {
        updatedCrossChainActions = updatedCrossChainActions.map((crossChainAction) => {
          if (crossChainAction.id !== unsentCrossChainAction.id
            || unsentCrossChainAction.multiCallData?.id !== crossChainAction.multiCallData?.id) {
            return crossChainAction;
          }

          return updateCrossChainActionTransactionsStatus(
            unsentCrossChainAction,
            CROSS_CHAIN_ACTION_STATUS.REJECTED_BY_USER,
          );
        });
        setCrossChainActions(updatedCrossChainActions);
        return;
      }

      const { transactionHash, batchHash } = result;

      updatedCrossChainActions = updatedCrossChainActions.map((crossChainAction) => {
        if (crossChainAction.id !== unsentCrossChainAction.id
          || unsentCrossChainAction.multiCallData?.id !== crossChainAction.multiCallData?.id) {
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
    }));

    return () => {
      updateExpired = true;
    }
  }, [
    crossChainActions,
    getSdkForChainId,
    processingCrossChainActionIds,
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
            console.log({ firstPending })

            let { status, transactionHash } = firstPending;

            if (batchHash) {
              try {
                const submittedBatch = await sdkForChain.getGatewaySubmittedBatch({ hash: batchHash });
                transactionHash = submittedBatch?.transaction?.hash;
                if (!submittedBatch) status = CROSS_CHAIN_ACTION_STATUS.FAILED;
              } catch (e) {
                //
              }
            }

            if (transactionHash) {
              try {
                const submittedTransaction = await sdkForChain.getTransaction({
                  hash: transactionHash,
                });
                console.log({ submittedTransaction })
                if (submittedTransaction?.status === TransactionStatuses.Completed) {
                  status = CROSS_CHAIN_ACTION_STATUS.CONFIRMED;
                } else if (submittedTransaction?.status === TransactionStatuses.Reverted) {
                  status = CROSS_CHAIN_ACTION_STATUS.FAILED;
                }
              } catch (e) {
                console.log('errr!!!!', { e })
                //
              }
            }

            const updatedTransactions = transactions.map((transaction) => {
              if (transactionHash !== transaction.transactionHash) return transaction;

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

        if (id === dispatchId) setCrossChainActions(updatedStoredGroupedCrossChainActions[id])
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

    // set oldest pending
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

    const restoreProcessingTimeout = setTimeout(() => {
      restoreProcessing();
    }, 3000);

    return () => {
      if (!restoreProcessingTimeout) return;
      clearTimeout(restoreProcessingTimeout);
    }
  }, [getSdkForChainId, web3Provider, providerAddress, accountAddress]);

  useEffect(() => {
    let sdkSubscriptions: Subscription[] = [];

    const validPendingCrossChainActionsWithBatches = crossChainActions.filter(
      (crossChainAction) =>
        crossChainAction.chainId &&
        crossChainAction.batchHash &&
        getCrossChainActionTransactionsByStatus(
          crossChainAction.transactions,
          CROSS_CHAIN_ACTION_STATUS.PENDING,
        ).length,
    );

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

        sdkSubscriptions.push(subscription);
      } catch (e) {
        //
      }
    });

    return () => {
      sdkSubscriptions.forEach((subscription) => {
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
    let updateExpired = false;

    const validPendingWeb3CrossChainActions = crossChainActions.filter(
      (crossChainAction) => crossChainAction.useWeb3Provider
        && getCrossChainActionTransactionsByStatus(
          crossChainAction.transactions,
          CROSS_CHAIN_ACTION_STATUS.PENDING,
        ).length,
    );

    const checkWeb3TransactionStatuses = () => {
      validPendingWeb3CrossChainActions.map(async (crossChainAction) => {
        const sdkForChain = getSdkForChainId(crossChainAction.chainId);
        if (!sdkForChain) return;

        await Promise.all(crossChainAction.transactions.map(async (transaction) => {
          if (!transaction?.transactionHash || updateExpired) return;

          try {
            const submittedTransaction = await sdkForChain.getTransaction({
              hash: transaction.transactionHash,
            });

            let status: string | undefined;

            if (submittedTransaction?.status === TransactionStatuses.Completed) {
              status = CROSS_CHAIN_ACTION_STATUS.CONFIRMED;
            } else if (submittedTransaction?.status === TransactionStatuses.Reverted) {
              status = CROSS_CHAIN_ACTION_STATUS.FAILED;
            }

            if (!status) return;

            setCrossChainActions((current) => current.map((currentCrossChainAction) => {
              if (crossChainAction.id !== currentCrossChainAction.id) return currentCrossChainAction;
              return {
                ...currentCrossChainAction,
                transactions: currentCrossChainAction.transactions.map((currentTransaction) => {
                  if (currentTransaction.transactionHash !== transaction.transactionHash) {
                    return currentTransaction;
                  }
                  return { ...currentTransaction, status, finishTimestamp: +new Date() };
                }),
              };
            }));
          } catch (e) {
            //
          }
        }))
      });
    }

    if (!validPendingWeb3CrossChainActions.length) return;

    checkWeb3TransactionStatuses();

    const timeout = setTimeout(() => { checkWeb3TransactionStatuses(); }, 3000);

    return () => {
      updateExpired = true;
      if (!timeout) return;
      clearTimeout(timeout);
    };
  }, [crossChainActions, getSdkForChainId, web3Provider]);

  useEffect(() => {
    restoreProcessing();
  }, [restoreProcessing]);

  const contextData = useMemo(
    () => ({
      dispatchedCrossChainActions: crossChainActions,
      dispatchCrossChainActions,
      processingCrossChainActionIds,
      resetDispatchedCrossChainActions: resetCrossChainActions,
    }),
    [crossChainActions, dispatchCrossChainActions, processingCrossChainActionIds],
  );

  return (
    <TransactionsDispatcherContext.Provider value={{ data: contextData }}>
      {children}
    </TransactionsDispatcherContext.Provider>
  );
};

export default TransactionsDispatcherContextProvider;

import React, {
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import styled from 'styled-components';

import {
  PrimaryButton,
  SecondaryButton,
  CloseButton,
} from '../components/Button';
import {
  useEtherspot,
  useTransactionBuilderModal,
  useTransactionsDispatcher,
} from '../hooks';
import { AssetBridgeTransactionBlock } from '../components/TransactionBlock';
import {
  ErrorMessages,
  validateTransactionBlockValues,
} from '../utils/validation';
import {
  buildDraftTransaction,
  DraftTransaction,
} from '../utils/transaction';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { TransactionBuilderContext } from '../contexts';
import { AssetBridgeTransactionBlockValues } from '../components/TransactionBlock/AssetBridgeTransactionBlock';
import { TransactionPreview } from '../components/TransactionPreview';

export type TransactionBlockValues = AssetBridgeTransactionBlockValues;

export interface TransactionBlock {
  title?: string;
  type?: string;
  values?: TransactionBlockValues;
  errorMessages?: ErrorMessages;
  disabled?: boolean;
}

export interface TransactionBuilderContextProps {
  defaultTransactionBlocks?: TransactionBlock[];
}

const TransactionBlockWrapper = styled.div<{ last?: boolean }>`
  background: #fff;
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 15px;
  color: #000;
  position: relative;
  box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
  text-align: left;

  ${CloseButton} { display: none; }

  &:hover { ${CloseButton} { display: block; } }
`;

const TransactionBlockSelectWrapper = styled.div`
  background: #fff;
  border-radius: 15px;
  padding: 25px;
  position: relative;
  box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
`;

const TransactionBlockListItemWrapper = styled.div<{ disabled?: boolean }>`
  color: ${({ disabled }) => disabled ? '#ddd' : '#000'};
  text-align: left;
  margin-bottom: 15px;
  cursor: pointer;

  &:last-child {
    margin-bottom: 0;
  }

  ${({ disabled }) => !disabled && `
    &:hover {
      text-decoration: underline;
    }
  `}
`;

const PreviewWrapper = styled.div`
  background: #fff;
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 15px;
  color: #000;
  position: relative;
  box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
  text-align: left;
`;

const availableTransactionBlocks: TransactionBlock[] = [
  {
    title: 'Asset bridge',
    type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION,
  },
  {
    title: 'LiFi staking (not yet available)',
    disabled: true,
  },
  {
    title: 'Uniswap LP (not yet available)',
    disabled: true,
  },
  {
    title: 'Sushiswap LP (not yet available)',
    disabled: true,
  },
  {
    title: 'Quickswap LP (not yet available)',
    disabled: true,
  }
];

const TransactionBuilderContextProvider = ({
  defaultTransactionBlocks,
}: TransactionBuilderContextProps) => {
  const context = useContext(TransactionBuilderContext);

  if (context.initialized) {
    throw new Error('<EtherspotContextProvider /> has already been declared.')
  }

  const initialized = useMemo(() => true, []);

  const [transactionBlocks, setTransactionBlocks] = useState<TransactionBlock[]>(defaultTransactionBlocks ?? []);
  const [transactionBlockValidationErrors, setTransactionBlockValidationErrors] = useState<{ [id: number]: ErrorMessages }>({});
  const [showTransactionBlockSelect, setShowTransactionBlockSelect] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [draftTransactions, setDraftTransactions] = useState<DraftTransaction[] | null>(null);

  const { account, connect, isConnecting, sdk } = useEtherspot();
  const { showConfirmModal, showAlertModal } = useTransactionBuilderModal();
  const { dispatchTransactions } = useTransactionsDispatcher();

  const onContinueClick = useCallback(async () => {
    if (!sdk) {
      showAlertModal('Failed to retrieve Etherspot SDK!');
      return;
    }

    if (isChecking || isConnecting) return;
    setIsChecking(true);

    if (!account) {
      await connect();
    }

    let validationErrors = {};
    transactionBlocks.forEach((transactionBlock, transactionBlockId) => {
      const transactionBlockErrors = validateTransactionBlockValues(transactionBlock);
      if (!transactionBlockErrors || Object.keys(transactionBlockErrors).length === 0) return;
      validationErrors = { ...validationErrors, [transactionBlockId]: transactionBlockErrors };
    });

    setTransactionBlockValidationErrors(validationErrors);

    let newDraftTransactions: DraftTransaction[] = [];
    let errorMessage;
    if (Object.keys(validationErrors).length === 0) {
      // keep blocks in order
      for (const transactionBlock of transactionBlocks) {
        const transaction = await buildDraftTransaction(sdk, transactionBlock);
        if (!transaction?.draftTransaction || transaction?.errorMessage) {
          errorMessage = transaction?.errorMessage ?? `Failed to build ${transactionBlock?.title ?? 'a'} transaction!`;
          break;
        }
        newDraftTransactions = [...newDraftTransactions, transaction.draftTransaction];
      }
    }

    setIsChecking(false);

    if (errorMessage) {
      showAlertModal(errorMessage);
      return;
    }

    setDraftTransactions(newDraftTransactions);
  }, [transactionBlocks, isChecking, sdk, connect, account, isConnecting]);

    const onSubmitClick = useCallback(async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      const transactionsToDispatch = draftTransactions?.filter(({ transactions }) => !!transactions?.length)

      if (!transactionsToDispatch?.length) {
        setIsSubmitting(false);
        showAlertModal('Unable to dispatch transactions.');
        return;
      }

      setDraftTransactions([]);
      dispatchTransactions(transactionsToDispatch);
      setIsSubmitting(false);
    }, [dispatchTransactions, draftTransactions, showAlertModal, isSubmitting]);

    const setTransactionBlockValues = useCallback((transactionBlockId: number, values: TransactionBlockValues) => {
    setTransactionBlocks((current) => {
      const updated = [...current];
      updated[transactionBlockId] = { ...updated[transactionBlockId], values };
      return updated;
    });
  }, []);

  const resetTransactionBlockFieldValidationError = (transactionBlockId: number, field: string) => {
    setTransactionBlockValidationErrors((current) => ({
      ...current,
      [transactionBlockId]: { ...current?.[transactionBlockId], [field]: '' },
    }));
  }

  const contextData = useMemo(
    () => ({
      setTransactionBlockValues,
      resetTransactionBlockFieldValidationError,
    }),
    [
      setTransactionBlockValues,
      resetTransactionBlockFieldValidationError,
    ],
  );

  return (
    <TransactionBuilderContext.Provider value={{ initialized, data: contextData }}>
      {!draftTransactions?.length && (
        <>
          {transactionBlocks.map((transactionBlock, transactionBlockId) => (
            <TransactionBlockWrapper
              key={`transaction-block-${transactionBlockId}`}
              last={transactionBlocks.length === transactionBlockId + 1}
            >
              <CloseButton
                onClick={() => showConfirmModal(
                  'Are you sure you want to remove selected transaction?',
                  () => {
                    setTransactionBlocks((current) => {
                      const updated = [...current];
                      updated.splice(transactionBlockId, 1);
                      return updated;
                    });
                  },
                )}
              />
              {transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION && (
                <AssetBridgeTransactionBlock
                  key={`block-${transactionBlockId}`}
                  id={transactionBlockId}
                  errorMessages={transactionBlockValidationErrors[transactionBlockId]}
                />
              )}
            </TransactionBlockWrapper>
          ))}
          {!showTransactionBlockSelect && (
            <SecondaryButton onClick={() => setShowTransactionBlockSelect(true)}>
              Add transaction
            </SecondaryButton>
          )}
          {!showTransactionBlockSelect && transactionBlocks.length > 0 && (
            <>
              <br/>
              <PrimaryButton marginTop={30} onClick={onContinueClick} disabled={isChecking}>
                {isChecking ? 'Checking...' : 'Continue'}
              </PrimaryButton>
            </>
          )}
          {showTransactionBlockSelect && (
            <TransactionBlockSelectWrapper>
              <CloseButton onClick={() => setShowTransactionBlockSelect(false)} />
              {availableTransactionBlocks.map((availableTransactionBlock) => (
                <TransactionBlockListItemWrapper
                  key={availableTransactionBlock.title}
                  onClick={() => {
                    if (availableTransactionBlock.disabled || !availableTransactionBlock.type) return;
                    setTransactionBlocks((current) => current.concat(availableTransactionBlock));
                    setShowTransactionBlockSelect(false);
                  }}
                  disabled={availableTransactionBlock.disabled}
                >
                  &bull; {availableTransactionBlock.title}
                </TransactionBlockListItemWrapper>
              ))}
            </TransactionBlockSelectWrapper>
          )}
        </>
      )}
      {!!draftTransactions?.length && (
        <>
          <PreviewWrapper>
            {draftTransactions.map((draftTransaction) => (
              <TransactionPreview
                data={draftTransaction.preview}
                type={draftTransaction.type}
              />
            ))}
          </PreviewWrapper>
          <PrimaryButton marginTop={30} onClick={onSubmitClick} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </PrimaryButton>
          <br/>
          <SecondaryButton
            marginTop={10}
            onClick={() => setDraftTransactions([])}
          >
            Go back
          </SecondaryButton>
        </>
      )}
    </TransactionBuilderContext.Provider>
  );
};

export default TransactionBuilderContextProvider;

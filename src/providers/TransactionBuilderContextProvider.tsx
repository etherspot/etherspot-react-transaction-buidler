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
} from '../hooks';
import { AssetBridgeTransactionBlock } from '../components/TransactionBlock';
import {
  ErrorMessages,
  validateTransactionBlockValues,
} from '../utils/validation';
import { buildTransactionsDraft } from '../utils/transaction';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { TransactionBuilderContext } from '../contexts';
import { AssetBridgeTransactionBlockValues } from '../components/TransactionBlock/AssetBridgeTransactionBlock';

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

const ConnectWalletWrapper = styled.div`
  margin: 25px 0;
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [batchTransactions, setBatchTransactions] = useState<TransactionBlock[] | null>(null);

  const { account, connect, isConnecting, sdk } = useEtherspot();
  const { showConfirmModal, showAlertModal } = useTransactionBuilderModal();

  const onContinueClick = useCallback(async () => {
    if (!sdk) {
      showAlertModal('Failed to retrieve Etherspot SDK!');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    let validationErrors = {};
    transactionBlocks.forEach((transactionBlock, transactionBlockId) => {
      const transactionBlockErrors = validateTransactionBlockValues(transactionBlock);
      if (!transactionBlockErrors || Object.keys(transactionBlockErrors).length === 0) return;
      validationErrors = { ...validationErrors, [transactionBlockId]: transactionBlockErrors };
    });

    setTransactionBlockValidationErrors(validationErrors);

    let transactions: TransactionBlock[] = [];
    let errorMessage;
    if (Object.keys(validationErrors).length === 0) {
      // keep in order
      for (const transactionBlock of transactionBlocks) {
        const transaction = await buildTransactionsDraft(sdk, transactionBlock);
        if (!transaction || transaction?.errorMessage) {
          errorMessage = transaction?.errorMessage ?? `Failed to build ${transactionBlock?.title ?? 'a'} transaction!`;
          break;
        }
        transactions = [...transactions, transactionBlock];
      }
    }

    setIsSubmitting(false);

    if (errorMessage) {
      showAlertModal(errorMessage);
      return;
    }

    setBatchTransactions(batchTransactions);
  }, [transactionBlocks, isSubmitting, sdk]);

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
      {!account && (
        <ConnectWalletWrapper>
          <PrimaryButton onClick={isConnecting ? () => null : connect} disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </PrimaryButton>
        </ConnectWalletWrapper>
      )}
      {!!account && (
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
              <PrimaryButton marginTop={30} onClick={onContinueClick} disabled={isSubmitting}>
                {isSubmitting ? 'Checking...' : 'Continue'}
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
    </TransactionBuilderContext.Provider>
  );
};

export default TransactionBuilderContextProvider;

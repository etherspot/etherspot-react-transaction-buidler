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
import {
  buildDraftTransaction,
  DraftTransaction,
} from '../utils/transaction';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { TransactionBuilderContext } from '../contexts';
import { AssetBridgeTransactionBlockValues } from '../components/TransactionBlock/AssetBridgeTransactionBlock';
import { Modal } from '../components';
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

const ConnectWalletWrapper = styled.div`
  margin: 25px 0;
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

  const onContinueClick = useCallback(async () => {
    if (!sdk) {
      showAlertModal('Failed to retrieve Etherspot SDK!');
      return;
    }

    if (isChecking) return;
    setIsChecking(true);

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
  }, [transactionBlocks, isChecking, sdk]);

    const onSubmitClick = useCallback(async () => {

    }, []);

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

  // {
  //   "type": "ASSET_BRIDGE_TRANSACTION",
  //   "preview": {
    //   "fromChainId": 1,
    //     "toChainId": 137,
    //     "fromAsset": {
    //     "address": "0x0000000000000000000000000000000000000000",
    //       "decimals": 18,
    //       "symbol": "ETH",
    //       "amount": "1000000000000000000"
    //   },
    //   "toAsset": {
    //     "address": "0x0000000000000000000000000000000000000000",
    //       "decimals": 18,
    //       "symbol": "MATIC",
    //       "amount": "1690800738100519348609"
  //    }
  // },
  //   "transactions": [
  //   {
  //     "to": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
  //     "value": "0x0de0b6b3a7640000",
  //     "data": "0x2722a4a800000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000078021010b318f20c78fb152708377ae5f5daaf27d7d5f1c373180e1a57c2c818d800000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb73a93c58974c82dd52dcb338c514ba32c286bb00000000000000000000000000000000000000000000000000000000000000890000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000def171fe48cf0115b1d80b88dc8eab59176fee57000000000000000000000000216b4b4ba9f3e719726886d34a177484278bfcae00000000000000000000000000000000000000000000000000000000000000000000000000000000000000007d1afa7b718fb893db30a3abc0cfc608aacfebb00000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000004c454e3f31b0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000007d1afa7b718fb893db30a3abc0cfc608aacfebb00000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000005bd9219c38bb8885be00000000000000000000000000000000000000000000005eb0576ee8ac384a8a00000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000003a00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000362fa9d0bca5d19f743db50738345ce2b40ec99f0000000000000000000000000000000000000000000000000000006c692e6669010000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000004800000000000000000000000000000000000000000000000000000000062d853196e75b68d0297446585f048f6dd14541c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000e592427a0aece92de3edee1f18e0157c058615640000000000000000000000000000000000000000000000000000000000000128d0e30db0c04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000def171fe48cf0115b1d80b88dc8eab59176fee570000000000000000000000000000000000000000000000000000000062d80cc90000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb87d1afa7b718fb893db30a3abc0cfc608aacfebb0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000012800000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000bb73a93c58974c82dd52dcb338c514ba32c286bb000000000000000000000000000000000000000000000000000000000000008900000000000000000000000000000000000000000000005bd9219c38bb8885be0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000058e8a2fbaa1c3db6570000000000000000000000000000000000000000000000000000000062d95039000000000000000000000000000000000000000000000058e8a2fbaa1c3db6570000000000000000000000000000000000000000000000000000000062d9503900000000000000000000000000000000000000000000000000000000000000054d41544943000000000000000000000000000000000000000000000000000000"
  //   }
  // ]
  // }

  return (
    <TransactionBuilderContext.Provider value={{ initialized, data: contextData }}>
      {!account && (
        <ConnectWalletWrapper>
          <PrimaryButton onClick={isConnecting ? () => null : connect} disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </PrimaryButton>
        </ConnectWalletWrapper>
      )}
      {!!account && !draftTransactions?.length && (
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
      {!!account &&!!draftTransactions?.length && (
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

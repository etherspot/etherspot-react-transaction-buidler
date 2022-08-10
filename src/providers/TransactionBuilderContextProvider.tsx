import React, {
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import styled from 'styled-components';
import { HiDotsHorizontal } from 'react-icons/hi';

import {
  PrimaryButton,
  SecondaryButton,
  CloseButton,
  CopyButton,
} from '../components/Button';
import {
  useEtherspot,
  useTransactionBuilderModal,
  useTransactionsDispatcher,
} from '../hooks';
import {
  AssetBridgeTransactionBlock,
  SendAssetTransactionBlock,
} from '../components/TransactionBlock';
import {
  ErrorMessages,
  validateTransactionBlockValues,
} from '../utils/validation';
import {
  buildCrossChainAction,
  CrossChainAction,
} from '../utils/transaction';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { TransactionBuilderContext } from '../contexts';
import { AssetBridgeTransactionBlockValues } from '../components/TransactionBlock/AssetBridgeTransactionBlock';
import { SendAssetTransactionBlockValues } from '../components/TransactionBlock/SendAssetTransactionBlock';
import { ActionPreview } from '../components/TransactionPreview';
import { humanizeHexString } from '../utils/common';
import History from '../components/History';

export type TransactionBlockValues = AssetBridgeTransactionBlockValues | SendAssetTransactionBlockValues;

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

const TopNavigation = styled.div`
  padding: 0px 5px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  color: #fff;
  font-size: 14px;
`;

const WalletAddressesWrapper = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const WalletAddress = styled.span`
  margin-right: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const MenuButton = styled(HiDotsHorizontal)`
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
`;

const MenuWrapper = styled.div`
  position: absolute;
  top: 40px;
  right: 15px;
  background: #fff;
  border-radius: 5px;
  padding: 15px 20px;
  font-size: 14px;
  text-align: left;
  box-shadow: rgb(0 0 0 / 24%) 0px 3px 8px;
`;

const MenuItem = styled.div`
  margin-bottom: 10px;
  cursor: pointer;

  a, a:visited {
    color: #000;
    text-decoration: none;
  }

  &:hover {
    text-decoration: underline;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const availableTransactionBlocks: TransactionBlock[] = [
  {
    title: 'Asset bridge',
    type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION,
  },
  {
    title: 'Send asset',
    type: TRANSACTION_BLOCK_TYPE.SEND_ASSET_TRANSACTION,
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
  const [draftTransactions, setDraftTransactions] = useState<CrossChainAction[] | null>(null);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const { accountAddress, connect, isConnecting, sdk, providerAddress } = useEtherspot();
  const { showConfirmModal, showAlertModal } = useTransactionBuilderModal();
  const { dispatchCrossChainActions, processingDispatched } = useTransactionsDispatcher();

  const onContinueClick = useCallback(async () => {
    if (!sdk) {
      showAlertModal('Failed to retrieve Etherspot SDK!');
      return;
    }

    if (isChecking || isConnecting) return;
    setIsChecking(true);

    if (!accountAddress) {
      await connect();
    }

    let validationErrors = {};
    transactionBlocks.forEach((transactionBlock, transactionBlockId) => {
      const transactionBlockErrors = validateTransactionBlockValues(transactionBlock);
      if (!transactionBlockErrors || Object.keys(transactionBlockErrors).length === 0) return;
      validationErrors = { ...validationErrors, [transactionBlockId]: transactionBlockErrors };
    });

    setTransactionBlockValidationErrors(validationErrors);

    let newDraftTransactions: CrossChainAction[] = [];
    let errorMessage;
    if (Object.keys(validationErrors).length === 0) {
      // keep blocks in order
      for (const transactionBlock of transactionBlocks) {
        const transaction = await buildCrossChainAction(sdk, transactionBlock);
        if (!transaction?.crossChainAction || transaction?.errorMessage) {
          errorMessage = transaction?.errorMessage ?? `Failed to build ${transactionBlock?.title ?? 'a'} transaction!`;
          break;
        }
        newDraftTransactions = [...newDraftTransactions, transaction.crossChainAction];
      }
    }

    setIsChecking(false);

    if (errorMessage) {
      showAlertModal(errorMessage);
      return;
    }

    setDraftTransactions(newDraftTransactions);
  }, [transactionBlocks, isChecking, sdk, connect, accountAddress, isConnecting]);

    const onSubmitClick = useCallback(async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);


      if (!draftTransactions) {
        setIsSubmitting(false);
        showAlertModal('Unable to dispatch transactions.');
        return;
      }

      const transactionsToDispatch = draftTransactions.filter(({ transactions }) => !!transactions?.length)
      if (!transactionsToDispatch?.length) {
        setIsSubmitting(false);
        showAlertModal('Unable to dispatch transactions.');
        return;
      }

      setDraftTransactions([]);
      setTransactionBlocks([]);
      dispatchCrossChainActions(transactionsToDispatch);
      setIsSubmitting(false);
    }, [dispatchCrossChainActions, draftTransactions, showAlertModal, isSubmitting]);

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

  const hideMenu = () => setShowMenu(false);

  const hasTransactionBlockAdded = transactionBlocks.some((transactionBlock) => transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION);

  return (
    <TransactionBuilderContext.Provider value={{ initialized, data: contextData }}>
      <TopNavigation>
        <WalletAddressesWrapper onClick={hideMenu}>
          {providerAddress && (
            <WalletAddress>
              Wallet: {humanizeHexString(providerAddress)}
              <CopyButton valueToCopy={providerAddress} marginLeft={5} />
            </WalletAddress>
          )}
          {!providerAddress && <WalletAddress>Wallet: Not connected</WalletAddress>}
          {accountAddress && (
            <WalletAddress>
              Account: {humanizeHexString(accountAddress)}
              <CopyButton valueToCopy={accountAddress} marginLeft={5} />
            </WalletAddress>
          )}
          {!accountAddress && <WalletAddress>Account: <SecondaryButton onClick={connect} disabled={isConnecting} noPadding>Connect</SecondaryButton></WalletAddress>}
        </WalletAddressesWrapper>
        <MenuButton size={20} onClick={() => setShowMenu(!showMenu)} />
      </TopNavigation>
      <div onClick={hideMenu}>
        {processingDispatched && (
          <PrimaryButton disabled marginTop={30} marginBottom={30}>
            Processing transactions...
          </PrimaryButton>
        )}
        {!draftTransactions?.length && !processingDispatched && (
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
                {transactionBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET_TRANSACTION && (
                  <SendAssetTransactionBlock
                    key={`block-${transactionBlockId}`}
                    id={transactionBlockId}
                    errorMessages={transactionBlockValidationErrors[transactionBlockId]}
                  />
                )}
              </TransactionBlockWrapper>
            ))}
            {!showTransactionBlockSelect && (
              <SecondaryButton onClick={() => setShowTransactionBlockSelect(true)} marginTop={transactionBlocks?.length ? 0 : 30}>
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
                {availableTransactionBlocks.map((availableTransactionBlock) => {
                  const isBridgeTransactionBlock = availableTransactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION;
                  const isBridgeTransactionBlockAndDisabled = isBridgeTransactionBlock && hasTransactionBlockAdded;
                  const isDisabled = !!availableTransactionBlock.disabled || isBridgeTransactionBlockAndDisabled;
                  const availableTransactionBlockTitle = isBridgeTransactionBlockAndDisabled
                    ? `${availableTransactionBlock.title} (Max. 1 bridge per batch)`
                    : availableTransactionBlock.title
                  return (
                    <TransactionBlockListItemWrapper
                      key={availableTransactionBlock.title}
                      onClick={() => {
                        if (availableTransactionBlock.disabled || !availableTransactionBlock.type) return;
                        setTransactionBlocks((current) => current.concat(availableTransactionBlock));
                        setShowTransactionBlockSelect(false);
                      }}
                      disabled={isDisabled}
                    >
                      &bull; {availableTransactionBlockTitle}
                    </TransactionBlockListItemWrapper>
                  )
                })}
              </TransactionBlockSelectWrapper>
            )}
          </>
        )}
        {!!draftTransactions?.length && !processingDispatched && (
          <>
            <PreviewWrapper>
              {draftTransactions.map((draftTransaction) => (
                <ActionPreview
                  key={`preview-${draftTransaction.id}`}
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
      </div>
      {showMenu && (
        <MenuWrapper>
          <MenuItem><a href="https://dashboard.etherspot.io" title="Dashboard" target="_blank">Dashboard</a></MenuItem>
          <MenuItem
            onClick={() => {
              hideMenu();
              showAlertModal(<History />);
            }}
          >
            History
          </MenuItem>
          <MenuItem><a href="https://etherspot.io/" title="About Etherspot" target="_blank">About Etherspot</a></MenuItem>
        </MenuWrapper>
      )}
    </TransactionBuilderContext.Provider>
  );
};

export default TransactionBuilderContextProvider;

import React, {
  useCallback,
  useContext,
  useEffect,
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
import TransactionBlock from '../components/TransactionBlock';
import {
  ErrorMessages,
  validateTransactionBlockValues,
} from '../utils/validation';
import {
  buildCrossChainAction,
  CrossChainAction,
  estimateCrossChainAction,
} from '../utils/transaction';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { TransactionBuilderContext } from '../contexts';
import { AssetBridgeTransactionBlockValues } from '../components/TransactionBlock/AssetBridgeTransactionBlock';
import { SendAssetTransactionBlockValues } from '../components/TransactionBlock/SendAssetTransactionBlock';
import { SwapAssetTransactionBlockValues } from '../components/TransactionBlock/AssetSwapTransactionBlock';
import { ActionPreview } from '../components/TransactionPreview';
import {
  getTimeBasedUniqueId,
  humanizeHexString,
} from '../utils/common';
import History from '../components/History';

export type TransactionBlockValues = SendAssetTransactionBlockValues
  & AssetBridgeTransactionBlockValues
  & SwapAssetTransactionBlockValues;

export interface AddedTransactionBlock {
  id: string;
  type: string;
  values?: TransactionBlockValues;
  errorMessages?: ErrorMessages;
}

export interface AvailableTransactionBlock {
  title?: string;
  type: string;
}

export interface TransactionBuilderContextProps {
  defaultTransactionBlocks?: AvailableTransactionBlock[];
  hiddenTransactionBlockTypes?: string[];
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

const ProcessingTitle = styled.h3`
  margin: 0 0 25px;
  padding: 0 0 5px;
  border-bottom: 1px solid #000;
`;

const availableTransactionBlocks: AvailableTransactionBlock[] = [
  {
    title: 'Asset bridge',
    type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE,
  },
  {
    title: 'Send asset',
    type: TRANSACTION_BLOCK_TYPE.SEND_ASSET,
  },
  {
    title: 'Swap asset',
    type: TRANSACTION_BLOCK_TYPE.ASSET_SWAP,
  },
  {
    title: 'LiFi staking (not yet available)',
    type: TRANSACTION_BLOCK_TYPE.DISABLED,
  },
  {
    title: 'Uniswap LP (not yet available)',
    type: TRANSACTION_BLOCK_TYPE.DISABLED,
  },
  {
    title: 'Sushiswap LP (not yet available)',
    type: TRANSACTION_BLOCK_TYPE.DISABLED,
  },
  {
    title: 'Quickswap LP (not yet available)',
    type: TRANSACTION_BLOCK_TYPE.DISABLED,
  }
];

const TransactionBuilderContextProvider = ({
  defaultTransactionBlocks,
  hiddenTransactionBlockTypes,
}: TransactionBuilderContextProps) => {
  const context = useContext(TransactionBuilderContext);

  if (context !== null) {
    throw new Error('<EtherspotContextProvider /> has already been declared.')
  }

  const [transactionBlocks, setTransactionBlocks] = useState<AddedTransactionBlock[]>(
    defaultTransactionBlocks?.map((defaultTransactionBlock) => ({ ...defaultTransactionBlock, id: getTimeBasedUniqueId() })) ?? []
  );

  const [transactionBlockValidationErrors, setTransactionBlockValidationErrors] = useState<{ [id: string]: ErrorMessages }>({});
  const [showTransactionBlockSelect, setShowTransactionBlockSelect] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [crossChainActions, setCrossChainActions] = useState<CrossChainAction[] | null>(null);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const { accountAddress, connect, isConnecting, sdk, providerAddress, getSdkForChainId } = useEtherspot();
  const { showConfirmModal, showAlertModal } = useTransactionBuilderModal();
  const { dispatchCrossChainActions, processingCrossChainActionId, dispatchedCrossChainActions } = useTransactionsDispatcher();

  const isEstimatingCrossChainActions = useMemo(
    () => crossChainActions?.some((crossChainAction) => crossChainAction.isEstimating) ?? false,
    [crossChainActions],
  );

  console.log({ isEstimatingCrossChainActions, isSubmitting })

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
    transactionBlocks.forEach((transactionBlock) => {
      const transactionBlockErrors = validateTransactionBlockValues(transactionBlock);
      if (!transactionBlockErrors || Object.keys(transactionBlockErrors).length === 0) return;
      validationErrors = { ...validationErrors, [transactionBlock.id]: transactionBlockErrors };
    });

    setTransactionBlockValidationErrors(validationErrors);

    let newCrossChainActions: CrossChainAction[] = [];
    let errorMessage;

    if (Object.keys(validationErrors).length === 0) {
      // keep blocks in order
      for (const transactionBlock of transactionBlocks) {
        const result = await buildCrossChainAction(sdk, transactionBlock);
        if (!result?.crossChainAction || result?.errorMessage) {
          errorMessage = result?.errorMessage ?? `Failed to build a cross chain action!`;
          break;
        }
        newCrossChainActions = [...newCrossChainActions, result.crossChainAction];
      }
    }

    setIsChecking(false);

    if (!errorMessage && !newCrossChainActions?.length) {
      errorMessage = `Failed to proceed with selected actions!`
    }

    if (errorMessage) {
      showAlertModal(errorMessage);
      return;
    }

    setCrossChainActions(newCrossChainActions);
  }, [transactionBlocks, isChecking, sdk, connect, accountAddress, isConnecting]);

  const estimateCrossChainActions = useCallback(async () => {
    const unestimatedCrossChainActions = crossChainActions?.filter((crossChainAction) => !crossChainAction.isEstimating && !crossChainAction.estimated);
    if (!unestimatedCrossChainActions?.length) return;

    unestimatedCrossChainActions.map(async (crossChainAction) => {
      setCrossChainActions((current) => current?.map((currentCrossChainAction) => {
        if (crossChainAction.id !== crossChainAction.id) return currentCrossChainAction;
        return { ...crossChainAction, isEstimating: true };
      }) || null);

      const estimated = await estimateCrossChainAction(getSdkForChainId(crossChainAction.chainId), crossChainAction);

      setCrossChainActions((current) => current?.map((currentCrossChainAction) => {
        if (crossChainAction.id !== crossChainAction.id) return currentCrossChainAction;
        return { ...crossChainAction, isEstimating: false, estimated };
      }) || null);
    });
  }, [crossChainActions, setCrossChainActions, getSdkForChainId]);

  useEffect(() => { estimateCrossChainActions(); }, [estimateCrossChainActions]);

  const onSubmitClick = useCallback(async () => {
    if (isSubmitting || isEstimatingCrossChainActions) return;
    setIsSubmitting(true);


    if (!crossChainActions) {
      setIsSubmitting(false);
      showAlertModal('Unable to dispatch cross chain actions.');
      return;
    }

    const crossChainActionsToDispatch = crossChainActions.filter(({ transactions }) => !!transactions?.length)
    if (!crossChainActionsToDispatch?.length) {
      setIsSubmitting(false);
      showAlertModal('Unable to dispatch cross chain actions.');
      return;
    }

    setCrossChainActions([]);
    setTransactionBlocks([]);
    dispatchCrossChainActions(crossChainActionsToDispatch);
    setIsSubmitting(false);
  }, [dispatchCrossChainActions, crossChainActions, showAlertModal, isSubmitting, isEstimatingCrossChainActions]);

  const setTransactionBlockValues = useCallback((transactionBlockId: string, values: TransactionBlockValues) => {
    setTransactionBlocks((current) => current.map((transactionBlock) => {
      if (transactionBlock.id !== transactionBlockId) return transactionBlock;
      return { ...transactionBlock, values };
    }));
  }, []);

  const resetTransactionBlockFieldValidationError = (transactionBlockId: string, field: string) => {
    setTransactionBlockValidationErrors((current) => ({
      ...current,
      [transactionBlockId]: { ...current?.[transactionBlockId], [field]: '' },
    }));
  }

  const resetAllTransactionBlockFieldValidationError = (transactionBlockId: string) => {
    setTransactionBlockValidationErrors((current) => ({
      ...current,
      [transactionBlockId]: {},
    }));
  }

  const contextData = useMemo(
    () => ({
      setTransactionBlockValues,
      resetTransactionBlockFieldValidationError,
      resetAllTransactionBlockFieldValidationError,
    }),
    [
      setTransactionBlockValues,
      resetTransactionBlockFieldValidationError,
      resetAllTransactionBlockFieldValidationError,
    ],
  );

  const hideMenu = () => setShowMenu(false);

  const hasTransactionBlockAdded = transactionBlocks.some((transactionBlock) => transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE);

  const crossChainActionInProcessing = useMemo(() => {
    if (!processingCrossChainActionId) return;
    return dispatchedCrossChainActions?.find((crossChainAction) => crossChainAction.id === processingCrossChainActionId);
  }, [processingCrossChainActionId, dispatchedCrossChainActions]);

  return (
    <TransactionBuilderContext.Provider value={{ data: contextData }}>
      <TopNavigation>
        <WalletAddressesWrapper onClick={hideMenu}>
          {providerAddress && (
            <WalletAddress>
              Wallet: {humanizeHexString(providerAddress)}
              <CopyButton valueToCopy={providerAddress} left={5} />
            </WalletAddress>
          )}
          {!providerAddress && <WalletAddress>Wallet: Not connected</WalletAddress>}
          {accountAddress && (
            <WalletAddress>
              Account: {humanizeHexString(accountAddress)}
              <CopyButton valueToCopy={accountAddress} left={5} />
            </WalletAddress>
          )}
          {!accountAddress && <WalletAddress>Account: <SecondaryButton onClick={connect} disabled={isConnecting} noPadding>Connect</SecondaryButton></WalletAddress>}
        </WalletAddressesWrapper>
        <MenuButton size={20} onClick={() => setShowMenu(!showMenu)} />
      </TopNavigation>
      <div onClick={hideMenu}>
        {!!processingCrossChainActionId && (
          <>
            {crossChainActionInProcessing && (
              <PreviewWrapper>
                <ProcessingTitle>
                  Action
                  &nbsp;{dispatchedCrossChainActions?.map((crossChainAction) => crossChainAction.id).indexOf(processingCrossChainActionId) + 1}
                  &nbsp;of {dispatchedCrossChainActions?.length}
                </ProcessingTitle>
                <ActionPreview
                  key={`preview-${crossChainActionInProcessing.id}`}
                  data={crossChainActionInProcessing.preview}
                  type={crossChainActionInProcessing.type}
                  chainId={crossChainActionInProcessing.chainId}
                  estimation={crossChainActionInProcessing.estimated}
                  noBottomBorder
                />
              </PreviewWrapper>
            )}
            <PrimaryButton disabled marginTop={30} marginBottom={30}>
              Processing...
            </PrimaryButton>
          </>
        )}
        {!crossChainActions?.length && !processingCrossChainActionId && (
          <>
            {transactionBlocks.map((transactionBlock, id) => (
              <TransactionBlockWrapper
                key={`transaction-block-${transactionBlock.id}`}
                last={transactionBlocks.length === id + 1}
              >
                <CloseButton
                  onClick={() => showConfirmModal(
                    'Are you sure you want to remove selected transaction?',
                    () => setTransactionBlocks((
                      current,
                    ) => current.filter((addedTransactionBlock) => addedTransactionBlock.id !== transactionBlock.id)),
                  )}
                />
                <TransactionBlock
                  key={`block-${transactionBlock.id}`}
                  id={transactionBlock.id}
                  type={transactionBlock.type}
                  errorMessages={transactionBlockValidationErrors[transactionBlock.id]}
                />
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
                {availableTransactionBlocks
                  .filter((availableTransactionBlock) => !hiddenTransactionBlockTypes?.includes(availableTransactionBlock.type))
                  .map((availableTransactionBlock) => {
                    const isBridgeTransactionBlock = availableTransactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE;
                    const isBridgeTransactionBlockAndDisabled = isBridgeTransactionBlock && hasTransactionBlockAdded;
                    const isDisabled = availableTransactionBlock.type === TRANSACTION_BLOCK_TYPE.DISABLED || isBridgeTransactionBlockAndDisabled;
                    const availableTransactionBlockTitle = isBridgeTransactionBlockAndDisabled
                      ? `${availableTransactionBlock.title} (Max. 1 bridge per batch)`
                      : availableTransactionBlock.title
                    return (
                      <TransactionBlockListItemWrapper
                        key={availableTransactionBlock.title}
                        onClick={() => {
                          if (availableTransactionBlock.type === TRANSACTION_BLOCK_TYPE.DISABLED) return;
                          const transactionBlock = {
                            ...availableTransactionBlock,
                            id: getTimeBasedUniqueId(),
                          };
                          setTransactionBlocks((current) => current.concat(transactionBlock));
                          setShowTransactionBlockSelect(false);
                        }}
                        disabled={isDisabled}
                      >
                        &bull; {availableTransactionBlockTitle}
                      </TransactionBlockListItemWrapper>
                    )
                  })
                }
              </TransactionBlockSelectWrapper>
            )}
          </>
        )}
        {!!crossChainActions?.length && !processingCrossChainActionId && (
          <>
            <PreviewWrapper>
              {crossChainActions.map((crossChainAction) => (
                <ActionPreview
                  key={`preview-${crossChainAction.id}`}
                  data={crossChainAction.preview}
                  type={crossChainAction.type}
                  isEstimating={crossChainAction.isEstimating}
                  estimation={crossChainAction.estimated}
                  chainId={crossChainAction.chainId}
                />
              ))}
            </PreviewWrapper>
            <PrimaryButton marginTop={30} onClick={onSubmitClick} disabled={isSubmitting || isEstimatingCrossChainActions}>
              {isSubmitting && !isEstimatingCrossChainActions && 'Submitting...'}
              {isEstimatingCrossChainActions && !isSubmitting && 'Estimating...'}
              {!isSubmitting && !isEstimatingCrossChainActions && 'Submit'}
            </PrimaryButton>
            <br/>
            <SecondaryButton
              marginTop={10}
              onClick={() => setCrossChainActions([])}
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

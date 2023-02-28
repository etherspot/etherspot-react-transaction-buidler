import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { HiCheck } from 'react-icons/hi';
import { AiOutlinePlusCircle } from 'react-icons/ai';
import { Sdk, sleep, TokenListToken } from 'etherspot';
import { BigNumber, utils, ethers } from 'ethers';

// Types
import {
  IAssetSwapTransactionBlock,
  IDefaultTransactionBlock,
  IMultiCallData,
  ISendAssetTransactionBlock,
  ITransactionBlock,
  ITransactionBlockType,
  ITransactionBlockValues,
} from '../types/transactionBlock';
import { ICrossChainAction, ICrossChainActionTransaction } from '../types/crossChainAction';

import { PrimaryButton, SecondaryButton } from '../components/Button';
import { useEtherspot, useTransactionBuilderModal, useTransactionsDispatcher } from '../hooks';
import TransactionBlock from '../components/TransactionBlock';
import { ErrorMessages, validateTransactionBlockValues } from '../utils/validation';
import {
  buildCrossChainAction,
  estimateCrossChainAction,
  getCrossChainStatusByHash,
  klimaDaoStaking,
  submitEtherspotTransactionsBatch,
  submitWeb3ProviderTransaction,
  submitWeb3ProviderTransactions,
  submitEtherspotAndWaitForTransactionHash,
  getFirstCrossChainActionByStatus,
} from '../utils/transaction';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { TransactionBuilderContext } from '../contexts';
import { ActionPreview } from '../components/TransactionPreview';
import { getTimeBasedUniqueId, humanizeHexString } from '../utils/common';
import { Theme } from '../utils/theme';
import { CHAIN_ID, Chain } from '../utils/chain';
import Card from '../components/Card';
import { Text } from '../components/Text';
import { CROSS_CHAIN_ACTION_STATUS } from '../constants/transactionDispatcherConstants';
import {
  SendActionIcon,
  SwapActionIcon,
  BridgeActionIcon,
  ChainIcon,
  WalletCopyIcon,
  WalletIcon,
} from '../components/TransactionBlock/Icons';
import { DestinationWalletEnum } from '../enums/wallet.enum';
import { POLYGON_USDC_CONTRACT_ADDRESS } from '../constants/assetConstants';
import WalletTransactionBlock from '../components/TransactionBlock/Wallet/WalletTransactionBlock';
import { openMtPelerinTab } from '../utils/pelerin';
import useInterval from '../hooks/useInterval';
import SettingMenu from '../components/SettingMenu/SettingMenu';

export interface TransactionBuilderContextProps {
  defaultTransactionBlocks?: IDefaultTransactionBlock[];
  hiddenTransactionBlockTypes?: ITransactionBlockType[];
  hideAddTransactionButton?: boolean;
  showMenuLogout?: boolean;
}

export interface IMulticallBlock {
  id: string;
  icon: React.ReactNode;
  title: string | ((arg: string) => string);
  type: ITransactionBlockType;
  hideFor?: ITransactionBlockType;
}

const TransactionBlockListItemWrapper = styled.div<{ disabled?: boolean }>`
  ${({ theme, disabled }) => disabled && `color: ${theme.color.text.cardDisabled}`};
  text-align: left;
  margin-bottom: 15px;
  cursor: pointer;

  &:last-child {
    margin-bottom: 0;
  }

  ${({ disabled }) =>
    !disabled &&
    `
    &:hover {
      text-decoration: underline;
    }
  `}
`;

const TopNavigation = styled.div`
  padding: 0px 5px 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  color: ${({ theme }) => theme.color.text.topBar};
  font-size: 14px;
`;

const WalletAddressesWrapper = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const WalletAddress = styled.span<{ disabled?: boolean; selected?: boolean }>`
  margin-right: 16px;
  padding: 2px 4px;
  border-radius: 6px;
  ${({ theme, selected }) =>
    !!selected &&
    `color: ${theme.color.text.searchInput};
    background-color: ${theme.color.background.topMenu};`}

  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  font-size: 14px;

  ${({ disabled }) =>
    !disabled &&
    `
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
  
    &:active {
      opacity: 0.5;
    }
  `}
`;

const CheckmarkIcon = styled(HiCheck)`
  margin-top: -3px;
`;

const ConnectButton = styled(SecondaryButton)`
  font-size: 14px;
  margin-left: 5px;
`;

const AddTransactionButton = styled(SecondaryButton)`
  text-align: center;

  span {
    position: relative;
    top: 1px;
    margin-left: 6px;
  }

  &:hover {
    opacity: 0.5;
    text-decoration: none;
  }
`;

const MultiCallButton = styled(PrimaryButton)`
  text-align: center;
  padding: 8px 0;
  font-size: 16px;
  border-radius: 6px;
  background: ${({ theme }) => theme.color.background.secondary};
  color: #fff;
`;

const TransactionBlocksWrapper = styled.div.attrs((props: { highlight: boolean }) => props)`
  ${({ theme, highlight }) =>
    !!highlight &&
    `margin: -10px; padding: 10px; border-radius: 18px; background-color: ${theme.color.background.secondary};`};
  margin-bottom: 20px;
`;

const TransactionBlocksWrapperIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 5px;
`;

const MulticallBlockListItemWrapper = styled(TransactionBlockListItemWrapper)`
  div:first-child {
    margin-right: 5px;
  }
`;

const availableTransactionBlocks: ITransactionBlock[] = [
  {
    id: getTimeBasedUniqueId(),
    title: 'Asset bridge',
    type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE,
  },
  {
    id: getTimeBasedUniqueId(),
    title: 'Send asset',
    type: TRANSACTION_BLOCK_TYPE.SEND_ASSET,
  },
  {
    id: getTimeBasedUniqueId(),
    title: 'Swap asset',
    type: TRANSACTION_BLOCK_TYPE.ASSET_SWAP,
  },
  {
    id: getTimeBasedUniqueId(),
    title: 'Klima Staking',
    type: TRANSACTION_BLOCK_TYPE.KLIMA_STAKE,
  },
  {
    id: getTimeBasedUniqueId(),
    title: 'PLR Staking',
    type: TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE,
  },
  {
    id: getTimeBasedUniqueId(),
    title: 'LI.FI staking (not yet available)',
    type: TRANSACTION_BLOCK_TYPE.DISABLED,
  },
  {
    id: getTimeBasedUniqueId(),
    title: 'Uniswap LP (not yet available)',
    type: TRANSACTION_BLOCK_TYPE.DISABLED,
  },
  {
    id: getTimeBasedUniqueId(),
    title: 'Sushiswap LP (not yet available)',
    type: TRANSACTION_BLOCK_TYPE.DISABLED,
  },
  {
    id: getTimeBasedUniqueId(),
    title: 'Quickswap LP (not yet available)',
    type: TRANSACTION_BLOCK_TYPE.DISABLED,
  },
];

const availableMulticallBlocks: IMulticallBlock[] = [
  {
    icon: SendActionIcon,
    id: getTimeBasedUniqueId(),
    title: 'Send asset',
    type: TRANSACTION_BLOCK_TYPE.SEND_ASSET,
  },
  {
    icon: SwapActionIcon,
    id: getTimeBasedUniqueId(),
    title: 'Swap asset',
    type: TRANSACTION_BLOCK_TYPE.ASSET_SWAP,
    hideFor: TRANSACTION_BLOCK_TYPE.SEND_ASSET, // hide this option so it cannot be chained with SEND_ASSET
  },
  {
    icon: BridgeActionIcon,
    id: getTimeBasedUniqueId(),
    title: 'Bridge asset',
    type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE,
    hideFor: TRANSACTION_BLOCK_TYPE.SEND_ASSET,
  },
];

const addIdToDefaultTransactionBlock = (transactionBlock: IDefaultTransactionBlock) => ({
  ...transactionBlock,
  id: getTimeBasedUniqueId(),
});

const TransactionBuilderContextProvider = ({
  defaultTransactionBlocks,
  hiddenTransactionBlockTypes,
  hideAddTransactionButton,
  showMenuLogout,
}: TransactionBuilderContextProps) => {
  const context = useContext(TransactionBuilderContext);

  if (context !== null) throw new Error('<EtherspotContextProvider /> has already been declared.');

  const mappedDefaultTransactionBlocks = defaultTransactionBlocks
    ? defaultTransactionBlocks.map(addIdToDefaultTransactionBlock)
    : [];
  const [transactionBlocks, setTransactionBlocks] = useState<ITransactionBlock[]>([]);

  type IValidationErrors = {
    [id: string]: ErrorMessages;
  };
  const [transactionBlockValidationErrors, setTransactionBlockValidationErrors] = useState<IValidationErrors>({});
  const [showTransactionBlockSelect, setShowTransactionBlockSelect] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [crossChainActions, setCrossChainActions] = useState<ICrossChainAction[]>([]);
  const [isSigningAction, setIsSigningAction] = useState<boolean>(false);
  const [editingTransactionBlock, setEditingTransactionBlock] = useState<ITransactionBlock | null>(null);
  const [isTransactionDone, setIsTransactionDone] = useState<boolean>(false);
  let multiCallList: string[] = [];

  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAddressInterval, setCopiedAddressInterval] = useState<number | null>(null);
  const [showWalletBlock, setShowWalletBlock] = useState(true);

  const theme: Theme = useTheme();

  // Change copy icon back
  useInterval(() => {
    setCopiedAddress(false);
    setCopiedAddressInterval(null);
  }, copiedAddressInterval);

  const onCopy = async (valueToCopy: string) => {
    try {
      setCopiedAddress(true);
      if (!copiedAddress && !copiedAddressInterval) setCopiedAddressInterval(10000);
      await navigator.clipboard.writeText(valueToCopy);
    } catch (e) {
      alert('Unable to copy!');
    }
  };

  const {
    accountAddress,
    connect,
    isConnecting,
    sdk,
    providerAddress,
    getSdkForChainId,
    web3Provider,
    logout,
    smartWalletOnly,
  } = useEtherspot();

  const { showConfirmModal, showAlertModal, showModal } = useTransactionBuilderModal();
  const {
    dispatchCrossChainActions,
    processingCrossChainActionIds,
    dispatchedCrossChainActions,
    resetDispatchedCrossChainActions,
  } = useTransactionsDispatcher();

  const isEstimatingCrossChainActions = useMemo(
    () => crossChainActions?.some((crossChainAction) => crossChainAction.isEstimating) ?? false,
    [crossChainActions]
  );

  const isEstimationFailing = useMemo(
    () => crossChainActions.some((crossChainAction) => !!crossChainAction.estimated?.errorMessage),
    [crossChainActions]
  );

  const onValidate = useCallback(() => {
    let validationErrors: IValidationErrors = {};
    transactionBlocks.forEach((transactionBlock) => {
      const transactionBlockErrors = validateTransactionBlockValues(transactionBlock);
      if (!transactionBlockErrors || Object.keys(transactionBlockErrors).length === 0) return;
      validationErrors = {
        ...validationErrors,
        [transactionBlock.id]: transactionBlockErrors,
      };
    });
    setTransactionBlockValidationErrors(validationErrors);

    return validationErrors;
  }, [transactionBlocks, isChecking, sdk, connect, accountAddress, isConnecting]);

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

    let validationErrors = await onValidate();

    let newCrossChainActions: ICrossChainAction[] = [];
    let errorMessage;

    if (Object.keys(validationErrors).length === 0) {
      // keep blocks in order
      let multiCallList: string[] = [];
      for (const transactionBlock of transactionBlocks) {
        const result = await buildCrossChainAction(sdk, transactionBlock);
        if (!result?.crossChainAction || result?.errorMessage) {
          errorMessage = result?.errorMessage ?? `Failed to build a cross chain action!`;
          break;
        }

        // no multicall/batching for key based
        if (result?.crossChainAction?.useWeb3Provider) {
          newCrossChainActions = [...newCrossChainActions, result.crossChainAction];
          continue;
        }

        const action = result.crossChainAction;
        const foundChainIndex = newCrossChainActions.findIndex(
          (x) => x?.chainId === action.chainId && x?.type === action.type && !x?.multiCallData
        );

        if (!!transactionBlock.multiCallData && !multiCallList.includes(transactionBlock.multiCallData.id)) {
          // Batch multiCallData
          multiCallList.push(transactionBlock.multiCallData.id);
          let multiCallBlocks = transactionBlocks.filter(
            (search) => search?.multiCallData?.id === transactionBlock.multiCallData?.id
          );
          let allActionList: ICrossChainAction[] = [];
          for (const block of multiCallBlocks) {
            let result = await buildCrossChainAction(sdk, block);
            if (!!result?.crossChainAction) allActionList.push(result.crossChainAction);
          }
          if (foundChainIndex > -1 && !!allActionList.length) {
            // Append other calls to batch (should not happen)
            const chainTx = newCrossChainActions[foundChainIndex];
            chainTx.batchTransactions = [...allActionList];
            newCrossChainActions[foundChainIndex] = chainTx;
          } else if (!!allActionList.length) {
            // Create new CrossChainAction with multicalls batched
            let chainTx: ICrossChainAction = {
              ...allActionList[0],
              batchTransactions: allActionList,
            };
            newCrossChainActions = [...newCrossChainActions, chainTx];
          }
        } else if (
          foundChainIndex > -1 &&
          (action.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP || action.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET)
        ) {
          // Batch .batchTransactions array
          const chainTx = newCrossChainActions[foundChainIndex];
          if (chainTx?.batchTransactions?.length) chainTx.batchTransactions = [...chainTx.batchTransactions, action];
          else chainTx.batchTransactions = [chainTx, action];
          newCrossChainActions[foundChainIndex] = chainTx;
        } else newCrossChainActions = [...newCrossChainActions, result.crossChainAction];
      }
    }

    setIsChecking(false);

    if (!errorMessage && !newCrossChainActions?.length) {
      errorMessage = `Failed to proceed with selected actions!`;
    }

    if (errorMessage) {
      showAlertModal(errorMessage);
      return;
    }

    setCrossChainActions(newCrossChainActions);
    setEditingTransactionBlock(null);
  }, [transactionBlocks, isChecking, sdk, connect, accountAddress, isConnecting]);

  const estimateCrossChainActions = useCallback(async () => {
    const unestimatedCrossChainActions = crossChainActions?.filter(
      (crossChainAction) => !crossChainAction.isEstimating && !crossChainAction.estimated
    );
    if (!unestimatedCrossChainActions?.length) return;

    unestimatedCrossChainActions.map(async (crossChainAction) => {
      setCrossChainActions((current) =>
        current.map((currentCrossChainAction) => {
          if (currentCrossChainAction.id !== crossChainAction.id) return currentCrossChainAction;
          return { ...crossChainAction, isEstimating: true };
        })
      );

      const estimated = await estimateCrossChainAction(
        getSdkForChainId(crossChainAction.chainId),
        web3Provider,
        crossChainAction,
        providerAddress,
        accountAddress
      );

      setCrossChainActions((current) =>
        current.map((currentCrossChainAction) => {
          if (currentCrossChainAction.id !== crossChainAction.id) return currentCrossChainAction;
          return { ...crossChainAction, isEstimating: false, estimated };
        })
      );
    });
  }, [crossChainActions, setCrossChainActions, getSdkForChainId, web3Provider, providerAddress, accountAddress]);

  const setCrossChainActionGasToken = async (
    crossChainActionId: string,
    gasTokenAddress: string | null,
    gasTokenDecimals: number | null,
    gasTokenSymbol: string | null
  ) => {
    setCrossChainActions((current) =>
      current.map((crossChainAction) => {
        if (crossChainAction.id !== crossChainActionId) return crossChainAction;
        return {
          ...crossChainAction,
          gasTokenAddress,
          gasTokenDecimals,
          gasTokenSymbol,
          estimated: null,
          isEstimating: false,
        };
      })
    );
  };

  useEffect(() => {
    estimateCrossChainActions();
  }, [estimateCrossChainActions]);

  const onSubmitClick = useCallback(async () => {
    if (isSubmitting || isEstimatingCrossChainActions || isEstimationFailing) return;
    setIsSubmitting(true);

    if (!crossChainActions) {
      setIsSubmitting(false);
      showAlertModal('Unable to dispatch cross chain actions.');
      return;
    }

    const crossChainActionsToDispatch = crossChainActions.filter(({ transactions }) => !!transactions?.length);
    if (!crossChainActionsToDispatch?.length) {
      setIsSubmitting(false);
      showAlertModal('Unable to dispatch cross chain actions.');
      return;
    }

    if (crossChainActions[0].type == TRANSACTION_BLOCK_TYPE.KLIMA_STAKE) {
      let crossChainAction = crossChainActions[0];

      if (!crossChainAction.receiveAmount) {
        showAlertModal('Failed to get receiveAmount');
        setIsSubmitting(false);
        return;
      }

      let result: {
        transactionHash?: string;
        errorMessage?: string;
      };

      result = crossChainAction.useWeb3Provider
        ? await submitWeb3ProviderTransactions(
            getSdkForChainId(crossChainAction.chainId) as Sdk,
            web3Provider,
            crossChainAction.transactions,
            crossChainAction.chainId,
            providerAddress
          )
        : await submitEtherspotAndWaitForTransactionHash(
            getSdkForChainId(crossChainAction.chainId) as Sdk,
            crossChainAction.transactions,
            crossChainAction.gasTokenAddress ?? undefined
          );

      if (result?.errorMessage || !result?.transactionHash?.length) {
        // showAlertModal(result.errorMessage ?? 'Unable to send transaction!');
        setIsSubmitting(false);
        crossChainAction.transactions.map(transaction => {
          transaction.status = CROSS_CHAIN_ACTION_STATUS.FAILED;
        })
        return;
      }

      crossChainAction.transactions.map(transaction => {
        transaction.status = CROSS_CHAIN_ACTION_STATUS.RECEIVING;
        transaction.submitTimestamp = Date.now();
        transaction.transactionHash = result.transactionHash;
      })
      crossChainAction.transactionHash = result.transactionHash;

      let flag = 1,
        errorOnLiFi;
      while (flag) {
        try {
          const status = await getCrossChainStatusByHash(
            getSdkForChainId(CHAIN_ID.POLYGON) as Sdk,
            crossChainAction.chainId,
            CHAIN_ID.POLYGON,
            result.transactionHash,
            crossChainAction.bridgeUsed
          );
          if (status?.status == 'DONE' && status.subStatus == 'COMPLETED') {
            flag = 0;
            crossChainAction.transactions.map(transaction => {
              transaction.status = CROSS_CHAIN_ACTION_STATUS.CONFIRMED;
            })
            crossChainAction.destinationCrossChainAction[0].transactions.map(transaction => {
              transaction.status = CROSS_CHAIN_ACTION_STATUS.ESTIMATING;
            })
          } else if (status?.status === 'FAILED') {
            errorOnLiFi = 'Transaction Failed on LiFi';
            flag = 0;
          }
          await sleep(30);
        } catch (err) {
          errorOnLiFi = 'Transaction Failed on LiFi';
          flag = 0;
        }
      }

      if (errorOnLiFi) {
        showAlertModal(errorOnLiFi);
        setIsSubmitting(false);
        return;
      }

      const estimateGas = await estimateCrossChainAction(
        getSdkForChainId(CHAIN_ID.POLYGON),
        web3Provider,
        crossChainAction.destinationCrossChainAction[0],
        providerAddress,
        accountAddress
      );

      const stakingTxns = await klimaDaoStaking(
        transactionBlocks[0].type === 'KLIMA_STAKE' ? transactionBlocks[0].values?.routeToKlima : null,
        transactionBlocks[0].type === 'KLIMA_STAKE' ? transactionBlocks[0].values?.receiverAddress : '',
        getSdkForChainId(CHAIN_ID.POLYGON),
        false,
        BigNumber.from(crossChainAction.receiveAmount)
          .sub(utils.parseUnits('0.02', 6))
          .sub(estimateGas.feeAmount ?? '0')
          .toString()
      );

      if (stakingTxns.errorMessage) {
        showAlertModal(stakingTxns.errorMessage);
        setIsSubmitting(false);
        return;
      }

      const estimated = await estimateCrossChainAction(
        getSdkForChainId(CHAIN_ID.POLYGON),
        web3Provider,
        crossChainAction.destinationCrossChainAction[0],
        providerAddress,
        accountAddress
      );

      crossChainAction = {
        ...crossChainAction,
        estimated,
        transactions: stakingTxns.result?.transactions ?? [],
        chainId: CHAIN_ID.POLYGON,
      };

      crossChainAction.destinationCrossChainAction[0].transactions.map(transaction => {
        transaction.status = CROSS_CHAIN_ACTION_STATUS.PENDING;
      })

      result = await submitEtherspotAndWaitForTransactionHash(
        getSdkForChainId(CHAIN_ID.POLYGON) as Sdk,
        crossChainAction.transactions,
        POLYGON_USDC_CONTRACT_ADDRESS
      );

      if (result?.errorMessage || !result?.transactionHash?.length) {
        showAlertModal(result.errorMessage ?? 'Unable to send Polygon transaction!');
        crossChainAction.destinationCrossChainAction[0].transactions.map(transaction => {
          transaction.status = CROSS_CHAIN_ACTION_STATUS.FAILED;
        })
        setIsSubmitting(false);
        return;
      }
      setCrossChainActions([]);
      setTransactionBlocks([]);
      showAlertModal('Transaction sent');
      setIsSubmitting(false);
    } else {
      setCrossChainActions([]);
      setTransactionBlocks([]);
      dispatchCrossChainActions(crossChainActionsToDispatch);
      setIsSubmitting(false);
    }
  }, [
    dispatchCrossChainActions,
    crossChainActions,
    showAlertModal,
    isSubmitting,
    isEstimatingCrossChainActions,
    providerAddress,
    accountAddress,
    isEstimationFailing,
  ]);

  const setTransactionBlockValues = (
    transactionBlockId: string,
    values: ITransactionBlockValues,
    multiCallData?: IMultiCallData
  ) => {
    // TODO: fix type
    // @ts-ignore
    setTransactionBlocks((current) =>
      current.map((transactionBlock) => {
        if (transactionBlock.id !== transactionBlockId) return transactionBlock;
        return { ...transactionBlock, values, multiCallData };
      })
    );
  };

  const resetTransactionBlockFieldValidationError = (transactionBlockId: string, field: string) => {
    setTransactionBlockValidationErrors((current) => ({
      ...current,
      [transactionBlockId]: { ...current?.[transactionBlockId], [field]: '' },
    }));
  };

  const resetAllTransactionBlockFieldValidationError = (transactionBlockId: string) => {
    setTransactionBlockValidationErrors((current) => ({
      ...current,
      [transactionBlockId]: {},
    }));
  };

  const setTransactionBlockFieldValidationError = (transactionBlockId: string, field: string, errorMessage: string) => {
    setTransactionBlockValidationErrors((current) => ({
      ...current,
      [transactionBlockId]: {
        ...current?.[transactionBlockId],
        [field]: errorMessage,
      },
    }));
  };

  const contextData = useMemo(
    () => ({
      setTransactionBlockValues,
      resetTransactionBlockFieldValidationError,
      resetAllTransactionBlockFieldValidationError,
      setTransactionBlockFieldValidationError,
      setCrossChainActionGasToken,
    }),
    []
  );

  const hasTransactionBlockAdded = transactionBlocks.some(
    (transactionBlock) => transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE
  );

  const hasKlimaBlockAdded = transactionBlocks.some(
    (transactionBlock) => transactionBlock.type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE
  );

  const crossChainActionsInProcessing = useMemo(() => {
    if (!processingCrossChainActionIds?.length) return;
    return dispatchedCrossChainActions?.filter((crossChainAction) =>
      processingCrossChainActionIds.some((id) => id === crossChainAction.id)
    );
  }, [processingCrossChainActionIds, dispatchedCrossChainActions]);

  const hasProcessingUnsent = useMemo(
    () => !!getFirstCrossChainActionByStatus(dispatchedCrossChainActions ?? [], CROSS_CHAIN_ACTION_STATUS.UNSENT),
    [dispatchedCrossChainActions]
  );

  const [showMulticallOptions, setShowMulticallOptions] = useState<string | null>(null);

  const addTransactionBlock = (
    availableTransactionBlock: ITransactionBlock,
    isBridgeTransactionBlockAndDisabled = false,
    isKlimaBlockIncluded = false
  ) => {
    if (!availableTransactionBlock) return;

    if (isKlimaBlockIncluded && transactionBlocks.length > 0) {
      showAlertModal(
        'Cannot add klima staking block with transaction batch. Please remove previous transactions or continue after the previous transactions are executed'
      );
      return;
    }
    if (hasKlimaBlockAdded) {
      showAlertModal(
        'Cannot add another transaction block with transaction batch. Please remove Klima transaction or continue after the klima transaction is executed'
      );
      return;
    }
    if (availableTransactionBlock.type === TRANSACTION_BLOCK_TYPE.DISABLED || isBridgeTransactionBlockAndDisabled)
      return;
    const transactionBlock: ITransactionBlock = {
      ...availableTransactionBlock,
      id: getTimeBasedUniqueId(),
    };
    setTransactionBlocks((current) => current.concat(transactionBlock));
    setShowTransactionBlockSelect(false);
  };

  // Mt Pelerin
  const [deployingAccount, setDeployingAccount] = useState(false);

  const onBuyClick = async (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.preventDefault();

    const maticSdk = getSdkForChainId(CHAIN_ID.POLYGON);

    if (!accountAddress || !maticSdk) return;

    let account = await maticSdk.getAccount();
    if (!account || account.address !== accountAddress) {
      try {
        await maticSdk.computeContractAccount();
        account = await maticSdk.getAccount();
      } catch {
        showAlertModal('There was an error fetching the account, please try again later.');
        return;
      }
    }

    if (!account) {
      showAlertModal('There was an error fetching the account, please try again later.');
      return;
    }

    openMtPelerinTab(maticSdk, account, deployingAccount, setDeployingAccount, showAlertModal);
  };

  return (
    <TransactionBuilderContext.Provider value={{ data: contextData }}>
      <TopNavigation>
        <WalletAddressesWrapper>
          <WalletAddress selected={showWalletBlock} disabled={isConnecting}>
            <Text marginRight={2}>{WalletIcon}</Text>
            {accountAddress ? (
              <>
                <Text onClick={() => setShowWalletBlock(!showWalletBlock)} marginRight={8}>
                  Wallet
                </Text>
                <Text onClick={() => onCopy(accountAddress)}>
                  {copiedAddress ? <CheckmarkIcon color={theme.color?.text?.textInput} /> : WalletCopyIcon}
                </Text>
              </>
            ) : (
              <Text onClick={connect}>Wallet: Connect</Text>
            )}
          </WalletAddress>
          {accountAddress && (
            <WalletAddress disabled={deployingAccount} onClick={onBuyClick}>
              {deployingAccount ? 'Deploying...' : 'Buy'}
            </WalletAddress>
          )}
        </WalletAddressesWrapper>
        <SettingMenu showLogout={showMenuLogout} logout={logout} />
      </TopNavigation>
      <div>
        {/* Wallet */}
        {showWalletBlock && accountAddress && (
          <TransactionBlocksWrapper>
            <Card onCloseButtonClick={() => setShowWalletBlock(false)} showCloseButton>
              <WalletTransactionBlock
                availableTransactionBlocks={availableTransactionBlocks}
                hasTransactionBlockAdded={hasTransactionBlockAdded}
                addTransactionBlock={addTransactionBlock}
                hideWalletBlock={() => setShowWalletBlock(false)}
              />
            </Card>
          </TransactionBlocksWrapper>
        )}

        {!!crossChainActionsInProcessing?.length && (
          <>
            {crossChainActionsInProcessing.map((crossChainActionInProcessing) => (
              <TransactionBlocksWrapper
                highlight={
                  !!crossChainActionInProcessing?.batchTransactions?.length &&
                  !!crossChainActionInProcessing.multiCallData
                }
              >
                {!!crossChainActionInProcessing?.batchTransactions?.length &&
                  !!crossChainActionInProcessing.multiCallData && (
                    <TransactionBlocksWrapperIcon>{ChainIcon}</TransactionBlocksWrapperIcon>
                  )}
                {
                  <ActionPreview
                    key={`preview-${crossChainActionInProcessing.id}`}
                    crossChainAction={crossChainActionInProcessing}
                  />
                }
              </TransactionBlocksWrapper>
            ))}
            {!hasProcessingUnsent && (
              <SecondaryButton
                marginTop={10}
                onClick={() => {
                  resetDispatchedCrossChainActions();
                  setTransactionBlocks(mappedDefaultTransactionBlocks);
                }}
              >
                Leave
              </SecondaryButton>
            )}
          </>
        )}
        {(!crossChainActions?.length || !!editingTransactionBlock) && !crossChainActionsInProcessing?.length && (
          <>
            {(editingTransactionBlock ? [editingTransactionBlock] : transactionBlocks).map((transactionBlock, i) => {
              let disabled = false;
              let multiCallBlocks: ITransactionBlock[] = [];

              if (!!transactionBlock?.multiCallData) {
                let multiCallId = transactionBlock?.multiCallData?.id;

                if (!!multiCallId && multiCallList.includes(multiCallId)) return null;
                else if (!!multiCallId) multiCallList.push(multiCallId);

                multiCallBlocks =
                  transactionBlocks.filter((item) => item?.multiCallData?.id === transactionBlock?.multiCallData?.id) ||
                  null;
              }

              const multicallOptions = (transactions: ITransactionBlock[]) => {
                const lastTxType = transactions[transactions.length - 1];
                return (
                  <Card
                    onCloseButtonClick={() => {
                      setShowMulticallOptions(null);
                    }}
                    showCloseButton
                  >
                    {availableMulticallBlocks
                      .filter((block) => !block.hideFor?.includes(lastTxType.type))
                      .map((item) => (
                        <MulticallBlockListItemWrapper
                          key={item.id}
                          onClick={() => {
                            const txBlock = availableTransactionBlocks.find((block) => {
                              return block.type === item.type;
                            });
                            if (!txBlock) return;
                            let multiCallData: IMultiCallData;
                            let newMultiCallData: IMultiCallData | null = null;
                            let multiCallBlock: ITransactionBlock;
                            let mutatedBlock: ITransactionBlock;
                            if (!!multiCallBlocks?.length) {
                              multiCallBlock = multiCallBlocks[multiCallBlocks.length - 1];
                              if (!multiCallBlock.multiCallData) {
                                return;
                              }
                              multiCallData = {
                                ...multiCallBlock.multiCallData,
                                fixed: true,
                              };

                              let token: TokenListToken | null = null;
                              let value = 0;
                              let chain: Chain | null = null;

                              if (multiCallBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP) {
                                const values = multiCallBlock.values;
                                if (values && values.chain && values.toAsset && values.offer) {
                                  chain = values.chain;
                                  token = values.toAsset;
                                  value = +ethers.utils.formatUnits(values.offer.receiveAmount, token.decimals);
                                }
                              }

                              if (multiCallBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) {
                                const values = multiCallBlock.values;
                                if (values && values.chain && values.selectedAsset && values.amount) {
                                  chain = values.chain;
                                  token = values.selectedAsset;
                                  let sumOfSwaps = multiCallBlocks
                                    .filter(
                                      (block) =>
                                        block.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP &&
                                        block.values?.toAsset?.address === token?.address
                                    )
                                    .reduce((sum: number, block: ITransactionBlock) => {
                                      const values = (block as IAssetSwapTransactionBlock).values;
                                      if (values && values.offer?.receiveAmount) {
                                        const value = +ethers.utils.formatUnits(
                                          values.offer.receiveAmount,
                                          values.toAsset?.decimals
                                        );
                                        return sum + value;
                                      }
                                      return sum;
                                    }, 0);
                                  let sumOfSends = multiCallBlocks
                                    .filter(
                                      (block) =>
                                        block.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET &&
                                        block.values?.selectedAsset?.address === token?.address
                                    )
                                    .reduce((sum: number, block: ITransactionBlock) => {
                                      const values = (block as ISendAssetTransactionBlock).values;
                                      if (values && values.amount) {
                                        return sum + +values.amount;
                                      }
                                      return sum;
                                    }, 0);
                                  value = -sumOfSends + sumOfSwaps;
                                }
                              }

                              if (!token || !value || !chain) {
                                return;
                              }

                              newMultiCallData = {
                                id: multiCallBlock.multiCallData.id,
                                chain: chain,
                                lastCallId: multiCallBlock.id,
                                index: multiCallBlocks.length,
                                token: token,
                                value: value,
                              };
                              setShowMulticallOptions(null);
                            } else {
                              multiCallBlock = transactionBlock;
                              const multiCallId = getTimeBasedUniqueId();
                              let token: TokenListToken | null = null;
                              let value = 0;
                              let chain: Chain | null = null;
                              if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP) {
                                const values = transactionBlock?.values;
                                if (values && values.chain && values.toAsset && values.offer) {
                                  chain = values.chain;
                                  token = values.toAsset;
                                  value = +ethers.utils.formatUnits(values.offer.receiveAmount, token.decimals);
                                }
                              }

                              if (multiCallBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) {
                                const values = multiCallBlock.values;
                                if (values && values.chain && values.selectedAsset && values.amount) {
                                  chain = values.chain;
                                  token = values.selectedAsset;
                                  value = -values.amount;
                                }
                              }

                              if (!chain || !token || !value) {
                                return;
                              }

                              multiCallData = {
                                id: multiCallId,
                                chain: chain,
                                lastCallId: null,
                                index: 0,
                                fixed: true,
                              };
                              newMultiCallData = {
                                id: multiCallId,
                                chain: chain,
                                lastCallId: transactionBlock.id,
                                index: 1,
                                token: token,
                                value: value,
                              };
                            }

                            mutatedBlock = {
                              ...multiCallBlock,
                              multiCallData,
                            };

                            const newTransactionBlock: ITransactionBlock = {
                              ...txBlock,
                              id: getTimeBasedUniqueId(),
                              multiCallData: newMultiCallData,
                            };

                            setTransactionBlocks((current) => {
                              let block = current.find((item) => item.id === multiCallBlock.id);
                              if (!!block) {
                                let index = current.indexOf(block);
                                if (index > -1) current[index] = mutatedBlock;
                              }
                              return [...current, newTransactionBlock];
                            });
                            setShowMulticallOptions(null);
                          }}
                        >
                          {item.icon}
                          {item.title as string}
                        </MulticallBlockListItemWrapper>
                      ))}
                  </Card>
                );
              };

              return (
                <TransactionBlocksWrapper highlight={!!multiCallBlocks?.length}>
                  {!!multiCallBlocks?.length ? (
                    multiCallBlocks?.map((multiCallBlock, j) => {
                      return (
                        <Card
                          key={`transaction-block-${multiCallBlock.id}`}
                          marginBottom={
                            j === multiCallBlocks.length - 1 && showMulticallOptions !== transactionBlock.id ? 0 : 20
                          }
                          onCloseButtonClick={() =>
                            showConfirmModal('Are you sure you want to remove selected transaction?', () => {
                              if (j == 0) {
                                // Remove entire block if there's only one multicall
                                setTransactionBlocks((current) => {
                                  return current.filter((block) => block.id !== transactionBlock.id);
                                });
                              } else {
                                // Remove last instance of a multicall block
                                setTransactionBlocks((current) => {
                                  return current
                                    .filter((block) => block.id !== multiCallBlock.id)
                                    .map((block) => {
                                      if (block.id !== multiCallBlock.multiCallData?.lastCallId) {
                                        return block;
                                      }
                                      if (block.multiCallData) {
                                        block.multiCallData.fixed = false;
                                      }
                                      return block;
                                    });
                                });
                              }
                            })
                          }
                          // Should only have the option to delete last multicall, any change mid structure should reset the entire block
                          showCloseButton={
                            (multiCallBlocks.length > 1 && j === multiCallBlocks.length - 1) ||
                            (multiCallBlocks.length === 1 && !editingTransactionBlock)
                          }
                        >
                          <TransactionBlock
                            key={`block-${multiCallBlock.id}`}
                            {...multiCallBlock}
                            errorMessages={transactionBlockValidationErrors[transactionBlock.id]}
                          />
                          {j === multiCallBlocks.length - 1 &&
                            (multiCallBlock.type == TRANSACTION_BLOCK_TYPE.ASSET_SWAP ||
                              multiCallBlock.type == TRANSACTION_BLOCK_TYPE.SEND_ASSET) && (
                              <MultiCallButton
                                disabled={!!disabled}
                                onClick={async () => {
                                  // Add new transaction block to the multicall block list
                                  let validationErrors = await onValidate();
                                  if (!!multiCallBlock.multiCallData && !validationErrors[multiCallBlock.id]) {
                                    setShowMulticallOptions(transactionBlock.id);
                                  }
                                }}
                              >
                                Continue Multi-Call
                                {multiCallBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP &&
                                  multiCallBlock.values?.toAsset?.symbol &&
                                  ` with ${multiCallBlock.values?.toAsset?.symbol}`}
                                {multiCallBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET &&
                                  multiCallBlock.values?.selectedAsset &&
                                  ` with ${multiCallBlock.values?.selectedAsset?.symbol}`}
                              </MultiCallButton>
                            )}
                        </Card>
                      );
                    })
                  ) : (
                    <Card
                      key={`transaction-block-${transactionBlock.id}`}
                      marginBottom={
                        i === transactionBlocks.length - 1 && showMulticallOptions !== transactionBlock.id ? 0 : 20
                      }
                      onCloseButtonClick={() =>
                        showConfirmModal('Are you sure you want to remove selected transaction?', () =>
                          setTransactionBlocks((current) =>
                            current.filter((addedTransactionBlock) => addedTransactionBlock.id !== transactionBlock.id)
                          )
                        )
                      }
                      showCloseButton={!editingTransactionBlock}
                    >
                      <TransactionBlock
                        key={`block-${transactionBlock.id}`}
                        {...transactionBlock}
                        errorMessages={transactionBlockValidationErrors[transactionBlock.id]}
                      />
                      {(transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP ||
                        transactionBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) &&
                        transactionBlock.values?.accountType === DestinationWalletEnum.Contract &&
                        !editingTransactionBlock && (
                          <MultiCallButton
                            disabled={!!disabled}
                            onClick={async () => {
                              // Add new transaction block to the multicall block list
                              let validationErrors = await onValidate();
                              if (!validationErrors[transactionBlock.id]) {
                                setShowMulticallOptions(transactionBlock.id);
                              }
                            }}
                          >
                            Start Multi-Call
                            {transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP &&
                              transactionBlock.values?.toAsset?.symbol &&
                              ` with ${transactionBlock.values?.toAsset?.symbol}`}
                            {transactionBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET &&
                              transactionBlock.values?.selectedAsset &&
                              ` with ${transactionBlock.values?.selectedAsset?.symbol}`}
                          </MultiCallButton>
                        )}
                    </Card>
                  )}
                  {showMulticallOptions === transactionBlock.id &&
                    multicallOptions(!!multiCallBlocks?.length ? multiCallBlocks : [transactionBlock])}
                </TransactionBlocksWrapper>
              );
            })}
            {!showTransactionBlockSelect && !hideAddTransactionButton && !editingTransactionBlock && (
              <AddTransactionButton onClick={() => setShowTransactionBlockSelect(true)}>
                <AiOutlinePlusCircle size={24} />
                <span>Add transaction</span>
              </AddTransactionButton>
            )}
            {!showTransactionBlockSelect && transactionBlocks.length > 0 && (
              <>
                <br />
                <PrimaryButton
                  marginTop={editingTransactionBlock ? 0 : 30}
                  onClick={onContinueClick}
                  disabled={isChecking}
                >
                  {!editingTransactionBlock && (isChecking ? 'Checking...' : 'Review')}
                  {editingTransactionBlock && (isChecking ? 'Saving...' : 'Save')}
                </PrimaryButton>
              </>
            )}
            {!!editingTransactionBlock && (
              <SecondaryButton
                marginTop={10}
                onClick={() => {
                  setEditingTransactionBlock(null);
                  // reset value changes, editingTransactionBlock storing initial before edits
                  setTransactionBlocks((current) =>
                    current.map((currentTransactionBlock) => {
                      if (currentTransactionBlock.id !== editingTransactionBlock?.id) {
                        return currentTransactionBlock;
                      }
                      return editingTransactionBlock;
                    })
                  );
                }}
              >
                Go back to preview
              </SecondaryButton>
            )}
            {showTransactionBlockSelect && (
              <Card onCloseButtonClick={() => setShowTransactionBlockSelect(false)} showCloseButton>
                {availableTransactionBlocks
                  .filter(
                    (availableTransactionBlock) =>
                      !hiddenTransactionBlockTypes?.includes(availableTransactionBlock.type)
                  )
                  .map((availableTransactionBlock) => {
                    const isBridgeTransactionBlock =
                      availableTransactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE;
                    const isBridgeTransactionBlockAndDisabled = isBridgeTransactionBlock && hasTransactionBlockAdded;
                    const isDisabled =
                      availableTransactionBlock.type === TRANSACTION_BLOCK_TYPE.DISABLED ||
                      isBridgeTransactionBlockAndDisabled;
                    const availableTransactionBlockTitle = isBridgeTransactionBlockAndDisabled
                      ? `${availableTransactionBlock.title} (Max. 1 bridge per batch)`
                      : availableTransactionBlock.title;
                    const isKlimaBlockIncluded = availableTransactionBlock.type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE;
                    return (
                      <TransactionBlockListItemWrapper
                        key={availableTransactionBlock.title}
                        onClick={() =>
                          addTransactionBlock(
                            availableTransactionBlock,
                            isBridgeTransactionBlockAndDisabled,
                            isKlimaBlockIncluded
                          )
                        }
                        disabled={isDisabled || hasKlimaBlockAdded}
                      >
                        &bull; {availableTransactionBlockTitle}
                      </TransactionBlockListItemWrapper>
                    );
                  })}
              </Card>
            )}
          </>
        )}
        {!!crossChainActions?.length && !crossChainActionsInProcessing?.length && !editingTransactionBlock && (
          <>
            {crossChainActions.map((crossChainAction) => {
              let multiCallBlocks: ICrossChainAction[] = [];
              if (!!crossChainAction?.multiCallData) {
                let multiCallId = crossChainAction?.multiCallData?.id;

                if (!!multiCallId && multiCallList.includes(multiCallId)) return null;
                else if (!!multiCallId) multiCallList.push(multiCallId);

                multiCallBlocks =
                  crossChainActions.filter((item) => item?.multiCallData?.id === crossChainAction?.multiCallData?.id) ||
                  null;
              }

              const actionPreview = (
                crossChainAction: ICrossChainAction,
                multiCallBlocks?: ICrossChainAction[],
                index?: number
              ) => {
                const multiCall = !!(multiCallBlocks && index !== undefined && multiCallBlocks.length > 1);
                const disableEdit = multiCall;
                return (
                  <ActionPreview
                    key={`preview-${crossChainAction.id}`}
                    crossChainAction={crossChainAction}
                    onRemove={
                      !disableEdit || isTransactionDone
                        ? () =>
                            setCrossChainActions((current) =>
                              current.filter(
                                (currentCrossChainAction) => currentCrossChainAction.id !== crossChainAction.id
                              )
                            )
                        : undefined
                    }
                    signButtonDisabled={crossChainAction.isEstimating || isSigningAction || disableEdit}
                    showSignButton={!crossChainAction.useWeb3Provider && !disableEdit}
                    onSign={async () => {
                      setIsSigningAction(true);

                      const result: {
                        transactionHash?: string;
                        errorMessage?: string;
                        batchHash?: string;
                      } = crossChainAction.useWeb3Provider
                        ? await submitWeb3ProviderTransaction(
                            web3Provider,
                            crossChainAction.transactions[0],
                            crossChainAction.chainId,
                            providerAddress
                          )
                        : await submitEtherspotTransactionsBatch(
                            getSdkForChainId(crossChainAction.chainId) as Sdk,
                            crossChainAction.transactions,
                            crossChainAction.gasTokenAddress ?? undefined
                          );

                      if (result?.errorMessage || (!result?.transactionHash?.length && !result?.batchHash?.length)) {
                        setIsSigningAction(false);
                        return;
                      }

                      const { transactionHash, batchHash } = result;

                      const updatedTransactions = crossChainAction.transactions.reduce(
                        (updated: ICrossChainActionTransaction[], transaction, index) => {
                          if (!crossChainAction.useWeb3Provider || index === 0) {
                            return [...updated, { ...transaction, transactionHash }];
                          }

                          return [...updated, transaction];
                        },
                        []
                      );

                      const mappedPendingCrossChainAction = {
                        ...crossChainAction,
                        transactions: updatedTransactions,
                        batchHash,
                      };

                      dispatchCrossChainActions([mappedPendingCrossChainAction], CROSS_CHAIN_ACTION_STATUS.PENDING);
                      setCrossChainActions((current) =>
                        current.filter((currentCrossChainAction) => currentCrossChainAction.id !== crossChainAction.id)
                      );
                      setIsSigningAction(false);
                      showAlertModal('Transaction sent!');
                    }}
                    onEdit={() =>
                      setEditingTransactionBlock(
                        transactionBlocks.find(
                          (transactionBlock) => transactionBlock.id === crossChainAction.relatedTransactionBlockId
                        ) ?? null
                      )
                    }
                    showEditButton={!disableEdit}
                    showStatus={!!crossChainActionsInProcessing?.length}
                    isSubmitted={isSubmitting}
                    setIsTransactionDone={setIsTransactionDone}
                    showGasAssetSelect
                  />
                );
              };

              return (
                <TransactionBlocksWrapper highlight={!!multiCallBlocks.length}>
                  {!!multiCallBlocks.length && <TransactionBlocksWrapperIcon>{ChainIcon}</TransactionBlocksWrapperIcon>}
                  {actionPreview(crossChainAction)}
                </TransactionBlocksWrapper>
              );
            })}
            <PrimaryButton
              marginTop={30}
              onClick={onSubmitClick}
              disabled={isSubmitting || isEstimatingCrossChainActions || isEstimationFailing}
            >
              {isSubmitting && !isEstimatingCrossChainActions && 'Executing...'}
              {isEstimatingCrossChainActions && !isSubmitting && 'Estimating...'}
              {!isSubmitting && !isEstimatingCrossChainActions && !isEstimationFailing && 'Execute'}
              {!isSubmitting && !isEstimatingCrossChainActions && isEstimationFailing && 'Estimation failed'}
            </PrimaryButton>
            <br />
            <SecondaryButton marginTop={10} onClick={() => setCrossChainActions([])} disabled={isSubmitting}>
              Go back
            </SecondaryButton>
          </>
        )}
      </div>
    </TransactionBuilderContext.Provider>
  );
};

export default TransactionBuilderContextProvider;

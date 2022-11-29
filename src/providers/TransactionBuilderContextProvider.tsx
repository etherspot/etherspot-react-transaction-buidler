import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { HiOutlineDotsHorizontal } from 'react-icons/hi';
import { AiOutlinePlusCircle } from 'react-icons/ai';
import { Sdk, sleep } from 'etherspot';
import { BigNumber, utils } from 'ethers';

// Types
import {
	IDefaultTransactionBlock,
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
} from '../utils/transaction';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { TransactionBuilderContext } from '../contexts';
import { ActionPreview } from '../components/TransactionPreview';
import { getTimeBasedUniqueId, humanizeHexString } from '../utils/common';
import History from '../components/History';
import { Theme } from '../utils/theme';
import { CHAIN_ID } from '../utils/chain';
import Card from '../components/Card';
import { CROSS_CHAIN_ACTION_STATUS } from '../constants/transactionDispatcherConstants';

export interface TransactionBuilderContextProps {
	defaultTransactionBlocks?: IDefaultTransactionBlock[];
	hiddenTransactionBlockTypes?: ITransactionBlockType[];
	hideAddTransactionButton?: boolean;
	showMenuLogout?: boolean;
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

const WalletAddress = styled.span<{ disabled?: boolean }>`
	margin-right: 40px;
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

const MenuButton = styled(HiOutlineDotsHorizontal)`
	cursor: pointer;

	&:hover {
		opacity: 0.5;
	}
`;

const MenuWrapper = styled.div`
	position: absolute;
	top: 40px;
	right: 15px;
	background: ${({ theme }) => theme.color.background.topMenu};
	color: ${({ theme }) => theme.color.text.topMenu};
	border-radius: 5px;
	padding: 15px 20px;
	font-size: 14px;
	text-align: left;
	box-shadow: rgb(0 0 0 / 24%) 0px 3px 8px;
`;

const MenuItem = styled.div`
	margin-bottom: 10px;
	cursor: pointer;

	a,
	a:visited {
		color: ${({ theme }) => theme.color.text.topMenu};
		text-decoration: none;
	}

	&:hover {
		text-decoration: underline;
	}

	&:last-child {
		margin-bottom: 0;
	}
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

	if (context !== null) {
		throw new Error('<EtherspotContextProvider /> has already been declared.');
	}

	const mappedDefaultTransactionBlocks = defaultTransactionBlocks
		? defaultTransactionBlocks.map(addIdToDefaultTransactionBlock)
		: [];
	const [transactionBlocks, setTransactionBlocks] = useState<ITransactionBlock[]>(mappedDefaultTransactionBlocks);

	const [transactionBlockValidationErrors, setTransactionBlockValidationErrors] = useState<{
		[id: string]: ErrorMessages;
	}>({});
	const [showTransactionBlockSelect, setShowTransactionBlockSelect] = useState<boolean>(false);
	const [isChecking, setIsChecking] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [crossChainActions, setCrossChainActions] = useState<ICrossChainAction[]>([]);
	const [showMenu, setShowMenu] = useState<boolean>(false);
	const [isSigningAction, setIsSigningAction] = useState<boolean>(false);
	const [editingTransactionBlock, setEditingTransactionBlock] = useState<ITransactionBlock | null>(null);

	const theme: Theme = useTheme();

	const onCopy = async (valueToCopy: string) => {
		try {
			await navigator.clipboard.writeText(valueToCopy);
			alert('Copied!');
		} catch (e) {
			//
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
	} = useEtherspot();

	const { showConfirmModal, showAlertModal, showModal } = useTransactionBuilderModal();
	const { dispatchCrossChainActions, processingCrossChainActionId, dispatchedCrossChainActions } =
		useTransactionsDispatcher();

	const isEstimatingCrossChainActions = useMemo(
		() => crossChainActions?.some((crossChainAction) => crossChainAction.isEstimating) ?? false,
		[crossChainActions],
	);

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

		let newCrossChainActions: ICrossChainAction[] = [];
		let errorMessage;

		if (Object.keys(validationErrors).length === 0) {
			// keep blocks in order
			for (const transactionBlock of transactionBlocks) {
				const result = await buildCrossChainAction(sdk, transactionBlock);
				if (!result?.crossChainAction || result?.errorMessage) {
					errorMessage = result?.errorMessage ?? `Failed to build a cross chain action!`;
					break;
				}
				const action = result.crossChainAction;
				const foundChainIndex = newCrossChainActions.findIndex(
					(x) => x?.chainId === action.chainId && x?.type === action.type,
				);

				if (
					foundChainIndex > -1 &&
					(action.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP ||
						action.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET)
				) {
					const chainTx = newCrossChainActions[foundChainIndex];
					if (chainTx?.batchTransactions?.length)
						chainTx.batchTransactions = [...chainTx.batchTransactions, action];
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
			(crossChainAction) => !crossChainAction.isEstimating && !crossChainAction.estimated,
		);
		if (!unestimatedCrossChainActions?.length) return;

		unestimatedCrossChainActions.map(async (crossChainAction) => {
			setCrossChainActions((current) =>
				current.map((currentCrossChainAction) => {
					if (currentCrossChainAction.id !== crossChainAction.id) return currentCrossChainAction;
					return { ...crossChainAction, isEstimating: true };
				}),
			);

			const estimated = await estimateCrossChainAction(
				getSdkForChainId(crossChainAction.chainId),
				web3Provider,
				crossChainAction,
				providerAddress,
			);

			setCrossChainActions((current) =>
				current.map((currentCrossChainAction) => {
					if (currentCrossChainAction.id !== crossChainAction.id) return currentCrossChainAction;
					return { ...crossChainAction, isEstimating: false, estimated };
				}),
			);
		});
	}, [crossChainActions, setCrossChainActions, getSdkForChainId, web3Provider, providerAddress]);

	useEffect(() => {
		estimateCrossChainActions();
	}, [estimateCrossChainActions]);

	const onSubmitClick = useCallback(async () => {
		if (isSubmitting || isEstimatingCrossChainActions) return;
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
			const PolygonUSDCAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
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
					providerAddress,
				)
				: await submitEtherspotAndWaitForTransactionHash(
					getSdkForChainId(crossChainAction.chainId) as Sdk,
					crossChainAction.transactions,
				);
			if (
				result?.errorMessage ||
				(!result?.transactionHash?.length)
			) {
				showAlertModal(result.errorMessage ?? 'Unable to send transaction!');
				setIsSubmitting(false);
				return;
			}

			let flag = 1, errorOnLiFi;
			while (flag) {
				try {
					const status = await getCrossChainStatusByHash(getSdkForChainId(CHAIN_ID.POLYGON) as Sdk, crossChainAction.chainId, CHAIN_ID.POLYGON, result.transactionHash, crossChainAction.bridgeUsed)
					if (status?.status == "DONE" && status.subStatus == "COMPLETED") {
						flag = 0;
					} else if (status?.status === "FAILED") {
						errorOnLiFi = 'Transaction Failed on LiFi'
						flag = 0
					}
					await sleep(30);
				} catch (err) {
					errorOnLiFi = 'Transaction Failed on LiFi'
					flag = 0;
				}
			}

			if (errorOnLiFi) {
				showAlertModal(errorOnLiFi);
				setIsSubmitting(false);
				return;
			}

			const estimateGas = await estimateCrossChainAction(getSdkForChainId(CHAIN_ID.POLYGON), web3Provider, crossChainAction.destinationCrossChainAction[0], providerAddress, PolygonUSDCAddress);

			const stakingTxns = await klimaDaoStaking(BigNumber.from(crossChainAction.receiveAmount).sub(utils.parseUnits('0.02', 6)).sub(estimateGas.feeAmount ?? '0').toString(), transactionBlocks[0].type === "KLIMA_STAKE" ? transactionBlocks[0].values?.receiverAddress : '', getSdkForChainId(CHAIN_ID.POLYGON))

			if (stakingTxns.errorMessage) {
				showAlertModal(stakingTxns.errorMessage);
				setIsSubmitting(false);
				return;
			}

			const estimated = await estimateCrossChainAction(getSdkForChainId(CHAIN_ID.POLYGON), web3Provider, crossChainAction.destinationCrossChainAction[0], providerAddress, PolygonUSDCAddress);

			crossChainAction = {
				...crossChainAction,
				estimated,
				transactions: stakingTxns.result?.transactions ?? [],
				chainId: CHAIN_ID.POLYGON,
			}

			result = await submitEtherspotAndWaitForTransactionHash(getSdkForChainId(CHAIN_ID.POLYGON) as Sdk, crossChainAction.transactions, PolygonUSDCAddress);

			if (
				result?.errorMessage ||
				(!result?.transactionHash?.length)
			) {
				showAlertModal(result.errorMessage ?? 'Unable to send Polygon transaction!');
				setIsSubmitting(false);
				return;
			}
			setCrossChainActions([]);
			setTransactionBlocks([]);
			showAlertModal('Transaction sent');
			setIsSubmitting(false);

		}
		else {
			setCrossChainActions([]);
			setTransactionBlocks([]);
			dispatchCrossChainActions(crossChainActionsToDispatch);
			setIsSubmitting(false);
		}
	}, [dispatchCrossChainActions, crossChainActions, showAlertModal, isSubmitting, isEstimatingCrossChainActions]);

	const setTransactionBlockValues = (transactionBlockId: string, values: ITransactionBlockValues) => {
		// TODO: fix type
		// @ts-ignore
		setTransactionBlocks((current) =>
			current.map((transactionBlock) => {
				if (transactionBlock.id !== transactionBlockId) return transactionBlock;
				return { ...transactionBlock, values };
			}),
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

	const setTransactionBlockFieldValidationError = (
		transactionBlockId: string,
		field: string,
		errorMessage: string,
	) => {
		setTransactionBlockValidationErrors((current) => ({
			...current,
			[transactionBlockId]: { ...current?.[transactionBlockId], [field]: errorMessage },
		}));
	};

	const contextData = useMemo(
		() => ({
			setTransactionBlockValues,
			resetTransactionBlockFieldValidationError,
			resetAllTransactionBlockFieldValidationError,
			setTransactionBlockFieldValidationError,
		}),
		[],
	);

	const hideMenu = () => setShowMenu(false);

	const hasTransactionBlockAdded = transactionBlocks.some(
		(transactionBlock) => transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE,
	);

	const hasKlimaBlockAdded = transactionBlocks.some(
		(transactionBlock) => transactionBlock.type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE,
	);

	const crossChainActionInProcessing = useMemo(() => {
		if (!processingCrossChainActionId) return;
		return dispatchedCrossChainActions?.find(
			(crossChainAction) => crossChainAction.id === processingCrossChainActionId,
		);
	}, [processingCrossChainActionId, dispatchedCrossChainActions]);

	return (
		<TransactionBuilderContext.Provider value={{ data: contextData }}>
			<TopNavigation>
				<WalletAddressesWrapper onClick={hideMenu}>
					{providerAddress && (
						<WalletAddress onClick={() => onCopy(providerAddress)}>
							Wallet: {humanizeHexString(providerAddress)}
						</WalletAddress>
					)}
					{!providerAddress && <WalletAddress disabled>Wallet: Not connected</WalletAddress>}
					{accountAddress && (
						<WalletAddress onClick={() => onCopy(accountAddress)}>
							Account: {humanizeHexString(accountAddress)}
						</WalletAddress>
					)}
					{!accountAddress && (
						<WalletAddress disabled>
							Account:{' '}
							<ConnectButton onClick={connect} disabled={isConnecting}>
								Connect
							</ConnectButton>
						</WalletAddress>
					)}
				</WalletAddressesWrapper>
				<MenuButton
					size={22}
					onClick={() => setShowMenu(!showMenu)}
					color={theme?.color?.background?.topMenuButton}
				/>
			</TopNavigation>
			<div onClick={hideMenu}>
				{!!processingCrossChainActionId && (
					<>
						{crossChainActionInProcessing && (
							<ActionPreview
								key={`preview-${crossChainActionInProcessing.id}`}
								crossChainAction={crossChainActionInProcessing}
							/>
						)}
						<PrimaryButton disabled marginTop={30} marginBottom={30}>
							Processing...
						</PrimaryButton>
					</>
				)}
				{!!editingTransactionBlock && !processingCrossChainActionId && (
					<>
						<Card
							key={`transaction-block-edit-${editingTransactionBlock.id}`}
							marginBottom={20}
							showCloseButton={false}
						>
							<TransactionBlock
								key={`block-edit-${editingTransactionBlock.id}`}
								{...editingTransactionBlock}
								errorMessages={transactionBlockValidationErrors[editingTransactionBlock.id]}
							/>
						</Card>
						<PrimaryButton marginTop={30} onClick={onContinueClick} disabled={isChecking}>
							{isChecking ? 'Saving...' : 'Save'}
						</PrimaryButton>
						<SecondaryButton
							marginTop={10}
							onClick={() => {
								setEditingTransactionBlock(null);
								// reset value changes, editingTransactionBlock storing initial before edits
								setTransactionBlocks((current) =>
									current.map((currentTransactionBlock) => {
										if (currentTransactionBlock.id !== editingTransactionBlock?.id)
											return currentTransactionBlock;
										return editingTransactionBlock;
									}),
								);
							}}
						>
							Go back to preview
						</SecondaryButton>
					</>
				)}
				{!crossChainActions?.length && !processingCrossChainActionId && !editingTransactionBlock && (
					<>
						{transactionBlocks.map((transactionBlock) => (
							<Card
								key={`transaction-block-${transactionBlock.id}`}
								marginBottom={20}
								onCloseButtonClick={() =>
									showConfirmModal('Are you sure you want to remove selected transaction?', () =>
										setTransactionBlocks((current) =>
											current.filter(
												(addedTransactionBlock) =>
													addedTransactionBlock.id !== transactionBlock.id,
											),
										),
									)
								}
								showCloseButton
							>
								<TransactionBlock
									key={`block-${transactionBlock.id}`}
									{...transactionBlock}
									errorMessages={transactionBlockValidationErrors[transactionBlock.id]}
								/>
							</Card>
						))}
						{!showTransactionBlockSelect && !hideAddTransactionButton && (
							<AddTransactionButton onClick={() => setShowTransactionBlockSelect(true)}>
								<AiOutlinePlusCircle size={24} />
								<span>Add transaction</span>
							</AddTransactionButton>
						)}
						{!showTransactionBlockSelect && transactionBlocks.length > 0 && (
							<>
								<br />
								<PrimaryButton marginTop={30} onClick={onContinueClick} disabled={isChecking}>
									{isChecking ? 'Checking...' : 'Review'}
								</PrimaryButton>
							</>
						)}
						{showTransactionBlockSelect && (
							<Card onCloseButtonClick={() => setShowTransactionBlockSelect(false)} showCloseButton>
								{availableTransactionBlocks
									.filter(
										(availableTransactionBlock) =>
											!hiddenTransactionBlockTypes?.includes(availableTransactionBlock.type),
									)
									.map((availableTransactionBlock) => {
										const isBridgeTransactionBlock =
											availableTransactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE;
										const isBridgeTransactionBlockAndDisabled =
											isBridgeTransactionBlock && hasTransactionBlockAdded;
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
												onClick={() => {
													if (isKlimaBlockIncluded && transactionBlocks.length > 0) {
														showAlertModal('Cannot add klima staking block with transaction batch. Please remove previous transactions or continue after the previous transactions are executed');
														return;
													}
													if (hasKlimaBlockAdded) {
														showAlertModal('Cannot add another transaction block with transaction batch. Please remove Klima transaction or continue after the klima transaction is executed');
														return;
													}
													if (
														availableTransactionBlock.type ===
														TRANSACTION_BLOCK_TYPE.DISABLED ||
														isBridgeTransactionBlockAndDisabled
													)
														return;
													const transactionBlock: ITransactionBlock = {
														...availableTransactionBlock,
														id: getTimeBasedUniqueId(),
													};
													setTransactionBlocks((current) => current.concat(transactionBlock));
													setShowTransactionBlockSelect(false);
												}}
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
				{!!crossChainActions?.length && !processingCrossChainActionId && !editingTransactionBlock && (
					<>
						{crossChainActions.map((crossChainAction) => (
							<ActionPreview
								key={`preview-${crossChainAction.id}`}
								crossChainAction={crossChainAction}
								onRemove={() =>
									setCrossChainActions((current) =>
										current.filter(
											(currentCrossChainAction) =>
												currentCrossChainAction.id !== crossChainAction.id,
										),
									)
								}
								signButtonDisabled={crossChainAction.isEstimating || isSigningAction}
								showSignButton={!crossChainAction.useWeb3Provider}
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
												providerAddress,
											)
											: await submitEtherspotTransactionsBatch(
												getSdkForChainId(crossChainAction.chainId) as Sdk,
												crossChainAction.transactions,
											);

									if (
										result?.errorMessage ||
										(!result?.transactionHash?.length && !result?.batchHash?.length)
									) {
										setIsSigningAction(false);
										showAlertModal(result.errorMessage ?? 'Unable to send transaction!');
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
										[],
									);

									const mappedPendingCrossChainAction = {
										...crossChainAction,
										transactions: updatedTransactions,
										batchHash,
									};

									dispatchCrossChainActions(
										[mappedPendingCrossChainAction],
										CROSS_CHAIN_ACTION_STATUS.PENDING,
									);
									setCrossChainActions((current) =>
										current.filter(
											(currentCrossChainAction) =>
												currentCrossChainAction.id !== crossChainAction.id,
										),
									);
									setIsSigningAction(false);
									showAlertModal('Transaction sent!');
								}}
								onEdit={() =>
									setEditingTransactionBlock(
										transactionBlocks.find(
											(transactionBlock) =>
												transactionBlock.id === crossChainAction.relatedTransactionBlockId,
										) ?? null,
									)
								}
								showEditButton
							/>
						))}
						<PrimaryButton
							marginTop={30}
							onClick={onSubmitClick}
							disabled={isSubmitting || isEstimatingCrossChainActions}
						>
							{isSubmitting && !isEstimatingCrossChainActions && 'Executing...'}
							{isEstimatingCrossChainActions && !isSubmitting && 'Estimating...'}
							{!isSubmitting && !isEstimatingCrossChainActions && 'Execute'}
						</PrimaryButton>
						<br />
						<SecondaryButton marginTop={10} onClick={() => setCrossChainActions([])} disabled={isSubmitting}>
							Go back
						</SecondaryButton>
					</>
				)}
			</div>
			{showMenu && (
				<MenuWrapper>
					<MenuItem>
						<a href='https://dashboard.etherspot.io' title='Dashboard' target='_blank'>
							Dashboard
						</a>
					</MenuItem>
					<MenuItem
						onClick={() => {
							hideMenu();
							showModal(<History />);
						}}
					>
						History
					</MenuItem>
					<MenuItem>
						<a href='https://etherspot.io/' title='About Etherspot' target='_blank'>
							About Etherspot
						</a>
					</MenuItem>
					{showMenuLogout && (
						<MenuItem onClick={logout}>
							Logout
						</MenuItem>
					)}
				</MenuWrapper>
			)}
		</TransactionBuilderContext.Provider>
	);
};

export default TransactionBuilderContextProvider;

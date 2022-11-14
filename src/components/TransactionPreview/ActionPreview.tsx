import React, { useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';
import { HiOutlinePencilAlt } from 'react-icons/hi';
import { BsClockHistory, BiCheck, IoClose, FaSignature } from 'react-icons/all';

import { getTransactionExplorerLink, isERC20ApprovalTransactionData } from '../../utils/transaction';
import { TRANSACTION_BLOCK_TYPE } from '../../constants/transactionBuilderConstants';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';
import { formatAmountDisplay, humanizeHexString } from '../../utils/common';
import { CROSS_CHAIN_ACTION_STATUS } from '../../constants/transactionDispatcherConstants';
import { nativeAssetPerChainId, supportedChains } from '../../utils/chain';
import Card from '../Card';
import { CombinedRoundedImages, RoundedImage } from '../Image';
import { ClickableText, Text } from '../Text';
import { Theme } from '../../utils/theme';
import { useEtherspot } from '../../hooks';
import moment from 'moment';
import { ICrossChainAction } from '../../types/crossChainAction';

const TransactionAction = styled.div`
	position: relative;
	margin-bottom: 18px;
	background: ${({ theme }) => theme.color.background.selectInput};
	color: ${({ theme }) => theme.color.text.selectInput};
	border-radius: 8px;
	padding: 8px 14px;
	word-break: break-all;
`;

const TransactionStatusAction = styled.div`
	margin-bottom: 18px;
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
`;

const DoubleTransactionActionsInSingleRow = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: stretch;

	${TransactionAction}:first-child {
		margin-right: 13px;
		width: calc(50% - 13px);
	}

	${TransactionAction}:last-child {
		width: 50%;
	}
`;

const Label = styled.label`
	display: inline-block;
	color: ${({ theme }) => theme.color.text.innerLabel};
	margin-bottom: 14px;
	font-size: 14px;
`;

const ValueWrapper = styled.div<{ marginTop?: number }>`
	display: flex;
	flex-direction: row;
	align-items: center;
	${({ marginTop }) => marginTop && `margin-top: ${marginTop}px;`}
`;

const ValueBlock = styled.div`
	margin-right: 20px;
`;

const SignButton = styled(FaSignature)<{ disabled?: boolean }>`
	margin-right: 10px;
	padding: 5px;
	cursor: pointer;

	&:hover {
		opacity: 0.5;
	}

	${({ disabled }) => disabled && `opacity: 0.5;`}
`;

const EditButton = styled(HiOutlinePencilAlt)<{ disabled?: boolean }>`
	margin-right: 10px;
	padding: 5px;
	cursor: pointer;

	&:hover {
		opacity: 0.5;
	}

	${({ disabled }) => disabled && `opacity: 0.5;`}
`;

const TransactionStatusWrapper = styled(TransactionAction)`
	padding: 18px 14px;
	margin-bottom: 0;
	flex: 1;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
`;

const TransactionStatusMessageWrapper = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
`;

const TransactionStatusClock = styled(Text).attrs({ medium: true })`
	color: ${({ theme }) => theme.color.text.outerLabel};
	font-size: 16px;
	margin-right: 12px;
`;

const StatusIconWrapper = styled.span<{ color?: string }>`
	display: inline-block;
	width: 24px;
	height: 24px;
	border-radius: 12px;
	${({ color }) => color && `background: ${color};`}
	color: #fff;
	margin-right: 10px;
	text-align: center;
`;

const RouteWrapper = styled.div`
	position: relative;
	background: ${({ theme }) => theme.color.background.card};
	color: ${({ theme }) => theme.color.text.selectInput};
	border-radius: 8px;
	padding: 8px 14px;
	word-break: break-all;
	margin-top: 6px;
	margin-bottom: 14px;
`;

const Row = styled.div.attrs((props: { center: boolean }) => props)`
	display: flex;
	flex-direction: row;
	${({ center }) => center && 'align-items: center;'};
`;

interface TransactionPreviewInterface {
	crossChainAction: ICrossChainAction;
	onRemove?: () => void;
	onSign?: () => void;
	onEdit?: () => void;
	signButtonDisabled?: boolean;
	editButtonDisabled?: boolean;
	showEditButton?: boolean;
	showSignButton?: boolean;
}

const TransactionStatus = ({ crossChainAction }: { crossChainAction: ICrossChainAction }) => {
	const theme: Theme = useTheme();
	const { getSdkForChainId } = useEtherspot();
	const [isGettingExplorerLink, setIsGettingExplorerLink] = useState<boolean>(false);
	const [, setSecondsAfter] = useState<number>(0);

	const { chainId, batchHash: transactionsBatchHash } = crossChainAction;

	const previewTransaction = (transactionHash?: string) => {
		const explorerLink = getTransactionExplorerLink(chainId, transactionHash);
		if (!explorerLink) {
			alert('Transaction hash not yet available!');
			return;
		}

		window.open(explorerLink, '_blank');
	};

	const previewBatchTransaction = async () => {
		if (isGettingExplorerLink) return;

		setIsGettingExplorerLink(true);

		const sdk = getSdkForChainId(chainId);
		if (!transactionsBatchHash || !sdk) {
			alert('Transaction hash not yet available!');
			setIsGettingExplorerLink(false);
			return;
		}

		let transactionHash = '';
		try {
			const submittedBatch = await sdk.getGatewaySubmittedBatch({ hash: transactionsBatchHash });
			const { transaction } = submittedBatch;
			transactionHash = transaction?.hash ?? '';
		} catch (e) {
			//
		}

		setIsGettingExplorerLink(false);
		previewTransaction(transactionHash);
	};

	useEffect(() => {
		if (crossChainAction.transactions.every((transaction) => !!transaction.finishTimestamp)) return;
		let intervalId = setInterval(() => setSecondsAfter((current) => current + 1), 1000);
		return () => {
			if (!intervalId) return;
			clearInterval(intervalId);
		};
	}, []);

	// only show first on sdk batch transactions
	const statusPreviewTransactions = crossChainAction.useWeb3Provider
		? crossChainAction.transactions
		: [crossChainAction.transactions[0]];

	return (
		<>
			{statusPreviewTransactions.map((transaction, index) => {
				const transactionStatus = transaction.status || CROSS_CHAIN_ACTION_STATUS.PENDING;

				const actionStatusToTitle: { [transactionStatus: string]: string } = {
					[CROSS_CHAIN_ACTION_STATUS.UNSENT]: 'Waiting for submit',
					[CROSS_CHAIN_ACTION_STATUS.PENDING]: 'Waiting for transaction',
					[CROSS_CHAIN_ACTION_STATUS.FAILED]: 'Transaction failed',
					[CROSS_CHAIN_ACTION_STATUS.REJECTED_BY_USER]: 'Rejected by user',
					[CROSS_CHAIN_ACTION_STATUS.CONFIRMED]: 'Transaction approved',
				};

				const actionStatusToIconBackgroundColor: { [transactionStatus: string]: string | undefined } = {
					[CROSS_CHAIN_ACTION_STATUS.UNSENT]: theme?.color?.background?.statusIconPending,
					[CROSS_CHAIN_ACTION_STATUS.PENDING]: theme?.color?.background?.statusIconPending,
					[CROSS_CHAIN_ACTION_STATUS.FAILED]: theme?.color?.background?.statusIconFailed,
					[CROSS_CHAIN_ACTION_STATUS.REJECTED_BY_USER]: theme?.color?.background?.statusIconFailed,
					[CROSS_CHAIN_ACTION_STATUS.CONFIRMED]: theme?.color?.background?.statusIconSuccess,
				};

				const actionStatusIconBackgroundColor = actionStatusToIconBackgroundColor[transactionStatus];
				const actionStatusTitle = actionStatusToTitle[transactionStatus];

				if (!actionStatusTitle) return null;

				const showAsApproval =
					crossChainAction.useWeb3Provider && isERC20ApprovalTransactionData(transaction.data as string);

				return (
					<TransactionStatusAction
						key={`tx-status-${
							transaction.transactionHash || crossChainAction.batchHash || 'no-hash'
						}-${index}`}
					>
						{transaction?.submitTimestamp && transactionStatus === CROSS_CHAIN_ACTION_STATUS.PENDING && (
							<TransactionStatusClock>
								{!!transaction.finishTimestamp &&
									moment(
										moment(transaction.finishTimestamp).diff(moment(transaction.submitTimestamp)),
									).format('mm:ss')}
								{!transaction.finishTimestamp &&
									moment(moment().diff(moment(transaction.submitTimestamp))).format('mm:ss')}
							</TransactionStatusClock>
						)}
						<TransactionStatusWrapper>
							<TransactionStatusMessageWrapper>
								{!!actionStatusIconBackgroundColor && (
									<StatusIconWrapper color={actionStatusIconBackgroundColor}>
										{transactionStatus === CROSS_CHAIN_ACTION_STATUS.CONFIRMED && (
											<BiCheck size={16} />
										)}
										{transactionStatus === CROSS_CHAIN_ACTION_STATUS.PENDING && (
											<BsClockHistory size={14} />
										)}
										{transactionStatus === CROSS_CHAIN_ACTION_STATUS.UNSENT && (
											<BsClockHistory size={14} />
										)}
										{transactionStatus === CROSS_CHAIN_ACTION_STATUS.FAILED && (
											<IoClose size={15} />
										)}
										{transactionStatus === CROSS_CHAIN_ACTION_STATUS.REJECTED_BY_USER && (
											<IoClose size={15} />
										)}
									</StatusIconWrapper>
								)}
								<Text size={16} medium>
									{showAsApproval ? `Approve: ${actionStatusTitle.toLowerCase()}` : actionStatusTitle}
								</Text>
							</TransactionStatusMessageWrapper>
							{transaction?.submitTimestamp && (
								<ClickableText
									disabled={isGettingExplorerLink}
									onClick={() => {
										if (crossChainAction.useWeb3Provider)
											return previewTransaction(transaction.transactionHash);
										previewBatchTransaction();
									}}
								>
									<Text size={16} color={theme?.color?.text?.transactionStatusLink} medium>
										Tx
									</Text>
								</ClickableText>
							)}
						</TransactionStatusWrapper>
					</TransactionStatusAction>
				);
			})}
		</>
	);
};

const ActionPreview = ({
	crossChainAction,
	onRemove,
	onSign,
	onEdit,
	signButtonDisabled = false,
	editButtonDisabled = false,
	showSignButton = false,
	showEditButton = false,
}: TransactionPreviewInterface) => {
	const { accountAddress, providerAddress } = useEtherspot();

	const theme: Theme = useTheme();

	const { preview, chainId, type, estimated, isEstimating } = crossChainAction;

	const onCopy = async (valueToCopy: string) => {
		try {
			await navigator.clipboard.writeText(valueToCopy);
			alert('Copied!');
		} catch (e) {
			//
		}
	};

	const onEditButtonClick = () => {
		if (editButtonDisabled || !onEdit) return;
		onEdit();
	};

	const onSignButtonClick = () => {
		if (signButtonDisabled || !onSign) return;
		onSign();
	};

	const showCloseButton = !!onRemove;

	const cost = useMemo(() => {
		if (isEstimating) return 'Estimating...';
		if (!estimated || !estimated?.gasCost) return estimated?.errorMessage;

		const gasCostNumericString = ethers.utils.formatUnits(
			estimated.gasCost,
			nativeAssetPerChainId[chainId].decimals,
		);
		const gasCostFormatted = `${formatAmountDisplay(gasCostNumericString)} ${
			nativeAssetPerChainId[chainId].symbol
		}`;
		if (!estimated.usdPrice) return gasCostFormatted;

		return formatAmountDisplay(`${+gasCostNumericString * +estimated.usdPrice}`, '$');
	}, [isEstimating, estimated]);

	const additionalTopButtons = [
		showSignButton && <SignButton disabled={signButtonDisabled} onClick={onSignButtonClick} />,
		showEditButton && <EditButton disabled={editButtonDisabled} onClick={onEditButtonClick} />,
	];

	if (type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE) {
		const { fromAsset, fromChainId } = preview;

		const fromNetwork = supportedChains.find((supportedChain) => supportedChain.chainId === fromChainId);

		const fromChainTitle = fromNetwork?.title ?? CHAIN_ID_TO_NETWORK_NAME[fromChainId].toUpperCase();

		const fromAmount = formatAmountDisplay(ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals));

		return (
			<Card
				title='Klima Staking'
				marginBottom={20}
				onCloseButtonClick={onRemove}
				showCloseButton={showCloseButton}
				additionalTopButtons={additionalTopButtons}
			>
				<DoubleTransactionActionsInSingleRow>
					<TransactionAction>
						<Label>You send</Label>
						<ValueWrapper>
							<CombinedRoundedImages
								title={fromAsset.symbol}
								url={fromAsset.iconUrl}
								smallImageTitle={fromChainTitle}
								smallImageUrl={fromNetwork?.iconUrl}
							/>
							<div>
								<Text size={16} marginBottom={1} medium block>
									{fromAmount} {fromAsset.symbol}
								</Text>
								<Text size={12}>On {fromChainTitle}</Text>
							</div>
						</ValueWrapper>
					</TransactionAction>
				</DoubleTransactionActionsInSingleRow>

				<TransactionAction>
					<Label>Route</Label>
					<ValueWrapper>
						{!!cost && (
							<ValueBlock>
								<Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>
									Gas price
								</Text>
								<Text size={16} medium>
									{cost}
								</Text>
							</ValueBlock>
						)}
					</ValueWrapper>
				</TransactionAction>
				<TransactionStatus crossChainAction={crossChainAction} />
			</Card>
		);
	}

	if (type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE) {
		const { fromAsset, toAsset, fromChainId, toChainId, providerName, providerIconUrl, receiverAddress } = preview;

		const fromNetwork = supportedChains.find((supportedChain) => supportedChain.chainId === fromChainId);
		const toNetwork = supportedChains.find((supportedChain) => supportedChain.chainId === toChainId);

		const fromChainTitle = fromNetwork?.title ?? CHAIN_ID_TO_NETWORK_NAME[fromChainId].toUpperCase();
		const toChainTitle = toNetwork?.title ?? CHAIN_ID_TO_NETWORK_NAME[toChainId].toUpperCase();

		const fromAmount = formatAmountDisplay(ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals));
		const toAmount = formatAmountDisplay(ethers.utils.formatUnits(toAsset.amount, toAsset.decimals));

		const senderAddress = crossChainAction.useWeb3Provider ? providerAddress : accountAddress;

		return (
			<Card
				title='Asset bridge'
				marginBottom={20}
				onCloseButtonClick={onRemove}
				showCloseButton={showCloseButton}
				additionalTopButtons={additionalTopButtons}
			>
				<DoubleTransactionActionsInSingleRow>
					<TransactionAction>
						<Label>You send</Label>
						<ValueWrapper>
							<CombinedRoundedImages
								title={fromAsset.symbol}
								url={fromAsset.iconUrl}
								smallImageTitle={fromChainTitle}
								smallImageUrl={fromNetwork?.iconUrl}
							/>
							<div>
								<Text size={16} marginBottom={1} medium block>
									{fromAmount} {fromAsset.symbol}
								</Text>
								<Text size={12}>On {fromChainTitle}</Text>
							</div>
						</ValueWrapper>
					</TransactionAction>
					<TransactionAction>
						<Label>You receive</Label>
						<ValueWrapper>
							<CombinedRoundedImages
								title={toAsset.symbol}
								url={toAsset.iconUrl}
								smallImageTitle={toChainTitle}
								smallImageUrl={toNetwork?.iconUrl}
							/>
							<div>
								<Text size={16} marginBottom={3} medium block>
									{toAmount} {toAsset.symbol}
								</Text>
								<Text size={12}>On {toChainTitle}</Text>
							</div>
						</ValueWrapper>
					</TransactionAction>
				</DoubleTransactionActionsInSingleRow>
				{!!senderAddress && !!receiverAddress && (
					<TransactionAction>
						<Text size={16} medium>
							<>
								From &nbsp;
								<ClickableText onClick={() => onCopy(senderAddress)}>
									{humanizeHexString(senderAddress)}
								</ClickableText>
								&nbsp;
							</>
							to &nbsp;
							<ClickableText onClick={() => onCopy(receiverAddress)}>
								{humanizeHexString(receiverAddress)}
							</ClickableText>
						</Text>
					</TransactionAction>
				)}
				<TransactionAction>
					<Label>Route</Label>
					<ValueWrapper>
						<RoundedImage title={providerName ?? 'Unknown'} url={providerIconUrl} />
						<ValueBlock>
							<Text size={12} marginBottom={2} medium block>
								{providerName}
							</Text>
							<Text size={16} medium>
								{toAmount} {toAsset.symbol}{' '}
							</Text>
						</ValueBlock>
						{!!cost && (
							<ValueBlock>
								<Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>
									Gas price
								</Text>
								<Text size={16} medium>
									{cost}
								</Text>
							</ValueBlock>
						)}
					</ValueWrapper>
				</TransactionAction>
				<TransactionStatus crossChainAction={crossChainAction} />
			</Card>
		);
	}

	if (type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) {
		const { asset, chainId, fromAddress } = preview;
		const receiverAddress = preview.receiverAddress as string;

		const network = supportedChains.find((supportedChain) => supportedChain.chainId === chainId);
		const chainTitle = network?.title ?? CHAIN_ID_TO_NETWORK_NAME[chainId].toUpperCase();

		const amount = formatAmountDisplay(ethers.utils.formatUnits(asset.amount, asset.decimals));

		return (
			<Card
				title='Send asset'
				marginBottom={20}
				onCloseButtonClick={onRemove}
				showCloseButton={showCloseButton}
				additionalTopButtons={additionalTopButtons}
			>
				<TransactionAction>
					<Label>You send</Label>
					<ValueWrapper>
						<CombinedRoundedImages
							title={asset.symbol}
							url={asset.iconUrl}
							smallImageTitle={chainTitle}
							smallImageUrl={network?.iconUrl}
						/>
						<ValueBlock>
							<Text size={16} marginBottom={1} medium block>
								{amount} {asset.symbol}
							</Text>
							<Text size={12}>On {chainTitle}</Text>
						</ValueBlock>
						<ValueBlock>
							<Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>
								Gas price
							</Text>
							<Text size={16} medium>
								{cost ?? 'N/A'}
							</Text>
						</ValueBlock>
					</ValueWrapper>
				</TransactionAction>
				<TransactionAction>
					<Text size={16} medium>
						{!!fromAddress && (
							<>
								From &nbsp;
								<ClickableText onClick={() => onCopy(fromAddress)}>
									{humanizeHexString(fromAddress)}
								</ClickableText>
								&nbsp;
							</>
						)}
						{fromAddress ? 'to' : 'To'}
						&nbsp;
						<ClickableText onClick={() => onCopy(receiverAddress)}>
							{humanizeHexString(receiverAddress)}
						</ClickableText>
					</Text>
				</TransactionAction>
				<TransactionStatus crossChainAction={crossChainAction} />
			</Card>
		);
	}

	if (type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP) {
		const previewList = crossChainAction?.batchTransactions?.length
			? crossChainAction?.batchTransactions.map((action) =>
					action.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP ? action.preview : null,
			  )
			: [crossChainAction.preview];

		const network = supportedChains.find((supportedChain) => supportedChain.chainId === chainId);
		const chainTitle = network?.title ?? CHAIN_ID_TO_NETWORK_NAME[chainId].toUpperCase();

		return (
			<Card
				title='Swap asset'
				marginBottom={20}
				onCloseButtonClick={onRemove}
				showCloseButton={showCloseButton}
				additionalTopButtons={additionalTopButtons}
			>
				{previewList.map((preview) => {
					if (!preview) return null;
					const { fromAsset, toAsset } = preview;

					const fromAmount = formatAmountDisplay(
						ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals),
					);
					const toAmount = formatAmountDisplay(ethers.utils.formatUnits(toAsset.amount, toAsset.decimals));

					return (
						<DoubleTransactionActionsInSingleRow>
							<TransactionAction>
								<Label>You send</Label>
								<ValueWrapper>
									<CombinedRoundedImages
										title={fromAsset.symbol}
										url={fromAsset.iconUrl}
										smallImageTitle={chainTitle}
										smallImageUrl={network?.iconUrl}
									/>
									<div>
										<Text size={16} marginBottom={1} medium block>
											{fromAmount} {fromAsset.symbol}
										</Text>
										<Text size={12}>On {chainTitle}</Text>
									</div>
								</ValueWrapper>
							</TransactionAction>
							<TransactionAction>
								<Label>You receive</Label>
								<ValueWrapper>
									<CombinedRoundedImages
										title={toAsset.symbol}
										url={toAsset.iconUrl}
										smallImageTitle={chainTitle}
										smallImageUrl={network?.iconUrl}
									/>
									<div>
										<Text size={16} marginBottom={3} medium block>
											{toAmount} {toAsset.symbol}
										</Text>
										<Text size={12}>On {chainTitle}</Text>
									</div>
								</ValueWrapper>
							</TransactionAction>
						</DoubleTransactionActionsInSingleRow>
					);
				})}

				{previewList.length > 1 && (
					<TransactionAction>
						<Text size={16} medium>
							{`${previewList.length} swaps are batched in one transaction`}
						</Text>
					</TransactionAction>
				)}

				<TransactionAction>
					<Label>Route</Label>
					{!!cost && (
						<Row center>
							<Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>
								Gas price
							</Text>
							<Text size={14} marginLeft={4} medium>
								{cost}
							</Text>
						</Row>
					)}

					<RouteWrapper>
						{previewList.map((preview) => {
							if (!preview) return null;
							const { fromAsset, toAsset, providerName, providerIconUrl } = preview;

							const fromAmount = formatAmountDisplay(
								ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals),
							);
							const toAmount = formatAmountDisplay(
								ethers.utils.formatUnits(toAsset.amount, toAsset.decimals),
							);
							return (
								<Row>
									<RoundedImage
										style={{ marginTop: 2 }}
										title={providerName}
										url={providerIconUrl}
										size={10}
									/>
									<ValueBlock>
										<Text size={12} marginBottom={2} regular block>
											{`Swap on ${chainTitle} via ${providerName}`}
										</Text>
										<Text size={12} regular block>
											{`${fromAmount} ${fromAsset.symbol} → ${toAmount} ${toAsset.symbol}`}
										</Text>
									</ValueBlock>
								</Row>
							);
						})}
					</RouteWrapper>
				</TransactionAction>
				<TransactionStatus crossChainAction={crossChainAction} />
			</Card>
		);
	}

	return null;
};

export default ActionPreview;

import React, { useEffect, useMemo, useState } from "react";
import styled, { useTheme } from "styled-components";
import { ethers } from "ethers";
import { HiOutlinePencilAlt } from "react-icons/hi";
import { BsClockHistory, BiCheck, IoClose, FaSignature } from "react-icons/all";
import { CHAIN_ID_TO_NETWORK_NAME } from "etherspot/dist/sdk/network/constants";

// Components
import Card from "../Card";
import { ClickableText, Text } from "../Text";
import RouteOption from "../RouteOption";
import { CombinedRoundedImages, RoundedImage } from "../Image";

// Utils
import {
  getTransactionExplorerLink,
  isERC20ApprovalTransactionData,
} from "../../utils/transaction";
import { formatAmountDisplay, humanizeHexString } from "../../utils/common";
import { CHAIN_ID, nativeAssetPerChainId, supportedChains } from "../../utils/chain";
import { Theme } from "../../utils/theme";

// Constants
import { TRANSACTION_BLOCK_TYPE } from "../../constants/transactionBuilderConstants";
import { CROSS_CHAIN_ACTION_STATUS } from "../../constants/transactionDispatcherConstants";
import moment from "moment";

// Hooks
import { useEtherspot } from "../../hooks";

// Types
import { ICrossChainAction } from "../../types/crossChainAction";

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

const SignButton = styled(FaSignature) <{ disabled?: boolean }>`
	margin-right: 10px;
	padding: 5px;
	cursor: pointer;

  &:hover {
    opacity: 0.5;
  }

  ${({ disabled }) => disabled && `opacity: 0.5;`}
`;

const EditButton = styled(HiOutlinePencilAlt) <{ disabled?: boolean }>`
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
  setIsTransactionDone?: (value: boolean) => void;
  showStatus?: boolean;
}

const TransactionStatus = ({
  crossChainAction,
  setIsTransactionDone
}: {
  crossChainAction: ICrossChainAction;
  setIsTransactionDone: (value: boolean) => void;
}) => {
  const theme: Theme = useTheme();
  const { getSdkForChainId } = useEtherspot();
  const [isGettingExplorerLink, setIsGettingExplorerLink] = useState<boolean>(false);
  const [, setSecondsAfter] = useState<number>(0);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);

  const { chainId, batchHash: transactionsBatchHash } = crossChainAction;

  const previewTransaction = (transactionHash?: string) => {
    // show cross chain tx explorer link if bridge action
    if (crossChainAction.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE) {
      const explorerLink = crossChainAction?.preview?.route?.steps?.[0]?.tool === 'connext'
        ? 'https://connextscan.io/tx'
        : 'https://socketscan.io/tx';
      window.open(`${explorerLink}/${transactionHash}`, '_blank');
      return;
    }

    const explorerLink = getTransactionExplorerLink(chainId, transactionHash);
    if (!explorerLink) {
      alert("The transaction hash is not yet available. Please try again later.");
      return;
    }

    window.open(explorerLink, '_blank');
  };

  const previewBatchTransaction = async () => {
    if (isGettingExplorerLink) return;

    setIsGettingExplorerLink(true);

    const sdk = getSdkForChainId(chainId);
    if (!transactionsBatchHash || !sdk) {
      alert("The transaction hash is not yet available. Please try again later.");
      setIsGettingExplorerLink(false);
      return;
    }

    let transactionHash = "";
    try {
      const submittedBatch = await sdk.getGatewaySubmittedBatch({
        hash: transactionsBatchHash,
      });
      const { transaction } = submittedBatch;
      transactionHash = transaction?.hash ?? "";
    } catch (e) {
      //
    }

    setIsGettingExplorerLink(false);
    previewTransaction(transactionHash);
  };

  useEffect(() => {
    if (
      crossChainAction.transactions.every(
        (transaction) => !!transaction.finishTimestamp
      )
    )
      return;
    let intervalId = setInterval(
      () => setSecondsAfter((current) => current + 1),
      1000
    );
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
        const transactionStatus =
          transaction.status || CROSS_CHAIN_ACTION_STATUS.PENDING;

        const actionStatusToTitle: { [transactionStatus: string]: string } = {
          [CROSS_CHAIN_ACTION_STATUS.UNSENT]: "Sign message",
          [CROSS_CHAIN_ACTION_STATUS.PENDING]: "Waiting for transaction",
          [CROSS_CHAIN_ACTION_STATUS.FAILED]: "Transaction failed",
          [CROSS_CHAIN_ACTION_STATUS.REJECTED_BY_USER]: "Rejected by user",
          [CROSS_CHAIN_ACTION_STATUS.CONFIRMED]: "Transaction approved",
        };

        const actionStatusToIconBackgroundColor: {
          [transactionStatus: string]: string | undefined;
        } = {
          [CROSS_CHAIN_ACTION_STATUS.UNSENT]:
            theme?.color?.background?.statusIconPending,
          [CROSS_CHAIN_ACTION_STATUS.PENDING]:
            theme?.color?.background?.statusIconPending,
          [CROSS_CHAIN_ACTION_STATUS.FAILED]:
            theme?.color?.background?.statusIconFailed,
          [CROSS_CHAIN_ACTION_STATUS.REJECTED_BY_USER]:
            theme?.color?.background?.statusIconFailed,
          [CROSS_CHAIN_ACTION_STATUS.CONFIRMED]:
            theme?.color?.background?.statusIconSuccess,
        };

        const actionStatusIconBackgroundColor =
          actionStatusToIconBackgroundColor[transactionStatus];
        const actionStatusTitle = actionStatusToTitle[transactionStatus];

        if (!actionStatusTitle) return null;

        const showAsApproval =
          crossChainAction.useWeb3Provider &&
          isERC20ApprovalTransactionData(transaction.data as string);

        const getStatusComponent = useMemo(() => {
          switch (transactionStatus) {
            case CROSS_CHAIN_ACTION_STATUS.CONFIRMED:
              return <BiCheck size={16} />;
            case CROSS_CHAIN_ACTION_STATUS.PENDING:
              return <BsClockHistory size={14} />;
            case CROSS_CHAIN_ACTION_STATUS.UNSENT:
              return <BsClockHistory size={14} />;
            case CROSS_CHAIN_ACTION_STATUS.FAILED:
              return <IoClose size={15} />;
            case CROSS_CHAIN_ACTION_STATUS.REJECTED_BY_USER:
              return <IoClose size={15} />;
            default:
              return null;
          }
        }, [transactionStatus]);

        useEffect(() => {
          let timeout: any;
          if (
            transactionStatus !== CROSS_CHAIN_ACTION_STATUS.UNSENT &&
            !prevStatus
          ) {
            setPrevStatus(transactionStatus);
            timeout = setTimeout(() => {
              setPrevStatus(null);
            }, 2000);
          }
          if (
            (transactionStatus === CROSS_CHAIN_ACTION_STATUS.CONFIRMED ||
            transactionStatus === CROSS_CHAIN_ACTION_STATUS.FAILED) &&
            setIsTransactionDone
          ){
            setIsTransactionDone(true)
          }
            if (timeout) {
              //@ts-ignore
              return () => clearTimeout(timeout);
            }
        }, [transactionStatus]);

        return (
          <TransactionStatusAction
            key={`tx-status-${
              transaction.transactionHash ||
              crossChainAction.batchHash ||
              "no-hash"
            }-${index}`}
          >
            {prevStatus ? (
              <TransactionStatusWrapper>
                <TransactionStatusMessageWrapper>
                  <StatusIconWrapper
                    color={theme?.color?.background?.statusIconSuccess}
                  >
                    <BiCheck size={16} />
                  </StatusIconWrapper>
                </TransactionStatusMessageWrapper>
              </TransactionStatusWrapper>
            ) : (
              <>
                {transaction?.submitTimestamp &&
                  transactionStatus === CROSS_CHAIN_ACTION_STATUS.PENDING && (
                    <TransactionStatusClock>
                      {!!transaction.finishTimestamp &&
                        moment(
                          moment(transaction.finishTimestamp).diff(
                            moment(transaction.submitTimestamp)
                          )
                        ).format("mm:ss")}
                      {!transaction.finishTimestamp &&
                        moment(
                          moment().diff(moment(transaction.submitTimestamp))
                        ).format("mm:ss")}
                    </TransactionStatusClock>
                  )}
                <TransactionStatusWrapper>
                  <TransactionStatusMessageWrapper>
                    {!!actionStatusIconBackgroundColor && (
                      <StatusIconWrapper
                        color={actionStatusIconBackgroundColor}
                      >
                        {getStatusComponent}
                      </StatusIconWrapper>
                    )}
                    <Text size={16} medium>
                      {showAsApproval
                        ? `Aprove: ${actionStatusTitle.toLowerCase()}`
                        : actionStatusTitle}
                    </Text>
                  </TransactionStatusMessageWrapper>
                  {transaction?.submitTimestamp && (
                    <ClickableText
                      disabled={isGettingExplorerLink}
                      onClick={() => {
                        if (crossChainAction.useWeb3Provider) {
                          return previewTransaction(transaction.transactionHash);
                        }
                        previewBatchTransaction();
                      }}
                    >
                      <Text
                        size={16}
                        color={theme?.color?.text?.transactionStatusLink}
                        medium
                      >
                        Tx
                      </Text>
                    </ClickableText>
                  )}
                </TransactionStatusWrapper>
              </>
            )}
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
  setIsTransactionDone,
  showStatus = true,
}: TransactionPreviewInterface) => {
	const { accountAddress, providerAddress } = useEtherspot();

	const theme: Theme = useTheme();

	const { preview, chainId, type, estimated, isEstimating } = crossChainAction;

  const onCopy = (valueToCopy: string) => {
      navigator.clipboard.writeText(valueToCopy).then((res) => {
        alert("Copied!");
      }).catch((err) => {
        //
      });
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
    if (isEstimating) return "Estimating...";
    if (!estimated || !estimated?.gasCost) return estimated?.errorMessage;

    const gasCostNumericString = ethers.utils.formatUnits(
      estimated.gasCost,
      nativeAssetPerChainId[chainId].decimals
    );
    const gasCostFormatted = `${formatAmountDisplay(gasCostNumericString)} ${
      nativeAssetPerChainId[chainId].symbol
    }`;
    if (!estimated.usdPrice) return gasCostFormatted;

    return formatAmountDisplay(
      `${+gasCostNumericString * +estimated.usdPrice}`,
      "$"
    );
  }, [isEstimating, estimated]);

  const additionalTopButtons = [
    showSignButton && (
      <SignButton disabled={signButtonDisabled} onClick={onSignButtonClick} />
    ),
    showEditButton && (
      <EditButton disabled={editButtonDisabled} onClick={onEditButtonClick} />
    ),
  ];

	if (type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE) {
		const { fromAsset, fromChainId, toAsset, providerName, providerIconUrl, receiverAddress } = preview;

		const fromNetwork = supportedChains.find((supportedChain) => supportedChain.chainId === fromChainId);

		const toNetwork = supportedChains[1];

		const toChainTitle = toNetwork?.title ?? CHAIN_ID_TO_NETWORK_NAME[CHAIN_ID.POLYGON].toUpperCase();

		const fromChainTitle = fromNetwork?.title ?? CHAIN_ID_TO_NETWORK_NAME[fromChainId].toUpperCase();

		const fromAmount = formatAmountDisplay(ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals));
		const toAmount = formatAmountDisplay(ethers.utils.formatUnits(toAsset.amount, toAsset.decimals));

		const senderAddress = crossChainAction.useWeb3Provider ? providerAddress : accountAddress;

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
				<TransactionStatus crossChainAction={crossChainAction} setIsTransactionDone={setIsTransactionDone ? setIsTransactionDone : (value: boolean) => {}} />
			</Card>
		);
	}

	if (type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE) {
		const { fromAsset, toAsset, fromChainId, toChainId, receiverAddress, route } = preview;

    const fromNetwork = supportedChains.find(
      (supportedChain) => supportedChain.chainId === fromChainId
    );
    const toNetwork = supportedChains.find(
      (supportedChain) => supportedChain.chainId === toChainId
    );

    const fromChainTitle =
      fromNetwork?.title ?? CHAIN_ID_TO_NETWORK_NAME[fromChainId].toUpperCase();
    const toChainTitle =
      toNetwork?.title ?? CHAIN_ID_TO_NETWORK_NAME[toChainId].toUpperCase();

    const fromAmount = formatAmountDisplay(
      ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals)
    );
    const toAmount = formatAmountDisplay(
      ethers.utils.formatUnits(toAsset.amount, toAsset.decimals)
    );

    const senderAddress = crossChainAction.useWeb3Provider
      ? providerAddress
      : accountAddress;

    return (
      <Card
        title="Asset bridge"
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
        {!!route && (
          <TransactionAction>
            <Label>Route</Label>
            <RouteOption route={route} showActions />
          </TransactionAction>
        )}
        {showStatus && <TransactionStatus crossChainAction={crossChainAction} setIsTransactionDone={setIsTransactionDone ? setIsTransactionDone : (value: boolean) => {}} />}
      </Card>
    );
  }

  if (type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) {
    const previewList = crossChainAction?.batchTransactions?.length
      ? crossChainAction?.batchTransactions.map((action) =>
          action.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET
            ? action.preview
            : null
        )
      : [crossChainAction.preview];

    const network = supportedChains.find(
      (supportedChain) => supportedChain.chainId === chainId
    );
    const chainTitle =
      network?.title ?? CHAIN_ID_TO_NETWORK_NAME[chainId].toUpperCase();

    return (
      <Card
        title="Send asset"
        marginBottom={20}
        onCloseButtonClick={onRemove}
        showCloseButton={showCloseButton}
        additionalTopButtons={additionalTopButtons}
      >
        {previewList.map((preview) => {
          if (!preview) return null;

          const { asset, chainId, fromAddress } = preview;
          const amount = formatAmountDisplay(
            ethers.utils.formatUnits(asset.amount, asset.decimals)
          );
          const receiverAddress = preview.receiverAddress as string;

          return (
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
                  <Text
                    size={12}
                    marginBottom={2}
                    color={theme.color?.text?.innerLabel}
                    medium
                    block
                  >
                    Gas price
                  </Text>
                  <Text size={16} medium>
                    {cost ?? "N/A"}
                  </Text>
                </ValueBlock>
              </ValueWrapper>
              <ValueWrapper marginTop={8}>
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
                  {fromAddress ? "to" : "To"}
                  &nbsp;
                  <ClickableText onClick={() => onCopy(receiverAddress)}>
                    {humanizeHexString(receiverAddress)}
                  </ClickableText>
                </Text>
              </ValueWrapper>
            </TransactionAction>
          );
        })}

        {previewList.length > 1 && (
          <TransactionAction>
            <Text size={16} medium>
              {`${previewList.length} swaps are batched in one transaction`}
            </Text>
          </TransactionAction>
        )}

        {showStatus && <TransactionStatus crossChainAction={crossChainAction} setIsTransactionDone={setIsTransactionDone ? setIsTransactionDone : (value: boolean) => {}} />}
      </Card>
    );
  }

  if (type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP) {
    const previewList = crossChainAction?.batchTransactions?.length
      ? crossChainAction?.batchTransactions.map((action) =>
          action.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP
            ? action.preview
            : null
        )
      : [crossChainAction.preview];
    const multicallCount = crossChainAction.batchTransactions?.length
      ? crossChainAction.batchTransactions.reduce((acc, curr) => {
        return acc + Number(!!curr.multiCallData)
      }, 0)
      : 0;

    const network = supportedChains.find(
      (supportedChain) => supportedChain.chainId === chainId
    );
    const chainTitle =
      network?.title ?? CHAIN_ID_TO_NETWORK_NAME[chainId].toUpperCase();

    return (
      <Card
        title="Swap asset"
        marginBottom={20}
        onCloseButtonClick={onRemove}
        showCloseButton={showCloseButton}
        additionalTopButtons={additionalTopButtons}
      >
        {previewList.map((preview) => {
          if (!preview) return null;

          const { fromAsset, toAsset } = preview;
          const fromAmount = formatAmountDisplay(
            ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals)
          );
          const toAmount = formatAmountDisplay(
            ethers.utils.formatUnits(toAsset.amount, toAsset.decimals)
          );

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

        {previewList.length - multicallCount > 1 && (
          <TransactionAction>
            <Text size={16} medium>
              {`${previewList.length - multicallCount} swaps are batched in one transaction`}
            </Text>
          </TransactionAction>
        )}

        <TransactionAction>
          <Label>Route</Label>
          {!!cost && (
            <Row center>
              <Text
                size={12}
                marginBottom={2}
                color={theme.color?.text?.innerLabel}
                medium
                block
              >
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
              const { fromAsset, toAsset, providerName, providerIconUrl } =
                preview;

              const fromAmount = formatAmountDisplay(
                ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals)
              );
              const toAmount = formatAmountDisplay(
                ethers.utils.formatUnits(toAsset.amount, toAsset.decimals)
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
        {showStatus && <TransactionStatus crossChainAction={crossChainAction} setIsTransactionDone={setIsTransactionDone ? setIsTransactionDone : (value: boolean) => {}} />}
      </Card>
    );
  }

  return null;
};

export default ActionPreview;

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';
import { HiOutlinePencilAlt } from 'react-icons/hi';
import {
  BsClockHistory,
  BiCheck,
  IoClose,
} from 'react-icons/all';

import {
  CrossChainAction,
  getTransactionExplorerLink,
} from '../../utils/transaction';
import { TRANSACTION_BLOCK_TYPE } from '../../constants/transactionBuilderConstants';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';
import {
  formatAmountDisplay,
  humanizeHexString,
} from '../../utils/common';
import { CROSS_CHAIN_ACTION_STATUS } from '../../constants/transactionDispatcherConstants';
import {
  nativeAssetPerChainId,
  supportedChains,
} from '../../utils/chain';
import Card from '../Card';
import {
  CombinedRoundedImages,
  RoundedImage,
} from '../Image';
import { Text } from '../Text';
import { Theme } from '../../utils/theme';
import {
  useEtherspot,
} from '../../hooks';
import moment from 'moment';

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

const Clickable = styled.span<{ disabled?: boolean}>`
  display: inline-block;
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
  
  ${({ disabled }) => disabled && `opacity: 0.5;`}
`;

const SignButton = styled(HiOutlinePencilAlt)<{ disabled?: boolean }>`
  position: absolute;
  top: 12px;
  right: 40px;
  padding: 5px;
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

interface TransactionPreviewInterface {
  crossChainAction: CrossChainAction;
  onRemove?: () => void
  onSign?: () => void
  signButtonDisabled?: boolean
}

const TransactionStatus = ({ crossChainAction }: { crossChainAction: CrossChainAction }) => {
  const theme: Theme = useTheme();
  const { getSdkForChainId } = useEtherspot();
  const [isGettingExplorerLink, setIsGettingExplorerLink] = useState<boolean>(false);
  const [, setSecondsAfter] = useState<number>(0);

  const {
    chainId,
    status: crossChainActionStatus,
    batchHash: transactionsBatchHash,
  } = crossChainAction;

  const transactionStatus = crossChainActionStatus || CROSS_CHAIN_ACTION_STATUS.PENDING;

  const actionStatusToTitle: { [transactionStatus: string]: string } = {
    [CROSS_CHAIN_ACTION_STATUS.UNSENT]: 'Preparing transaction',
    [CROSS_CHAIN_ACTION_STATUS.PENDING]: 'Waiting for transaction',
    [CROSS_CHAIN_ACTION_STATUS.FAILED]: 'Transaction failed',
    [CROSS_CHAIN_ACTION_STATUS.CONFIRMED]: 'Transaction approved',
  };

  const actionStatusToIconBackgroundColor: { [transactionStatus: string]: string | undefined } = {
    [CROSS_CHAIN_ACTION_STATUS.UNSENT]: theme?.color?.background?.statusIconPending,
    [CROSS_CHAIN_ACTION_STATUS.PENDING]: theme?.color?.background?.statusIconPending,
    [CROSS_CHAIN_ACTION_STATUS.FAILED]: theme?.color?.background?.statusIconFailed,
    [CROSS_CHAIN_ACTION_STATUS.CONFIRMED]: theme?.color?.background?.statusIconSuccess,
  };

  const actionStatusIconBackgroundColor = actionStatusToIconBackgroundColor[transactionStatus];
  const actionStatusTitle = actionStatusToTitle[transactionStatus];

  if (!actionStatusTitle) return null;

  const onPreviewTransactionClick = async () => {
    if (isGettingExplorerLink) return;+

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

    const explorerLink = getTransactionExplorerLink(chainId, transactionHash);
    if (!explorerLink) {
      alert('Transaction hash not yet available!');
      return;
    }

    window.open(explorerLink, '_blank');
  }

  useEffect(() => {
    if (crossChainAction.finishTimestamp) return;
    let intervalId = setInterval(() => setSecondsAfter((current) => current + 1), 1000);
    return () => {
      if (!intervalId) return;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <TransactionStatusAction>
      <TransactionStatusClock>
        {!!crossChainAction.finishTimestamp && moment(moment(crossChainAction.finishTimestamp).diff(moment(crossChainAction.submitTimestamp))).format('mm:ss')}
        {!crossChainAction.finishTimestamp && moment(moment().diff(moment(crossChainAction.submitTimestamp))).format('mm:ss')}
      </TransactionStatusClock>
      <TransactionStatusWrapper>
        <TransactionStatusMessageWrapper>
          {!!actionStatusIconBackgroundColor && (
            <StatusIconWrapper color={actionStatusIconBackgroundColor}>
              {transactionStatus === CROSS_CHAIN_ACTION_STATUS.CONFIRMED && <BiCheck size={16} />}
              {transactionStatus === CROSS_CHAIN_ACTION_STATUS.PENDING && <BsClockHistory size={14} />}
              {transactionStatus === CROSS_CHAIN_ACTION_STATUS.UNSENT && <BsClockHistory size={14} />}
              {transactionStatus === CROSS_CHAIN_ACTION_STATUS.FAILED && <IoClose size={15} />}
            </StatusIconWrapper>
          )}
          <Text size={16} medium>{actionStatusTitle}</Text>
        </TransactionStatusMessageWrapper>
        <Clickable disabled={isGettingExplorerLink} onClick={onPreviewTransactionClick}>
          <Text size={16} color={theme?.color?.text?.transactionStatusLink} medium>Tx</Text>
        </Clickable>
      </TransactionStatusWrapper>
    </TransactionStatusAction>
  )
}

const ActionPreview = ({
  crossChainAction,
  onRemove,
  onSign,
  signButtonDisabled = false,
}: TransactionPreviewInterface) => {
  const { accountAddress } = useEtherspot();

  const theme: Theme = useTheme();

  const {
    preview,
    chainId,
    type,
    estimated,
    isEstimating,
  } = crossChainAction;

  const onCopy = async (valueToCopy: string) => {
    try {
      await navigator.clipboard.writeText(valueToCopy);
      alert('Copied!');
    } catch (e) {
      //
    }
  };

  const onSignButtonClick = () => {
    if (signButtonDisabled || !onSign) return;
    onSign();
  }
  const showCloseButton = !!onRemove;
  const showSignButton = !!onSign;

  const cost = useMemo(() => {
    if (isEstimating) return 'Estimating...';
    if (!estimated || !estimated?.gasCost) return estimated?.errorMessage;

    const gasCostNumericString = ethers.utils.formatUnits(estimated.gasCost, nativeAssetPerChainId[chainId].decimals);
    const gasCostFormatted = `${formatAmountDisplay(gasCostNumericString)} ${nativeAssetPerChainId[chainId].symbol}`;
    if (!estimated.usdPrice) return gasCostFormatted;

    return formatAmountDisplay(`${+gasCostNumericString * +estimated.usdPrice}`, '$');
  }, [isEstimating, estimated]);

  if (type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE) {
    // @ts-ignore
    // TODO: fix type
    const { fromAsset, fromChainId } = preview;

    const fromNetwork = supportedChains.find((supportedChain) => supportedChain.chainId === fromChainId);

    const fromChainTitle = fromNetwork?.title ?? CHAIN_ID_TO_NETWORK_NAME[fromChainId].toUpperCase();

    const fromAmount = formatAmountDisplay(ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals));

    return (
      <Card title="Klima Staking" marginBottom={20} onCloseButtonClick={onRemove} showCloseButton={showCloseButton}>
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
                <Text size={16} marginBottom={1} medium block>{fromAmount} {fromAsset.symbol}</Text>
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
                <Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>Gas price</Text>
                <Text size={16} medium>{cost}</Text>
              </ValueBlock>
            )}
          </ValueWrapper>
        </TransactionAction>
        <TransactionStatus crossChainAction={crossChainAction} />
        {showSignButton && (
          <Clickable>
            <SignButton disabled={signButtonDisabled} onClick={onSignButtonClick} />
          </Clickable>
        )}
      </Card>
    );
  }

  if (type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE) {
    // @ts-ignore
    // TODO: fix type
    const { fromAsset, toAsset, fromChainId, toChainId, providerName, providerIconUrl, receiverAddress } = preview;

    const fromNetwork = supportedChains.find((supportedChain) => supportedChain.chainId === fromChainId);
    const toNetwork = supportedChains.find((supportedChain) => supportedChain.chainId === toChainId);

    const fromChainTitle = fromNetwork?.title ?? CHAIN_ID_TO_NETWORK_NAME[fromChainId].toUpperCase();
    const toChainTitle = toNetwork?.title ?? CHAIN_ID_TO_NETWORK_NAME[toChainId].toUpperCase();

    const fromAmount = formatAmountDisplay(ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals));
    const toAmount = formatAmountDisplay(ethers.utils.formatUnits(toAsset.amount, toAsset.decimals));

    return (
      <Card title="Asset bridge" marginBottom={20} onCloseButtonClick={onRemove} showCloseButton={showCloseButton}>
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
                <Text size={16} marginBottom={1} medium block>{fromAmount} {fromAsset.symbol}</Text>
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
                <Text size={16} marginBottom={3} medium block>{toAmount} {toAsset.symbol}</Text>
                <Text size={12}>On {toChainTitle}</Text>
              </div>
            </ValueWrapper>
          </TransactionAction>
        </DoubleTransactionActionsInSingleRow>
        {!!accountAddress && !!receiverAddress && (
          <TransactionAction>
            <Text size={16} medium>
              <>
                From
                &nbsp;
                <Clickable onClick={() => onCopy(accountAddress)}>{humanizeHexString(accountAddress)}</Clickable>
                &nbsp;
              </>
              to
              &nbsp;
              <Clickable onClick={() => onCopy(receiverAddress)}>{humanizeHexString(receiverAddress)}</Clickable>
            </Text>
          </TransactionAction>
        )}
        <TransactionAction>
          <Label>Route</Label>
          <ValueWrapper>
            <RoundedImage title={providerName ?? 'Unknown'} url={providerIconUrl} />
            <ValueBlock>
              <Text size={12} marginBottom={2} medium block>{providerName}</Text>
              <Text size={16} medium>{toAmount} {toAsset.symbol} </Text>
            </ValueBlock>
            {!!cost && (
              <ValueBlock>
                <Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>Gas price</Text>
                <Text size={16} medium>{cost}</Text>
              </ValueBlock>
            )}
          </ValueWrapper>
        </TransactionAction>
        <TransactionStatus crossChainAction={crossChainAction} />
        {showSignButton && (
          <Clickable>
            <SignButton disabled={signButtonDisabled} onClick={onSignButtonClick} />
          </Clickable>
        )}
      </Card>
    );
  }

  if (type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) {
    // @ts-ignore
    // TODO: fix type
    const { asset, chainId, fromAddress } = preview;

    // @ts-ignore
    // TODO: fix type
    const receiverAddress = preview.receiverAddress as string;

    const network = supportedChains.find((supportedChain) => supportedChain.chainId === chainId);
    const chainTitle = network?.title ?? CHAIN_ID_TO_NETWORK_NAME[chainId].toUpperCase();

    const amount = formatAmountDisplay(ethers.utils.formatUnits(asset.amount, asset.decimals));

    return (
      <Card title="Send asset" marginBottom={20} onCloseButtonClick={onRemove} showCloseButton={showCloseButton}>
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
              <Text size={16} marginBottom={1} medium block>{amount} {asset.symbol}</Text>
              <Text size={12}>On {chainTitle}</Text>
            </ValueBlock>
            <ValueBlock>
              <Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>Gas price</Text>
              <Text size={16} medium>{cost ?? 'N/A'}</Text>
            </ValueBlock>
          </ValueWrapper>
        </TransactionAction>
        <TransactionAction>
          <Text size={16} medium>
            {!!fromAddress && (
              <>
                From
                &nbsp;
                <Clickable onClick={() => onCopy(fromAddress)}>{humanizeHexString(fromAddress)}</Clickable>
                &nbsp;
              </>
            )}
            {fromAddress ? 'to' : 'To'}
            &nbsp;
            <Clickable onClick={() => onCopy(receiverAddress)}>{humanizeHexString(receiverAddress)}</Clickable>
          </Text>
        </TransactionAction>
        <TransactionStatus crossChainAction={crossChainAction} />
        {showSignButton && (
          <Clickable>
            <SignButton disabled={signButtonDisabled} onClick={onSignButtonClick} />
          </Clickable>
        )}
      </Card>
    );
  }

  if (type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP) {
    // @ts-ignore
    // TODO: fix type
    const { fromAsset, toAsset, chainId, providerName, providerIconUrl } = preview;

    const network = supportedChains.find((supportedChain) => supportedChain.chainId === chainId);
    const chainTitle = network?.title ?? CHAIN_ID_TO_NETWORK_NAME[chainId].toUpperCase();

    const fromAmount = formatAmountDisplay(ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals));
    const toAmount = formatAmountDisplay(ethers.utils.formatUnits(toAsset.amount, toAsset.decimals));

    return (
      <Card title="Swap asset" marginBottom={20}  onCloseButtonClick={onRemove} showCloseButton={showCloseButton}>
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
                <Text size={16} marginBottom={1} medium block>{fromAmount} {fromAsset.symbol}</Text>
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
                <Text size={16} marginBottom={3} medium block>{toAmount} {toAsset.symbol}</Text>
                <Text size={12}>On {chainTitle}</Text>
              </div>
            </ValueWrapper>
          </TransactionAction>
        </DoubleTransactionActionsInSingleRow>
        <TransactionAction>
          <Label>Route</Label>
          <ValueWrapper>
            <RoundedImage title={providerName} url={providerIconUrl} />
            <ValueBlock>
              <Text size={12} marginBottom={2} medium block>{providerName}</Text>
              <Text size={16} medium>{toAmount} {toAsset.symbol} </Text>
            </ValueBlock>
            {!!cost && (
              <ValueBlock>
                <Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>Gas price</Text>
                <Text size={16} medium>{cost}</Text>
              </ValueBlock>
            )}
          </ValueWrapper>
        </TransactionAction>
        <TransactionStatus crossChainAction={crossChainAction} />
        {showSignButton && (
          <Clickable>
            <SignButton disabled={signButtonDisabled} onClick={onSignButtonClick} />
          </Clickable>
        )}
      </Card>
    );
  }

  return null;
};

export default ActionPreview;

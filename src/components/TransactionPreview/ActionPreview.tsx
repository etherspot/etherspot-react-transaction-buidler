import React, {
  useMemo,
} from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';
import { HiOutlinePencilAlt } from 'react-icons/hi';

import {
  CrossChainActionEstimation,
  CrossChainActionPreview,
} from '../../utils/transaction';
import { TRANSACTION_BLOCK_TYPE } from '../../constants/transactionBuilderConstants';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';
import {
  formatAmountDisplay,
  humanizeHexString,
} from '../../utils/common';
import { DispatchedCrossChainActionTransaction } from '../../providers/TransactionsDispatcherContextProvider';
import { DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS } from '../../constants/transactionDispatcherConstants';
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

const TransactionAction = styled.div`
  position: relative;
  margin-bottom: 18px;
  background: ${({ theme }) => theme.color.background.selectInput};
  color: ${({ theme }) => theme.color.text.selectInput};
  border-radius: 8px;
  padding: 8px 14px 14px;
  word-break: break-all;
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

const Clickable = styled.span`
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
`;

const SignButton = styled(HiOutlinePencilAlt)<{ disabled?: boolean }>`
  position: absolute;
  top: 12px;
  right: 40px;
  cursor: pointer;
  padding: 5px;

  &:hover {
    opacity: 0.5;
  }

  ${({ disabled }) => disabled && `opacity: 0.5;`}
`;

interface TransactionPreviewInterface {
  data: CrossChainActionPreview;
  type: string;
  transactions?: DispatchedCrossChainActionTransaction[];
  estimation?: CrossChainActionEstimation | null;
  isEstimating?: boolean;
  chainId: number;
  title?: string;
  onRemove?: () => void
  onSign?: () => void
  signButtonDisabled?: boolean
}

const ActionPreview = ({
  data,
  type,
  transactions,
  estimation,
  isEstimating,
  chainId,
  onRemove,
  onSign,
  signButtonDisabled = false,
}: TransactionPreviewInterface) => {
  const theme: Theme = useTheme();

  const allStatuses: string[] = transactions?.reduce((statuses: string[], transaction) => {
    if (statuses.includes(transaction.status)) return statuses;
    return statuses.concat(transaction.status);
  }, []) ?? [];

  let actionStatus = allStatuses?.length && DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.UNSENT;
  if (allStatuses.includes(DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.FAILED)) {
    actionStatus = DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.FAILED
  } else if (allStatuses.includes(DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING)) {
    actionStatus = DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING;
  } else if (allStatuses.includes(DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.CONFIRMED)) {
    actionStatus = DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.CONFIRMED;
  }

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
    if (!estimation || !estimation?.gasCost) return estimation?.errorMessage;

    const gasCostNumericString = ethers.utils.formatUnits(estimation.gasCost, nativeAssetPerChainId[chainId].decimals);
    const gasCostFormatted = `${formatAmountDisplay(gasCostNumericString)} ${nativeAssetPerChainId[chainId].symbol}`;
    if (!estimation.usdPrice) return gasCostFormatted;

    return formatAmountDisplay(`${+gasCostNumericString * +estimation.usdPrice}`, '$');
  }, [isEstimating, estimation]);

  if (type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE) {
    // @ts-ignore
    // TODO: fix type
    const { fromAsset, toAsset, fromChainId, toChainId, providerName, providerIconUrl } = data;

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
        {!!actionStatus && (
          <TransactionAction>
            <ValueBlock>
              <Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>Status</Text>
              <Text size={16} medium>{actionStatus}</Text>
            </ValueBlock>
          </TransactionAction>
        )}
        {showSignButton && <SignButton disabled={signButtonDisabled} onClick={onSignButtonClick} />}
      </Card>
    );
  }

  if (type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) {
    // @ts-ignore
    // TODO: fix type
    const { asset, chainId, receiverAddress, fromAddress } = data;

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
        {!!actionStatus && (
          <TransactionAction>
            <ValueBlock>
              <Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>Status</Text>
              <Text size={16} medium>{actionStatus}</Text>
            </ValueBlock>
          </TransactionAction>
        )}
        {showSignButton && <SignButton disabled={signButtonDisabled} onClick={onSignButtonClick} />}
      </Card>
    );
  }

  if (type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP) {
    // @ts-ignore
    // TODO: fix type
    const { fromAsset, toAsset, chainId, providerName, providerIconUrl } = data;

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
        {!!actionStatus && (
          <TransactionAction>
            <ValueBlock>
              <Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>Status</Text>
              <Text size={16} medium>{actionStatus}</Text>
            </ValueBlock>
          </TransactionAction>
        )}
        {showSignButton && <SignButton disabled={signButtonDisabled} onClick={onSignButtonClick} />}
      </Card>
    );
  }

  return null;
};

export default ActionPreview;

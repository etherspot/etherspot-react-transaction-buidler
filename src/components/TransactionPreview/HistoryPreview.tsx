import React, { useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';

// Components
import Card from '../Card';
import { ClickableText, Text } from '../Text';
import { CombinedRoundedImages } from '../Image';

// Utils
import { copyToClipboard, getTypeOfAddress, formatAmountDisplay } from '../../utils/common';
import { Chain, supportedChains } from '../../utils/chain';
import { Theme } from '../../utils/theme';

// Constants
import { TRANSACTION_BLOCK_TYPE } from '../../constants/transactionBuilderConstants';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';

import moment from 'moment';

// Hooks
import { useEtherspot } from '../../hooks';

// Types
import { ICrossChainAction, SendAssetActionPreview } from '../../types/crossChainAction';

// Icons
import { RiExternalLinkLine } from 'react-icons/ri';
import { LuFuel } from 'react-icons/lu';

interface TransactionPreviewInterface {
  crossChainAction: ICrossChainAction;
}

const HistoryPreview = ({ crossChainAction }: TransactionPreviewInterface) => {
  const { accountAddress, providerAddress } = useEtherspot();
  const theme: Theme = useTheme();
  const [showFullGasAmount, setShowFullGasAmount] = useState(false);

  const { chainId, type } = crossChainAction;

  const openBlockExplorerUrl = (transactionUrl) => {
    if (!transactionUrl) {
      alert('The transaction hash is not yet available. Please try again later.');
      return;
    } else window.open(transactionUrl, '_blank');
  };

  const handleTap = () => {
    setShowFullGasAmount(!showFullGasAmount);
  };

  const previewSend = (
    preview: SendAssetActionPreview | null,
    network: Chain | undefined,
    chainTitle: string,
    direction: string
  ) => {
    if (!preview) return null;

    const { asset, fromAddress, transactionUrl } = preview;
    const receiverAddress = preview.receiverAddress as string;
    const SendReceiveAddress = direction == 'Sender' ? receiverAddress : fromAddress;
    const gasCost = asset.gasCost.toNumber();

    // Convert gas wei to ETH
    const gasInETHAmount = gasCost / 1e18;

    // calculate gas fees
    const gasFees = gasInETHAmount * asset.gasUsed;

    // convert gas fee to USD
    const gasFeesInUsd = gasFees * crossChainAction.estimated.usdPrice;
    const fullGasFee = gasFeesInUsd.toFixed(6);
    const partialGasFeesInUsd = parseFloat(gasFeesInUsd.toFixed(3)) < 0.001 ? '<0.001' : gasFeesInUsd.toFixed(2);
    const gasFeeDisplay = `${partialGasFeesInUsd}  $`;

    // calculate Token value
    const tokenValue =
      asset.feeAmount && asset.feeAmount != null ? ethers.utils.formatUnits(asset.feeAmount, asset.decimals) : null;

    // convert Token value to USD
    const tokenValueUsd =
      tokenValue != null ? formatAmountDisplay(`${+tokenValue * +crossChainAction.estimated.usdPrice}`, '$') : '$ 0';
    const tokenFeeDisplay = `${direction === 'Sender' ? '-' : '+'} ${tokenValue} ${asset.symbol}・${tokenValueUsd}`;

    return (
      <>
        <MainWrapper>
          <LeftWrapper>
            <Label>{direction == 'Sender' ? ' Send to' : 'Receive from'} &nbsp;</Label>
            <ClickableText onClick={() => copyToClipboard(receiverAddress)}>
              {getTypeOfAddress(SendReceiveAddress, accountAddress, providerAddress)}
            </ClickableText>
            <ValueWrapper>
              {asset.iconUrl && asset.iconUrl != null ? (
                <CombinedRoundedImages
                  title={asset.symbol}
                  url={asset.iconUrl}
                  smallImageTitle={chainTitle}
                  smallImageUrl={network?.iconUrl}
                  size={24}
                />
              ) : (
                <IconPlaceHolder data-letters="Ox"></IconPlaceHolder>
              )}
              <Text> {tokenFeeDisplay} </Text>
            </ValueWrapper>
          </LeftWrapper>
          <RightWrapper>
            <DateLabel>
              {!!asset.createTimestamp && moment.unix(asset.createTimestamp).format('D/M/YY hh:mm')}
            </DateLabel>
            <ClickableText>
              <RiExternalLinkLine
                size={16}
                style={{ marginBottom: 10 }}
                onClick={() => openBlockExplorerUrl(transactionUrl)}
              />
            </ClickableText>
            <ClickableText onClick={handleTap}>
              <Text size={16} marginBottom={2} marginRight={5} medium block>
                <LuFuel size={16} style={{ marginRight: 8 }} color={theme?.color?.text?.innerLabel} />
                <Text>
                  {' '}
                  {parseFloat(gasFeesInUsd.toFixed(3)) < 0.001 && showFullGasAmount ? fullGasFee : gasFeeDisplay}
                </Text>
              </Text>
            </ClickableText>
          </RightWrapper>
        </MainWrapper>
      </>
    );
  };

  if (type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) {
    const previewList = crossChainAction?.batchTransactions?.length
      ? crossChainAction?.batchTransactions.map((action) =>
          action.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET ? action.preview : null
        )
      : [crossChainAction.preview];

    const network = supportedChains.find((supportedChain) => supportedChain.chainId == crossChainAction.chainId);
    const chainTitle = network?.title ?? CHAIN_ID_TO_NETWORK_NAME[chainId].toUpperCase();

    return (
      <Card marginBottom={10}>
        {previewList.map((preview) => previewSend(preview, network, chainTitle, crossChainAction.direction))}
      </Card>
    );
  }
  return null;
};

export default HistoryPreview;

const MainWrapper = styled.div`
  display: inline-block;
  display: flex;
  flex-direction: row;
  background: ${({ theme }) => theme.color.background.card};
  width: 100%;
`;

const LeftWrapper = styled.label`
  font-size: 14px;
  float: left;
  text-align: left;
  width: 50%;
`;

const RightWrapper = styled.label`
  font-size: 14px;
  float: right;
  text-align: right;
  width: 50%;
`;

const Label = styled.label`
  display: inline-block;
  color: ${({ theme }) => theme.color.text.innerLabel};
  margin-bottom: 10px;
  font-size: 14px;
`;

const DateLabel = styled.label`
  display: inline-block;
  color: ${({ theme }) => theme.color.text.innerLabel};
  margin-right: 7px;
  margin-bottom: 10px;
  font-size: 14px;
`;

const ValueWrapper = styled.div<{ marginTop?: number }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  ${({ marginTop }) => marginTop && `margin-top: ${marginTop}px;`}
`;

const IconPlaceHolder = styled.div`
  &[data-letters]:before {
    content: attr(data-letters);
    display: inline-block;
    font-size: 1em;
    width: 2em;
    height: 2em;
    line-height: 2em;
    text-align: center;
    border-radius: 50%;
    background: black;
    vertical-align: middle;
    margin-right: 0.5em;
    color: white;
  }
`;

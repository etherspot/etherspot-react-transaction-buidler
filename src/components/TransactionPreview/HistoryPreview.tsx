import React from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';

// Components
import Card from '../Card';
import { ClickableText, Text } from '../Text';
import { CombinedRoundedImages, RoundedImage } from '../Image';

// Utils
import { formatAmountDisplay, humanizeHexString, copyToClipboard, getTypeOfAddress } from '../../utils/common';
import { Chain, CHAIN_ID, klimaAsset, nativeAssetPerChainId, supportedChains } from '../../utils/chain';
import { Theme } from '../../utils/theme';

// Constants
import { TRANSACTION_BLOCK_TYPE } from '../../constants/transactionBuilderConstants';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';

import moment from 'moment';

// Hooks
import { useEtherspot } from '../../hooks';

// Types
import { ICrossChainAction, SendAssetActionPreview } from '../../types/crossChainAction';

//Icons
import { RiExternalLinkLine } from 'react-icons/ri';
import { LuFuel } from 'react-icons/lu';

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

interface TransactionPreviewInterface {
  crossChainAction: ICrossChainAction;
}

const HistoryPreview = ({ crossChainAction }: TransactionPreviewInterface) => {
  const { accountAddress, providerAddress, web3Provider } = useEtherspot();
  const theme: Theme = useTheme();

  const { chainId, type } = crossChainAction;

  const openBlockExplorerUrl = (transactionUrl) => {
    if (!transactionUrl) return;
    else window.open(transactionUrl, '_blank');
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
    const gasCostNumericString = ethers.utils.formatUnits(
      asset.gasCost,
      nativeAssetPerChainId[crossChainAction.chainId].decimals
    );
    const gasAssetSymbol = nativeAssetPerChainId[crossChainAction.chainId].symbol;
    const gasCostFormatted = `${formatAmountDisplay(gasCostNumericString)} ${gasAssetSymbol}`;
    const gasFeesUSD = formatAmountDisplay(`${+gasCostNumericString * +crossChainAction.estimated.usdPrice}`, '$');

    return (
      <>
        <MainWrapper>
          <LeftWrapper>
            <Label>{direction == 'Sender' ? ' Send to' : 'Receive from'} &nbsp;</Label>
            <ClickableText onClick={() => copyToClipboard(receiverAddress)}>
              {getTypeOfAddress(SendReceiveAddress, accountAddress, providerAddress)}
            </ClickableText>
            <ValueWrapper>
              <CombinedRoundedImages
                title={asset.symbol}
                url={asset.iconUrl}
                smallImageTitle={chainTitle}
                smallImageUrl={network?.iconUrl}
                size={24}
              />
            </ValueWrapper>
          </LeftWrapper>
          <RightWrapper>
            <DateLabel>
              {!!asset.createTimestamp && moment.unix(asset.createTimestamp).format('D.M.YY HH:mm')}
            </DateLabel>
            <ClickableText>
              <RiExternalLinkLine
                size={16}
                style={{ marginBottom: 10 }}
                onClick={() => openBlockExplorerUrl(transactionUrl)}
              />
            </ClickableText>
            <Text size={12} marginBottom={2} marginRight={3} medium block>
              <LuFuel size={16} style={{ marginRight: 5 }} color={theme?.color?.text?.innerLabel} />
              <Text> {gasFeesUSD}</Text>
            </Text>
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
      <Card title="" marginBottom={10}>
        {previewList.map((preview) => previewSend(preview, network, chainTitle, crossChainAction.direction))}
      </Card>
    );
  }
  return null;
};

export default HistoryPreview;

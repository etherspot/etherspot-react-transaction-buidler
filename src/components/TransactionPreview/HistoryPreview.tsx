import React from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';

// Components
import Card from '../Card';
import { ClickableText, Text } from '../Text';
import { CombinedRoundedImages } from '../Image';

// Utils
import { copyToClipboard, getTypeOfAddress } from '../../utils/common';
import { Chain, nativeAssetPerChainId, supportedChains } from '../../utils/chain';
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
  const { accountAddress, providerAddress, web3Provider } = useEtherspot();
  const theme: Theme = useTheme();
  console.log('crosschain', crossChainAction);

  const { chainId, type } = crossChainAction;

  const openBlockExplorerUrl = (transactionUrl) => {
    if (!transactionUrl) {
      alert('The transaction hash is not yet available. Please try again later.');
      return;
    } else window.open(transactionUrl, '_blank');
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

    const gasCost = asset.gasCost.toNumber();

    // Convert gas wei to ETH
    const gasInETHAmount = (gasCost / 1e18).toFixed(18);

    // Convert to USD
    let gasFees = gasInETHAmount * crossChainAction.estimated.usdPrice;
    gasFees = gasFees.toFixed(2) == '0.00' ? gasFees.toFixed(8) : gasFees.toFixed(2);

    const gasFeesUSD = `${gasFees} $`;

    // Calculate transaction fees
    let transactionfees = gasInETHAmount * asset.gasUsed;
    transactionfees = transactionfees.toFixed(2) == '0.00' ? transactionfees.toFixed(6) : transactionfees.toFixed(2);

    // convert Tx fee to USD
    let transactionfeesInUsd = transactionfees * crossChainAction.estimated.usdPrice;
    transactionfeesInUsd =
      transactionfeesInUsd.toFixed(2) == '0.00' ? transactionfeesInUsd.toFixed(6) : transactionfeesInUsd.toFixed(2);

    const amountString = `${+transactionfees + ` ` + asset.symbol}・ $ ${transactionfeesInUsd}`;

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
              <Text> {amountString} </Text>
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

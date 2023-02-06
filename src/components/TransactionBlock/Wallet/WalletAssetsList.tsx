import React, { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';

import { IAssetWithBalance, IBalanceByChain } from '../../../providers/EtherspotContextProvider';
import { Chain, supportedChains } from '../../../utils/chain';
import { Text } from '../../Text';
import RoundedImage from '../../Image/RoundedImage';
import { WalletCopyIcon, WalletDropdownDownIcon, WalletDropdownUpIcon } from '../Icons';
import { formatAmountDisplay } from '../../../utils/common';

export interface IChainAssets {
  title: string;
  chain: Chain;
  assets: IAssetWithBalance[];
}

interface IWalletAssetsList {
  updateCount: number;
  accountAddress: string | null;
  tab: 'tokens' | 'nfts';
  showAllChains: boolean;
  selectedChains: number[];
  hideChainList: number[];
  displayAssets: IAssetWithBalance[];
  smartWalletBalanceByChain: IBalanceByChain[] | null;
  onCopy: (text: string) => void;
  toggleChainBlock: (id: number) => void;
}

const WalletAssetsList = ({
  updateCount, // refreshes display when assets update
  accountAddress,
  tab,
  showAllChains,
  selectedChains,
  hideChainList,
  displayAssets,
  smartWalletBalanceByChain,
  onCopy,
  toggleChainBlock,
}: IWalletAssetsList) => {
  return (
    <>
      {tab === 'tokens' &&
        showAllChains &&
        supportedChains?.map((chain, i) => {
          // Check if asset exists
          const assets = displayAssets.filter((asset) => asset?.chainId === chain.chainId);
          if (!assets || !assets?.length) return null;

          const chainId = chain.chainId;
          const chainTotal = smartWalletBalanceByChain?.find((bl) => bl.chain === chain.chainId)?.total || 0;

          if (!showAllChains && !selectedChains.includes(chainId)) return null;

          return (
            <ChainBlock key={`asset-chain-${i}`}>
              {(showAllChains || selectedChains.length > 1) && (
                <ChainBlockHeader show={!hideChainList.includes(chainId)}>
                  <RoundedImage title={chain.title} url={chain.iconUrl} size={20} />

                  <ChainBlockHeaderText>{`${chain.title}・$${formatAmountDisplay(chainTotal)}`}</ChainBlockHeaderText>

                  <ChainHeaderCopyIcon onClick={() => onCopy(accountAddress || '')}>
                    {WalletCopyIcon}
                  </ChainHeaderCopyIcon>

                  <ChainBlockDropdownIcon onClick={() => toggleChainBlock(chainId)}>
                    {hideChainList.includes(chainId) ? WalletDropdownDownIcon : WalletDropdownUpIcon}
                  </ChainBlockDropdownIcon>
                </ChainBlockHeader>
              )}

              {!hideChainList.includes(chainId) && (
                <ChainBlockList>
                  {assets.map((asset, i) => {
                    return (
                      <ListItem key={`asset-${chainId}-${i}`}>
                        <ListItemIconWrapper>
                          <RoundedImage url={asset.logoURI} size={32} title={asset.name} noMarginRight />
                        </ListItemIconWrapper>
                        <ListItemDetails>
                          <ListItemLine>
                            <ListItemText size={14} medium>{`${asset.symbol}・$${formatAmountDisplay(
                              asset.assetPriceUsd || 0
                            )}`}</ListItemText>
                            <ListItemText size={14} medium>{`$${formatAmountDisplay(
                              asset.balanceWorthUsd || 0
                            )}`}</ListItemText>
                          </ListItemLine>

                          <ListItemLine margin_top={5}>
                            <ListItemText regular>{`On ${chain.title}`}</ListItemText>
                            <ListItemText regular>{`${
                              formatAmountDisplay(ethers.utils.formatUnits(asset.balance, asset.decimals)) || 0
                            } ${asset.symbol}`}</ListItemText>
                          </ListItemLine>
                        </ListItemDetails>
                      </ListItem>
                    );
                  })}
                </ChainBlockList>
              )}
            </ChainBlock>
          );
        })}

      {tab === 'tokens' && !showAllChains && displayAssets?.length > 0 && (
        <ChainBlock>
          <ChainBlockList>
            {displayAssets?.map((asset, i) => {
              const chain = supportedChains.find((item) => item.chainId === asset.chainId);
              if (!chain) return;

              return (
                <ListItem key={`all-assets-${asset?.chainId || 0}-${i}`}>
                  <ListItemIconWrapper>
                    <RoundedImage url={asset.logoURI} size={32} title={asset.name} noMarginRight />
                    <AssetChainIcon src={chain.iconUrl} title={chain.title} />
                  </ListItemIconWrapper>
                  <ListItemDetails>
                    <ListItemLine>
                      <ListItemText size={14} medium>{`${asset.symbol}・$${formatAmountDisplay(
                        asset.assetPriceUsd || 0
                      )}`}</ListItemText>
                      <ListItemText size={14} medium>{`$${formatAmountDisplay(
                        asset.balanceWorthUsd || 0
                      )}`}</ListItemText>
                    </ListItemLine>

                    <ListItemLine margin_top={5}>
                      <ListItemText regular>{`On ${chain.title}`}</ListItemText>
                      <ListItemText regular>{`${
                        formatAmountDisplay(ethers.utils.formatUnits(asset.balance, asset.decimals)) || 0
                      } ${asset.symbol}`}</ListItemText>
                    </ListItemLine>
                  </ListItemDetails>
                </ListItem>
              );
            })}
          </ChainBlockList>
        </ChainBlock>
      )}
    </>
  );
};

export default WalletAssetsList;

// Chains
const ChainBlock = styled.div`
  flex: 1;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.color.background.selectInput};
  padding: 0 0 10px;
  margin-bottom: 12px;
`;

const ChainBlockHeader = styled.div<{ show?: boolean }>`
  flex: 1;
  align-items: center;
  padding: 10px 16px 0;
  position: relative;

  ${({ theme, show }) => show && `padding-bottom: 10px; border-bottom: 1px solid ${theme.color.background.card};`};
`;

const ChainBlockHeaderText = styled(Text)`
  font-size: 14px;
  color: ${({ theme }) => theme.color.text.innerLabel};
`;

const ChainBlockDropdownIcon = styled.div`
  position: absolute;
  top: -3px;
  right: 0;
  padding: 14px;

  display: flex;
  justify-content: center;
  align-items: center;

  &:hover {
    opacity: 0.5;
  }
`;

const ChainHeaderCopyIcon = styled.span`
  margin-left: 4px;

  &:hover {
    opacity: 0.5;
  }
`;

// Chain Assets
const ChainBlockList = styled.div`
  padding: 1px 12px;
  max-height: 320px;
  overflow-y: scroll;
`;

const ListItem = styled.div`
  margin-top: 12px;
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
`;

const ListItemDetails = styled.div`
  margin-left: 10px;
  display: flex;
  flex: 1;
  flex-direction: column;
`;

const ListItemLine = styled.div<{ margin_top?: number }>`
  display: flex;
  flex: 1;
  justify-content: space-between;
  align-item: center;
  ${({ margin_top }) => margin_top && `margin-top: ${margin_top}px;`}
`;

const ListItemIconWrapper = styled.span`
  position: relative;
  margin-right: 10px;
`;

const AssetChainIcon = styled.img`
  position: absolute;
  top: 0;
  right: 0;

  background-color: ${({ theme }) => theme.color.background.selectInput};
  height: 16px;
  width: 16px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.color.background.selectInput};
`;

const ListItemText = styled(Text)<{ size?: number; regular?: boolean; medium?: boolean }>`
  color: ${({ theme }) => theme.color.text.button};
  ${({ size }) => `font-size: ${size || 12}px;`}
  ${({ regular }) => !!regular && `font-family: "PTRootUIWebRegular", sans-serif;`}
  ${({ medium }) => !!medium && `font-family: "PTRootUIWebMedium", sans-serif;`}
`;

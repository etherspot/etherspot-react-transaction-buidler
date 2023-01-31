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
  accountAddress: string | null;
  tab: 'tokens' | 'nfts';
  showAllChains: boolean;
  selectedChains: number[];
  hideChainList: number[];
  chainAssets: IChainAssets[] | null;
  displayAssets: IAssetWithBalance[];
  smartWalletBalanceByChain: IBalanceByChain[] | null;

  onCopy: (text: string) => void;
  toggleChainBlock: (id: number) => void;
}

const WalletNftAssetsList = ({
  accountAddress,
  tab,
  showAllChains,
  selectedChains,
  hideChainList,
  chainAssets,
  displayAssets,
  smartWalletBalanceByChain,

  onCopy,
  toggleChainBlock,
}: IWalletAssetsList) => {
  return (
    <>
      {tab === 'tokens' &&
        showAllChains &&
        chainAssets?.map((chainAsset) => {
          // Check if asset exists
          if (!chainAsset || !chainAsset.assets?.length) return null;

          const chainId = chainAsset?.chain?.chainId || 0;
          const chainTotal =
            smartWalletBalanceByChain?.find((bl) => bl.chain === chainAsset?.chain?.chainId)?.total || 0;

          if (!showAllChains && !selectedChains.includes(chainId)) return null;

          return (
            <ChainBlock>
              {(showAllChains || selectedChains.length > 1) && (
                <ChainBlockHeader show={!hideChainList.includes(chainId)}>
                  <RoundedImage title={chainAsset.chain.title} url={chainAsset.chain.iconUrl} size={20} />

                  <ChainBlockHeaderText>{`${chainAsset.title}・$${chainTotal.toFixed(2)}`}</ChainBlockHeaderText>

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
                  {chainAsset.assets.map((asset) => {
                    return (
                      <ListItem>
                        <ListItemIconWrapper>
                          <RoundedImage url={asset.logoURI} size={32} title={asset.name} noMarginRight />
                        </ListItemIconWrapper>
                        <ListItemDetails>
                          <ListItemLine>
                            <ListItemText size={14} medium>{`${asset.symbol}・$${
                              asset.assetPriceUsd?.toFixed(2) || 0
                            }`}</ListItemText>
                            <ListItemText size={14} medium>{`$${asset.balanceWorthUsd?.toFixed(2) || 0}`}</ListItemText>
                          </ListItemLine>

                          <ListItemLine>
                            <ListItemText regular>{`On ${chainAsset.title}`}</ListItemText>
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
            {displayAssets?.map((asset) => {
              const chain = supportedChains.find((item) => item.chainId === asset.chainId);
              if (!chain) return;

              return (
                <ListItem>
                  <ListItemIconWrapper>
                    <RoundedImage url={asset.logoURI} size={32} title={asset.name} noMarginRight />
                    <AssetChainIcon src={chain.iconUrl} title={chain.title} />
                  </ListItemIconWrapper>
                  <ListItemDetails>
                    <ListItemLine>
                      <ListItemText size={14} medium>{`${asset.symbol}・$${
                        asset.assetPriceUsd?.toFixed(2) || 0
                      }`}</ListItemText>
                      <ListItemText size={14} medium>{`$${asset.balanceWorthUsd?.toFixed(2) || 0}`}</ListItemText>
                    </ListItemLine>

                    <ListItemLine>
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

export default WalletNftAssetsList;

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

const ListItemLine = styled.div`
  display: flex;
  flex: 1;
  justify-content: space-between;
  align-item: center;
`;

const ListItemIconWrapper = styled.span`
  position: relative;
  margin-right: 10px;
`;

const AssetChainIcon = styled.img`
  position: absolute;
  top: 0;
  right: 0;

  background-color: #fff;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  border: 1px solid #fff;
`;

const ListItemText = styled(Text)<{ size?: number }>`
  color: ${({ theme }) => theme.color.text.button};
  ${({ size }) => `font-size: ${size || 12}px;`}
`;

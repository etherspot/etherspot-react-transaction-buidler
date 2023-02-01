import React, { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';
import { Nft, NftCollection } from 'etherspot';

import { Chain, supportedChains } from '../../../utils/chain';
import { Text } from '../../Text';
import RoundedImage from '../../Image/RoundedImage';
import { WalletCopyIcon, WalletDropdownDownIcon, WalletDropdownUpIcon } from '../Icons';

export interface INft {
  chain: Chain;
  contractAddress: string;
  contractName: string;
  tokenId: number;
  name: string;
  image: string;
}

export interface IChainNfts {
  title: string;
  chain: Chain;
  nfts: INft[];
}

interface IWalletNftsList {
  accountAddress: string | null;
  tab: 'tokens' | 'nfts';
  showAllChains: boolean;
  selectedChains: number[];
  hideChainList: number[];
  displayNfts: INft[];
  onCopy: (text: string) => void;
  toggleChainBlock: (id: number) => void;
}

const WalletNftsList = ({
  accountAddress,
  tab,
  showAllChains,
  selectedChains,
  hideChainList,
  displayNfts,
  onCopy,
  toggleChainBlock,
}: IWalletNftsList) => {
  return (
    <>
      {tab === 'nfts' &&
        showAllChains &&
        supportedChains?.map((chain, i) => {
          // Check if asset exists
          const nfts = displayNfts.filter((nft) => nft?.chain?.chainId === chain.chainId);
          if (!nfts || !nfts.length) return null;

          const chainId = chain.chainId || 0;

          if (!showAllChains && !selectedChains.includes(chainId)) return null;

          return (
            <ChainBlock key={`nft-chain-${i}`}>
              {(showAllChains || selectedChains.length > 1) && (
                <ChainBlockHeader show={!hideChainList.includes(chainId)}>
                  <RoundedImage title={chain.title} url={chain.iconUrl} size={20} />

                  <ChainBlockHeaderText>{chain.title}</ChainBlockHeaderText>

                  <ChainHeaderCopyIcon onClick={() => onCopy(accountAddress || '')}>
                    {WalletCopyIcon}
                  </ChainHeaderCopyIcon>

                  <ChainBlockDropdownIcon onClick={() => toggleChainBlock(chainId)}>
                    {hideChainList.includes(chainId) ? WalletDropdownDownIcon : WalletDropdownUpIcon}
                  </ChainBlockDropdownIcon>
                </ChainBlockHeader>
              )}

              {!hideChainList.includes(chainId) && (
                <ChainBlockNftList>
                  {nfts.map((nft, i) => {
                    return (
                      <NftWrapper key={`nft-${chainId}-${i}`}>
                        <NftImage src={nft.image} />
                        <NftText marginTop={12} medium>{`${nft.contractName}`}</NftText>
                        <NftText size={14} medium>{`${nft.name}`}</NftText>
                        <NftText size={12} regular>{`On ${nft.chain.title}`}</NftText>
                      </NftWrapper>
                    );
                  })}
                </ChainBlockNftList>
              )}
            </ChainBlock>
          );
        })}

      {tab === 'nfts' && !showAllChains && displayNfts?.length > 0 && (
        <ChainBlock>
          <ChainBlockNftList>
            {displayNfts.map((nft, i) => {
              const chain = supportedChains.find((item) => item.chainId === nft?.chain?.chainId);
              if (!chain) return;

              return (
                <NftWrapper key={`all-nft-${nft?.chain?.chainId || 0}-${i}`}>
                  {nft?.chain?.iconUrl && <NftChainIcon src={nft.chain.iconUrl} />}
                  <NftImage src={nft.image} />
                  <NftText marginTop={12} medium>{`${nft.contractName}`}</NftText>
                  <NftText size={14} medium>{`${nft.name}`}</NftText>
                  <NftText size={12} regular>{`On ${nft.chain.title}`}</NftText>
                </NftWrapper>
              );
            })}
          </ChainBlockNftList>
        </ChainBlock>
      )}
    </>
  );
};

export default WalletNftsList;

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

// Chain NFTs
const ChainBlockNftList = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  max-height: 320px;
  overflow-y: scroll;
  padding: 16px;
`;

const NftWrapper = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const NftImage = styled.img`
  width: 100%;
  aspect-ratio: 1/1;
  object-fit: cover;
  border-radius: 8px;
`;

const NftChainIcon = styled.img`
  position: absolute;
  top: 4px;
  right: 4px;

  background-color: #fff;
  height: 24px;
  width: 24px;
  border-radius: 50%;
  border: 1px solid #fff;
`;

const NftText = styled(Text)<{ marginTop?: number; size?: number }>`
  margin-top: 6px;
  max-width: 85px;

  color: ${({ theme }) => theme.color.text.button};
  ${({ marginTop }) => `margin-top: ${marginTop || 4}px;`}
  ${({ size }) => `font-size: ${size || 12}px;`}

  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

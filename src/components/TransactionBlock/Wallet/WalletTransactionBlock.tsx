import React, { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';
import { Nft, NftCollection } from 'etherspot';

import { useEtherspot, useTransactionBuilder } from '../../../hooks';
import { formatAmountDisplay } from '../../../utils/common';
import { CHAIN_ID, Chain, supportedChains } from '../../../utils/chain';
import { IAssetWithBalance } from '../../../providers/EtherspotContextProvider';
import { CombinedRoundedImages, RoundedImage } from '../../Image';
import { Theme } from '../../../utils/theme';
import { ITransactionBlock } from '../../../types/transactionBlock';
import {
  WalletAssetSearchIcon,
  WalletBridgeIcon,
  WalletDepositIcon,
  WalletSendIcon,
  WalletSwapIcon,
  WalletWithdrawIcon,
  WalletDropdownUpIcon,
  WalletDropdownDownIcon,
  WalletCopyIcon,
  WalletCloseSearchIcon,
} from '../Icons';
import { Text } from '../../Text';
import SwitchInput from '../../SwitchInput/SwitchInput';
import { TRANSACTION_BLOCK_TYPE, TRANSACTION_BLOCK_TYPE_KEY } from '../../../constants/transactionBuilderConstants';
import { ISendAssetTransactionBlockValues } from '../SendAssetTransactionBlock';

// Local
import WalletNftsList, { IChainNfts, INft } from './WalletNftsList';
import WalletAssetsList, { IChainAssets } from './WalletAssetsList';

const tabOptions = {
  tokens: {
    title: 'Tokens',
    value: 'tokens',
  },
  nfts: {
    title: 'Collectibles',
    value: 'nfts',
  },
};

type ITabs = keyof typeof tabOptions;

export interface IWalletTransactionBlock {
  chain?: Chain;
  availableTransactionBlocks: ITransactionBlock[];
  hasTransactionBlockAdded: boolean;
  addTransactionBlock: (block: ITransactionBlock, isBridgeDisabled: boolean, isKlimaIncluded: boolean) => void;
  hideWalletBlock: () => void;
}

const WalletTransactionBlock = ({
  chain,
  availableTransactionBlocks,
  hasTransactionBlockAdded,
  addTransactionBlock,
  hideWalletBlock,
}: IWalletTransactionBlock) => {
  const theme: Theme = useTheme();

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();

  const {
    providerAddress,
    accountAddress,
    getSupportedAssetsWithBalancesForChainId,
    getNftsForChainId,
    smartWalletOnly,
    smartWalletBalanceByChain,
    sdk,
  } = useEtherspot();

  const [tab, setTab] = useState<ITabs>('tokens');
  const [fetchingAssets, setFetchingAssets] = useState(false);
  const [fetchingNfts, setFetchingNfts] = useState(false);
  const [showAllChains, setShowAllChains] = useState(true);

  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [selectedChains, setSelectedChains] = useState<number[]>([supportedChains[1].chainId]);
  const [hideChainList, setHideChainList] = useState<number[]>([]);

  const [walletTotal, setWalletTotal] = useState(0);
  const [chainAssets, setChainAssets] = useState<IChainAssets[] | null>(null);
  const [chainNfts, setChainNfts] = useState<IChainNfts[] | null>(null);
  const [displayAssets, setDisplayAssets] = useState<IAssetWithBalance[]>([]);
  const [displayNfts, setDisplayNfts] = useState<INft[]>([]);

  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Fetch assets
  const getAssets = async () => {
    if (fetchingAssets) return;
    setFetchingAssets(true);

    let allAssets: IChainAssets[] = [];
    supportedChains.map(async (chain, i) => {
      try {
        // Disabling Avalanche for the moment as it triggers another sign modal
        if (chain.chainId === CHAIN_ID.AVALANCHE) return;

        const assets = await getSupportedAssetsWithBalancesForChainId(chain.chainId, true, accountAddress);

        if (assets?.length) {
          allAssets.push({
            chain,
            title: chain.title,
            assets,
          });

          setChainAssets(allAssets);
        }
      } catch (e) {
        //
      }
      if (i === supportedChains.length - 1) {
        setFetchingAssets(false);
      }
    });
  };

  const getNfts = async () => {
    if (fetchingNfts) return;
    setFetchingNfts(true);

    let allNfts: IChainNfts[] = [];
    supportedChains.map(async (chain, i) => {
      try {
        // Disabling Avalanche for the moment as it triggers another sign modal
        if (chain.chainId === CHAIN_ID.AVALANCHE) return;

        let collections = await getNftsForChainId(chain.chainId);

        if (collections?.length) {
          const nfts: INft[] = [];
          collections.map(({ items, contractAddress, contractName }) => {
            if (!items?.length) return;

            items.map(({ tokenId, name, image }) => {
              nfts.push({
                chain,
                contractAddress,
                contractName,
                tokenId,
                name,
                image,
              });
            });
          });

          allNfts.push({
            chain,
            title: chain.title,
            nfts,
          });

          setChainNfts(allNfts);
        }
      } catch (e) {
        //
      }
      if (i === supportedChains.length - 1) {
        setFetchingNfts(false);
      }
    });
  };

  // Initial fetch
  useEffect(() => {
    if (!accountAddress || !sdk || !!chainAssets) return;

    if (smartWalletBalanceByChain?.length) {
      const sum = 0;
      let total = smartWalletBalanceByChain.reduce((acc, curr) => {
        return acc + curr.total;
      }, sum);
      setWalletTotal(total);
    }

    getAssets();
  }, [accountAddress, smartWalletBalanceByChain]);

  useEffect(() => {
    if (tab !== 'nfts' || !!chainNfts) return;

    getNfts();
  }, [tab]);

  // Sort assets + nfts
  useEffect(() => {
    let assets: IAssetWithBalance[] = [];
    let nfts: INft[] = [];

    if (chainAssets) {
      chainAssets.map((chainAsset) => {
        if (!chainAsset.assets || !selectedChains.includes(chainAsset?.chain?.chainId)) return;

        chainAsset.assets.map((asset) => {
          if (
            !!searchValue &&
            !asset.name.toLowerCase().includes(searchValue.toLowerCase()) &&
            !asset.symbol.toLowerCase().includes(searchValue.toLowerCase())
          )
            return;

          assets.push({ ...asset, chainId: chainAsset.chain.chainId });
        });
      });
    }

    if (chainNfts) {
      chainNfts.map((chainNft) => {
        if (!chainNft?.nfts || !selectedChains.includes(chainNft?.chain?.chainId)) return;

        chainNft.nfts.map((nft) => {
          if (
            !!searchValue &&
            !nft.contractName.toLowerCase().includes(searchValue.toLowerCase()) &&
            !nft.name.toLowerCase().includes(searchValue.toLowerCase())
          )
            return;

          nfts.push(nft);
        });
      });
    }

    setDisplayAssets(assets);
    setDisplayNfts(nfts);
  }, [chainAssets, chainNfts, selectedChains, showAllChains, searchValue]);

  const findTransactionBlock = (blockType: TRANSACTION_BLOCK_TYPE_KEY) => {
    return availableTransactionBlocks.find((item) => item?.type === blockType) || null;
  };

  const handleAddTransaction = (availableTransactionBlock: ITransactionBlock | null) => {
    if (!availableTransactionBlock) return;

    const isBridgeTransactionBlock = availableTransactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE;
    const isBridgeTransactionBlockAndDisabled = isBridgeTransactionBlock && hasTransactionBlockAdded;
    const isKlimaBlockIncluded = availableTransactionBlock.type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE;

    addTransactionBlock(
      availableTransactionBlock,
      isBridgeTransactionBlockAndDisabled || false,
      isKlimaBlockIncluded || false
    );
  };

  const handleActionButton = (blockType: TRANSACTION_BLOCK_TYPE_KEY) => {
    const block = findTransactionBlock(blockType);
    handleAddTransaction(block);
  };

  const handleDepositButton = () => {
    const block = findTransactionBlock(TRANSACTION_BLOCK_TYPE.SEND_ASSET);
    if (!block || block.type !== TRANSACTION_BLOCK_TYPE.SEND_ASSET) return;

    if (!providerAddress || !accountAddress) return;

    let values: ISendAssetTransactionBlockValues = {};
    values.fromAddress = providerAddress;
    values.receiverAddress = accountAddress;
    values.isFromEtherspotWallet = false;

    block.values = values;
    handleAddTransaction(block);
  };

  const handleSendButton = () => {
    const block = findTransactionBlock(TRANSACTION_BLOCK_TYPE.SEND_ASSET);
    if (!block || block.type !== TRANSACTION_BLOCK_TYPE.SEND_ASSET) return;

    if (!providerAddress || !accountAddress) return;

    let values: ISendAssetTransactionBlockValues = {};
    values.fromAddress = accountAddress;
    values.isFromEtherspotWallet = true;

    block.values = values;
    handleAddTransaction(block);
  };

  const handleWithdrawButton = () => {
    const block = findTransactionBlock(TRANSACTION_BLOCK_TYPE.SEND_ASSET);
    if (!block || block.type !== TRANSACTION_BLOCK_TYPE.SEND_ASSET) return;

    if (!providerAddress || !accountAddress) return;

    let values: ISendAssetTransactionBlockValues = {};
    values.fromAddress = accountAddress;
    values.receiverAddress = providerAddress;
    values.isFromEtherspotWallet = true;

    block.values = values;
    handleAddTransaction(block);
  };

  const onDropdownClick = () => setShowChainDropdown(true);

  const hideDropdown = () => setShowChainDropdown(false);

  const hideSearchBar = () => {
    setShowSearch(false);
    setSearchValue('');
  };

  const resetModals = () => {
    hideDropdown();
    hideSearchBar();
  };

  const toggleShowAllChains = (show = false) => {
    resetModals();
    setShowAllChains(show);
  };

  const toggleChainDropdownOption = (chainId: number) => {
    if (selectedChains.includes(chainId)) setSelectedChains((current) => current.filter((id) => id !== chainId));
    else setSelectedChains((current) => [...current, chainId]);
  };

  const toggleChainBlock = (chainId: number) => {
    if (hideChainList.includes(chainId)) setHideChainList((current) => current.filter((id) => id !== chainId));
    else setHideChainList((current) => [...current, chainId]);
  };

  const changeTab = (tab: ITabs) => {
    resetModals();
    setTab(tab);
  };

  const onCopy = async (valueToCopy: string) => {
    try {
      await navigator.clipboard.writeText(valueToCopy);
      alert('Copied!');
    } catch (e) {
      alert('Unable to copy!');
    }
  };

  return (
    <>
      <Title>{`$${walletTotal.toFixed(2)}`}</Title>
      <ButtonRow>
        <ActionButtonWrapper onClick={handleDepositButton}>
          <ActionButton>{WalletDepositIcon}</ActionButton>
          <ActionButtonText>Deposit</ActionButtonText>
        </ActionButtonWrapper>

        <ActionButtonWrapper onClick={handleSendButton}>
          <ActionButton>{WalletSendIcon}</ActionButton>
          <ActionButtonText>Send</ActionButtonText>
        </ActionButtonWrapper>

        <ActionButtonWrapper onClick={handleWithdrawButton}>
          <ActionButton>{WalletWithdrawIcon}</ActionButton>
          <ActionButtonText>Withdraw</ActionButtonText>
        </ActionButtonWrapper>

        <ActionButtonWrapper onClick={() => handleActionButton(TRANSACTION_BLOCK_TYPE.ASSET_SWAP)}>
          <ActionButton>{WalletSwapIcon}</ActionButton>
          <ActionButtonText>Swap</ActionButtonText>
        </ActionButtonWrapper>

        <ActionButtonWrapper
          disabled={!!hasTransactionBlockAdded}
          onClick={() => handleActionButton(TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE)}
        >
          <ActionButton>{WalletBridgeIcon}</ActionButton>
          <ActionButtonText>Bridge</ActionButtonText>
        </ActionButtonWrapper>
      </ButtonRow>

      <SwitchInput
        options={Object.values(tabOptions).map((tabs) => tabs)}
        selectedOption={tabOptions[tab]}
        onChange={(option) => changeTab(option.value)}
      />

      <ButtonRow>
        <ChainButton onClick={() => setShowSearch(!showSearch)} remove_margin>
          {WalletAssetSearchIcon}
          <ChainButtonText marginLeft={1}>Search</ChainButtonText>
        </ChainButton>

        <ChainButtonRow>
          <ChainButton selected={!showAllChains} onClick={() => toggleShowAllChains(false)}>
            <ChainButtonText>Assets</ChainButtonText>
          </ChainButton>

          <ChainButton selected={showAllChains} onClick={() => toggleShowAllChains(true)}>
            <ChainButtonText>Chains</ChainButtonText>
          </ChainButton>
        </ChainButtonRow>
      </ButtonRow>

      {showSearch && (
        <SearchWrapper>
          {WalletAssetSearchIcon}
          <SearchInput value={searchValue} onChange={({ target }) => setSearchValue(target.value)} />
          <SearchClose onClick={hideSearchBar}>{WalletCloseSearchIcon}</SearchClose>
        </SearchWrapper>
      )}

      {!showAllChains && (
        <ChainDropdownWrapper>
          <ChainDropdownSelect onClick={onDropdownClick}>
            {supportedChains?.map((chain, i) => {
              if (i > 5) return null;

              return (
                <ChainDropdownButton selected={selectedChains.includes(chain.chainId)}>
                  <RoundedImage url={chain.iconUrl} title={chain.title} size={34} marginRight={0} />
                </ChainDropdownButton>
              );
            })}

            <ChainDropdownIcon>{WalletDropdownDownIcon}</ChainDropdownIcon>
          </ChainDropdownSelect>

          {showChainDropdown && (
            <ChainDropdownModal>
              <ChainDropdownList>
                {supportedChains?.map((chain) => {
                  return (
                    <ChainDropdownButton
                      onClick={() => toggleChainDropdownOption(chain.chainId)}
                      selected={selectedChains.includes(chain.chainId)}
                    >
                      <RoundedImage url={chain.iconUrl} title={chain.title} size={34} marginRight={0} />
                    </ChainDropdownButton>
                  );
                })}

                <ChainDropdownIcon onClick={hideDropdown}>{WalletDropdownUpIcon}</ChainDropdownIcon>
              </ChainDropdownList>
            </ChainDropdownModal>
          )}
        </ChainDropdownWrapper>
      )}

      <WalletAssetsList
        accountAddress={accountAddress}
        tab={tab}
        showAllChains={showAllChains}
        selectedChains={selectedChains}
        hideChainList={hideChainList}
        chainAssets={chainAssets}
        displayAssets={displayAssets}
        smartWalletBalanceByChain={smartWalletBalanceByChain}
        onCopy={onCopy}
        toggleChainBlock={toggleChainBlock}
      />

      <WalletNftsList
        accountAddress={accountAddress}
        tab={tab}
        showAllChains={showAllChains}
        selectedChains={selectedChains}
        hideChainList={hideChainList}
        chainNfts={chainNfts}
        displayNfts={displayNfts}
        onCopy={onCopy}
        toggleChainBlock={toggleChainBlock}
      />
    </>
  );
};

export default WalletTransactionBlock;

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 20px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: 'PTRootUIWebMedium', sans-serif;
`;

// Buttons
const ButtonRow = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 18px;
`;

const ActionButtonWrapper = styled.div<{ disabled?: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  cursor: pointer;

  ${({ disabled }) =>
    !disabled
      ? `&:hover {
    span {
      color: #ff7733;
    }
    div {
      opacity: 0.5;
    }
  }`
      : 'opacity: 0.5'};
`;

const ActionButton = styled.div<{ disabled?: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  box-shadow: 0 1px 3px 0 rgba(95, 0, 1, 0.13);
  background-image: linear-gradient(to bottom, #fd9250, #ff5548);
`;

const ActionButtonText = styled(Text)`
  font-size: 14px;
  color: #191726;
  margin-top: 10px;
`;

const ChainButtonRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
`;

const ChainButton = styled.div<{
  selected?: boolean;
  remove_margin?: boolean;
}>`
  display: flex;

  ${({ remove_margin }) => (remove_margin ? `padding: 2px 0;` : `margin: 0 0 0 2px; padding: 2px 6px;`)};

  border-radius: 6px;
  ${({ selected }) => (selected ? `background-color: #ff7733;` : `background-color: rgba(0,0,0,0);`)};

  cursor: pointer;
  &:hover {
    opacity: 0.5;
  }

  span {
    ${({ selected }) => (selected ? `color: #fff;` : `color: #ff7733;`)};
  }
`;

const ChainButtonText = styled(Text)`
  font-size: 14px;
  line-height: 20px;
`;

// Chain Dropdown
const ChainDropdownWrapper = styled.div`
  position: relative;
  display: flex;
  flex: 1;
`;

const ChainDropdownSelect = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);

  width: 100%;
  border-radius: 8px;
  margin-bottom: 18px;
  padding: 0px 48px 4px 4px;
  background-color: #fff;

  &:hover {
    opacity: 0.5;
  }
`;

const ChainDropdownModal = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1;
`;

const ChainDropdownList = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);

  border-radius: 8px;
  margin: 0 0 18px;
  padding: 0px 48px 4px 4px;
  background-color: #fff;

  box-shadow: 0 2px 4px 0 rgba(255, 210, 187, 0.4), 0 2px 8px 0 rgba(201, 201, 200, 0.55);
`;

const ChainDropdownButton = styled.div<{ selected?: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 48px;
  width: 48px;
  margin-top: 4px;
  border-radius: 8px;
  background-color: ${({ selected }) => (selected ? '#ffeee6' : '#fff')};
`;

const ChainDropdownIcon = styled.div`
  position: absolute;
  top: 0;
  right: 0;

  display: flex;
  justify-content: center;
  align-items: center;

  width: 48px;
  height: 48px;

  &:hover {
    opacity: 0.5;
  }
`;

// Search
const SearchWrapper = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
`;

const SearchInput = styled.input`
  flex: 1;
  font-size: 16px;
  color: #ff7f40;
  width: 100%;
  font-family: 'PTRootUIWebMedium', sans-serif;
  border: none;
  background: transparent;
  padding: 0 10px;
  box-sizing: border-box !important;

  &::placeholder {
    color: ${({ theme }) => theme.color.text.textInputSecondary};
  }

  &:focus {
    outline: none;
  }

  ${({ disabled }) =>
    disabled &&
    `
    opacity: 0.6;
  `}
`;

const SearchClose = styled.span`
  cursor: pointer;
  &:hover {
    opacity: 0.5;
  }
`;

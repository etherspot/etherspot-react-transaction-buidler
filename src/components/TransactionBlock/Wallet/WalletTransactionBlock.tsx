import React, { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { HiChevronDown } from 'react-icons/hi';

import { useEtherspot, useTransactionBuilder } from '../../../hooks';
import { CHAIN_ID, Chain, supportedChains } from '../../../utils/chain';
import { IAssetWithBalance } from '../../../providers/EtherspotContextProvider';
import { RoundedImage } from '../../Image';
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
  WalletCloseSearchIcon,
} from '../Icons';
import { Text } from '../../Text';
import SwitchInput from '../../SwitchInput/SwitchInput';
import { TRANSACTION_BLOCK_TYPE, TRANSACTION_BLOCK_TYPE_KEY } from '../../../constants/transactionBuilderConstants';
import { ISendAssetTransactionBlockValues } from '../SendAssetTransactionBlock';
import { formatAmountDisplay, sumAssetsBalanceWorth } from '../../../utils/common';
import { sortAssetsByValue } from '../../../utils/sort';

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
  const [refreshCount, setRefreshCount] = useState(0);

  const forceUpdate = () => setRefreshCount(refreshCount + 1);

  const theme: Theme = useTheme();

  const { providerAddress, accountAddress, getSupportedAssetsWithBalancesForChainId, getNftsForChainId, sdk } =
    useEtherspot();

  const [tab, setTab] = useState<ITabs>('tokens');
  const [fetchingAssets, setFetchingAssets] = useState(false);
  const [fetchingNfts, setFetchingNfts] = useState(false);
  const [showAllChains, setShowAllChains] = useState(false);

  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [selectedChains, setSelectedChains] = useState<number[]>([]);
  const [hideChainList, setHideChainList] = useState<number[]>([]);

  const [walletTotal, setWalletTotal] = useState(0);
  const [chainAssets, setChainAssets] = useState<IChainAssets[] | null>(null);
  const [chainNfts, setChainNfts] = useState<IChainNfts[] | null>(null);
  const [displayAssets, setDisplayAssets] = useState<IAssetWithBalance[]>([]);
  const [displayNfts, setDisplayNfts] = useState<INft[]>([]);

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
          calcWalletTotal();
          forceUpdate();
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
        console.log(chain.title, collections);

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

  const calcWalletTotal = () => {
    if (!chainAssets?.length) return;

    let total = 0;
    chainAssets.map((chain) => {
      if (chain?.assets) total += sumAssetsBalanceWorth(chain.assets);
    });

    setWalletTotal(total);
  };

  // Initial fetch
  useEffect(() => {
    if (!accountAddress || !sdk) return;

    getAssets();
  }, [accountAddress]);

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
        if (!chainAsset.assets) return;

        if (selectedChains.length && !selectedChains.includes(chainAsset?.chain?.chainId)) return;

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
        if (!chainNfts?.length) return;

        if (selectedChains.length && !selectedChains.includes(chainNft?.chain?.chainId)) return;

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

    assets = assets.sort(sortAssetsByValue);

    setDisplayAssets(assets);
    setDisplayNfts(nfts);
    calcWalletTotal();
    forceUpdate();
  }, [chainAssets?.length, chainNfts?.length, selectedChains, showAllChains, searchValue]);

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
    hideWalletBlock();
  };

  const handleActionButton = (blockType: TRANSACTION_BLOCK_TYPE_KEY) => {
    const block = findTransactionBlock(blockType);
    handleAddTransaction(block);
  };

  const handleDepositButton = () => {
    const block = findTransactionBlock(TRANSACTION_BLOCK_TYPE.SEND_ASSET);
    if (!block || block.type !== TRANSACTION_BLOCK_TYPE.SEND_ASSET) return;

    if (!providerAddress || !accountAddress) return;

    let newBlock = { ...block };
    let values: ISendAssetTransactionBlockValues = {};
    values.fromAddress = providerAddress;
    values.receiverAddress = accountAddress;
    values.isFromEtherspotWallet = false;

    newBlock.values = values;
    handleAddTransaction(newBlock);
  };

  const handleSendButton = () => {
    const block = findTransactionBlock(TRANSACTION_BLOCK_TYPE.SEND_ASSET);
    if (!block || block.type !== TRANSACTION_BLOCK_TYPE.SEND_ASSET) return;

    if (!providerAddress || !accountAddress) return;

    let newBlock = { ...block };
    let values: ISendAssetTransactionBlockValues = {};
    values.fromAddress = accountAddress;
    values.isFromEtherspotWallet = true;

    newBlock.values = values;
    handleAddTransaction(newBlock);
  };

  const handleWithdrawButton = () => {
    const block = findTransactionBlock(TRANSACTION_BLOCK_TYPE.SEND_ASSET);
    if (!block || block.type !== TRANSACTION_BLOCK_TYPE.SEND_ASSET) return;

    if (!providerAddress || !accountAddress) return;

    let newBlock = { ...block };
    let values: ISendAssetTransactionBlockValues = {};
    values.fromAddress = accountAddress;
    values.receiverAddress = providerAddress;
    values.isFromEtherspotWallet = true;

    newBlock.values = values;
    handleAddTransaction(newBlock);
  };

  const onDropdownClick = () => setShowChainDropdown(!showChainDropdown);

  const hideDropdown = () => setShowChainDropdown(false);

  const hideSearchBar = () => {
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
      <Title>{`$${formatAmountDisplay(walletTotal)}`}</Title>
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
        <SearchWrapper>
          <SearchIcon>{WalletAssetSearchIcon}</SearchIcon>
          <SearchInput
            placeholder="Search"
            value={searchValue}
            onChange={({ target }) => setSearchValue(target.value)}
          />
          {searchValue && <SearchIcon onClick={hideSearchBar}>{WalletCloseSearchIcon}</SearchIcon>}
        </SearchWrapper>

        <ChainButtonRow>
          <ChainButton selected={!showAllChains} onClick={() => toggleShowAllChains(false)}>
            <ChainButtonText>Assets</ChainButtonText>
          </ChainButton>

          <ChainButton selected={showAllChains} onClick={() => toggleShowAllChains(true)}>
            <ChainButtonText>Chains</ChainButtonText>
          </ChainButton>
        </ChainButtonRow>
      </ButtonRow>

      {!showAllChains && (
        <ChainDropdownWrapper>
          <ChainDropdownSelect>
            {supportedChains?.map((chain, i) => {
              if (i > 5) return null;

              return (
                <ChainDropdownButton
                  key={`chain-dropdown-${i}`}
                  onClick={() => toggleChainDropdownOption(chain.chainId)}
                  selected={selectedChains.includes(chain.chainId)}
                >
                  <RoundedImage url={chain.iconUrl} title={chain.title} size={34} marginRight={0} />
                </ChainDropdownButton>
              );
            })}

            <ChainDropdownIcon onClick={onDropdownClick}>
              <HiChevronDown size={18} color={theme.color?.text?.walletDropdownIcon} />
            </ChainDropdownIcon>
          </ChainDropdownSelect>

          {showChainDropdown && (
            <ChainDropdownModal>
              <ChainDropdownList>
                {supportedChains?.map((chain, i) => {
                  return (
                    <ChainDropdownButton
                      key={`chain-dropdown-button-${i}`}
                      onClick={() => toggleChainDropdownOption(chain.chainId)}
                      selected={selectedChains.includes(chain.chainId)}
                    >
                      <RoundedImage url={chain.iconUrl} title={chain.title} size={34} marginRight={0} />
                    </ChainDropdownButton>
                  );
                })}

                <ChainDropdownIcon onClick={hideDropdown}>
                  <HiChevronDown size={18} color={theme.color?.text?.walletDropdownIcon} />
                </ChainDropdownIcon>
              </ChainDropdownList>
            </ChainDropdownModal>
          )}
        </ChainDropdownWrapper>
      )}

      <WalletAssetsList
        updateCount={refreshCount}
        accountAddress={accountAddress}
        tab={tab}
        showAllChains={showAllChains}
        selectedChains={selectedChains}
        hideChainList={hideChainList}
        displayAssets={displayAssets}
        onCopy={onCopy}
        toggleChainBlock={toggleChainBlock}
      />

      <WalletNftsList
        accountAddress={accountAddress}
        tab={tab}
        showAllChains={showAllChains}
        selectedChains={selectedChains}
        hideChainList={hideChainList}
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

  ${({ theme, disabled }) =>
    !disabled
      ? `&:hover {
    span {
      color: ${theme.color.text.searchInput};
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
  background-image: ${({ theme }) => theme.color.background.walletButton};
`;

const ActionButtonText = styled(Text)`
  font-size: 14px;
  color: ${({ theme }) => theme.color.text.button};
  margin-top: 10px;
`;

const ChainButtonRow = styled.div`
  display: flex;
  flex: 1;
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
  ${({ theme, selected }) =>
    selected ? `background-color: ${theme.color.text.searchInput};` : `background-color: rgba(0,0,0,0);`};

  cursor: pointer;
  &:hover {
    opacity: 0.5;
  }

  span {
    ${({ theme, selected }) =>
      selected ? `color: ${theme.color.text.main};` : `color: ${theme.color.text.searchInput};`};
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
  gap: 5px;

  width: 100%;
  border-radius: 8px;
  margin-bottom: 18px;
  padding: 4px 48px 4px 4px;
  background-color: ${({ theme }) => theme.color.background.walletChainDropdown};
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
  gap: 5px;

  border-radius: 8px;
  margin: 0 0 18px;
  padding: 4px 48px 4px 4px;
  background-color: ${({ theme }) => theme.color.background.walletChainDropdown};

  box-shadow: 0 2px 4px 0 rgba(255, 210, 187, 0.4), 0 2px 8px 0 rgba(201, 201, 200, 0.55);
`;

const ChainDropdownButton = styled.div<{ selected?: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 48px;
  width: 48px;
  border-radius: 8px;
  background-color: ${({ theme, selected }) =>
    selected ? theme.color.background.walletChainButtonActive : 'transparent'};
`;

const ChainDropdownIcon = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;

  display: flex;
  justify-content: center;
  align-items: center;

  width: 48px;
  height: 48px;
  border-radius: 8px;

  &:hover {
    background: ${({ theme }) => theme.color.background.walletChainButtonActive};
  }
`;

// Search
const SearchWrapper = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0;
`;

const SearchInput = styled.input`
  flex: 1;
  font-size: 14px;
  color: ${({ theme }) => theme.color.text.searchInput};
  width: 100%;
  font-family: 'PTRootUIWebMedium', sans-serif;
  border: none;
  background: transparent;
  padding: 0 10px;
  box-sizing: border-box !important;

  &::placeholder {
    font-size: 14px;
    color: ${({ theme }) => theme.color.text.searchInput};
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

const SearchIcon = styled.span`
  margin-top -3px;

  ${({ onClick }) =>
    !!onClick &&
    `cursor: pointer;
    &:hover {
      opacity: 0.5;
    }
  `};
`;

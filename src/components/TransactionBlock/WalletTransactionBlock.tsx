import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';
import { AccountBalance, AccountTypes } from 'etherspot';

import TextInput from '../TextInput';
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import { formatAmountDisplay, formatAssetAmountInput, formatMaxAmount } from '../../utils/common';
import { Chain, supportedChains } from '../../utils/chain';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { CombinedRoundedImages, RoundedImage } from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';
import AccountSwitchInput from '../AccountSwitchInput';
import { IMultiCallData, ITransactionBlock } from '../../types/transactionBlock';
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
} from './Icons';
import { Text } from '../Text';
import { TRANSACTION_BLOCK_TYPE, TRANSACTION_BLOCK_TYPE_KEY } from '../../constants/transactionBuilderConstants';
import { ISendAssetTransactionBlockValues } from './SendAssetTransactionBlock';

interface IChainAssets {
  title: string;
  chainId: number;
  chain: Chain;
  assets: IAssetWithBalance[];
}

export interface IWalletTransactionBlock {
  chain?: Chain;
  availableTransactionBlocks: ITransactionBlock[];
  hasTransactionBlockAdded: boolean;
  addTransactionBlock: (block: ITransactionBlock, isBridgeDisabled: boolean, isKlimaIncluded: boolean) => void;
}

const WalletTransactionBlock = ({
  chain,
  availableTransactionBlocks,
  hasTransactionBlockAdded,
  addTransactionBlock,
}: IWalletTransactionBlock) => {
  const theme: Theme = useTheme();

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();

  const {
    providerAddress,
    accountAddress,
    getSupportedAssetsWithBalancesForChainId,
    smartWalletOnly,
    smartWalletBalanceByChain,
    sdk,
  } = useEtherspot();

  const [selectedNetwork, setSelectedNetwork] = useState<Chain | null>(supportedChains[1]);
  const [fetchingAssets, setFetchingAssets] = useState(false);
  const [showAllChains, setShowAllChains] = useState(true);

  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [selectedChains, setSelectedChains] = useState<number[]>([supportedChains[1].chainId]);
  const [hideChainList, setHideChainList] = useState<number[]>([]);
  const [displayAssets, setDisplayAssets] = useState<IAssetWithBalance[]>([]);

  const [walletTotal, setWalletTotal] = useState(0);
  const [chainAssets, setChainAssets] = useState<IChainAssets[] | null>(null);

  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    const getAssets = async () => {
      if (!chainAssets || fetchingAssets) {
        setFetchingAssets(true);
        let allAssets: IChainAssets[] = [];
        supportedChains.map(async (chain, i) => {
          try {
            if (chain.chainId === 43114) return;

            const assets = await getSupportedAssetsWithBalancesForChainId(chain.chainId, true, accountAddress);

            if (assets?.length) {
              allAssets.push({
                chain,
                chainId: chain.chainId,
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
      }
    };

    if (!accountAddress || !sdk) return;

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
    let assets: IAssetWithBalance[] = [];

    if (chainAssets) {
      chainAssets.map((chainAsset) => {
        if (!chainAsset.assets || !selectedChains.includes(chainAsset.chainId)) return;

        chainAsset.assets.map((asset) => {
          if (
            !!searchValue &&
            !asset.name.toLowerCase().includes(searchValue.toLowerCase()) &&
            !asset.symbol.toLowerCase().includes(searchValue.toLowerCase())
          )
            return;

          assets.push({ ...asset, chainId: chainAsset.chainId });
        });
      });
    }

    setDisplayAssets(assets);
  }, [chainAssets, selectedChains, showAllChains, searchValue]);

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

      {showAllChains &&
        chainAssets?.map((chainAsset) => {
          // Check if asset exists
          if (!chainAsset || !chainAsset.assets?.length) return null;

          const chainId = chainAsset?.chain?.chainId || 0;
          const chainTotal = smartWalletBalanceByChain?.find((bl) => bl.chain === chainAsset.chainId)?.total || 0;

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
                            <Text size={14} color="#191726" medium>{`${asset.symbol}・$${
                              asset.assetPriceUsd?.toFixed(2) || 0
                            }`}</Text>
                            <Text size={14} color="#191726" medium>{`$${asset.balanceWorthUsd?.toFixed(2) || 0}`}</Text>
                          </ListItemLine>

                          <ListItemLine>
                            <Text size={12} color="#191726" regular>{`on ${chainAsset.title}`}</Text>
                            <Text size={12} color="#191726" regular>{`${
                              formatAmountDisplay(ethers.utils.formatUnits(asset.balance, asset.decimals)) || 0
                            } ${asset.symbol}`}</Text>
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

      {!showAllChains && displayAssets?.length > 0 && (
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
                      <Text size={14} color="#191726" medium>{`${asset.symbol}・$${
                        asset.assetPriceUsd?.toFixed(2) || 0
                      }`}</Text>
                      <Text size={14} color="#191726" medium>{`$${asset.balanceWorthUsd?.toFixed(2) || 0}`}</Text>
                    </ListItemLine>

                    <ListItemLine>
                      <Text size={12} color="#191726" regular>{`on ${chain.title}`}</Text>
                      <Text size={12} color="#191726" regular>{`${
                        formatAmountDisplay(ethers.utils.formatUnits(asset.balance, asset.decimals)) || 0
                      } ${asset.symbol}`}</Text>
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

// Chains
const ChainBlock = styled.div<{ show?: boolean }>`
  flex: 1;
  border-radius: 8px;
  background-color: #fff;
  padding: 0 0 10px;
  margin-bottom: 12px;
`;

const ChainBlockHeader = styled.div<{ show?: boolean }>`
  flex: 1;
  align-items: center;
  padding: 10px 16px 0;
  position: relative;

  ${({ show }) => show && `padding-bottom: 10px; border-bottom: 1px solid #ffeee6;`};
`;

const ChainBlockHeaderText = styled(Text)`
  font-size: 14px;
  color: #6e6b6a;
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
const ChainBlockList = styled.div<{ show?: boolean }>`
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

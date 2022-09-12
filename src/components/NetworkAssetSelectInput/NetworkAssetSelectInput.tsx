import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled from 'styled-components';
import { AiOutlineSearch } from 'react-icons/ai';
import { MdOutlineKeyboardArrowDown, MdOutlineKeyboardArrowUp } from 'react-icons/md';
import {
  sortBy,
  uniqueId,
} from 'lodash';
import { ethers } from 'ethers';

import { useEtherspot } from '../../hooks';
import {
  Chain,
  supportedChains,
} from '../../utils/chain';
import {
  AssetWithBalance,
} from '../../providers/EtherspotContextProvider';
import { containsText } from '../../utils/validation';
import { formatAmountDisplay } from '../../utils/common';

const Wrapper = styled.div<{ disabled: boolean }>`
  position: relative;
  margin-bottom: 18px;
  background: #fff;
  border-radius: 8px;
  padding: 8px 14px 14px;
  ${({ disabled }) => disabled && `opacity: 0.3;`}
`;

const SelectWrapper = styled.div<{ disabled: boolean }>`
  position: absolute;
  top: 10px;
  right: 8px;
  width: 50px;
  text-align: right;
  
  ${({ disabled }) => !disabled && `
    cursor: pointer;

    &:hover {
      opacity: 0.5;
    }
  `}
`;

const Label = styled.label`
  display: inline-block;
  color: #6e6b6a;
  margin-bottom: 14px;
  font-size: 14px;
`;

const ErrorMessage = styled.small`
  color: #ff0000;
  margin-top: 5px;
  font-size: 12px;
`;

const SearchInputWrapper = styled.label`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  border-bottom: 1px solid #ffd2bb;
  margin-bottom: 17px;
  padding: 0 0 5px;
`;

const SearchInput = styled.input`
  font-size: 16px;
  width: calc(100% - 18px);
  height: 20px;
  background: none;
  border: none;
  margin: 0;
  padding: 0 8px;
  font-family: "PTRootUIWebMedium", sans-serif;
  color: #ff7733;
  
  &::placeholder {
    color: #ff7733;
  }

  &:focus {
    outline: none;
  }
`;

const OptionList = styled.div``;

const LargeOptionList = styled.div`
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #ffeee6;
`;

const SelectedOption = styled.div<{ disabled: boolean }>`
  color: #191726;
  font-size: 16px;
  font-family: "PTRootUIWebMedium", sans-serif;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  
  ${({ disabled }) => !disabled && `
    cursor: pointer;

    &:hover {
      opacity: 0.5;
    }
  `}
`;

const LargeSelectedOption = styled(SelectedOption)`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
`;

const OptionListItem = styled(SelectedOption)`
  text-align: left;
  margin-bottom: 15px;
  cursor: pointer;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    text-decoration: underline;
  }
`;

const LargeOptionListItem = styled(OptionListItem)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const LargeOptionDetails = styled.div`
  font-size: 14px;
`;

const LargeOptionDetailsBottom = styled.div`
  margin-top: 5px;
  font-size: 12px;
  color: #191726;
  font-family: "PTRootUIWebRegular", sans-serif;
`;

const OptionImage = styled.img`
  height: 24px;
  width: 24px;
  border-radius: 50%;
  margin-right: 8px;
`;

const LargeOptionImage = styled.img`
  height: 32px;
  width: 32px;
  border-radius: 50%;
  margin-right: 11px;
`;

const NetworkAssetCombinedImagesWrapper = styled.div`
  position: relative;

  ${OptionImage} {
    position: absolute;
    top: -2px;
    right: -2px;
    height: 14px;
    width: 14px;
    border: 2px solid #fff;
    border-radius: 50%;
  }
`;

const PlaceholderOptionImage = styled.div`
  font-family: "PTRootUIWebBold", sans-serif;
  font-size: 16px;
  line-height: 32px;
  height: 32px;
  width: 32px;
  border-radius: 50%;
  margin-right: 8px;
  background: #ffe6d9;
  color: #6e6b6a;
  text-align: center;
  text-transform: uppercase;
`;

const OptionsScroll = styled.div`
  max-height: 200px;
  overflow-x: hidden;
  overflow-y: scroll;
  
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: none;
  }

  ::-webkit-scrollbar-thumb {
    background: #ff7733;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 119, 51, 0.8);
  }

  ::-webkit-scrollbar-thumb:active {
    background-color: rgba(255, 119, 51, 0.5);
  }
`;

interface SelectInputProps {
  label?: string;
  errorMessage?: string;
  selectedAsset?: AssetWithBalance | null;
  selectedNetwork?: Chain | null;
  onAssetSelect?: (asset: AssetWithBalance) => void;
  onNetworkSelect?: (chain: Chain) => void;
  disabled?: boolean;
  showPositiveBalanceAssets?: boolean;
  hideChainIds?: number[];
  walletAddress?: string | null;
}

const NetworkAssetSelectInput = ({
  label,
  errorMessage,
  selectedAsset,
  selectedNetwork,
  onAssetSelect,
  onNetworkSelect,
  disabled = false,
  showPositiveBalanceAssets = false,
  hideChainIds,
  walletAddress,
}: SelectInputProps) => {
  const [inputId] = useState(uniqueId('etherspot-network-asset-select-input-'));
  const [searchInputId] = useState(uniqueId('etherspot-network-asset--select-search-input-'));
  const [showSelectModal, setShowSelectModal] = useState<boolean>(false);
  const [preselectedNetwork, setPreselectedNetwork] = useState<Chain | null>(null);
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  const [selectedNetworkAssets, setSelectedNetworkAssets] = useState<AssetWithBalance[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState<boolean>(false);
  const [noImageAssets, setNoImageAssets] = useState<{ [assetId: string]: boolean }>({});

  const { sdk, getSupportedAssetsForChainId, getSupportedAssetsWithBalancesForChainId } = useEtherspot();

  const onSelectClick = useCallback(() => {
    if (disabled) return;
    setShowSelectModal(!showSelectModal);
  }, [disabled, showSelectModal]);

  const updateSelectedNetworkAssets = useCallback(async () => {
    if (!sdk || !preselectedNetwork) return;
    setIsLoadingAssets(true);
    setSelectedNetworkAssets([]);

    const supportedAssets = await getSupportedAssetsWithBalancesForChainId(
      preselectedNetwork.chainId,
      showPositiveBalanceAssets,
      walletAddress,
    );
    setSelectedNetworkAssets(supportedAssets);

    setIsLoadingAssets(false);
  }, [
    sdk,
    preselectedNetwork,
    getSupportedAssetsForChainId,
    getSupportedAssetsWithBalancesForChainId,
    showPositiveBalanceAssets,
    walletAddress,
  ]);

  useEffect(() => { updateSelectedNetworkAssets(); }, [updateSelectedNetworkAssets]);

  const filteredSelectedNetworkAssets = useMemo(() => {
    const filtered = selectedNetworkAssets.filter((asset) => containsText(asset.name, assetSearchQuery) || containsText(asset.symbol, assetSearchQuery));
    return sortBy(filtered, ['balanceWorthUsd', 'name'], ['desc', 'asc']);
  }, [selectedNetworkAssets, assetSearchQuery, showPositiveBalanceAssets]);

  return (
    <Wrapper disabled={disabled}>
      {!!label && <Label htmlFor={inputId}>{label}</Label>}
      <SelectWrapper onClick={onSelectClick} disabled={disabled}>
        {!showSelectModal && <MdOutlineKeyboardArrowDown size={21} color="#0a1427" />}
        {showSelectModal && <MdOutlineKeyboardArrowUp size={21} color="#0a1427" />}
      </SelectWrapper>
      {!showSelectModal && (!selectedAsset || !selectedNetwork) && (
        <SelectedOption onClick={onSelectClick} disabled={disabled}>
          Select chain and token
        </SelectedOption>
      )}
      {!showSelectModal && !!selectedNetwork && !!selectedAsset && (
        <LargeSelectedOption onClick={onSelectClick} disabled={disabled}>
          <NetworkAssetCombinedImagesWrapper>
            <LargeOptionImage src={selectedNetwork.iconUrl} alt={selectedNetwork.title} />
            <OptionImage src={selectedAsset.logoURI} alt={selectedAsset.symbol} />
          </NetworkAssetCombinedImagesWrapper>
          <LargeOptionDetails>
            <div>{selectedAsset.symbol}</div>
            <LargeOptionDetailsBottom>On {selectedNetwork.title}</LargeOptionDetailsBottom>
          </LargeOptionDetails>
        </LargeSelectedOption>
      )}
      {showSelectModal && preselectedNetwork && (
        <SelectedOption onClick={() => setPreselectedNetwork(null)} disabled={disabled}>
          {!!preselectedNetwork?.iconUrl && <OptionImage src={preselectedNetwork?.iconUrl} alt={preselectedNetwork.title} />}
          {preselectedNetwork.title}
        </SelectedOption>
      )}
      {showSelectModal && !preselectedNetwork && (
        <OptionList>
          {supportedChains
            .filter((supportedChain) => !hideChainIds?.length || !hideChainIds.includes(supportedChain.chainId))
            .map((supportedChain) => (
              <OptionListItem
                disabled={disabled}
                key={`${supportedChain.chainId}`}
                onClick={() => setPreselectedNetwork(supportedChain)}
              >
                {!!supportedChain.iconUrl && <OptionImage src={supportedChain.iconUrl} alt={supportedChain.title} />}
                {supportedChain.title}
              </OptionListItem>
          ))}
        </OptionList>
      )}
      {showSelectModal && preselectedNetwork && (
        <LargeOptionList>
          {isLoadingAssets && <small>Loading assets...</small>}
          {!isLoadingAssets && !filteredSelectedNetworkAssets?.length && <small>No assets found.</small>}
          {!isLoadingAssets && !!filteredSelectedNetworkAssets?.length && (
            <>
              {selectedNetworkAssets?.length > 5 && (
                <SearchInputWrapper htmlFor={searchInputId}>
                  <AiOutlineSearch size={18} color="#ff7733" />
                  <SearchInput id={searchInputId} onChange={(e: any) => setAssetSearchQuery(e?.target?.value)} placeholder="Search" />
                </SearchInputWrapper>
              )}
              <OptionsScroll>
                {filteredSelectedNetworkAssets.map((asset, index) => {
                  const assetId = `${preselectedNetwork.chainId}-${asset.address}`;
                  return (
                    <LargeOptionListItem
                      disabled={disabled}
                      key={`${asset.address ?? '0x'}-${index}`}
                      onClick={() => {
                        if (onAssetSelect) onAssetSelect(asset);
                        if (onNetworkSelect) onNetworkSelect(preselectedNetwork);
                        setShowSelectModal(false);
                        setPreselectedNetwork(null);
                        setAssetSearchQuery('');
                      }}
                    >
                      {(!asset.logoURI || noImageAssets[assetId]) && <PlaceholderOptionImage>{asset.symbol[0]}</PlaceholderOptionImage>}
                      {!!asset.logoURI && !noImageAssets[assetId] && (
                        <LargeOptionImage
                          src={asset.logoURI}
                          alt={asset.name}
                          onError={({ currentTarget }) => {
                            currentTarget.onerror = null;
                            setNoImageAssets((current) => ({ ...current, [assetId]: true }));
                          }}
                        />
                      )}
                      <LargeOptionDetails>
                        <div>
                          {asset.name}
                          {asset?.assetPriceUsd && `・$${formatAmountDisplay(asset.assetPriceUsd)}`}
                        </div>
                        <LargeOptionDetailsBottom>
                          {formatAmountDisplay(ethers.utils.formatUnits(asset.balance, asset.decimals))} {asset.symbol}
                          {!asset.balance.isZero() && asset?.balanceWorthUsd && `・$${formatAmountDisplay(asset.balanceWorthUsd)}`}
                        </LargeOptionDetailsBottom>
                      </LargeOptionDetails>
                    </LargeOptionListItem>
                  )
                })}
              </OptionsScroll>
            </>
          )}
        </LargeOptionList>
      )}
      {!!errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
    </Wrapper>
  );
}

export default NetworkAssetSelectInput;

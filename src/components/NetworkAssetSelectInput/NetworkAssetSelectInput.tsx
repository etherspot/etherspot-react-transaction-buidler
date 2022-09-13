import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
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
import { Theme } from '../../utils/theme';
import { RoundedImage } from '../Image';
import CombinedRoundedImages from '../Image/CombinedRoundedImages';

const Wrapper = styled.div<{ disabled: boolean, expanded?: boolean }>`
  position: relative;
  margin-bottom: 18px;
  background: ${({ theme, expanded }) => expanded ? theme.color.background.selectInputExpanded : theme.color.background.selectInput};
  color: ${({ theme }) => theme.color.text.selectInput};
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
  color: ${({ theme }) => theme.color.text.innerLabel};
  margin-bottom: 14px;
  font-size: 14px;
`;

const ErrorMessage = styled.small`
  color: ${({ theme }) => theme.color.text.errorMessage};
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
  color: ${({ theme }) => theme.color.text.searchInput};
  
  &::placeholder {
    color: ${({ theme }) => theme.color.text.searchInputSecondary};
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
  color: ${({ theme }) => theme.color.text.selectInputOption};
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
  color: ${({ theme }) => theme.color.text.selectInputOptionSecondary};
  font-family: "PTRootUIWebRegular", sans-serif;
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
    background: ${({ theme }) => theme.color.background.selectInputScrollbar};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: ${({ theme }) => theme.color.background.selectInputScrollbarHover};
  }

  ::-webkit-scrollbar-thumb:active {
    background-color: ${({ theme }) => theme.color.background.selectInputScrollbarActive};
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
  const theme: Theme = useTheme();

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
    <Wrapper disabled={disabled} expanded={showSelectModal}>
      {!!label && <Label htmlFor={inputId}>{label}</Label>}
      <SelectWrapper onClick={onSelectClick} disabled={disabled}>
        {!showSelectModal && <MdOutlineKeyboardArrowDown size={21} color={theme.color?.background?.selectInputToggleButton} />}
        {showSelectModal && <MdOutlineKeyboardArrowUp size={21} color={theme.color?.background?.selectInputToggleButton} />}
      </SelectWrapper>
      {!showSelectModal && (!selectedAsset || !selectedNetwork) && (
        <SelectedOption onClick={onSelectClick} disabled={disabled}>
          Select chain and token
        </SelectedOption>
      )}
      {!showSelectModal && !!selectedNetwork && !!selectedAsset && (
        <LargeSelectedOption onClick={onSelectClick} disabled={disabled}>
          <CombinedRoundedImages
            url1={selectedAsset.logoURI}
            url2={selectedNetwork.iconUrl}
            title1={selectedAsset.symbol}
            title2={selectedNetwork.title}
          />
          <LargeOptionDetails>
            <div>{selectedAsset.symbol}</div>
            <LargeOptionDetailsBottom>On {selectedNetwork.title}</LargeOptionDetailsBottom>
          </LargeOptionDetails>
        </LargeSelectedOption>
      )}
      {showSelectModal && preselectedNetwork && (
        <SelectedOption onClick={() => setPreselectedNetwork(null)} disabled={disabled}>
          {!!preselectedNetwork?.iconUrl && <RoundedImage url={preselectedNetwork?.iconUrl} title={preselectedNetwork.title} size={24} />}
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
                {!!supportedChain.iconUrl && <RoundedImage url={supportedChain.iconUrl} title={supportedChain.title} size={24} />}
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
                  <AiOutlineSearch size={18} color={theme?.color?.text?.searchInput} />
                  <SearchInput id={searchInputId} onChange={(e: any) => setAssetSearchQuery(e?.target?.value)} placeholder="Search" />
                </SearchInputWrapper>
              )}
              <OptionsScroll>
                {filteredSelectedNetworkAssets.map((asset, index) => (
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
                    <RoundedImage url={asset.logoURI} title={asset.name} />
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
                ))}
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

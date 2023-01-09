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
  orderBy,
  uniqueId,
} from 'lodash';
import {
  BigNumber,
  ethers,
} from 'ethers';

import { useEtherspot } from '../../hooks';
import {
  Chain,
  CHAIN_ID,
  supportedChains,
} from '../../utils/chain';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { containsText } from '../../utils/validation';
import { formatAmountDisplay } from '../../utils/common';
import { Theme } from '../../utils/theme';
import { RoundedImage } from '../Image';
import CombinedRoundedImages from '../Image/CombinedRoundedImages';
import { DestinationWalletEnum } from '../../enums/wallet.enum';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';

const Wrapper = styled.div<{ disabled: boolean, expanded?: boolean, hover?: boolean }>`
  position: relative;
  margin-bottom: 18px;
  background: ${({ theme, expanded }) => expanded ? theme.color.background.selectInputExpanded : theme.color.background.selectInput};
  color: ${({ theme }) => theme.color.text.selectInput};
  border-radius: 8px;
  padding: 8px 14px 14px;
  cursor: pointer;
  ${({ disabled }) => disabled && `opacity: 0.3;`}
  &:hover {
    ${({ theme, hover }) => hover && `background-color: ${ theme.color.background.dropdownHoverColor };`}
  }
`;

const SelectWrapper = styled.div<{ disabled: boolean }>`
  position: absolute;
  top: 10px;
  right: 8px;
  width: 50px;
  text-align: right;
  
  ${({ disabled }) => !disabled && `
    cursor: pointer;
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

const SelectedOption = styled.div<{ disabled?: boolean }>`
  color: ${({ theme }) => theme.color.text.selectInputOption};
  font-size: 16px;
  font-family: "PTRootUIWebMedium", sans-serif;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;

  ${({ disabled }) => !disabled && `
    cursor: pointer;
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
  cursor: pointer;
  padding: 7.5px 3px;
  border-radius: 10px;
  &:hover {
    ${({ theme }) => `background-color: ${ theme.color.background.selectInputExpandedHover };`}
  }
`;

const LargeOptionListItem = styled(OptionListItem)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  cursor: inherit;
  
  &:hover {
    opacity: 1;
  }
`;

const LargeOptionListItemLeft = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;

`;

const LargeOptionListItemRight = styled.div<{ paddingRight?: boolean; }>`
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
`;

const QuickAmountButton = styled.div<{ primary?: boolean }>`
  padding: 4px 8px;
  border-radius: 8px;
  margin-right: 4px;
  line-height: 16px;
  font-size: 12px;
  font-family: "PTRootUIWebMedium", sans-serif;
  color: ${({ theme, primary }) => primary ? theme.color.text.listItemQuickButtonPrimary : theme.color.text.listItemQuickButtonSecondary};
  background-color: ${({ theme, primary }) => primary ? theme.color.background.listItemQuickButtonPrimary : theme.color.background.listItemQuickButtonSecondary};
  cursor: pointer;

  &:last-child {
    margin-right: 0;
  }
  
  &:hover {
    opacity: 0.5;
  }
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
  max-height: 210px;
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
  selectedAsset?: IAssetWithBalance | null;
  selectedNetwork?: Chain | null;
  onAssetSelect?: (asset: IAssetWithBalance, amountBN?: BigNumber) => void;
  onNetworkSelect?: (chain: Chain) => void;
  disabled?: boolean;
  showPositiveBalanceAssets?: boolean;
  hideChainIds?: number[];
  walletAddress?: string | null;
  showQuickInputButtons?: boolean;
  accountType: string;
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
  showQuickInputButtons,
  accountType,
}: SelectInputProps) => {
  const [inputId] = useState(uniqueId('etherspot-network-asset-select-input-'));
  const [searchInputId] = useState(uniqueId('etherspot-network-asset--select-search-input-'));
  const [showSelectModal, setShowSelectModal] = useState<boolean>(false);
  const [preselectedNetwork, setPreselectedNetwork] = useState<Chain | null>(null);
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  const [selectedNetworkAssets, setSelectedNetworkAssets] = useState<IAssetWithBalance[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState<boolean>(false);
  const theme: Theme = useTheme();

  const {
    sdk,
    getSupportedAssetsWithBalancesForChainId,
    getSmartWalletBalancesPerChain,
    balancePerChainSmartWallet,
    setBalancePerChainSmartWallet,
    balancePerChainKeybasedWallet,
    providerAddress,
    accountAddress,
    getKeybasedWalletBalancesPerChain,
    setBalancePerChainKeybasedWallet,
  } = useEtherspot();

  const onSelectClick = useCallback(() => {
    if (disabled) return;
    if (selectedNetwork) setPreselectedNetwork(selectedNetwork);
    setShowSelectModal(!showSelectModal);
  }, [disabled, showSelectModal, selectedNetwork]);

  useEffect(() => {
    let shouldUpdate = true;

    const updateSelectedNetworkAssets = async () => {
      if (!sdk || !preselectedNetwork || preselectedNetwork.chainId === selectedNetwork?.chainId) return;
      setIsLoadingAssets(true);

      let supportedAssets: IAssetWithBalance[] = [];
      try {
        supportedAssets = await getSupportedAssetsWithBalancesForChainId(
          preselectedNetwork.chainId,
          showPositiveBalanceAssets,
          walletAddress,
        );
      } catch (e) {
        //
      }

      if (!shouldUpdate) return;

      setSelectedNetworkAssets(supportedAssets);
      setIsLoadingAssets(false);
    }

    updateSelectedNetworkAssets();

    return () => { shouldUpdate = false; }
  }, [
    sdk,
    preselectedNetwork,
    getSupportedAssetsWithBalancesForChainId,
    showPositiveBalanceAssets,
    walletAddress,
  ]);

  useEffect(() => {
    const handleBalanceGet = async () => {
      if (!sdk || !accountAddress) return;
      await getSmartWalletBalancesPerChain(accountAddress, supportedChains);
    };
    handleBalanceGet();
  }, [supportedChains, sdk, accountAddress]);

  useEffect(() => {
    const handleKeybasedBalanceGet = async () => {
      if (!sdk || !providerAddress) return;
      await getKeybasedWalletBalancesPerChain(providerAddress, supportedChains);
    };
    handleKeybasedBalanceGet();
  }, [supportedChains, sdk, providerAddress]);

  const filteredSelectedNetworkAssets = useMemo(() => {
    const filtered = selectedNetworkAssets.filter((asset) => containsText(asset.name, assetSearchQuery) || containsText(asset.symbol, assetSearchQuery));
    return orderBy(filtered, [(asset) => asset.balanceWorthUsd ?? 0, 'name'], ['desc', 'asc']);
  }, [selectedNetworkAssets, assetSearchQuery]);

  useEffect(() => {
    const updateAvalancheBalanceSmart = () => {
      if (
        !sdk ||
        !walletAddress ||
        !preselectedNetwork ||
        preselectedNetwork.chainId !== CHAIN_ID.AVALANCHE ||
        !balancePerChainSmartWallet ||
        filteredSelectedNetworkAssets.length ||
        accountType !== DestinationWalletEnum.Contract
      )
        return;
      setBalancePerChainSmartWallet([
        ...balancePerChainSmartWallet,
        {
          total: filteredSelectedNetworkAssets.reduce((acc, curr) => {
            return curr.balanceWorthUsd ? acc + curr.balanceWorthUsd : acc;
          }, 0),
          title: supportedChains.filter(
            (element) => element.chainId === CHAIN_ID.AVALANCHE
          )[0].title,
          chain: CHAIN_ID.AVALANCHE,
        },
      ]);
    };
    updateAvalancheBalanceSmart();
  }, [
    sdk,
    supportedChains,
    accountAddress,
    preselectedNetwork,
    filteredSelectedNetworkAssets,
  ]);

  useEffect(() => {
    const updateAvalancheBalanceKeybased = () => {
      if (
        !sdk ||
        !walletAddress ||
        !preselectedNetwork ||
        preselectedNetwork.chainId !== CHAIN_ID.AVALANCHE ||
        !balancePerChainKeybasedWallet ||
        filteredSelectedNetworkAssets.length ||
        accountType !== DestinationWalletEnum.Key
      )
        return;

      setBalancePerChainKeybasedWallet([
        ...balancePerChainKeybasedWallet,
        {
          total: filteredSelectedNetworkAssets.reduce((acc, curr) => {
            return curr.balanceWorthUsd ? acc + curr.balanceWorthUsd : acc;
          }, 0),
          title: supportedChains.filter(
            (element) => element.chainId === CHAIN_ID.AVALANCHE
          )[0].title,
          chain: CHAIN_ID.AVALANCHE,
        },
      ]);
    };
    updateAvalancheBalanceKeybased();
  }, [
    sdk,
    supportedChains,
    providerAddress,
    preselectedNetwork,
    filteredSelectedNetworkAssets,
  ]);

  const onListItemClick = (asset: IAssetWithBalance, amountBN?: BigNumber) => {
    if (onAssetSelect) onAssetSelect(asset, amountBN);
    if (onNetworkSelect && preselectedNetwork) onNetworkSelect(preselectedNetwork);
    setShowSelectModal(false);
    setPreselectedNetwork(null);
    setAssetSearchQuery('');
  }

  const formatBalanceByChainByAccountType = (
    supportedChain: Chain,
    accType?: string
  ) => {
    if (
      accType === DestinationWalletEnum.Contract &&
      label === 'From' &&
      balancePerChainSmartWallet &&
      balancePerChainSmartWallet.length
    ) {
      let balanceByChain = balancePerChainSmartWallet.filter(
        (item: any) => item.chain === supportedChain.chainId
      );
      return balancePerChainSmartWallet &&
        balancePerChainSmartWallet.length &&
        balanceByChain.length
        ? ` · ${formatAmountDisplay(String(balanceByChain[0].total), '$')}`
        : ' · $0';
    } else if (
      accType === DestinationWalletEnum.Key &&
      label === 'From' &&
      balancePerChainKeybasedWallet &&
      balancePerChainKeybasedWallet.length
    ) {
      let balanceByChain = balancePerChainKeybasedWallet.filter(
        (item: any) => item.chain === supportedChain.chainId
      );
      return balancePerChainKeybasedWallet &&
        balancePerChainKeybasedWallet.length &&
        balanceByChain.length
        ? ` · ${formatAmountDisplay(String(balanceByChain[0].total), '$')}`
        : ' · $0';
    }
    return ' · $0';
  };

  return (
    <Wrapper hover={!showSelectModal} disabled={disabled} onClick={onSelectClick} expanded={showSelectModal}>
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
            url={selectedAsset.logoURI}
            smallImageUrl={selectedNetwork.iconUrl}
            title={selectedAsset.symbol}
            smallImageTitle={selectedNetwork.title}
          />
          <LargeOptionDetails>
            <div>{selectedAsset.symbol}</div>
            <LargeOptionDetailsBottom>On {selectedNetwork.title}</LargeOptionDetailsBottom>
          </LargeOptionDetails>
        </LargeSelectedOption>
      )}
      {showSelectModal && preselectedNetwork && (
        <SelectedOption onClick={(e) => {
              e.stopPropagation()
              setPreselectedNetwork(null)
            }
          }
          disabled={disabled}>
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
                onClick={(e) => {
                  e.stopPropagation();
                  setPreselectedNetwork(supportedChain)
                }}
              >
                <>
                  {!!supportedChain.iconUrl && <RoundedImage url={supportedChain.iconUrl} title={supportedChain.title} size={24} />}
                  {supportedChain.title} {formatBalanceByChainByAccountType(supportedChain, accountType)}
                </>
              </OptionListItem>
          ))}
        </OptionList>
      )}
      {showSelectModal && preselectedNetwork && (
        <LargeOptionList>
          {isLoadingAssets && <small>Loading assets...</small>}
          {!isLoadingAssets && !selectedNetworkAssets?.length && <small>No assets found.</small>}
          {!isLoadingAssets && !!selectedNetworkAssets?.length && (
            <>
              {selectedNetworkAssets?.length > 5 && (
                <SearchInputWrapper htmlFor={searchInputId}>
                  <AiOutlineSearch size={18} color={theme?.color?.text?.searchInput} />
                  <SearchInput id={searchInputId}
                    onChange={(e: any) => setAssetSearchQuery(e?.target?.value)}
                    placeholder="Search"
                    onClick={(e:any) => e.stopPropagation()}
                    onFocus={(e: any) => {
                      e.stopPropagation();
                    }}
                  />
                </SearchInputWrapper>
              )}
              <OptionsScroll>
                {filteredSelectedNetworkAssets.map((asset, index) => (
                  <LargeOptionListItem key={`${asset.address ?? '0x'}-${index}`}
                  onClick={(e:any) => {
                    e.stopPropagation();
                    if(!showQuickInputButtons){
                      onListItemClick(asset)
                    }
                  }}>
                    <LargeOptionListItemLeft onClick={() => onListItemClick(asset)}>
                      <RoundedImage url={asset.logoURI} title={asset.name} />
                      <LargeOptionDetails>
                        <div>
                          {asset.name}
                          {asset?.assetPriceUsd && `・${formatAmountDisplay(asset.assetPriceUsd, '$')}`}
                        </div>
                        <LargeOptionDetailsBottom>
                          {formatAmountDisplay(ethers.utils.formatUnits(asset.balance, asset.decimals))} {asset.symbol}
                          {!asset.balance.isZero() && asset?.balanceWorthUsd && `・${formatAmountDisplay(asset.balanceWorthUsd, '$')}`}
                        </LargeOptionDetailsBottom>
                      </LargeOptionDetails>
                    </LargeOptionListItemLeft>
                    {showQuickInputButtons && BigNumber.isBigNumber(asset.balance) && !asset.balance.isZero() && (
                      <LargeOptionListItemRight>
                        <QuickAmountButton onClick={() => onListItemClick(asset, asset.balance.div(4))}>25%</QuickAmountButton>
                        <QuickAmountButton onClick={() => onListItemClick(asset, asset.balance.div(2))}>50%</QuickAmountButton>
                        <QuickAmountButton onClick={() => onListItemClick(asset, asset.balance)} primary>Max</QuickAmountButton>
                      </LargeOptionListItemRight>
                    )}
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

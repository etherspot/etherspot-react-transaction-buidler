import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountTypes, ExchangeOffer } from 'etherspot';
import { BigNumber, ethers } from 'ethers';
import debounce from 'debounce-promise';
import { Route } from '@lifi/sdk';

// types
import { IPlrStakingV2Block } from '../../types/transactionBlock';

// components
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import { Pill, Text } from '../Text';
import AccountSwitchInput from '../AccountSwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import { CombinedRoundedImages, RoundedImage } from '../Image';
import RouteOption from '../RouteOption';

// providers
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';

// utils
import { formatAmountDisplay, formatMaxAmount, formatAssetAmountInput } from '../../utils/common';
import { addressesEqual, isValidEthereumAddress, isValidAmount } from '../../utils/validation';
import { Chain, supportedChains, CHAIN_ID } from '../../utils/chain';
import { swapServiceIdToDetails } from '../../utils/swap';
import { Theme } from '../../utils/theme';
import { bridgeServiceIdToDetails } from '../../utils/bridge';
import { getPlrAssetForChainId, plrStakedAssetEthereumMainnet } from '../../utils/asset';

// constants
import {
  PLR_ADDRESS_PER_CHAIN,
  PLR_STAKING_ADDRESS_ETHEREUM_MAINNET,
} from '../../constants/assetConstants';

interface ICrossChainSwap {
  type: 'CROSS_CHAIN_SWAP',
  route?: Route;
}

interface ISameChainSwap {
  type: 'SAME_CHAIN_SWAP',
  offer?: ExchangeOffer;
}

export type IPlrStakingV2BlockSwap = ICrossChainSwap | ISameChainSwap;

export interface IPlrStakingV2BlockValues {
  swap?: IPlrStakingV2BlockSwap;
  fromChain?: Chain;
  toChain?: Chain;
  fromAsset?: IAssetWithBalance;
  toAsset?: IAssetWithBalance;
  amount?: string;
  accountType?: string;
  receiverAddress?: string;
}

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: 'PTRootUIWebBold', sans-serif;
`;

const WalletReceiveWrapper = styled.div`
  display: flex;
  flex-direction: row;
`;

const OfferDetails = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  font-family: 'PTRootUIWebMedium', sans-serif;
`;

const Container = styled.div`
  align-items: center;
  font-family: 'PTRootUIWebMedium', sans-serif;
  background: ${({ theme }) => theme.color.background.card};
  color: ${({ theme }) => theme.color.text.tokenBalance};
  padding: 16px;
  border-radius: 7px;
`;

const ContainerWrapper = styled.div`
  background: ${({ theme }) => theme.color.background.blockParagraphBorder};
  margin: 12px 0 14px 0;
  padding: 2px;
  border-radius: 8px;
`;

const Highlighted = styled.span<{ color?: string }>`
  ${({ color }) => color && `color: ${color};`};
`;

const HorizontalLine = styled.div`
  margin: 11px 0;
  width: 100%;
  height: 1px;
  background: ${({ theme }) => theme.color.background.blockParagraphBorder};
`;

const mapOfferToOption = (offer: ExchangeOffer) => {
  const serviceDetails = swapServiceIdToDetails[offer.provider];
  return {
    title: serviceDetails?.title ?? offer.provider,
    value: offer.provider,
    iconUrl: serviceDetails?.iconUrl,
  };
};

const mapRouteToOption = (route: Route) => {
  const [fistStep] = route.steps;
  const serviceDetails = bridgeServiceIdToDetails[fistStep?.toolDetails?.key ?? 'lifi'];
  return {
    title: fistStep?.toolDetails?.name ?? serviceDetails?.title ?? 'LiFi',
    value: route.id,
    iconUrl: fistStep?.toolDetails?.logoURI ?? serviceDetails?.iconUrl,
  };
};

interface IPlrBalancePerChain { [chainId: string]: BigNumber | undefined }

const MIN_PLR_STAKE_AMOUNT = '1';

const chainIdsWithPlrTokens = [CHAIN_ID.ETHEREUM_MAINNET, CHAIN_ID.BINANCE, CHAIN_ID.XDAI, CHAIN_ID.POLYGON];

const isEnoughPlrBalanceToStake = (
  plrBalance: BigNumber | undefined,
): boolean => {
  if (!plrBalance) return false;
  const requiredAmountBN = ethers.utils.parseUnits(MIN_PLR_STAKE_AMOUNT, 18);
  return plrBalance.gte(requiredAmountBN);
}

const PlrStakingV2TransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  values,
}: IPlrStakingV2Block) => {
  const {
    sdk,
    providerAddress,
    accountAddress,
    smartWalletOnly,
  } = useEtherspot();

  const [amount, setAmount] = useState<string>(values?.amount ?? '');
  const [selectedAccountType, setSelectedAccountType] = useState<string>(values?.accountType ?? AccountTypes.Contract);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(values?.fromChain ?? null);
  const [selectedToNetwork, setSelectedToNetwork] = useState<Chain | null>(values?.toChain ?? null);
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(values?.fromAsset ?? null);
  const [selectedToAsset, setSelectedToAsset] = useState<IAssetWithBalance | null>(values?.toAsset ?? null);
  const [
    addressPlrBalancePerChain,
    setAddressPlrBalancePerChain,
  ] = useState<{ [address: string]: IPlrBalancePerChain }>({});

  const hasEnoughPlrToStake = useMemo(() => [providerAddress, accountAddress].some((address) => {
    if (!address || !addressPlrBalancePerChain?.[address]?.[CHAIN_ID.ETHEREUM_MAINNET]) return false;
    return isEnoughPlrBalanceToStake(addressPlrBalancePerChain[address][CHAIN_ID.ETHEREUM_MAINNET]);
  }), [providerAddress, accountAddress, addressPlrBalancePerChain]);

  useEffect(() => {
    const setPlrAsDefault = (selectedAccountType === AccountTypes.Key
      && providerAddress
      && addressPlrBalancePerChain?.[providerAddress]?.[CHAIN_ID.ETHEREUM_MAINNET]
      && isEnoughPlrBalanceToStake(addressPlrBalancePerChain?.[providerAddress]?.[CHAIN_ID.ETHEREUM_MAINNET]))
    || (selectedAccountType === AccountTypes.Contract
        && accountAddress
        && addressPlrBalancePerChain?.[accountAddress]?.[CHAIN_ID.ETHEREUM_MAINNET]
        && isEnoughPlrBalanceToStake(addressPlrBalancePerChain?.[accountAddress]?.[CHAIN_ID.ETHEREUM_MAINNET]));

    if (!setPlrAsDefault) return;

    const ethereumMainnetChain = supportedChains.find((chain) => chain.chainId === CHAIN_ID.ETHEREUM_MAINNET) as Chain;
    setSelectedFromNetwork(ethereumMainnetChain);
    setSelectedToNetwork(ethereumMainnetChain);

    const balanceAddress = (selectedAccountType === AccountTypes.Key ? providerAddress : accountAddress) as string;
    const plrAsset = getPlrAssetForChainId(
      CHAIN_ID.ETHEREUM_MAINNET,
      addressPlrBalancePerChain[balanceAddress][CHAIN_ID.ETHEREUM_MAINNET] as BigNumber,
    );

    setSelectedFromAsset(plrAsset);
    setSelectedToAsset(plrStakedAssetEthereumMainnet);
  }, [
    addressPlrBalancePerChain,
    selectedAccountType,
    providerAddress,
    accountAddress,
  ]);

  // cross chain swaps
  const defaultRoute = values?.swap?.type == 'CROSS_CHAIN_SWAP' && values?.swap?.route;
  const [selectedRoute, setSelectedRoute] = useState<SelectOption | null>(defaultRoute ? mapRouteToOption(defaultRoute) : null);
  const [availableRoutes, setAvailableRoutes] = useState<Route[] | null>(defaultRoute ? [defaultRoute] : null);
  const [isLoadingAvailableRoutes, setIsLoadingAvailableRoutes] = useState<boolean>(false);

  // same chain swaps
  const defaultOffer = values?.swap?.type == 'SAME_CHAIN_SWAP' && values?.swap?.offer;
  const [selectedOffer, setSelectedOffer] = useState<SelectOption | null>(defaultOffer ? mapOfferToOption(defaultOffer) : null);
  const [availableOffers, setAvailableOffers] = useState<ExchangeOffer[] | null>(defaultOffer ? [defaultOffer] : null);
  const [isLoadingAvailableOffers, setIsLoadingAvailableOffers] = useState<boolean>(false);

  const defaultSelectedReceiveAccountType = (!values?.receiverAddress && values?.accountType === AccountTypes.Key)
  || (values?.receiverAddress && values?.accountType === AccountTypes.Contract && addressesEqual(providerAddress, values?.receiverAddress))
    ? AccountTypes.Key
    : AccountTypes.Contract;
  const [selectedReceiveAccountType, setSelectedReceiveAccountType] = useState<string>(defaultSelectedReceiveAccountType);

  const {
    setTransactionBlockValues,
    resetTransactionBlockFieldValidationError,
    setTransactionBlockFieldValidationError,
  } = useTransactionBuilder();

  const theme: Theme = useTheme()

  useEffect(() => {
    setSelectedRoute(null);
    resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
  }, [selectedToNetwork, selectedFromNetwork]);

  const receiverAddress = useMemo(() => {
    if (selectedReceiveAccountType === selectedAccountType) return null;
    return selectedReceiveAccountType === AccountTypes.Key
      ? providerAddress
      : accountAddress;
  }, [
    providerAddress,
    selectedReceiveAccountType,
    selectedAccountType,
    accountAddress,
  ]);

  const getAvailableRoutes = useCallback<() => Promise<Route[] | undefined>>(debounce(async () => {
    if (!sdk
      || !selectedToAsset
      || !selectedFromAsset
      || !amount
      || !selectedFromNetwork?.chainId
      || !selectedToNetwork?.chainId
      || !isValidAmount(amount)) return;

    if (receiverAddress && !isValidEthereumAddress(receiverAddress)) {
      setTransactionBlockFieldValidationError(
        transactionBlockId,
        'receiverAddress',
        'Invalid receiver address',
      );
      return;
    }

    try {
      const { items: routes } = await sdk.getAdvanceRoutesLiFi({
        fromChainId: selectedFromNetwork.chainId,
        toChainId: selectedToNetwork.chainId,
        fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
        fromTokenAddress: selectedFromAsset.address,
        toTokenAddress: selectedToAsset.address,
        toAddress: receiverAddress ?? undefined,
      });
      return routes;
    } catch (e) {
      //
    }
  }, 200), [
    sdk,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedFromNetwork,
    selectedToNetwork,
    receiverAddress,
  ]);

  useEffect(() => {
    let proceedUpdate = true;

    const updateRoutes = async () => {
      setIsLoadingAvailableRoutes(true);
      setSelectedRoute(null);
      setAvailableRoutes([]);

      const newRoutes = await getAvailableRoutes();
      if (!proceedUpdate) return;

      if (newRoutes) {
        setAvailableRoutes(newRoutes);
        if (newRoutes.length === 1) setSelectedRoute(mapRouteToOption(newRoutes[0]));
      }

      setIsLoadingAvailableRoutes(false);
    }

    updateRoutes();

    return () => { proceedUpdate = false };
  }, [getAvailableRoutes]);

  const getAvailableOffers = useCallback<() => Promise<ExchangeOffer[] | undefined>>(debounce(async () => {
    if (!sdk
      || !selectedToAsset
      || !selectedFromAsset
      || !amount
      || !selectedToNetwork
      || (selectedToNetwork?.chainId !== selectedFromNetwork?.chainId)
      || !isValidAmount(amount)
    ) return;

    try {
      // needed computed account address before calling getExchangeOffers
      if (!accountAddress) await sdk.computeContractAccount();

      return sdk.getExchangeOffers({
        fromChainId: selectedToNetwork.chainId,
        fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
        fromTokenAddress: selectedFromAsset.address,
        toTokenAddress: selectedToAsset.address,
      });
    } catch (e) {
      //
    }
  }, 200), [
    sdk,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedToNetwork,
    selectedFromNetwork,
    accountAddress,
  ]);

  useEffect(() => {
    let proceedUpdate = true;

    const updateOffers = async () => {
      setIsLoadingAvailableOffers(true);
      setSelectedOffer(null);
      setAvailableOffers([]);

      const newOffers = await getAvailableOffers();
      if (!proceedUpdate) return;

      if (newOffers?.length) setAvailableOffers(newOffers);

      setIsLoadingAvailableOffers(false);
    }

    updateOffers();

    return () => { proceedUpdate = false };
  }, [getAvailableOffers]);

  const onAmountChange = useCallback((newAmount: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    const decimals = selectedToAsset?.decimals ?? 18;
    const updatedAmount = formatAssetAmountInput(newAmount, decimals);
    setAmount(updatedAmount)
  }, [selectedFromAsset, selectedToAsset]);

  useEffect(() => {
    let swap: IPlrStakingV2BlockSwap | undefined;

    if (selectedFromNetwork?.chainId !== selectedToNetwork?.chainId) {
      const route = availableRoutes?.find((availableRoute) => availableRoute.id === selectedRoute?.value);
      swap = {
        type: 'CROSS_CHAIN_SWAP',
        route,
      }
    } else if (selectedFromNetwork?.chainId === selectedToNetwork?.chainId
      && !addressesEqual(selectedFromAsset?.address, PLR_STAKING_ADDRESS_ETHEREUM_MAINNET)) {
      const offer = availableOffers?.find((availableOffer) => availableOffer.provider === selectedOffer?.value);
      swap = {
        type: 'SAME_CHAIN_SWAP',
        offer,
      }
    }

    setTransactionBlockValues(
      transactionBlockId,
      {
        fromChain: selectedFromNetwork ?? undefined,
        toChain: selectedToNetwork ?? undefined,
        fromAsset: selectedFromAsset ?? undefined,
        toAsset: selectedToAsset ?? undefined,
        receiverAddress: receiverAddress ?? undefined,
        accountType: selectedAccountType,
        amount,
        swap,
      },
    );
  }, [
    selectedFromNetwork,
    selectedToNetwork,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedRoute,
    selectedOffer,
    receiverAddress,
    selectedAccountType,
  ]);

  const availableRoutesOptions = useMemo(
    () => availableRoutes?.map(mapRouteToOption),
    [availableRoutes],
  );

  const availableOffersOptions = useMemo(
    () => availableOffers?.map(mapOfferToOption),
    [availableOffers],
  );

  useEffect(() => {
    let shouldUpdate = true;

    const updateBalances = async () => {
      // is connected
      if (!accountAddress || !sdk) return;

      await Promise.all([accountAddress, providerAddress].map(async (address) => {
        if (!address) return;

        await Promise.all(supportedChains.map(async (chain) => {
          if (!chainIdsWithPlrTokens.includes(chain.chainId)) return;

          const plrAddressForChain = PLR_ADDRESS_PER_CHAIN[chain.chainId];

          try {
            const { items: balances } = await sdk.getAccountBalances({
              account: address,
              tokens: [plrAddressForChain],
              chainId: chain.chainId,
            });

            if (!shouldUpdate) return;

            const plrBalance = balances
              .find((balance) => addressesEqual(plrAddressForChain, balance.token))
              ?.balance;

            setAddressPlrBalancePerChain((current) => ({
              ...current,
              [address]: {
                ...current[address] ?? {},
                [chain.chainId]: plrBalance,
              },
            }));
          } catch (e) {
            //
          }
        }));
      }));
    }

    updateBalances();

    return () => { shouldUpdate = false; };
  }, [
    sdk,
    providerAddress,
    accountAddress,
  ]);

  const remainingSelectedFromAssetBalance = useMemo(() => {
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero()) return 0;

    if (!amount) return +ethers.utils.formatUnits(selectedFromAsset.balance, selectedFromAsset.decimals);

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedFromAsset.decimals);
    return +ethers.utils.formatUnits(selectedFromAsset.balance.sub(assetAmountBN), selectedFromAsset.decimals);
  }, [amount, selectedFromAsset]);

  const inputTitle = useMemo(() => {
    return 'You swap';
  }, []);

  const renderRouteOption = (option: SelectOption) => (
    <RouteOption
      route={availableRoutes?.find((route) => route.id === option.value)}
      isChecked={selectedRoute?.value && selectedRoute?.value === option.value}
    />
  );

  const renderOfferOption = (option: SelectOption) => {
    const availableOffer = availableOffers?.find((offer) => offer.provider === option.value);
    return (
      <OfferDetails>
        <RoundedImage title={option.title} url={option.iconUrl} size={24} />
        <div>
          <Text size={12} marginBottom={2} medium block>
            {option.title}
          </Text>
          {!!availableOffer && !!selectedToAsset && (
            <Text size={16} medium>
              {formatAmountDisplay(ethers.utils.formatUnits(availableOffer.receiveAmount, selectedToAsset?.decimals))}
              &nbsp;{selectedToAsset?.symbol}
            </Text>
          )}
        </div>
      </OfferDetails>
    );
  }

  const plrTokensSum = useMemo(() => Object.values(addressPlrBalancePerChain).reduce((sum, balancePerChain) => {
    let walletSum = 0;

    Object.keys(balancePerChain).forEach((chain) => {
      if (!balancePerChain[chain]) return;

      const plrBalance = balancePerChain[chain];
      if (!plrBalance) return;

      walletSum += +ethers.utils.formatUnits(plrBalance, 18);
    });

    return sum + walletSum;
  }, 0), [addressPlrBalancePerChain]);

  const isStakingAssetSelected = selectedToAsset?.address === plrStakedAssetEthereumMainnet.address;

  const assetToSelectDisabled = !selectedFromNetwork
    || !selectedFromAsset
    || isStakingAssetSelected;

  return (
    <>
      <Title>Pillar Validator Staking</Title>
      <ContainerWrapper>
        <Container>
          <Text size={14}>
            {!hasEnoughPlrToStake && (
              <>
                You need a minimum of
                &nbsp;<Highlighted color={theme.color?.text?.blockParagraphHighlight}>10,000 PLR</Highlighted>
                &nbsp;tokens on Ethereum, swap more assets to PLR on Ethereum Mainnet.
              </>
            )}
            {hasEnoughPlrToStake && <>You can stake your PLR tokens.</>}
          </Text>
          <HorizontalLine />
          {plrTokensSum > 0 && (
            <>
              <Text size={14}>You have {formatAmountDisplay(plrTokensSum)} PLR tokens:</Text>
              {supportedChains
                .filter((chain) => chainIdsWithPlrTokens.includes(chain.chainId))
                .map((chain) => {
                  const [
                    plrAmountOnKeyBased,
                    plrAmountOnSmartWallet,
                  ] = [providerAddress, accountAddress].map((address) => {
                    if (!address || !addressPlrBalancePerChain?.[address]?.[chain.chainId]) return;

                    const plrBalance = addressPlrBalancePerChain[address][chain.chainId] ;
                    if (!plrBalance) return;

                    return formatAmountDisplay(ethers.utils.formatUnits(plrBalance, 18));
                  });

                  return (
                    <>
                      {plrAmountOnKeyBased && (
                        <Text size={12} marginTop={4} block>• {plrAmountOnKeyBased} PLR on {chain.title} on Key Based</Text>
                      )}
                      {plrAmountOnSmartWallet && (
                        <Text size={12} marginTop={4} block>• {plrAmountOnKeyBased} PLR on {chain.title} on Smart Wallet</Text>
                      )}
                    </>
                  );
                })
              }
            </>
          )}
          {plrTokensSum === 0 && (
            <Text size={14}>
              You have 0 PLR tokens.
            </Text>
          )}
        </Container>
      </ContainerWrapper>
      <AccountSwitchInput
        label="From wallet"
        selectedAccountType={selectedAccountType}
        onChange={(accountType) => {
          if (accountType !== selectedAccountType) {
            setSelectedFromNetwork(null);
            setSelectedFromAsset(null);
            setSelectedToNetwork(null);
            setSelectedToAsset(null);
            setAvailableRoutes(null);
            setSelectedRoute(null);
            setAvailableOffers(null);
            setSelectedOffer(null);
          }
          setSelectedAccountType(accountType);
        }}
        errorMessage={errorMessages?.accountType}
        hideKeyBased={smartWalletOnly}
        showTotals
      />
      <NetworkAssetSelectInput
        label="From"
        onAssetSelect={(asset, amountBN) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAsset');
          setSelectedFromAsset(asset);
          setAmount(amountBN ? formatMaxAmount(amountBN, asset.decimals) : '');
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromChain');
          setSelectedFromNetwork(network);
        }}
        selectedNetwork={selectedFromNetwork}
        selectedAsset={selectedFromAsset}
        errorMessage={errorMessages?.fromChain || errorMessages?.fromAsset}
        walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
        hideChainIds={[CHAIN_ID.AVALANCHE]}
        showPositiveBalanceAssets
        showQuickInputButtons
        accountType={selectedAccountType}
      />
      <NetworkAssetSelectInput
        label="To"
        onAssetSelect={(asset) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'toAsset');
          setSelectedToAsset(asset);
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'toChain');
          setSelectedToNetwork(network);
        }}
        selectedNetwork={selectedToNetwork}
        selectedAsset={selectedToAsset}
        errorMessage={errorMessages?.toChain || errorMessages?.toAsset}
        disabled={assetToSelectDisabled}
        hideChainIds={[CHAIN_ID.AVALANCHE]}
        hideAssets={
          selectedFromNetwork && selectedFromAsset
            ? [{ chainId: selectedFromNetwork.chainId, address: selectedFromAsset.address }]
            : undefined
        }
        walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
        accountType={selectedAccountType}
      />
      {!!selectedFromAsset && !!selectedFromNetwork && (
        <TextInput
          label={inputTitle}
          onValueChange={onAmountChange}
          value={amount}
          placeholder="0"
          inputBottomText={
            selectedFromAsset?.assetPriceUsd && amount
              ? `${formatAmountDisplay(+amount * selectedFromAsset.assetPriceUsd, '$')}`
              : undefined
          }
          inputLeftComponent={
            <CombinedRoundedImages
              url={selectedFromAsset.logoURI}
              smallImageUrl={selectedFromNetwork.iconUrl}
              title={selectedFromAsset.symbol}
              smallImageTitle={selectedFromNetwork.title}
            />
          }
          inputTopRightComponent={
            <Pill
              label="Remaining"
              value={`${formatAmountDisplay(remainingSelectedFromAssetBalance ?? 0)} ${selectedFromAsset.symbol}`}
              valueColor={(remainingSelectedFromAssetBalance ?? 0) < 0 ? theme.color?.text?.errorMessage : undefined}
            />
          }
          errorMessage={errorMessages?.amount}
        />
      )}
      <WalletReceiveWrapper>
        <AccountSwitchInput
          label="You will receive on"
          selectedAccountType={selectedReceiveAccountType}
          onChange={setSelectedReceiveAccountType}
          hideKeyBased={smartWalletOnly}
        />
      </WalletReceiveWrapper>
      {!isStakingAssetSelected
        && !!selectedToAsset
        && !!selectedFromAsset
        && !!amount
        && (remainingSelectedFromAssetBalance ?? 0) >= 0
        && (
          <>
            {selectedFromNetwork?.chainId !== selectedToNetwork?.chainId && (
              <SelectInput
                label={'Route'}
                options={availableRoutesOptions ?? []}
                isLoading={isLoadingAvailableRoutes}
                selectedOption={selectedRoute}
                onOptionSelect={(option) => {
                  resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
                  setSelectedRoute(option);
                }}
                placeholder="Select route"
                renderOptionListItemContent={renderRouteOption}
                renderSelectedOptionContent={renderRouteOption}
                errorMessage={errorMessages?.route}
                disabled={!availableRoutesOptions?.length || isLoadingAvailableRoutes}
                noOpen={!!selectedRoute && availableRoutesOptions?.length === 1}
                forceShow={!!availableRoutesOptions?.length && availableRoutesOptions?.length > 1}
              />
            )}
            {selectedFromNetwork?.chainId === selectedToNetwork?.chainId && (
              <SelectInput
                label={'Offer'}
                options={availableOffersOptions ?? []}
                isLoading={isLoadingAvailableOffers}
                disabled={!availableOffersOptions?.length || isLoadingAvailableOffers}
                selectedOption={selectedOffer}
                onOptionSelect={(option) => {
                  resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
                  setSelectedOffer(option);
                }}
                renderOptionListItemContent={renderOfferOption}
                renderSelectedOptionContent={renderOfferOption}
                placeholder='Select offer'
                errorMessage={errorMessages?.offer}
                noOpen={!!selectedOffer && availableOffersOptions?.length === 1}
                forceShow={!!availableOffersOptions?.length && availableOffersOptions?.length > 1}
              />
            )}
          </>
      )}
    </>
  );
};

export default PlrStakingV2TransactionBlock;

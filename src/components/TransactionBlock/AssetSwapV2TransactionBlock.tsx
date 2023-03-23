import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountTypes, ExchangeOffer } from 'etherspot';
import { ethers } from 'ethers';
import debounce from 'debounce-promise';
import { Route } from '@lifi/sdk';

// types
import { IAssetSwapV2TransactionBlock } from '../../types/transactionBlock';

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
import { DestinationWalletEnum } from '../../enums/wallet.enum';

// utils
import { formatAmountDisplay, formatMaxAmount, formatAssetAmountInput } from '../../utils/common';
import { addressesEqual, isValidEthereumAddress, isValidAmount } from '../../utils/validation';
import { Chain, CHAIN_ID } from '../../utils/chain';
import { swapServiceIdToDetails } from '../../utils/swap';
import { bridgeServiceIdToDetails } from '../../utils/bridge';
import { Theme } from '../../utils/theme';

interface ICrossChainSwap {
  type: 'CROSS_CHAIN_SWAP';
  route?: Route;
}

interface ISameChainSwap {
  type: 'SAME_CHAIN_SWAP';
  offer?: ExchangeOffer;
}

export type IAssetSwapV2BlockSwap = ICrossChainSwap | ISameChainSwap;

export interface ISwapAssetV2TransactionBlockValues {
  swap?: IAssetSwapV2BlockSwap;
  fromChain?: Chain;
  fromAsset?: IAssetWithBalance;
  toChain?: Chain;
  toAsset?: IAssetWithBalance;
  amount?: string;
  receiverAddress?: string;
  isDifferentReceiverAddress?: boolean;
  accountType?: string;
}

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

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: 'PTRootUIWebBold', sans-serif;
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
  const [firstStep] = route.steps;
  const serviceDetails = bridgeServiceIdToDetails[firstStep?.toolDetails?.key ?? 'lifi'];
  return {
    title: firstStep?.toolDetails?.name ?? serviceDetails?.title ?? 'LiFi',
    value: route.id,
    iconUrl: firstStep?.toolDetails?.logoURI ?? serviceDetails?.iconUrl,
  };
};

const AssetSwapV2Block = ({ id: transactionBlockId, errorMessages, values }: IAssetSwapV2TransactionBlock) => {
  const { sdk, providerAddress, accountAddress, smartWalletOnly } = useEtherspot();

  const [amount, setAmount] = useState<string>(values?.amount ?? '');
  const [selectedAccountType, setSelectedAccountType] = useState<string>(values?.accountType ?? AccountTypes.Contract);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(values?.fromChain ?? null);
  const [selectedToNetwork, setSelectedToNetwork] = useState<Chain | null>(values?.toChain ?? null);
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(values?.fromAsset ?? null);
  const [selectedToAsset, setSelectedToAsset] = useState<IAssetWithBalance | null>(values?.toAsset ?? null);

  // cross chain swaps
  const defaultRoute = values?.swap?.type === 'CROSS_CHAIN_SWAP' && values?.swap?.route;
  const [selectedRoute, setSelectedRoute] = useState<SelectOption | null>(
    defaultRoute ? mapRouteToOption(defaultRoute) : null
  );
  const [availableRoutes, setAvailableRoutes] = useState<Route[] | null>(defaultRoute ? [defaultRoute] : null);
  const [isLoadingAvailableRoutes, setIsLoadingAvailableRoutes] = useState<boolean>(false);

  // same chain swaps
  const defaultOffer = values?.swap?.type === 'SAME_CHAIN_SWAP' && values?.swap?.offer;
  const [selectedOffer, setSelectedOffer] = useState<SelectOption | null>(
    defaultOffer ? mapOfferToOption(defaultOffer) : null
  );
  const [availableOffers, setAvailableOffers] = useState<ExchangeOffer[] | null>(defaultOffer ? [defaultOffer] : null);
  const [isLoadingAvailableOffers, setIsLoadingAvailableOffers] = useState<boolean>(false);

  const defaultCustomReceiverAddress =
    values?.receiverAddress &&
    !addressesEqual(providerAddress, values?.receiverAddress) &&
    !addressesEqual(accountAddress, values?.receiverAddress)
      ? values.receiverAddress
      : null;
  const [customReceiverAddress, setCustomReceiverAddress] = useState<string | null>(defaultCustomReceiverAddress);
  const [useCustomAddress, setUseCustomAddress] = useState<boolean>(!!defaultCustomReceiverAddress);

  const defaultSelectedReceiveAccountType =
    (!values?.receiverAddress && values?.accountType === AccountTypes.Key) ||
    (values?.receiverAddress &&
      values?.accountType === AccountTypes.Contract &&
      addressesEqual(providerAddress, values?.receiverAddress))
      ? AccountTypes.Key
      : AccountTypes.Contract;
  const [selectedReceiveAccountType, setSelectedReceiveAccountType] = useState<string>(
    defaultSelectedReceiveAccountType
  );

  const {
    setTransactionBlockValues,
    resetTransactionBlockFieldValidationError,
    setTransactionBlockFieldValidationError,
  } = useTransactionBuilder();

  const theme: Theme = useTheme();

  useEffect(() => {
    if (selectedReceiveAccountType === DestinationWalletEnum.Custom) {
      resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
      setUseCustomAddress(true);
    } else {
      setUseCustomAddress(false);
      setCustomReceiverAddress(null);
    }
  }, [selectedReceiveAccountType]);

  useEffect(() => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
  }, [selectedToNetwork, selectedFromNetwork]);

  const receiverAddress = useMemo(() => {
    if (useCustomAddress) return customReceiverAddress;
    if (selectedReceiveAccountType === selectedAccountType) return null;
    return selectedReceiveAccountType === AccountTypes.Key ? providerAddress : accountAddress;
  }, [
    useCustomAddress,
    customReceiverAddress,
    providerAddress,
    selectedReceiveAccountType,
    selectedAccountType,
    accountAddress,
  ]);

  const getAvailableRoutes = useCallback<() => Promise<Route[] | undefined>>(
    debounce(async () => {
      if (
        !sdk ||
        !selectedToAsset ||
        !selectedFromAsset ||
        !amount ||
        !selectedFromNetwork?.chainId ||
        !selectedToNetwork?.chainId ||
        !isValidAmount(amount)
      )
        return;

      if (receiverAddress && !isValidEthereumAddress(receiverAddress)) {
        setTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress', 'Invalid receiver address');
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
    }, 200),
    [sdk, selectedFromAsset, selectedToAsset, amount, selectedFromNetwork, selectedToNetwork, receiverAddress]
  );

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
    };

    updateRoutes();

    return () => {
      proceedUpdate = false;
    };
  }, [getAvailableRoutes]);

  const getAvailableOffers = useCallback<() => Promise<ExchangeOffer[] | undefined>>(
    debounce(async () => {
      if (
        !sdk ||
        !selectedToAsset ||
        !selectedFromAsset ||
        !amount ||
        !selectedToNetwork ||
        !selectedFromNetwork?.chainId ||
        !selectedToNetwork?.chainId ||
        !isValidAmount(amount)
      )
        return;

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
    }, 200),
    [sdk, selectedFromAsset, selectedToAsset, amount, selectedToNetwork, selectedFromNetwork, accountAddress]
  );

  useEffect(() => {
    let proceedUpdate = true;

    const updateOffers = async () => {
      setIsLoadingAvailableOffers(true);
      setSelectedOffer(null);
      setAvailableOffers([]);

      const newOffers = await getAvailableOffers();
      if (newOffers === undefined) return;
      if (!proceedUpdate) return;

      if (selectedFromNetwork?.chainId !== selectedToNetwork?.chainId) {
        const bestOffer: ExchangeOffer[] | undefined = newOffers?.filter(
          (offer) => offer.provider === swapServiceIdToDetails['Lifi'].title
        );
        const selectedOffer = bestOffer[0]?.provider ? bestOffer[0] : newOffers[0];
        setSelectedOffer(mapOfferToOption(selectedOffer));
        setAvailableOffers(bestOffer);
      } else {
        setAvailableOffers(newOffers);
        setIsLoadingAvailableOffers(false);
      }
    };

    updateOffers();

    return () => {
      proceedUpdate = false;
    };
  }, [getAvailableOffers]);

  const onAmountChange = useCallback(
    (newAmount: string) => {
      resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
      const decimals = selectedToAsset?.decimals ?? 18;
      const updatedAmount = formatAssetAmountInput(newAmount, decimals);
      setAmount(updatedAmount);
    },
    [selectedFromAsset, selectedToAsset]
  );

  useEffect(() => {
    let swap: IAssetSwapV2BlockSwap | undefined;

    if (selectedFromNetwork?.chainId !== selectedToNetwork?.chainId) {
      const route = availableRoutes?.find((availableRoute) => availableRoute.id === selectedRoute?.value);
      swap = {
        type: 'CROSS_CHAIN_SWAP',
        route,
      };
    } else if (selectedFromNetwork?.chainId === selectedToNetwork?.chainId) {
      const offer = availableOffers?.find((availableOffer) => availableOffer.provider === selectedOffer?.value);
      swap = {
        type: 'SAME_CHAIN_SWAP',
        offer,
      };
    }
    setTransactionBlockValues(transactionBlockId, {
      fromChain: selectedFromNetwork ?? undefined,
      toChain: selectedToNetwork ?? undefined,
      fromAsset: selectedFromAsset ?? undefined,
      toAsset: selectedToAsset ?? undefined,
      receiverAddress: receiverAddress ?? undefined,
      accountType: selectedAccountType,
      amount,
      swap,
    });
  }, [
    selectedFromNetwork,
    selectedToNetwork,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedOffer,
    receiverAddress,
    selectedAccountType,
  ]);

  const availableOffersOptions = useMemo(() => availableOffers?.map(mapOfferToOption), [availableOffers]);

  const availableRoutesOptions = useMemo(() => availableRoutes?.map(mapRouteToOption), [availableRoutes]);

  const remainingSelectedFromAssetBalance = useMemo(() => {
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero()) return 0;

    if (!amount) return +ethers.utils.formatUnits(selectedFromAsset.balance, selectedFromAsset.decimals);

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedFromAsset.decimals);
    return +ethers.utils.formatUnits(selectedFromAsset.balance.sub(assetAmountBN), selectedFromAsset.decimals);
  }, [amount, selectedFromAsset]);

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
  };

  return (
    <>
      <Title>Swap Asset V2</Title>
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
        disabled={!selectedFromNetwork || !selectedFromAsset}
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
          label="Swap Asset"
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
              borderColor={theme?.color?.background?.textInput}
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
          showCustom
        />
      </WalletReceiveWrapper>
      {useCustomAddress && (
        <TextInput
          value={customReceiverAddress ?? ''}
          onValueChange={(value) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
            setCustomReceiverAddress(value);
          }}
          errorMessage={errorMessages?.receiverAddress}
          placeholder="Insert address"
          noLabel
          showPasteButton
        />
      )}
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
          placeholder="Select offer"
          errorMessage={errorMessages?.offer}
          noOpen={!!selectedOffer && availableOffersOptions?.length === 1}
          forceShow={!!availableOffersOptions?.length && availableOffersOptions?.length > 1}
        />
      )}
    </>
  );
};

export default AssetSwapV2Block;

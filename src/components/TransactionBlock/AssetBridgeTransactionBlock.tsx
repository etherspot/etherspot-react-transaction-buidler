import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
import {
  AccountTypes,
} from 'etherspot';
import { ethers } from 'ethers';
import debounce from 'debounce-promise';

import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import {
  useEtherspot,
  useTransactionBuilder,
} from '../../hooks';
import {
  formatAmountDisplay,
  formatAssetAmountInput,
  formatMaxAmount,
} from '../../utils/common';
import {
  ErrorMessages,
} from '../../utils/validation';
import AccountSwitchInput from '../AccountSwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { Chain } from '../../utils/chain';
import {
  IAssetWithBalance,
} from '../../providers/EtherspotContextProvider';
import {
  CombinedRoundedImages,
  RoundedImage,
} from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';
import Text from '../Text/Text';
import { bridgeServiceIdToDetails } from '../../utils/bridge';
import { Route } from '@lifi/sdk';

export interface AssetBridgeTransactionBlockValues {
  fromChainId?: number;
  toChainId?: number;
  fromAssetAddress?: string;
  fromAssetIconUrl?: string;
  fromAssetDecimals?: number;
  toAssetAddress?: string;
  toAssetIconUrl?: string;
  toAssetUsdPrice?: number;
  amount?: string;
  route?: Route;
}

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: "PTRootUIWebBold", sans-serif;
`;

const OfferDetails = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  font-family: "PTRootUIWebMedium", sans-serif;
`;

const OfferDetailsBlock = styled.div`
  margin-right: 16px;
`;

const mapRouteToOption = (route: Route) => {
  const [fistStep] = route.steps;
  const serviceDetails = bridgeServiceIdToDetails[fistStep?.toolDetails?.key ?? 'lifi'];
  return {
    title: fistStep?.toolDetails?.name ?? serviceDetails?.title ?? 'LiFi',
    value: route.id,
    iconUrl: fistStep?.toolDetails?.logoURI ?? serviceDetails?.iconUrl,
  };
}

const AssetBridgeTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
}: {
  id: string;
  errorMessages?: ErrorMessages;
}) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(null);
  const [selectedToAsset, setSelectedToAsset] = useState<IAssetWithBalance | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<string>(AccountTypes.Contract);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(null);
  const [selectedToNetwork, setSelectedToNetwork] = useState<Chain | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<SelectOption | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<Route[] | null>(null);
  const [isLoadingAvailableRoutes, setIsLoadingAvailableRoutes] = useState<boolean>(false);

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();
  const theme: Theme = useTheme();

  const { sdk } = useEtherspot();

  useEffect(() => {
    if (selectedFromNetwork?.chainId === selectedToNetwork?.chainId) {
      setSelectedToNetwork(null);
      setSelectedToAsset(null);
    }
  }, [selectedFromNetwork, selectedToNetwork]);

  useEffect(() => {
    setSelectedRoute(null);
    resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
  }, [selectedToNetwork, selectedFromNetwork]);

  const updateAvailableRoutes = useCallback(debounce(async () => {
    setSelectedRoute(null);
    setAvailableRoutes([]);

    if (!sdk || !selectedToAsset || !selectedFromAsset || !amount || !selectedFromNetwork?.chainId || !selectedToNetwork?.chainId) return;

    setIsLoadingAvailableRoutes(true);

    try {
      const { items: routes } = await sdk.getAdvanceRoutesLiFi({
        fromChainId: selectedFromNetwork.chainId,
        toChainId: selectedToNetwork.chainId,
        fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
        fromTokenAddress: selectedFromAsset.address,
        toTokenAddress: selectedToAsset.address,
      });
      setAvailableRoutes(routes);
      if (routes.length === 1) setSelectedRoute(mapRouteToOption(routes[0]));
    } catch (e) {
      //
    }

    setIsLoadingAvailableRoutes(false);
  }, 200), [
    sdk,
    selectedFromAsset,
    selectedToAsset, amount,
    selectedFromNetwork,
    selectedToNetwork,
  ]);

  useEffect(() => { updateAvailableRoutes(); }, [updateAvailableRoutes]);

  const onAmountChange = useCallback((newAmount: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    const decimals = selectedToAsset?.decimals ?? 18;
    const updatedAmount = formatAssetAmountInput(newAmount, decimals);
    setAmount(updatedAmount)
  }, [selectedFromAsset, selectedToAsset]);

  useEffect(() => {
    if (setTransactionBlockValues) {
      const route = availableRoutes?.find((availableRoute) => availableRoute.id === selectedRoute?.value);
      setTransactionBlockValues(transactionBlockId, {
        fromChainId: selectedFromNetwork?.chainId,
        toChainId: selectedToNetwork?.chainId,
        fromAssetAddress: selectedFromAsset?.address,
        fromAssetDecimals: selectedFromAsset?.decimals,
        fromAssetIconUrl: selectedFromAsset?.logoURI,
        toAssetAddress: selectedToAsset?.address,
        toAssetIconUrl: selectedToAsset?.logoURI,
        toAssetUsdPrice: selectedToAsset?.assetPriceUsd ?? undefined,
        amount,
        route,
      });
    }
  }, [
    setTransactionBlockValues,
    selectedFromNetwork,
    selectedToNetwork,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedRoute,
  ]);

  const availableRoutesOptions = useMemo(
    () => availableRoutes?.map(mapRouteToOption),
    [availableRoutes],
  );

  const remainingSelectedFromAssetBalance = useMemo(() => {
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero()) return 0;

    if (!amount) return +ethers.utils.formatUnits(selectedFromAsset.balance, selectedFromAsset.decimals);

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedFromAsset.decimals);
    return +ethers.utils.formatUnits(selectedFromAsset.balance.sub(assetAmountBN), selectedFromAsset.decimals);
  }, [amount, selectedFromAsset]);


  const renderOption = (option: SelectOption) => {
    const availableRoute = availableRoutes?.find((route) => route.id === option.value);
    const valueToReceive = availableRoute?.toAmountMin && formatAmountDisplay(ethers.utils.formatUnits(availableRoute.toAmountMin, selectedToAsset?.decimals));
    return (
      <OfferDetails>
        <RoundedImage title={option.title} url={option.iconUrl} size={24} />
        <OfferDetailsBlock>
          <Text size={12} marginBottom={2} medium block>{option.title}</Text>
          {!!valueToReceive && <Text size={16} medium>{valueToReceive} {selectedToAsset?.symbol}</Text>}
        </OfferDetailsBlock>
        {!!availableRoute?.gasCostUSD && (
          <OfferDetailsBlock>
            <Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>Gas price</Text>
            {!!valueToReceive && <Text size={16} medium>{formatAmountDisplay(availableRoute.gasCostUSD, '$')}</Text>}
          </OfferDetailsBlock>
        )}
      </OfferDetails>
    );
  };

  return (
    <>
      <Title>Asset bridge</Title>
      <AccountSwitchInput
        label="From wallet"
        selectedAccountType={selectedAccountType}
        onChange={(accountType) => {
          if (accountType === AccountTypes.Key) {
            alert('Not supported yet!');
            return;
          }
          setSelectedAccountType(accountType);
        }}
        errorMessage={errorMessages?.fromWallet}
      />
      <NetworkAssetSelectInput
        label="From"
        onAssetSelect={(asset, amountBN) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetAddress');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetDecimals');
          setSelectedFromAsset(asset);
          setAmount(amountBN ? formatMaxAmount(amountBN, asset.decimals) : '');
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromChainId');
          setSelectedFromNetwork(network);
        }}
        selectedNetwork={selectedFromNetwork}
        selectedAsset={selectedFromAsset}
        errorMessage={errorMessages?.fromChainId
          || errorMessages?.fromAssetAddress
          || errorMessages?.fromAssetDecimals
        }
        showPositiveBalanceAssets
        showQuickInputButtons
      />
      <NetworkAssetSelectInput
        label="To"
        onAssetSelect={(asset) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetDecimals');
          setSelectedToAsset(asset);
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'toChainId');
          setSelectedToNetwork(network);
        }}
        selectedNetwork={selectedToNetwork}
        selectedAsset={selectedToAsset}
        errorMessage={errorMessages?.toChainId
          || errorMessages?.toAssetAddress
          || errorMessages?.toAssetDecimals
        }
        disabled={!selectedFromNetwork || !selectedFromAsset}
        hideChainIds={selectedFromNetwork ? [selectedFromNetwork.chainId] : undefined}
      />
      {selectedFromAsset && selectedFromNetwork && (
        <TextInput
          label="You swap"
          onValueChange={onAmountChange}
          value={amount}
          placeholder="0"
          inputBottomText={selectedFromAsset?.assetPriceUsd && amount ? `${formatAmountDisplay(+amount * selectedFromAsset.assetPriceUsd, '$')}` : undefined}
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
      {!!selectedToAsset && !!selectedFromAsset && !!amount && (remainingSelectedFromAssetBalance ?? 0) >= 0 && (
        <SelectInput
          label={`Route`}
          options={availableRoutesOptions ?? []}
          isLoading={isLoadingAvailableRoutes}
          selectedOption={selectedRoute}
          onOptionSelect={(option) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
            setSelectedRoute(option);
          }}
          placeholder="Select route"
          renderOptionListItemContent={renderOption}
          renderSelectedOptionContent={renderOption}
          errorMessage={errorMessages?.route}
          disabled={!availableRoutesOptions?.length || isLoadingAvailableRoutes}
          noOpen={!!selectedRoute && availableRoutesOptions?.length === 1}
          forceShow={!!availableRoutesOptions?.length && availableRoutesOptions?.length > 1}
        />
      )}
    </>
  );
};

export default AssetBridgeTransactionBlock;

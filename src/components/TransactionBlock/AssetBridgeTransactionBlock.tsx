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
  isValidAmount,
  isValidEthereumAddress,
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
import Checkbox from '../Checkbox';

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
  accountType?: string;
  route?: Route;
  receiverAddress?: string;
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

const WalletReceiveWrapper = styled.div`
  display: flex;
  flex-direction: row;
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
  const [customReceiverAddress, setCustomReceiverAddress] = useState<string | null>(null);
  const [selectedReceiveAccountType, setSelectedReceiveAccountType] = useState<string>(AccountTypes.Contract);
  const [isLoadingAvailableRoutes, setIsLoadingAvailableRoutes] = useState<boolean>(false);
  const [useCustomAddress, setUseCustomAddress] = useState<boolean>(false);

  const {
    setTransactionBlockValues,
    resetTransactionBlockFieldValidationError,
    setTransactionBlockFieldValidationError,
  } = useTransactionBuilder();

  const theme: Theme = useTheme();

  const { sdk, providerAddress, accountAddress } = useEtherspot();

  useEffect(() => {
    if (selectedFromNetwork?.chainId === selectedToNetwork?.chainId) {
      setSelectedToNetwork(null);
      setSelectedToAsset(null);
    }
  }, [selectedFromNetwork, selectedToNetwork]);

  useEffect(() => {
    setSelectedFromNetwork(null);
    setSelectedFromAsset(null);
    setSelectedToNetwork(null);
    setSelectedToAsset(null);
    setAvailableRoutes(null);
    setSelectedRoute(null);
  }, [selectedAccountType]);

  useEffect(() => {
    setSelectedRoute(null);
    resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
  }, [selectedToNetwork, selectedFromNetwork]);

  const receiverAddress = useMemo(() => {
    if (useCustomAddress) return customReceiverAddress;
    if (selectedReceiveAccountType === selectedAccountType) return null;
    return selectedReceiveAccountType === AccountTypes.Key
      ? providerAddress
      : accountAddress;
  }, [
    useCustomAddress,
    customReceiverAddress,
    providerAddress,
    selectedReceiveAccountType,
    selectedAccountType,
    accountAddress,
  ]);

  const updateAvailableRoutes = useCallback(debounce(async () => {
    setSelectedRoute(null);
    setAvailableRoutes([]);

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

    setIsLoadingAvailableRoutes(true);

    try {
      const { items: routes } = await sdk.getAdvanceRoutesLiFi({
        fromChainId: selectedFromNetwork.chainId,
        toChainId: selectedToNetwork.chainId,
        fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
        fromTokenAddress: selectedFromAsset.address,
        toTokenAddress: selectedToAsset.address,
        toAddress: receiverAddress ?? undefined,
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
    selectedToAsset,
    amount,
    selectedFromNetwork,
    selectedToNetwork,
    receiverAddress,
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
        receiverAddress: receiverAddress ?? undefined,
        accountType: selectedAccountType,
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
    receiverAddress,
    selectedAccountType,
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
        onChange={setSelectedAccountType}
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
        walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
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
        walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
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
      <WalletReceiveWrapper>
        <AccountSwitchInput
          label="You will receive on"
          selectedAccountType={selectedReceiveAccountType}
          onChange={setSelectedReceiveAccountType}
          disabled={useCustomAddress}
          inlineLabel
        />
      </WalletReceiveWrapper>
      <Checkbox
        label="Use custom address"
        isChecked={useCustomAddress}
        onChange={(isChecked) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
          setUseCustomAddress(isChecked);
          if (!isChecked) setCustomReceiverAddress(null);
        }}
        rightAlign
      />
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

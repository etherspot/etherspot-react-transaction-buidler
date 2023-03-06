import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountTypes } from 'etherspot';
import { ethers } from 'ethers';
import debounce from 'debounce-promise';

import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import { formatAmountDisplay, formatAssetAmountInput, formatMaxAmount } from '../../utils/common';
import { addressesEqual, isValidAmount, isValidEthereumAddress } from '../../utils/validation';
import AccountSwitchInput from '../AccountSwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { Chain } from '../../utils/chain';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { CombinedRoundedImages } from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';
import { bridgeServiceIdToDetails } from '../../utils/bridge';
import { Route } from '@lifi/sdk';
import { IAssetBridgeTransactionBlock, IMultiCallData } from '../../types/transactionBlock';
import RouteOption from '../RouteOption';
import { DestinationWalletEnum } from '../../enums/wallet.enum';

export interface IAssetBridgeTransactionBlockValues {
  fromChain?: Chain;
  toChain?: Chain;
  fromAsset?: IAssetWithBalance;
  toAsset?: IAssetWithBalance;
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
  font-family: 'PTRootUIWebBold', sans-serif;
`;

const WalletReceiveWrapper = styled.div`
  display: flex;
  flex-direction: row;
`;

const mapRouteToOption = (route: Route) => {
  const [firstStep] = route.steps;
  const serviceDetails = bridgeServiceIdToDetails[firstStep?.toolDetails?.key ?? 'lifi'];
  return {
    title: firstStep?.toolDetails?.name ?? serviceDetails?.title ?? 'LiFi',
    value: route.id,
    iconUrl: firstStep?.toolDetails?.logoURI ?? serviceDetails?.iconUrl,
  };
};

const AssetBridgeTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  values,
  multiCallData,
}: IAssetBridgeTransactionBlock) => {
  const {
    sdk,
    providerAddress,
    accountAddress,
    getSupportedAssetsWithBalancesForChainId,
    smartWalletOnly,
    updateWalletBalances,
  } = useEtherspot();

  const [amount, setAmount] = useState<string>(values?.amount ?? '');
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(values?.fromAsset ?? null);
  const [selectedToAsset, setSelectedToAsset] = useState<IAssetWithBalance | null>(values?.toAsset ?? null);
  const [selectedAccountType, setSelectedAccountType] = useState<string>(values?.accountType ?? AccountTypes.Contract);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(values?.fromChain ?? null);
  const [selectedToNetwork, setSelectedToNetwork] = useState<Chain | null>(values?.toChain ?? null);
  const [selectedRoute, setSelectedRoute] = useState<SelectOption | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<Route[] | null>(null);

  const defaultCustomReceiverAddress =
    values?.receiverAddress &&
    !addressesEqual(providerAddress, values?.receiverAddress) &&
    !addressesEqual(accountAddress, values?.receiverAddress)
      ? values.receiverAddress
      : null;
  const [customReceiverAddress, setCustomReceiverAddress] = useState<string | null>(defaultCustomReceiverAddress);
  const [useCustomAddress, setUseCustomAddress] = useState<boolean>(!!defaultCustomReceiverAddress);
  const fixed = multiCallData?.fixed ?? false;

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

  const [isLoadingAvailableRoutes, setIsLoadingAvailableRoutes] = useState<boolean>(false);

  const {
    setTransactionBlockValues,
    resetTransactionBlockFieldValidationError,
    setTransactionBlockFieldValidationError,
  } = useTransactionBuilder();

  const theme: Theme = useTheme();

  useEffect(() => {
    updateWalletBalances();
  }, [sdk, accountAddress]);

  useEffect(() => {
    const preselectAsset = async (multiCallData: IMultiCallData) => {
      setSelectedFromNetwork(multiCallData.chain);
      const supportedAssets = await getSupportedAssetsWithBalancesForChainId(
        multiCallData.chain.chainId,
        false,
        selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress
      );
      const asset = supportedAssets.find((search) => search.address === multiCallData.token?.address);
      setSelectedFromAsset(asset || null);
    };

    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAsset');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
    if (!!multiCallData?.token) preselectAsset(multiCallData);
  }, [multiCallData]);

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
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAsset');
  }, [selectedToNetwork, selectedFromNetwork]);

  useEffect(() => {
    if (selectedReceiveAccountType === DestinationWalletEnum.Custom) {
      resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
      setUseCustomAddress(true);
    } else {
      setUseCustomAddress(false);
      setCustomReceiverAddress(null);
    }
  }, [selectedReceiveAccountType]);

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

  const updateAvailableRoutes = useCallback(
    debounce(async () => {
      setSelectedRoute(null);
      setAvailableRoutes([]);

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
    }, 200),
    [sdk, selectedFromAsset, selectedToAsset, amount, selectedFromNetwork, selectedToNetwork, receiverAddress]
  );

  useEffect(() => {
    updateAvailableRoutes();
  }, [updateAvailableRoutes]);

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
    const route = availableRoutes?.find((availableRoute) => availableRoute.id === selectedRoute?.value);
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
        route,
      },
      multiCallData || undefined
    );
  }, [
    selectedFromNetwork,
    selectedToNetwork,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedRoute,
    receiverAddress,
    selectedAccountType,
  ]);

  const availableRoutesOptions = useMemo(() => availableRoutes?.map(mapRouteToOption), [availableRoutes]);

  const remainingSelectedFromAssetBalance = useMemo(() => {
    const multiCallCarryOver = multiCallData?.value || 0;
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero()) return 0 + multiCallCarryOver;

    if (!amount)
      return +ethers.utils.formatUnits(selectedFromAsset.balance, selectedFromAsset.decimals) + multiCallCarryOver;

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedFromAsset.decimals);
    return (
      +ethers.utils.formatUnits(selectedFromAsset.balance.sub(assetAmountBN), selectedFromAsset.decimals) +
      multiCallCarryOver
    );
  }, [amount, selectedFromAsset]);

  const renderOption = (option: SelectOption) => (
    <RouteOption
      route={availableRoutes?.find((route) => route.id === option.value)}
      isChecked={selectedRoute?.value && selectedRoute?.value === option.value}
    />
  );

  return (
    <>
      <Title>Asset bridge</Title>
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
          }
          setSelectedAccountType(accountType);
        }}
        errorMessage={errorMessages?.accountType}
        hideKeyBased={smartWalletOnly}
        disabled={!!fixed || !!multiCallData}
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
        disabled={!!fixed || !!multiCallData}
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
        hideChainIds={selectedFromNetwork ? [selectedFromNetwork.chainId] : undefined}
        walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
        accountType={selectedAccountType}
      />
      {selectedFromAsset && selectedFromNetwork && (
        <TextInput
          label="You swap"
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

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled from 'styled-components';
import {
  AccountBalance,
  CrossChainBridgeSupportedChain,
} from 'etherspot';

import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import {
  formatAmountDisplay,
  formatAssetAmountInput,
} from '../../utils/common';
import {
  addressesEqual,
  ErrorMessages,
} from '../../utils/validation';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { ethers } from 'ethers';

export interface SendAssetTransactionBlockValues {
  receiverAddress?: string;
  chainId?: number;
  assetAddress?: string;
  assetDecimals?: number;
  assetSymbol?: string;
  amount?: string;
}

const Title = styled.h3`
  margin: 0 0 25px;
  padding: 0 0 5px;
  border-bottom: 1px solid #000;
`;

const mapAvailableNetworkToSelectOption = ({
  name: title,
  chainId: value,
}: CrossChainBridgeSupportedChain): SelectOption => ({
  title,
  value,
});

const SendAssetTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
}: {
  id: string;
  errorMessages?: ErrorMessages;
}) => {
  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<SelectOption | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<SelectOption | null>(null);
  const [availableNetworks, setAvailableNetworks] = useState<CrossChainBridgeSupportedChain[] | null>(null);
  const [availableAssets, setAvailableAssets] = useState<TokenListToken[] | null>(null);
  const [availableAssetsBalances, setAvailableAssetsBalances] = useState<AccountBalance[] | null>(null);
  const [isLoadingAvailableNetworks, setIsLoadingAvailableNetworks] = useState<boolean>(false);
  const [isLoadingAvailableAssets, setIsLoadingAvailableAssets] = useState<boolean>(false);

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();

  const { sdk, getSupportedAssetsForChainId, getAssetsBalancesForChainId } = useEtherspot();

  const networkOptions = useMemo(
    () => availableNetworks
      ?.filter((network) => network.sendingEnabled)
      ?.map(mapAvailableNetworkToSelectOption),
    [availableNetworks],
  );

  useEffect(() => {
    setSelectedAsset(null);
    setAmount('');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'assetAddress');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'assetDecimals');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'assetSymbol');
  }, [selectedNetwork]);

  const updateAvailableNetworks = useCallback(async () => {
    if (!sdk) return;
    setIsLoadingAvailableNetworks(true);
    try {
      const networks = await sdk.getCrossChainBridgeSupportedChains();
      setAvailableNetworks(networks);
    } catch (e) {
      //
    }
    setIsLoadingAvailableNetworks(false);
  }, [sdk]);

  useEffect(() => {
    updateAvailableNetworks();
  }, [updateAvailableNetworks]);

  const updateAvailableAssets = useCallback(async () => {
    if (!sdk || !selectedNetwork) return;
    setIsLoadingAvailableAssets(true);

    try {
      const assets = await getSupportedAssetsForChainId(+selectedNetwork.value);
      const assetsBalances = await getAssetsBalancesForChainId(assets, +selectedNetwork.value);

      const assetsWithPositiveBalances = assets.filter((asset) => assetsBalances.some((assetBalance) => {
        if (addressesEqual(asset.address, ethers.constants.AddressZero) && assetBalance.token === null) return true;
        return addressesEqual(asset.address, assetBalance.token);
      }));

      setAvailableAssets(assetsWithPositiveBalances);
      setAvailableAssetsBalances(assetsBalances);
    } catch (e) {
      //
    }
    setIsLoadingAvailableAssets(false);
  }, [sdk, selectedNetwork]);

  useEffect(() => { updateAvailableAssets(); }, [updateAvailableAssets]);

  const availableAssetsOptions = useMemo(() => availableAssets?.map((availableAsset) => {
    const assetBalance = availableAssetsBalances?.find((assetBalance) => {
      if (addressesEqual(availableAsset.address, ethers.constants.AddressZero) && assetBalance.token === null) return true;
      return addressesEqual(availableAsset.address, assetBalance.token);
    });

    const assetBalanceFormatted = assetBalance
      ? formatAmountDisplay(ethers.utils.formatUnits(assetBalance.balance, availableAsset.decimals))
      : '0.00';

    return ({
      title: `${availableAsset.name} (${assetBalanceFormatted} ${availableAsset.symbol})`,
      value: availableAsset.address,
    })
  }), [availableAssets, availableAssetsBalances]);

  const onAmountChange = useCallback((newAmount: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    const asset = availableAssets?.find((availableAsset) => availableAsset.symbol === selectedAsset?.value);
    const decimals = asset?.decimals ?? 18;
    const updatedAmount = formatAssetAmountInput(newAmount, decimals);
    setAmount(updatedAmount)
  }, [selectedAsset, availableAssets]);

  const onReceiverAddressChange = useCallback((newReceiverAddress: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
    setReceiverAddress(newReceiverAddress)
  }, []);

  useEffect(() => {
    if (setTransactionBlockValues) {
      const asset = availableAssets?.find((availableAsset) => availableAsset.address === selectedAsset?.value);
      setTransactionBlockValues(transactionBlockId, {
        chainId: selectedNetwork?.value,
        assetAddress: asset?.address,
        assetSymbol: asset?.symbol,
        assetDecimals: asset?.decimals,
        amount,
        receiverAddress,
      });
    }
  }, [
    setTransactionBlockValues,
    selectedNetwork,
    availableAssets,
    selectedAsset,
    receiverAddress,
    amount,
  ]);

  const selectedAssetDisplayValue = useMemo(
    () => availableAssets?.find((availableAsset) => availableAsset.address === selectedAsset?.value)?.symbol,
    [availableAssets, selectedAsset]
  );

  return (
    <>
      <Title>Send asset</Title>
      <SelectInput
        label="Network"
        options={networkOptions ?? []}
        isLoading={isLoadingAvailableNetworks}
        selectedOption={selectedNetwork}
        onOptionSelect={(option) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'chainId');
          setSelectedNetwork(option);
        }}
        errorMessage={errorMessages?.chainId}
      />
      {!!selectedNetwork && (
        <TextInput
          label={`Asset on ${selectedNetwork.title}`}
          isLoading={isLoadingAvailableAssets}
          selectOptions={availableAssetsOptions ?? []}
          selectedOption={selectedAsset}
          selectedOptionDisplayValue={selectedAssetDisplayValue}
          value={amount}
          onValueChange={(value) => onAmountChange(value)}
          onOptionSelect={(option) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'assetAddress');
            resetTransactionBlockFieldValidationError(transactionBlockId, 'assetDecimals');
            resetTransactionBlockFieldValidationError(transactionBlockId, 'assetSymbol');
            setSelectedAsset(option);
          }}
          errorMessage={
            errorMessages?.amount
              || errorMessages?.assetDecimals
              || errorMessages?.assetAddress
              || errorMessages?.assetSymbol
          }
        />
      )}
      {!!selectedNetwork && (
        <TextInput
          label={`Receiver address`}
          value={receiverAddress}
          onValueChange={(value) => onReceiverAddressChange(value)}
          errorMessage={errorMessages?.receiverAddress}
        />
      )}
    </>
  );
};

export default SendAssetTransactionBlock;

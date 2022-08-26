import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled from 'styled-components';
import {
  AccountBalance,
  BridgingQuote,
  CrossChainBridgeSupportedChain,
  CrossChainServiceProvider,
} from 'etherspot';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { ethers } from 'ethers';
import { debounce } from 'lodash';

import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import {
  useEtherspot,
  useTransactionBuilder,
} from '../../hooks';
import {
  formatAmountDisplay,
  formatAssetAmountInput,
} from '../../utils/common';
import {
  addressesEqual,
  ErrorMessages,
} from '../../utils/validation';

export interface AssetBridgeTransactionBlockValues {
  fromChainId?: number;
  toChainId?: number;
  fromAssetAddress?: string;
  toAssetAddress?: string;
  fromAssetDecimals?: number;
  amount?: string;
  quote?: BridgingQuote;
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

const AssetBridgeTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
}: {
  id: string;
  errorMessages?: ErrorMessages;
}) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedFromAsset, setSelectedFromAsset] = useState<SelectOption | null>(null);
  const [selectedToAsset, setSelectedToAsset] = useState<SelectOption | null>(null);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<SelectOption | null>(null);
  const [selectedToNetwork, setSelectedToNetwork] = useState<SelectOption | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<SelectOption | null>(null);
  const [availableNetworks, setAvailableNetworks] = useState<CrossChainBridgeSupportedChain[] | null>(null);
  const [availableFromAssets, setAvailableFromAssets] = useState<TokenListToken[] | null>(null);
  const [availableFromAssetsBalances, setAvailableFromAssetsBalances] = useState<AccountBalance[] | null>(null);
  const [availableToAssets, setAvailableToAssets] = useState<TokenListToken[] | null>(null);
  const [availableQuotes, setAvailableQuotes] = useState<BridgingQuote[] | null>(null);
  const [isLoadingAvailableNetworks, setIsLoadingAvailableNetworks] = useState<boolean>(false);
  const [isLoadingAvailableFromAssets, setIsLoadingAvailableFromAssets] = useState<boolean>(false);
  const [isLoadingAvailableToAssets, setIsLoadingAvailableToAssets] = useState<boolean>(false);
  const [isLoadingAvailableQuotes, setIsLoadingAvailableQuotes] = useState<boolean>(false);

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();

  const { sdk, getSupportedAssetsForChainId, getAssetsBalancesForChainId } = useEtherspot();

  const fromNetworkOptions = useMemo(
    () => availableNetworks
      ?.filter((network) => network.sendingEnabled)
      ?.map(mapAvailableNetworkToSelectOption),
    [availableNetworks],
  );

  const toNetworkOptions = useMemo(
    () => availableNetworks
      ?.filter((network) => network.receivingEnabled)
      ?.map(mapAvailableNetworkToSelectOption)
      ?.filter((option) => option.value !== selectedFromNetwork?.value),
    [selectedFromNetwork, availableNetworks],
  );

  useEffect(() => {
    if (selectedFromNetwork?.value === selectedToNetwork?.value) setSelectedToNetwork(null);
  }, [selectedFromNetwork, selectedToNetwork]);

  useEffect(() => {
    setSelectedFromAsset(null);
    setAmount('');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetAddress');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetDecimals');
  }, [selectedFromNetwork]);

  useEffect(() => {
    setSelectedToAsset(null);
    setSelectedQuote(null);
    resetTransactionBlockFieldValidationError(transactionBlockId, 'quote');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
  }, [selectedToNetwork, selectedFromNetwork]);

  const updateAvailableNetworks = useCallback(async () => {
    if (!sdk) return;
    setIsLoadingAvailableNetworks(true);
    try {
      // TODO: remove serviceProvider once it is fixed on SDK side
      const networks = await sdk.getCrossChainBridgeSupportedChains({ serviceProvider: CrossChainServiceProvider.LiFi});
      setAvailableNetworks(networks);
    } catch (e) {
      //
    }
    setIsLoadingAvailableNetworks(false);
  }, [sdk]);

  useEffect(() => {
    updateAvailableNetworks();
  }, [updateAvailableNetworks]);

  const updateAvailableFromAssets = useCallback(async () => {
    if (!sdk || !selectedFromNetwork) return;
    setIsLoadingAvailableFromAssets(true);
    try {
      const fromAssets = await getSupportedAssetsForChainId(+selectedFromNetwork.value);
      const fromAssetsBalances = await getAssetsBalancesForChainId(fromAssets, +selectedFromNetwork.value);

      const fromAssetsWithPositiveBalances = fromAssets.filter((asset) => fromAssetsBalances.some((fromAssetBalance) => {
        if (addressesEqual(asset.address, ethers.constants.AddressZero) && fromAssetBalance.token === null) return true;
        return addressesEqual(asset.address, fromAssetBalance.token);
      }));

      setAvailableFromAssets(fromAssetsWithPositiveBalances);
      setAvailableFromAssetsBalances(fromAssetsBalances);
    } catch (e) {
      //
    }
    setIsLoadingAvailableFromAssets(false);
  }, [sdk, selectedFromNetwork]);

  useEffect(() => { updateAvailableFromAssets(); }, [updateAvailableFromAssets]);

  const updateAvailableToAssets = useCallback(async () => {
    if (!sdk || !selectedFromNetwork || !selectedToNetwork) return;
    setIsLoadingAvailableToAssets(true);
    try {
      const toAssets = await getSupportedAssetsForChainId(+selectedToNetwork.value);
      setAvailableToAssets(toAssets);
    } catch (e) {
      //
    }
    setIsLoadingAvailableToAssets(false);
  }, [sdk, selectedToNetwork, selectedFromNetwork]);

  useEffect(() => {  updateAvailableToAssets(); }, [updateAvailableToAssets]);

  const availableFromAssetsOptions = useMemo(() => availableFromAssets?.map((availableAsset) => {
    const assetBalance = availableFromAssetsBalances?.find((fromAssetBalance) => {
      if (addressesEqual(availableAsset.address, ethers.constants.AddressZero) && fromAssetBalance.token === null) return true;
      return addressesEqual(availableAsset.address, fromAssetBalance.token);
    });

    const assetBalanceFormatted = assetBalance
      ? formatAmountDisplay(ethers.utils.formatUnits(assetBalance.balance, availableAsset.decimals))
      : '0.00';

    return ({
      title: `${availableAsset.name} (${assetBalanceFormatted} ${availableAsset.symbol})`,
      value: availableAsset.address,
    })
  }), [availableFromAssets, availableFromAssetsBalances]);

  const updateAvailableQuotes = useCallback(debounce(async () => {
    setSelectedQuote(null);
    setAvailableQuotes([]);

    if (!sdk || !selectedToAsset || !selectedFromAsset || !amount || !selectedFromNetwork?.value || !selectedToNetwork?.value) return;

    setIsLoadingAvailableQuotes(true);

    try {
      const fromAsset = availableFromAssets?.find((availableAsset) => addressesEqual(availableAsset.address, selectedFromAsset?.value));
      if (!fromAsset) {
        setIsLoadingAvailableQuotes(false);
        return;
      }

      const { items: quotes } = await sdk.getCrossChainQuotes({
        fromChainId: +selectedFromNetwork.value,
        toChainId: +selectedToNetwork?.value,
        fromAmount: ethers.utils.parseUnits(amount, fromAsset.decimals),
        fromTokenAddress: selectedFromAsset?.value,
        toTokenAddress: selectedToAsset?.value,
      });
      setAvailableQuotes(quotes);
    } catch (e) {
      //
    }

    setIsLoadingAvailableQuotes(false);
  }, 200), [sdk, selectedFromAsset, selectedToAsset, amount, availableFromAssets, selectedFromNetwork, selectedToNetwork]);

  useEffect(() => { updateAvailableQuotes(); }, [updateAvailableQuotes]);

  const availableToAssetsOptions = useMemo(
    () => availableToAssets?.map((availableAsset) => ({
      title: `${availableAsset.name} (${availableAsset.symbol})`,
      value: availableAsset.address,
    })),
    [availableToAssets],
  );

  const onAmountChange = useCallback((newAmount: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    const asset = availableFromAssets?.find((availableAsset) => availableAsset.symbol === selectedFromAsset?.value);
    const decimals = asset?.decimals ?? 18;
    const updatedAmount = formatAssetAmountInput(newAmount, decimals);
    setAmount(updatedAmount)
  }, [selectedFromAsset, availableFromAssets]);

  useEffect(() => {
    if (setTransactionBlockValues) {
      const fromAsset = availableFromAssets?.find((availableAsset) => availableAsset.address === selectedFromAsset?.value);
      const toAsset = availableToAssets?.find((availableAsset) => availableAsset.address === selectedToAsset?.value);
      setTransactionBlockValues(transactionBlockId, {
        fromChainId: selectedFromNetwork?.value,
        toChainId: selectedToNetwork?.value,
        fromAssetAddress: fromAsset?.address,
        fromAssetDecimals: fromAsset?.decimals,
        toAssetAddress: toAsset?.address,
        amount,
      });
    }
  }, [
    setTransactionBlockValues,
    selectedFromNetwork,
    selectedToNetwork,
    availableFromAssets,
    availableToAssets,
    selectedFromAsset,
    selectedToAsset,
    amount,
  ]);

  const selectedFromAssetDisplayValue = useMemo(
    () => availableFromAssets?.find((availableAsset) => availableAsset.address === selectedFromAsset?.value)?.symbol,
    [availableFromAssets, selectedFromAsset]
  );

  const availableQuotesOptions = useMemo(
    () => {
      const toAsset = availableToAssets?.find((availableAsset) => addressesEqual(availableAsset.address, selectedToAsset?.value));
      return availableQuotes
        ?.map((availableQuote) => ({
          title: `${availableQuote.provider.toUpperCase()}: ${formatAmountDisplay(ethers.utils.formatUnits(availableQuote.estimate.toAmount, toAsset?.decimals))} ${toAsset?.symbol}`,
          value: availableQuote.provider,
        }));
    },
    [availableQuotes, availableToAssets],
  );

  return (
    <>
      <Title>Asset bridge</Title>
      <SelectInput
        label="From network"
        options={fromNetworkOptions ?? []}
        isLoading={isLoadingAvailableNetworks}
        selectedOption={selectedFromNetwork}
        onOptionSelect={(option) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromChainId');
          setSelectedFromNetwork(option);
        }}
        errorMessage={errorMessages?.fromChainId}
      />
      {!!selectedFromNetwork && (
        <TextInput
          label={`From asset on ${selectedFromNetwork.title}`}
          isLoading={isLoadingAvailableFromAssets}
          selectOptions={availableFromAssetsOptions ?? []}
          selectedOption={selectedFromAsset}
          selectedOptionDisplayValue={selectedFromAssetDisplayValue}
          value={amount}
          onValueChange={(value) => onAmountChange(value)}
          onOptionSelect={(option) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetAddress');
            resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetDecimals');
            setSelectedFromAsset(option);
          }}
          errorMessage={
            errorMessages?.amount
            || errorMessages?.fromAssetDecimals
            || errorMessages?.fromAssetAddress
          }
        />
      )}
      {!!selectedFromNetwork && (
        <SelectInput
          label="To network"
          options={toNetworkOptions ?? []}
          isLoading={isLoadingAvailableNetworks}
          selectedOption={selectedToNetwork}
          onOptionSelect={(option) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'toChainId');
            setSelectedToNetwork(option);
          }}
          errorMessage={errorMessages?.toChainId}
        />
      )}
      {!!selectedToNetwork && (
        <SelectInput
          label={`Asset to receive on ${selectedToNetwork.title}`}
          options={availableToAssetsOptions ?? []}
          isLoading={isLoadingAvailableToAssets}
          selectedOption={selectedToAsset}
          onOptionSelect={(option) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
            setSelectedToAsset(option);
          }}
          errorMessage={errorMessages?.toAssetAddress}
        />
      )}
      {!!selectedToAsset && selectedFromAsset && (
        <SelectInput
          label={`Accepted quote`}
          options={availableQuotesOptions ?? []}
          isLoading={isLoadingAvailableQuotes}
          selectedOption={selectedQuote}
          onOptionSelect={(option) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'quote');
            setSelectedQuote(option);
          }}
          errorMessage={errorMessages?.offer}
        />
      )}
    </>
  );
};

export default AssetBridgeTransactionBlock;

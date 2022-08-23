import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled from 'styled-components';
import {
  AccountBalance,
  ExchangeOffer,
} from 'etherspot';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { ethers } from 'ethers';
import { debounce } from 'lodash';

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
import { supportedChains } from '../../utils/chain';

export interface SwapAssetTransactionBlockValues {
  chainId?: number;
  fromAssetAddress?: string;
  fromAssetDecimals?: number;
  fromAssetSymbol?: string;
  toAssetAddress?: string;
  toAssetDecimals?: number
  toAssetSymbol?: string;
  amount?: string;
  offer?: ExchangeOffer;
}

const Title = styled.h3`
  margin: 0 0 25px;
  padding: 0 0 5px;
  border-bottom: 1px solid #000;
`;

const mapSupportedChainToSelectOption = ({
  title,
  chainId: value,
}: { title: string; chainId: number; }): SelectOption => ({
  title,
  value,
});

const AssetSwapTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
}: {
  id: string;
  errorMessages?: ErrorMessages;
}) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedFromAsset, setSelectedFromAsset] = useState<SelectOption | null>(null);
  const [selectedToAsset, setSelectedToAsset] = useState<SelectOption | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<SelectOption | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<SelectOption | null>(null);
  const [availableFromAssets, setAvailableFromAssets] = useState<TokenListToken[] | null>(null);
  const [availableFromAssetsBalances, setAvailableFromAssetsBalances] = useState<AccountBalance[] | null>(null);
  const [availableToAssets, setAvailableToAssets] = useState<TokenListToken[] | null>(null);
  const [availableOffers, setAvailableOffers] = useState<ExchangeOffer[] | null>(null);
  const [isLoadingAvailableAssets, setIsLoadingAvailableAssets] = useState<boolean>(false);
  const [isLoadingAvailableOffers, setIsLoadingAvailableOffers] = useState<boolean>(false);

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();

  const { sdk, getSupportedAssetsForChainId, getAssetsBalancesForChainId, getSdkForChainId } = useEtherspot();

  useEffect(() => {
    setSelectedFromAsset(null);
    setAmount('');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetAddress');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetDecimals');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetSymbol');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetDecimals');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetSymbol');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
  }, [selectedNetwork]);


  const updateAvailableOffers = useCallback(debounce(async () => {
    setSelectedOffer(null);
    setAvailableOffers([]);

    if (!sdk || !selectedToAsset || !selectedFromAsset || !amount || !selectedNetwork?.value) return;

    setIsLoadingAvailableOffers(true);

    try {
      const sdkForChain = getSdkForChainId(selectedNetwork.value);
      const fromAsset = availableFromAssets?.find((availableAsset) => addressesEqual(availableAsset.address, selectedFromAsset?.value));
      const toAsset = availableToAssets?.find((availableAsset) => addressesEqual(availableAsset.address, selectedToAsset?.value));
      if (!fromAsset || !toAsset || !sdkForChain) {
        setIsLoadingAvailableOffers(false);
        return;
      }

      // needed computed account address before calling getExchangeOffers
      await sdkForChain.computeContractAccount();

      const offers = await sdkForChain.getExchangeOffers({
        fromAmount: ethers.utils.parseUnits(amount, fromAsset.decimals),
        fromTokenAddress: fromAsset.address,
        toTokenAddress: toAsset.address,
      });

      setAvailableOffers(offers);
    } catch (e) {
      //
    }

    setIsLoadingAvailableOffers(false);
  }, 200), [sdk, selectedFromAsset, selectedToAsset, amount, availableFromAssets, selectedNetwork]);

  useEffect(() => { updateAvailableOffers(); }, [updateAvailableOffers]);

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

      setAvailableFromAssets(assetsWithPositiveBalances);
      setAvailableFromAssetsBalances(assetsBalances);
      setAvailableToAssets(assets);
    } catch (e) {
      //
    }

    setIsLoadingAvailableAssets(false);
  }, [sdk, selectedNetwork]);

  useEffect(() => {  updateAvailableAssets(); }, [updateAvailableAssets]);

  const availableFromAssetsOptions = useMemo(() => availableFromAssets?.map((availableAsset) => {
    const assetBalance = availableFromAssetsBalances?.find((assetBalance) => {
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
  }), [availableFromAssets, availableFromAssetsBalances]);

  const availableToAssetsOptions = useMemo(
    () => availableToAssets?.map((availableAsset) => ({
      title: `${availableAsset.name} (${availableAsset.symbol})`,
      value: availableAsset.address,
    })),
    [availableToAssets],
  );

  const availableOffersOptions = useMemo(
    () => {
      const toAsset = availableToAssets?.find((availableAsset) => addressesEqual(availableAsset.address, selectedToAsset?.value));
      return availableOffers?.map((availableOffer) => ({
        title: `${availableOffer.provider}: ${formatAmountDisplay(ethers.utils.formatUnits(availableOffer.receiveAmount, toAsset?.decimals))} ${toAsset?.symbol}`,
        value: availableOffer.provider,
      }));
    },
    [availableOffers, availableToAssets],
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
      const fromAsset = availableFromAssets?.find((availableAsset) => addressesEqual(availableAsset.address, selectedFromAsset?.value));
      const toAsset = availableToAssets?.find((availableAsset) => addressesEqual(availableAsset.address, selectedToAsset?.value));
      const offer = availableOffers?.find((availableOffer) => availableOffer.provider === selectedOffer?.value);
      setTransactionBlockValues(transactionBlockId, {
        chainId: selectedNetwork?.value,
        fromAssetAddress: fromAsset?.address,
        fromAssetSymbol: fromAsset?.symbol,
        fromAssetDecimals: fromAsset?.decimals,
        toAssetAddress: toAsset?.address,
        toAssetSymbol: toAsset?.symbol,
        toAssetDecimals: toAsset?.decimals,
        amount,
        offer,
      });
    }
  }, [
    setTransactionBlockValues,
    selectedNetwork,
    availableFromAssets,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedOffer,
  ]);

  const selectedFromAssetDisplayValue = useMemo(
    () => availableFromAssets?.find((availableAsset) => availableAsset.address === selectedFromAsset?.value)?.symbol,
    [availableFromAssets, selectedFromAsset]
  );

  return (
    <>
      <Title>Swap asset</Title>
      <SelectInput
        label="Network"
        options={supportedChains.map(mapSupportedChainToSelectOption)}
        selectedOption={selectedNetwork}
        onOptionSelect={(option) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'chainId');
          setSelectedNetwork(option);
        }}
        errorMessage={errorMessages?.chainId}
      />
      {!!selectedNetwork && (
        <>
          <TextInput
            label={`From asset`}
            isLoading={isLoadingAvailableAssets}
            selectOptions={availableFromAssetsOptions ?? []}
            selectedOption={selectedFromAsset}
            selectedOptionDisplayValue={selectedFromAssetDisplayValue}
            value={amount}
            onValueChange={(value) => onAmountChange(value)}
            onOptionSelect={(option) => {
              resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetAddress');
              resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetDecimals');
              resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetSymbol');
              setSelectedFromAsset(option);
            }}
            errorMessage={
              errorMessages?.amount
              || errorMessages?.fromAssetAddress
              || errorMessages?.fromAssetDecimals
              || errorMessages?.fromAssetSymbol
            }
          />
          <SelectInput
            label={`To asset`}
            options={availableToAssetsOptions ?? []}
            isLoading={isLoadingAvailableAssets}
            selectedOption={selectedToAsset}
            onOptionSelect={(option) => {
              resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
              resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetDecimals');
              resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetSymbol');
              setSelectedToAsset(option);
            }}
            errorMessage={errorMessages?.toAssetAddress}
          />
        </>
      )}
      {!!selectedToAsset && selectedFromAsset && (
        <>
          <SelectInput
            label={`Accepted offer`}
            options={availableOffersOptions ?? []}
            isLoading={isLoadingAvailableOffers}
            selectedOption={selectedOffer}
            onOptionSelect={(option) => {
              resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
              setSelectedOffer(option);
            }}
            errorMessage={errorMessages?.offer}
          />
        </>
      )}
    </>
  );
};

export default AssetSwapTransactionBlock;

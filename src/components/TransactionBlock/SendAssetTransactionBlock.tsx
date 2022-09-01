import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled from 'styled-components';
import {
  AccountBalance,
} from 'etherspot';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { ethers } from 'ethers';

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
import {
  nativeAssetPerChainId,
  supportedChains,
} from '../../utils/chain';
import Checkbox from '../Checkbox';

export interface SendAssetTransactionBlockValues {
  fromAddress?: string;
  receiverAddress?: string;
  chainId?: number;
  assetAddress?: string;
  assetDecimals?: number;
  assetSymbol?: string;
  amount?: string;
  isFromEtherspotWallet?: boolean;
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
  const [availableAssets, setAvailableAssets] = useState<TokenListToken[] | null>(null);
  const [availableAssetsBalances, setAvailableAssetsBalances] = useState<AccountBalance[] | null>(null);
  const [isLoadingAvailableAssets, setIsLoadingAvailableAssets] = useState<boolean>(false);
  const [isFromEtherspotWallet, setIsFromEtherspotWallet] = useState<boolean>(true);

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();

  const {
    sdk,
    getSupportedAssetsForChainId,
    getAssetsBalancesForChainId,
    providerAddress,
    accountAddress,
    chainId,
  } = useEtherspot();

  useEffect(() => {
    setSelectedAsset(null);
    setAmount('');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'assetAddress');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'assetDecimals');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'assetSymbol');
  }, [selectedNetwork]);

  const updateAvailableAssets = useCallback(async () => {
    if (!sdk) return;
    if ((isFromEtherspotWallet && !selectedNetwork) || !providerAddress) return;
    setIsLoadingAvailableAssets(true);

    const chainIdToLoad = isFromEtherspotWallet
      ? +selectedNetwork?.value
      : chainId;

    const addressToCheck = isFromEtherspotWallet
      ? accountAddress
      : providerAddress;

    try {
      const assets = await getSupportedAssetsForChainId(chainIdToLoad);
      const assetsBalances = await getAssetsBalancesForChainId(assets, chainIdToLoad, addressToCheck);

      const assetsWithPositiveBalances = assets.filter((asset) => assetsBalances.some((assetBalance) => {
        console.log({ assetBalance })
        if (addressesEqual(asset.address, nativeAssetPerChainId[chainId]?.address)) return true;
        return addressesEqual(asset.address, assetBalance.token);
      }));

      setAvailableAssets(assetsWithPositiveBalances);
      setAvailableAssetsBalances(assetsBalances);
    } catch (e) {
      //
    }
    setIsLoadingAvailableAssets(false);
  }, [sdk, selectedNetwork, isFromEtherspotWallet, providerAddress, accountAddress, chainId]);

  useEffect(() => { updateAvailableAssets(); }, [updateAvailableAssets]);

  const availableAssetsOptions = useMemo(() => availableAssets?.map((availableAsset) => {
    const assetBalance = availableAssetsBalances?.find((assetBalance) => {
      if (addressesEqual(availableAsset.address, nativeAssetPerChainId[chainId]?.address) && assetBalance.token === null) return true;
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
        chainId: isFromEtherspotWallet ? selectedNetwork?.value : chainId,
        assetAddress: asset?.address,
        assetSymbol: asset?.symbol,
        assetDecimals: asset?.decimals,
        amount,
        receiverAddress,
        isFromEtherspotWallet,
        fromAddress: (isFromEtherspotWallet ? accountAddress : providerAddress) as string,
      });
    }
  }, [
    setTransactionBlockValues,
    selectedNetwork,
    availableAssets,
    selectedAsset,
    receiverAddress,
    amount,
    isFromEtherspotWallet,
    accountAddress,
    providerAddress,
  ]);

  const selectedAssetDisplayValue = useMemo(
    () => availableAssets?.find((availableAsset) => availableAsset.address === selectedAsset?.value)?.symbol,
    [availableAssets, selectedAsset]
  );

  return (
    <>
      <Title>Send asset</Title>
      <Checkbox
        label={`Send from Etherspot account`}
        isChecked={isFromEtherspotWallet}
        onChange={(isChecked) => {
          setIsFromEtherspotWallet(isChecked);
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAddress');
        }}
        errorMessage={errorMessages?.fromAddress}
      />
      {isFromEtherspotWallet && (
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
      )}
      {!isFromEtherspotWallet && (
        <TextInput
          label="Network"
          disabled
          value={supportedChains.find((chain) => +chainId === +chain.chainId)?.title}
          errorMessage={errorMessages?.chainId}
        />
      )}
      {(!!selectedNetwork || !isFromEtherspotWallet) && (
        <TextInput
          label={`Asset`}
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
      {(!!selectedNetwork || !isFromEtherspotWallet) && (
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

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
import {
  AccountTypes,
  ExchangeOffer,
} from 'etherspot';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { ethers } from 'ethers';
import debounce from 'debounce-promise';

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
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { Chain } from '../../utils/chain';
import {
  CombinedRoundedImages,
  RoundedImage,
} from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';
import AccountSwitchInput from '../AccountSwitchInput';
import { swapServiceIdToDetails } from '../../utils/swap';
import Text from '../Text/Text';

export interface SwapAssetTransactionBlockValues {
  chainId?: number;
  fromAssetAddress?: string;
  fromAssetDecimals?: number;
  fromAssetSymbol?: string;
  fromAssetIconUrl?: string;
  toAssetAddress?: string;
  toAssetDecimals?: number
  toAssetSymbol?: string;
  toAssetIconUrl?: string;
  toAssetUsdPrice?: number;
  amount?: string;
  receiverAddress?: string;
  isDifferentReceiverAddress?: boolean;
  offer?: ExchangeOffer;
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

const AssetSwapTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
}: {
  id: string;
  errorMessages?: ErrorMessages;
}) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(null);
  const [selectedToAsset, setSelectedToAsset] = useState<SelectOption | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<Chain | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<SelectOption | null>(null);
  const [availableToAssets, setAvailableToAssets] = useState<TokenListToken[] | null>(null);
  const [availableOffers, setAvailableOffers] = useState<ExchangeOffer[] | null>(null);
  const [isLoadingAvailableToAssets, setIsLoadingAvailableToAssets] = useState<boolean>(false);
  const [isLoadingAvailableOffers, setIsLoadingAvailableOffers] = useState<boolean>(false);
  const [showReceiverInput] = useState<boolean>(false);
  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [selectedAccountType, setSelectedAccountType] = useState<string>(AccountTypes.Contract);

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();
  const { sdk, getSupportedAssetsForChainId, accountAddress } = useEtherspot();
  const theme: Theme = useTheme();

  useEffect(() => {
    setAmount('');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetDecimals');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetSymbol');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
  }, [selectedNetwork]);

  const updateAvailableOffers = useCallback(debounce(async () => {
    setSelectedOffer(null);
    setAvailableOffers([]);

    if (!sdk || !selectedToAsset || !selectedFromAsset || !amount || !selectedNetwork?.chainId) return;

    setIsLoadingAvailableOffers(true);

    try {
      // needed computed account address before calling getExchangeOffers
      if (!accountAddress) await sdk.computeContractAccount();

      const offers = await sdk.getExchangeOffers({
        fromChainId: selectedNetwork.chainId,
        fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
        fromTokenAddress: selectedFromAsset.address,
        toTokenAddress: selectedToAsset.value,
      });

      setAvailableOffers(offers);
    } catch (e) {
      //
    }

    setIsLoadingAvailableOffers(false);
  }, 200), [sdk, selectedFromAsset, selectedToAsset, amount, selectedNetwork, accountAddress]);

  useEffect(() => { updateAvailableOffers(); }, [updateAvailableOffers]);

  const updateAvailableToAssets = useCallback(async () => {
    if (!sdk || !selectedNetwork) return;
    setIsLoadingAvailableToAssets(true);

    try {
      const assets = await getSupportedAssetsForChainId(selectedNetwork.chainId);
      setAvailableToAssets(assets);
    } catch (e) {
      //
    }

    setIsLoadingAvailableToAssets(false);
  }, [sdk, selectedNetwork]);

  useEffect(() => {  updateAvailableToAssets(); }, [updateAvailableToAssets]);

  const availableToAssetsOptions = useMemo(
    () => availableToAssets?.map((availableAsset) => ({
      title: availableAsset.symbol,
      value: availableAsset.address,
      iconUrl: availableAsset.logoURI,
    })),
    [availableToAssets],
  );

  const availableOffersOptions = useMemo(
    () => availableOffers?.map((availableOffer) => {
      const serviceDetails = swapServiceIdToDetails[availableOffer.provider];
      return {
        title: serviceDetails?.title ?? availableOffer.provider,
        value: availableOffer.provider,
        iconUrl: serviceDetails?.iconUrl,
      };
    }),
    [availableOffers, availableToAssets],
  );

  const onAmountChange = useCallback((newAmount: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    const decimals = selectedFromAsset?.decimals ?? 18;
    const updatedAmount = formatAssetAmountInput(newAmount, decimals);
    setAmount(updatedAmount)
  }, [selectedFromAsset]);

  useEffect(() => {
    if (setTransactionBlockValues) {
      const toAsset = availableToAssets?.find((availableAsset) => addressesEqual(availableAsset.address, selectedToAsset?.value));
      const offer = availableOffers?.find((availableOffer) => availableOffer.provider === selectedOffer?.value);
      setTransactionBlockValues(transactionBlockId, {
        chainId: selectedNetwork?.chainId,
        fromAssetAddress: selectedFromAsset?.address,
        fromAssetSymbol: selectedFromAsset?.symbol,
        fromAssetDecimals: selectedFromAsset?.decimals,
        fromAssetIconUrl: selectedFromAsset?.logoURI,
        toAssetAddress: toAsset?.address,
        toAssetSymbol: toAsset?.symbol,
        toAssetDecimals: toAsset?.decimals,
        toAssetIconUrl: toAsset?.logoURI,
        amount,
        receiverAddress,
        offer,
        isDifferentReceiverAddress: showReceiverInput,
      });
    }
  }, [
    setTransactionBlockValues,
    selectedNetwork,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedOffer,
    receiverAddress,
    showReceiverInput,
  ]);

  const remainingSelectedFromAssetBalance = useMemo(() => {
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero()) return 0;

    if (!amount) return +ethers.utils.formatUnits(selectedFromAsset.balance, selectedFromAsset.decimals);

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedFromAsset.decimals);
    return +ethers.utils.formatUnits(selectedFromAsset.balance.sub(assetAmountBN), selectedFromAsset.decimals);
  }, [amount, selectedFromAsset]);

  const renderOption = (option: SelectOption) => {
    const availableOffer = availableOffers?.find((offer) => offer.provider === option.value);
    const toAsset = availableToAssets?.find((availableAsset) => addressesEqual(availableAsset.address, selectedToAsset?.value));
    const valueToReceive = availableOffer && formatAmountDisplay(ethers.utils.formatUnits(availableOffer.receiveAmount, toAsset?.decimals));
    return (
      <OfferDetails>
        <RoundedImage title={option.title} url={option.iconUrl} size={24} />
        <div>
          <Text size={12} marginBottom={2} medium block>{option.title}</Text>
          {!!valueToReceive && <Text size={16} medium>{valueToReceive} {toAsset?.symbol}</Text>}
        </div>
      </OfferDetails>
    );
  };

  return (
    <>
      <Title>Swap asset</Title>
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
        onAssetSelect={(asset) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetAddress');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetDecimals');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetSymbol');
          setSelectedFromAsset(asset);
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'chainId');
          setSelectedNetwork(network);
        }}
        selectedNetwork={selectedNetwork}
        selectedAsset={selectedFromAsset}
        errorMessage={errorMessages?.chainId
          || errorMessages?.fromAssetAddress
          || errorMessages?.fromAssetDecimals
          || errorMessages?.fromAssetSymbol
        }
        showPositiveBalanceAssets
      />
      {!!selectedNetwork && (
        <>
          <SelectInput
            label="To"
            options={availableToAssetsOptions ?? []}
            isLoading={isLoadingAvailableToAssets}
            selectedOption={selectedToAsset}
            onOptionSelect={(asset) => {
              resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
              resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetDecimals');
              resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetSymbol');
              setSelectedToAsset(asset);
            }}
            errorMessage={errorMessages?.toAssetAddress
              || errorMessages?.toAssetDecimals
              || errorMessages?.toAssetSymbol
            }
          />
          {!!selectedFromAsset && (
            <TextInput
              label="You swap"
              onValueChange={onAmountChange}
              value={amount}
              placeholder="0"
              inputBottomText={selectedFromAsset?.assetPriceUsd && amount ? `$${+amount * selectedFromAsset.assetPriceUsd}` : undefined}
              inputLeftComponent={
                <CombinedRoundedImages
                  url={selectedFromAsset.logoURI}
                  smallImageUrl={selectedNetwork.iconUrl}
                  title={selectedFromAsset.symbol}
                  smallImageTitle={selectedNetwork.title}
                />
              }
              inputTopRightComponent={
                <Pill
                  label="Remaining"
                  value={`${formatAmountDisplay(remainingSelectedFromAssetBalance ?? 0)} ${selectedFromAsset.symbol}`}
                  valueColor={(remainingSelectedFromAssetBalance ?? 0) <= 0 ? theme.color?.text?.errorMessage : undefined}
                />
              }
              errorMessage={errorMessages?.amount}
            />
          )}
        </>
      )}
      {/* TODO: unhide once offer spread or min amount is fixed from SDK side */}
      {/* <Checkbox */}
      {/*   label={`Set different receiver address`} */}
      {/*   isChecked={showReceiverInput} */}
      {/*   onChange={(isChecked) => { */}
      {/*     resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress'); */}
      {/*     setShowReceiverInput(isChecked); */}
      {/*     if (!isChecked) setReceiverAddress(''); */}
      {/*   }} */}
      {/* /> */}
      {showReceiverInput && (
        <TextInput
          label={`Receiver address`}
          value={receiverAddress}
          onValueChange={(value) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
            setReceiverAddress(value);
          }}
          errorMessage={errorMessages?.receiverAddress}
        />
      )}
      {!!selectedToAsset && !!selectedFromAsset && !!amount && (remainingSelectedFromAssetBalance ?? 0) > 0 && (
        <SelectInput
          label={`Offer`}
          options={availableOffersOptions ?? []}
          isLoading={isLoadingAvailableOffers}
          disabled={!availableOffersOptions?.length || isLoadingAvailableOffers}
          selectedOption={selectedOffer}
          onOptionSelect={(option) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
            setSelectedOffer(option);
          }}
          renderOptionListItemContent={renderOption}
          renderSelectedOptionContent={renderOption}
          placeholder="Select offer"
          errorMessage={errorMessages?.offer}
        />
      )}
    </>
  );
};

export default AssetSwapTransactionBlock;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountTypes, ExchangeOffer } from 'etherspot';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { ethers } from 'ethers';
import debounce from 'debounce-promise';

import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import { formatAmountDisplay, formatAssetAmountInput, formatMaxAmount } from '../../utils/common';
import { addressesEqual, isValidAmount } from '../../utils/validation';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { Chain } from '../../utils/chain';
import { CombinedRoundedImages, RoundedImage } from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';
import AccountSwitchInput from '../AccountSwitchInput';
import { swapServiceIdToDetails } from '../../utils/swap';
import Text from '../Text/Text';
import { IAssetSwapTransactionBlock, IMultiCallData } from '../../types/transactionBlock';

export interface ISwapAssetTransactionBlockValues {
  chain?: Chain;
  fromAsset?: IAssetWithBalance;
  toAsset?: TokenListToken;
  amount?: string;
  receiverAddress?: string;
  isDifferentReceiverAddress?: boolean;
  offer?: ExchangeOffer;
  accountType?: string;
}

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: 'PTRootUIWebBold', sans-serif;
`;

const OfferDetails = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  font-family: 'PTRootUIWebMedium', sans-serif;
`;

const mapOfferToOption = (offer: ExchangeOffer) => {
  const serviceDetails = swapServiceIdToDetails[offer.provider];
  return {
    title: serviceDetails?.title ?? offer.provider,
    value: offer.provider,
    iconUrl: serviceDetails?.iconUrl,
  };
};

const mapAssetToOption = (asset: TokenListToken) => ({
  title: asset.symbol,
  value: asset.address,
  iconUrl: asset.logoURI,
});

const AssetSwapTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  values,
  multiCallData,
}: IAssetSwapTransactionBlock) => {
  const [amount, setAmount] = useState<string>(values?.amount ?? '');
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(values?.fromAsset ?? null);
  const [selectedToAsset, setSelectedToAsset] = useState<TokenListToken | null>(values?.toAsset ?? null);
  const [selectedNetwork, setSelectedNetwork] = useState<Chain | null>(values?.chain ?? null);
  const [selectedOffer, setSelectedOffer] = useState<SelectOption | null>(
    values?.offer ? mapOfferToOption(values?.offer) : null
  );
  const [availableToAssets, setAvailableToAssets] = useState<TokenListToken[] | null>(null);
  const [availableOffers, setAvailableOffers] = useState<ExchangeOffer[] | null>(values?.offer ? [values.offer] : null);
  const [isLoadingAvailableToAssets, setIsLoadingAvailableToAssets] = useState<boolean>(false);
  const [isLoadingAvailableOffers, setIsLoadingAvailableOffers] = useState<boolean>(false);
  const [showReceiverInput] = useState<boolean>(!!values?.receiverAddress);
  const [receiverAddress, setReceiverAddress] = useState<string>(values?.receiverAddress ?? '');
  const [selectedAccountType, setSelectedAccountType] = useState<string>(values?.accountType ?? AccountTypes.Contract);
  const fixed = multiCallData?.fixed ?? false;

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();
  const {
    sdk,
    getSupportedAssetsForChainId,
    getSupportedAssetsWithBalancesForChainId,
    accountAddress,
    providerAddress,
    smartWalletOnly,
  } = useEtherspot();
  const theme: Theme = useTheme();

  useEffect(() => {
    const preselectAsset = async (multiCallData: IMultiCallData) => {
      setSelectedNetwork(multiCallData.chain);
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
  }, [selectedNetwork, multiCallData]);

  const updateAvailableOffers = useCallback<() => Promise<ExchangeOffer[] | undefined>>(
    debounce(async () => {
      // there is a race condition here
      if (multiCallData && fixed) {
        return;
      }
      setSelectedOffer(null);
      setAvailableOffers([]);

      if (
        !sdk ||
        !selectedToAsset ||
        !selectedFromAsset ||
        !amount ||
        !selectedNetwork?.chainId ||
        !isValidAmount(amount)
      )
        return;

      setIsLoadingAvailableOffers(true);

      // test

      try {
        // needed computed account address before calling getExchangeOffers
        if (!accountAddress) await sdk.computeContractAccount();

        const offers = await sdk.getExchangeOffers({
          fromChainId: selectedNetwork.chainId,
          fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
          fromTokenAddress: selectedFromAsset.address,
          toTokenAddress: selectedToAsset.address,
        });

        return offers;
      } catch (e) {
        //
      }
    }, 200),
    [sdk, selectedFromAsset, selectedToAsset, amount, selectedNetwork, accountAddress]
  );

  useEffect(() => {
    // this will ensure that the old data won't replace the new one
    let active = true;
    updateAvailableOffers().then((offers) => {
      if (active && offers) {
        setAvailableOffers(offers);
        if (offers.length === 1) setSelectedOffer(mapOfferToOption(offers[0]));
        setIsLoadingAvailableOffers(false);
      }
    });

    // hook's clean-up function
    return () => {
      active = false;
    };
  }, [updateAvailableOffers]);

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

  useEffect(() => {
    updateAvailableToAssets();
  }, [updateAvailableToAssets]);

  const availableToAssetsOptions = useMemo(() => availableToAssets?.map(mapAssetToOption), [availableToAssets]);

  const availableOffersOptions = useMemo(
    () => availableOffers?.map(mapOfferToOption),
    [availableOffers, availableToAssets]
  );

  const onAmountChange = useCallback(
    (newAmount: string) => {
      resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
      const decimals = selectedFromAsset?.decimals ?? 18;
      const updatedAmount = formatAssetAmountInput(newAmount, decimals);
      setAmount(updatedAmount);
    },
    [selectedFromAsset]
  );

  useEffect(() => {
    const offer = availableOffers?.find((availableOffer) => availableOffer.provider === selectedOffer?.value);
    setTransactionBlockValues(
      transactionBlockId,
      {
        chain: selectedNetwork ?? undefined,
        fromAsset: selectedFromAsset ?? undefined,
        toAsset: selectedToAsset ?? undefined,
        amount,
        receiverAddress,
        offer,
        isDifferentReceiverAddress: showReceiverInput,
        accountType: selectedAccountType,
      },
      multiCallData || undefined
    );
  }, [
    selectedNetwork,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedOffer,
    availableOffers,
    receiverAddress,
    showReceiverInput,
    selectedAccountType,
    multiCallData,
  ]);

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

  const RenderOption = (option: SelectOption) => {
    const availableOffer = availableOffers?.find((offer) => offer.provider === option.value);
    const toAsset = availableToAssets?.find((availableAsset) =>
      addressesEqual(availableAsset.address, selectedToAsset?.address)
    );
    const valueToReceive =
      availableOffer && formatAmountDisplay(ethers.utils.formatUnits(availableOffer.receiveAmount, toAsset?.decimals));
    return (
      <OfferDetails>
        <RoundedImage title={option.title} url={option.iconUrl} size={24} />
        <div>
          <Text size={12} marginBottom={2} medium block>
            {option.title}
          </Text>
          {!!valueToReceive && (
            <Text size={16} medium>
              {valueToReceive} {toAsset?.symbol}
            </Text>
          )}
        </div>
      </OfferDetails>
    );
  };

  return (
    <>
      <Title>Swap asset</Title>
      {!multiCallData && (
        <AccountSwitchInput
          label="From wallet"
          selectedAccountType={selectedAccountType}
          onChange={(accountType) => {
            if (accountType !== selectedAccountType) {
              setSelectedNetwork(null);
              setSelectedFromAsset(null);
              setSelectedToAsset(null);
              setAvailableOffers(null);
              setSelectedOffer(null);
            }
            setSelectedAccountType(accountType);
          }}
          hideKeyBased={smartWalletOnly}
          errorMessage={errorMessages?.accountType}
          disabled={!!fixed || !!multiCallData}
          showTotals
        />
      )}
      <NetworkAssetSelectInput
        label="From"
        onAssetSelect={(asset, amountBN) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAsset');
          setSelectedFromAsset(asset);
          setAmount(amountBN ? formatMaxAmount(amountBN, asset.decimals) : '');
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'chain');
          setSelectedNetwork(network);
        }}
        selectedNetwork={selectedNetwork}
        selectedAsset={selectedFromAsset}
        errorMessage={errorMessages?.chain || errorMessages?.fromAsset}
        walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
        showPositiveBalanceAssets
        showQuickInputButtons
        disabled={!!fixed || !!multiCallData}
        accountType={selectedAccountType}
      />
      {!!selectedNetwork && (
        <>
          <SelectInput
            label="To"
            options={availableToAssetsOptions ?? []}
            isLoading={isLoadingAvailableToAssets}
            selectedOption={selectedToAsset ? mapAssetToOption(selectedToAsset) : null}
            onOptionSelect={(assetOption) => {
              resetTransactionBlockFieldValidationError(transactionBlockId, 'toAsset');
              const toAsset = availableToAssets?.find((availableAsset) =>
                addressesEqual(availableAsset.address, assetOption?.value)
              );
              setSelectedToAsset(toAsset ?? null);
            }}
            errorMessage={errorMessages?.toAsset}
            disabled={!!fixed}
          />
          {!!selectedFromAsset && (
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
                  smallImageUrl={selectedNetwork.iconUrl}
                  title={selectedFromAsset.symbol}
                  smallImageTitle={selectedNetwork.title}
                />
              }
              inputTopRightComponent={
                <Pill
                  label="Remaining"
                  value={`${formatAmountDisplay(remainingSelectedFromAssetBalance ?? 0)} ${selectedFromAsset.symbol}`}
                  valueColor={
                    (remainingSelectedFromAssetBalance ?? 0) < 0 ? theme.color?.text?.errorMessage : undefined
                  }
                />
              }
              errorMessage={errorMessages?.amount}
              disabled={!!fixed}
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
          showPasteButton
          disabled={!!fixed}
        />
      )}
      {!!selectedToAsset && !!selectedFromAsset && !!amount && (remainingSelectedFromAssetBalance ?? 0) >= 0 && (
        <SelectInput
          label={`Offer`}
          options={availableOffersOptions ?? []}
          isLoading={isLoadingAvailableOffers}
          disabled={!availableOffersOptions?.length || isLoadingAvailableOffers || fixed}
          selectedOption={selectedOffer}
          onOptionSelect={(option) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
            setSelectedOffer(option);
          }}
          renderOptionListItemContent={RenderOption}
          renderSelectedOptionContent={RenderOption}
          placeholder="Select offer"
          errorMessage={errorMessages?.offer}
          noOpen={!!selectedOffer && availableOffersOptions?.length === 1}
          forceShow={!!availableOffersOptions?.length && availableOffersOptions?.length > 1}
        />
      )}
    </>
  );
};

export default AssetSwapTransactionBlock;

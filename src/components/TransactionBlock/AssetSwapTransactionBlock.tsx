import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountTypes, ExchangeOffer } from 'etherspot';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { ethers } from 'ethers';
import debounce from 'debounce-promise';

import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import {
  formatAmountDisplay,
  formatAssetAmountInput,
  formatMaxAmount,
  getOfferItemIndexByBestOffer,
} from '../../utils/common';
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
import useAssetPriceUsd from '../../hooks/useAssetPriceUsd';
import { OfferRoute } from '../OfferRoute/OfferRoute';

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
  const [exchangeRateByChainId, setExchangeRateByChainId] = useState<number>(0);
  const fixed = multiCallData?.fixed ?? false;

  const targetAssetPriceUsd = useAssetPriceUsd(selectedNetwork?.chainId, selectedToAsset?.address);

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();
  const {
    sdk,
    getSupportedAssetsForChainId,
    getSupportedAssetsWithBalancesForChainId,
    accountAddress,
    providerAddress,
    smartWalletOnly,
    updateWalletBalances,
    getRatesByNativeChainId,
    getSdkForChainId,
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
      if (multiCallData && fixed) return;

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

  const getGasSwapUsdValue = async (offer: ExchangeOffer) => {
    if (!selectedNetwork?.chainId) return;

    const sdkByChain = getSdkForChainId(selectedNetwork?.chainId);

    if (sdkByChain && selectedFromAsset && selectedAccountType === AccountTypes.Contract) {
      if (sdkByChain.state.account.type !== AccountTypes.Contract) {
        await sdkByChain.computeContractAccount();
      }

      sdkByChain.clearGatewayBatch();

      await Promise.all(
        offer.transactions.map((transaction) => sdkByChain.batchExecuteAccountTransaction(transaction))
      );

      try {
        const estimation = await sdkByChain.estimateGatewayBatch();
        return +ethers.utils.formatUnits(estimation.estimation.feeAmount) * exchangeRateByChainId;
      } catch (error) {
        //
      }
    }
  };

  useEffect(() => {
    updateWalletBalances();
  }, [sdk, accountAddress]);

  useEffect(() => {
    // this will ensure that the old data won't replace the new one
    let active = true;

    const updateOffers = async () => {
      try {
        const offers = await updateAvailableOffers();
        if (!active || !offers) return;

        const usdValuesGas = await Promise.all(offers.map((offer) => getGasSwapUsdValue(offer)));
        const valuesToReceiveRaw = offers.map((offer) => {
          const toAsset = availableToAssets
            ? availableToAssets?.find((availableAsset) =>
                addressesEqual(availableAsset.address, selectedToAsset?.address)
              )
            : null;

          return targetAssetPriceUsd
            ? +ethers.utils.formatUnits(offer.receiveAmount, toAsset?.decimals) * targetAssetPriceUsd
            : +ethers.utils.formatUnits(offer.receiveAmount, toAsset?.decimals);
        });

        let bestOfferIndex = getOfferItemIndexByBestOffer(usdValuesGas, valuesToReceiveRaw);

        setAvailableOffers(offers);
        setSelectedOffer(mapOfferToOption(offers[bestOfferIndex]));

        setIsLoadingAvailableOffers(false);
      } catch (e) {
        //
      }
    };

    updateOffers();

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

  useEffect(() => {
    if (selectedNetwork?.chainId) {
      getRatesByNativeChainId(selectedNetwork?.chainId).then((res) => {
        if (res) {
          setExchangeRateByChainId(res);
        }
      });
    }
  }, [selectedNetwork]);

  const renderOfferOption = (option: SelectOption) => (
    <OfferRoute
      option={option}
      availableOffers={availableOffers}
      availableToAssets={availableToAssets}
      selectedToAsset={selectedToAsset}
      targetAssetPriceUsd={targetAssetPriceUsd}
      selectedAccountType={selectedAccountType}
      selectedFromAsset={selectedFromAsset}
      selectedNetwork={selectedNetwork}
      exchnageRate={exchangeRateByChainId}
    />
  );

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
                  borderColor={theme?.color?.background?.textInput}
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
          renderOptionListItemContent={renderOfferOption}
          renderSelectedOptionContent={renderOfferOption}
          placeholder="Select offer"
          errorMessage={errorMessages?.offer}
          noOpen={!!selectedOffer && availableOffersOptions?.length === 1}
          forceShow={!!availableOffersOptions?.length && availableOffersOptions?.length > 1 && !selectedOffer}
        />
      )}
    </>
  );
};

export default AssetSwapTransactionBlock;

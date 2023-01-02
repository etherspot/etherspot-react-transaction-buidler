import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountTypes, ExchangeOffer } from 'etherspot';
import { ethers } from 'ethers';
import debounce from 'debounce-promise';

// Types
import { IPlrDaoStakingMembershipBlock } from '../../types/transactionBlock';

import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import {
  formatAmountDisplay,
  formatAssetAmountInput,
  formatMaxAmount,
} from '../../utils/common';
import {
  addressesEqual,
  isValidEthereumAddress,
  isValidAmount,
} from '../../utils/validation';
import AccountSwitchInput from '../AccountSwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import {
  Chain,
  CHAIN_ID,
  supportedChains,
  plrDaoAsset,
} from '../../utils/chain';
import { swapServiceIdToDetails } from '../../utils/swap';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { CombinedRoundedImages, RoundedImage } from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';
import { DestinationWalletEnum } from '../../enums/wallet.enum';
import Text from '../Text/Text';

export interface IPlrDaoTransactionBlockValues {
  fromChainId?: number;
  fromAssetAddress?: string;
  fromAssetIconUrl?: string;
  selectedAsset?: IAssetWithBalance | null;
  fromAssetDecimals?: number;
  fromAssetSymbol?: string;
  amount?: string;
  accountType: AccountTypes;
  receiverAddress?: string;
  offer?: ExchangeOffer;
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

const PlrDaoStakingTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  values,
  multiCallData,
}: IPlrDaoStakingMembershipBlock) => {
  const { smartWalletOnly, providerAddress, accountAddress, sdk } =
    useEtherspot();
  const [amount, setAmount] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<SelectOption | null>(
    values?.offer ? mapOfferToOption(values?.offer) : null
  );
  const [availableOffers, setAvailableOffers] = useState<
    ExchangeOffer[] | null
  >(values?.offer ? [values.offer] : null);
  const [isLoadingAvailableOffers, setIsLoadingAvailableOffers] =
    useState<boolean>(false);
  const [selectedFromAsset, setSelectedFromAsset] =
    useState<IAssetWithBalance | null>(values?.selectedAsset ?? null);
  const [selectedAccountType, setSelectedAccountType] = useState<string>(
    AccountTypes.Contract
  );
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(
    null
  );
  const fixed = multiCallData?.fixed ?? false;
  const defaultCustomReceiverAddress =
    values?.receiverAddress &&
    !addressesEqual(providerAddress, values?.receiverAddress) &&
    !addressesEqual(accountAddress, values?.receiverAddress)
      ? values.receiverAddress
      : null;
  const [customReceiverAddress, setCustomReceiverAddress] = useState<
    string | null
  >(defaultCustomReceiverAddress);
  const [useCustomAddress, setUseCustomAddress] = useState<boolean>(
    !!defaultCustomReceiverAddress
  );

  const defaultSelectedReceiveAccountType =
    (!values?.receiverAddress && values?.accountType === AccountTypes.Key) ||
    (values?.receiverAddress &&
      values?.accountType === AccountTypes.Contract &&
      addressesEqual(providerAddress, values?.receiverAddress))
      ? AccountTypes.Key
      : AccountTypes.Contract;
  const [selectedReceiveAccountType, setSelectedReceiveAccountType] =
    useState<string>(defaultSelectedReceiveAccountType);

  const {
    setTransactionBlockValues,
    resetTransactionBlockFieldValidationError,
    setTransactionBlockFieldValidationError,
  } = useTransactionBuilder();

  const theme: Theme = useTheme();

  useEffect(() => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
    resetTransactionBlockFieldValidationError(
      transactionBlockId,
      'toAssetAddress'
    );
  }, [selectedFromNetwork]);

  const updateAvailableOffers = useCallback<
    () => Promise<ExchangeOffer[] | undefined>
  >(
    debounce(async () => {
      // there is a race condition here
      if (multiCallData && fixed) {
        return;
      }
      setSelectedOffer(null);
      setAvailableOffers([]);

      if (
        !sdk ||
        !selectedFromAsset ||
        !amount ||
        !selectedFromNetwork?.chainId ||
        !isValidAmount(amount)
      )
        return;

      setIsLoadingAvailableOffers(true);

      try {
        // needed computed account address before calling getExchangeOffers
        if (!accountAddress) await sdk.computeContractAccount();
        const offers = await sdk.getExchangeOffers({
          fromChainId: selectedFromAsset.chainId,
          fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
          toTokenAddress: plrDaoAsset.address,
          fromTokenAddress: selectedFromAsset.address,
        });
        return offers;
      } catch (e) {
        //
      }
    }, 200),
    [sdk, selectedFromAsset, amount, selectedFromNetwork, accountAddress]
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

  const availableOffersOptions = useMemo(
    () => availableOffers?.map(mapOfferToOption),
    [availableOffers]
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

  const receiverAddress = useMemo(() => {
    if (useCustomAddress) return customReceiverAddress;
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

  useEffect(() => {
    const offer = availableOffers?.find(
      (availableOffer) => availableOffer.provider === selectedOffer?.value
    );
    if (selectedFromAsset?.assetPriceUsd) {
      if (+amount * selectedFromAsset.assetPriceUsd < 0.4) {
        setTransactionBlockFieldValidationError(
          transactionBlockId,
          'amount',
          'Minimum amount 0.4 USD'
        );
        return;
      }
    }
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    if (receiverAddress && !isValidEthereumAddress(receiverAddress)) {
      setTransactionBlockFieldValidationError(
        transactionBlockId,
        'receiverAddress',
        'Invalid receiver address'
      );
      return;
    }
    resetTransactionBlockFieldValidationError(
      transactionBlockId,
      'receiverAddress'
    );
    setTransactionBlockValues(transactionBlockId, {
      fromChainId: selectedFromNetwork?.chainId ?? undefined,
      fromAssetAddress: selectedFromAsset?.address ?? undefined,
      fromAssetDecimals: selectedFromAsset?.decimals ?? undefined,
      fromAssetSymbol: selectedFromAsset?.symbol ?? undefined,
      fromAssetIconUrl: selectedFromAsset?.logoURI,
      amount,
      offer,
      accountType: selectedAccountType,
      receiverAddress: receiverAddress ?? undefined,
    });
  }, [
    selectedFromNetwork,
    selectedFromAsset,
    amount,
    selectedOffer,
    availableOffers,
    selectedAccountType,
    receiverAddress,
  ]);

  const remainingSelectedFromAssetBalance = useMemo(() => {
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero())
      return 0;

    if (!amount)
      return +ethers.utils.formatUnits(
        selectedFromAsset.balance,
        selectedFromAsset.decimals
      );

    const assetAmountBN = ethers.utils.parseUnits(
      amount,
      selectedFromAsset.decimals
    );
    return +ethers.utils.formatUnits(
      selectedFromAsset.balance.sub(assetAmountBN),
      selectedFromAsset.decimals
    );
  }, [amount, selectedFromAsset]);

  const RenderOption = (option: SelectOption) => {
    const availableOffer = availableOffers?.find(
      (offer) => offer.provider === option.value
    );
    const valueToReceive =
      availableOffer &&
      formatAmountDisplay(
        ethers.utils.formatUnits(
          availableOffer.receiveAmount,
          plrDaoAsset.decimals
        )
      );
    return (
      <OfferDetails>
        <RoundedImage title={option.title} url={option.iconUrl} size={24} />
        <div>
          <Text size={12} marginBottom={2} medium block>
            {option.title}
          </Text>
          {!!valueToReceive && (
            <Text size={16} medium>
              {valueToReceive} {plrDaoAsset.symbol}
            </Text>
          )}
        </div>
      </OfferDetails>
    );
  };

  return (
    <>
      <Title>Stake into Pillar DAO</Title>
      <AccountSwitchInput
        label="From wallet"
        selectedAccountType={selectedAccountType}
        onChange={(accountType) => {
          setSelectedAccountType(accountType);
          setAvailableOffers(null);
          setSelectedOffer(null);
        }}
        hideKeyBased={smartWalletOnly}
        errorMessage={errorMessages?.accountType}
      />
      <NetworkAssetSelectInput
        label="From"
        onAssetSelect={(asset, amountBN) => {
          resetTransactionBlockFieldValidationError(
            transactionBlockId,
            'amount'
          );
          resetTransactionBlockFieldValidationError(
            transactionBlockId,
            'fromAssetAddress'
          );
          resetTransactionBlockFieldValidationError(
            transactionBlockId,
            'fromAssetSymbol'
          );
          resetTransactionBlockFieldValidationError(
            transactionBlockId,
            'fromAssetDecimals'
          );
          setSelectedFromAsset(asset);
          setAmount(amountBN ? formatMaxAmount(amountBN, asset.decimals) : '');
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(
            transactionBlockId,
            'fromChainId'
          );
          setSelectedFromNetwork(network);
        }}
        hideChainIds={[CHAIN_ID.POLYGON]}
        selectedNetwork={selectedFromNetwork}
        selectedAsset={selectedFromAsset}
        errorMessage={
          errorMessages?.fromChainId ||
          errorMessages?.fromAssetSymbol ||
          errorMessages?.fromAssetAddress ||
          errorMessages?.fromAssetDecimals
        }
        walletAddress={
          selectedAccountType === AccountTypes.Contract
            ? accountAddress
            : providerAddress
        }
        showPositiveBalanceAssets
        showQuickInputButtons
      />
      <NetworkAssetSelectInput
        label="To"
        selectedNetwork={supportedChains[1]}
        selectedAsset={plrDaoAsset}
        disabled={true}
        walletAddress={
          selectedAccountType === AccountTypes.Contract
            ? accountAddress
            : providerAddress
        }
      />
      {selectedFromAsset && selectedFromNetwork && (
        <TextInput
          label="You stake"
          onValueChange={onAmountChange}
          value={amount}
          placeholder="0"
          inputBottomText={
            selectedFromAsset?.assetPriceUsd && amount
              ? `${formatAmountDisplay(
                  +amount * selectedFromAsset.assetPriceUsd,
                  '$'
                )}`
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
              value={`${formatAmountDisplay(
                remainingSelectedFromAssetBalance ?? 0
              )} ${selectedFromAsset.symbol}`}
              valueColor={
                (remainingSelectedFromAssetBalance ?? 0) < 0
                  ? theme.color?.text?.errorMessage
                  : undefined
              }
            />
          }
          errorMessage={errorMessages?.amount}
        />
      )}
      <WalletReceiveWrapper>
        <AccountSwitchInput
          label="You will receive on"
          selectedAccountType={selectedReceiveAccountType}
          onChange={(value) => {
            setSelectedReceiveAccountType(value);
            if (value == DestinationWalletEnum.Custom) {
              setUseCustomAddress(true);
              return;
            }
            resetTransactionBlockFieldValidationError(
              transactionBlockId,
              'receiverAddress'
            );
            setUseCustomAddress(false);
            setCustomReceiverAddress(null);
          }}
          hideKeyBased={smartWalletOnly}
          showCustom
        />
      </WalletReceiveWrapper>
      {useCustomAddress && (
        <TextInput
          value={customReceiverAddress ?? ''}
          onValueChange={(value) => {
            resetTransactionBlockFieldValidationError(
              transactionBlockId,
              'receiverAddress'
            );
            setCustomReceiverAddress(value);
          }}
          errorMessage={errorMessages?.receiverAddress}
          placeholder="Insert address"
          noLabel
          showPasteButton
        />
      )}
      {!!selectedFromAsset && !!amount && (
        <SelectInput
          label={`Offer`}
          options={availableOffersOptions ?? []}
          isLoading={isLoadingAvailableOffers}
          disabled={
            !availableOffersOptions?.length || isLoadingAvailableOffers || fixed
          }
          selectedOption={selectedOffer}
          onOptionSelect={(option) => {
            resetTransactionBlockFieldValidationError(
              transactionBlockId,
              'offer'
            );
            setSelectedOffer(option);
          }}
          renderOptionListItemContent={RenderOption}
          renderSelectedOptionContent={RenderOption}
          placeholder="Select offer"
          errorMessage={errorMessages?.offer}
          noOpen={!!selectedOffer && availableOffersOptions?.length === 1}
          forceShow={
            !!availableOffersOptions?.length &&
            availableOffersOptions?.length > 1
          }
        />
      )}
    </>
  );
};

export default PlrDaoStakingTransactionBlock;

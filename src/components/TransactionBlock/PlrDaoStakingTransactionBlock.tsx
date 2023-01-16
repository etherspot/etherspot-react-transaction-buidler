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
import CloseButton from '../Button/closeButtonWhite';
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

const Container = styled.div`
  align-items: center;
  font-family: 'PTRootUIWebMedium', sans-serif;
  background: #21002e;
  color: #fefefe;
  padding: 16px;
  margin: 5px;
  border-image: linear-gradient(#346ecd, #cd34a2) 30;
  border-width: 2px;
  border-style: solid;
`;

const Value = styled.div`
  font-family: 'PTRootUIWebMedium', sans-serif;
  color: #57c2d6;
  display: contents;
`;

const Total = styled.div`
  font-family: 'PTRootUIWebMedium', sans-serif;
  color: #ff0065;
  display: contents;
  font-weight: bold;
`;

const HorizontalLine = styled.div`
  margin: 9px 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, #23a9c9, #cd34a2);
`;

const Bold = styled.p`
  font-weight: bold;
`;

//TODO : change color of block if polygon has less than 10,000 plr on keybased / smart wallet
const Block = styled.div`
  font-size: 12px;
  padding: 2px;
  text-indent: 2px;
  display: flex;
  color: ${(props) => props.color === 'red' && '#ff0065'};
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
  const [closeButton, setCloseButton] = useState<boolean | null>(true);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(
    null
  );
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [keyBasedTotal, setKeyBasedTotal] = useState<string>('');
  const [smartWalletTotal, setSmartWalletTotal] = useState<string>('');
  const [accounts, setAccounts] = useState<
    { chainName: string; keybasedWallet: number; smartWallet: number }[]
  >([{ chainName: 'Ethereum', keybasedWallet: 0, smartWallet: 0 }]);

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

  const apiCalls = async (chainId: number, name: string) => {
    const smartWalletAccount =
      accountAddress &&
      (await sdk!.getAccountBalances({
        account: accountAddress,
        chainId,
      }));

    const keyBasedWalletAccount =
      providerAddress &&
      (await sdk!.getAccountBalances({
        account: providerAddress,
        chainId,
      }));
    const smartWallet =
      smartWalletAccount &&
      smartWalletAccount.items
        .map((i) => parseInt(i.balance._hex, 16))
        .reduce((a, b) => a + b);

    const keybasedWallet =
      keyBasedWalletAccount &&
      keyBasedWalletAccount.items
        .map((i) => parseInt(i.balance._hex, 16))
        .reduce((a, b) => a + b);

    return {
      chainName: name,
      keybasedWallet: keybasedWallet || 0,
      smartWallet: smartWallet || 0,
    };
  };

  const fetchAllAssets = async () => {
    let resultArray = [];
    for (let chain of supportedChains) {
      const result = await apiCalls(chain.chainId, chain.title); // TODO: use promise.allSettle
      resultArray.push(result);
    }

    const totalOfKeybased = resultArray.reduce((accumulator, object) => {
      return accumulator + object.keybasedWallet;
    }, 0);

    const totalOfSmartWallet = resultArray.reduce((accumulator, object) => {
      return accumulator + object.smartWallet;
    }, 0);
    const totalBalance = totalOfKeybased + totalOfSmartWallet;

    const keyBased = formatAmountDisplay(totalOfKeybased, '$');
    const newKeyBasedString =
      keyBased.length > 8 ? `${keyBased.substring(0, 7)}...` : keyBased;

    const smartWallet = formatAmountDisplay(totalOfSmartWallet, '$');
    const newSmartWalletString =
      smartWallet.length > 8
        ? `${smartWallet.substring(0, 7)}...`
        : smartWallet;

    setTotalBalance(totalBalance);
    setKeyBasedTotal(newKeyBasedString);
    setSmartWalletTotal(newSmartWalletString);
    setAccounts(resultArray);
  };

  useEffect(() => {
    fetchAllAssets();
  }, [fetchAllAssets, accountAddress, providerAddress]);

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
          fromAmount: ethers.utils.parseUnits(
            amount,
            selectedFromAsset.decimals
          ),
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
      {closeButton && (
        <Container>
          <CloseButton
            onClick={() => {
              setCloseButton(false);
            }}
          />
          <Text style={{ fontSize: '16px' }}>
            To become DAO member, you need to stake <Value>10,000 PLR</Value>{' '}
            tokens on Polygon.
          </Text>
          <HorizontalLine></HorizontalLine>
          <Text style={{ fontSize: '14px' }}>
            You have{' '}
            <Total>
              {totalBalance
                ? `${formatAmountDisplay(totalBalance, '')}`
                : '...'}{' '}
              PLR
            </Total>{' '}
            {`tokens on ${supportedChains.length} chains and 2 wallets`}
          </Text>{' '}
          {'\n'}
          {accounts.map(({ chainName, keybasedWallet, smartWallet }) => (
            <Text style={{ fontSize: '12px' }}>
              {keybasedWallet > 0 && (
                <Block color= {(chainName==='Polygon' && keybasedWallet<10000) ? 'red' :''}>
                  {`\u25CF`}
                  <Bold>{formatAmountDisplay(keybasedWallet, '')} PLR</Bold> on
                  <Bold>{chainName}</Bold> on <Bold> Keybased Wallet</Bold>
                </Block>
              )}
              {smartWallet > 0 && (
                <Block color= {(chainName==='Polygon' && smartWallet<10000) ? 'red' :''}>
                  {`\u25CF`}
                  <Bold>{formatAmountDisplay(smartWallet, '')} PLR</Bold> on
                  <Bold>{chainName}</Bold> on <Bold> Smart Wallet</Bold>
                </Block>
              )}
            </Text>
          ))}
        </Container>
      )}
      <AccountSwitchInput
        smartWalletTotal={smartWalletTotal}
        keyBasedWalletTotal={keyBasedTotal}
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

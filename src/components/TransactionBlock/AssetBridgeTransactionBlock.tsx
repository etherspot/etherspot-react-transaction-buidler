import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
import {
  AccountTypes,
  BridgingQuote,
} from 'etherspot';
import { ethers } from 'ethers';
import debounce from 'debounce-promise';

import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import {
  useEtherspot,
  useTransactionBuilder,
} from '../../hooks';
import {
  formatAmountDisplay,
  formatAssetAmountInput,
  formatMaxAmount,
} from '../../utils/common';
import {
  ErrorMessages,
} from '../../utils/validation';
import AccountSwitchInput from '../AccountSwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { Chain } from '../../utils/chain';
import {
  IAssetWithBalance,
} from '../../providers/EtherspotContextProvider';
import {
  CombinedRoundedImages,
  RoundedImage,
} from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';
import Text from '../Text/Text';
import { bridgeServiceIdToDetails } from '../../utils/bridge';

export interface AssetBridgeTransactionBlockValues {
  fromChainId?: number;
  toChainId?: number;
  fromAssetAddress?: string;
  fromAssetIconUrl?: string;
  fromAssetDecimals?: number;
  toAssetAddress?: string;
  toAssetIconUrl?: string;
  toAssetUsdPrice?: number;
  amount?: string;
  quote?: BridgingQuote;
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

const OfferDetailsBlock = styled.div`
  margin-right: 16px;
`;

const AssetBridgeTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
}: {
  id: string;
  errorMessages?: ErrorMessages;
}) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(null);
  const [selectedToAsset, setSelectedToAsset] = useState<IAssetWithBalance | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<string>(AccountTypes.Contract);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(null);
  const [selectedToNetwork, setSelectedToNetwork] = useState<Chain | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<SelectOption | null>(null);
  const [availableQuotes, setAvailableQuotes] = useState<BridgingQuote[] | null>(null);
  const [isLoadingAvailableQuotes, setIsLoadingAvailableQuotes] = useState<boolean>(false);

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();
  const theme: Theme = useTheme();

  const { sdk } = useEtherspot();

  useEffect(() => {
    if (selectedFromNetwork?.chainId === selectedToNetwork?.chainId) {
      setSelectedToNetwork(null);
      setSelectedToAsset(null);
    }
  }, [selectedFromNetwork, selectedToNetwork]);

  useEffect(() => {
    setSelectedQuote(null);
    resetTransactionBlockFieldValidationError(transactionBlockId, 'quote');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
  }, [selectedToNetwork, selectedFromNetwork]);

  const updateAvailableQuotes = useCallback(debounce(async () => {
    setSelectedQuote(null);
    setAvailableQuotes([]);

    if (!sdk || !selectedToAsset || !selectedFromAsset || !amount || !selectedFromNetwork?.chainId || !selectedToNetwork?.chainId) return;

    setIsLoadingAvailableQuotes(true);

    try {
      const { items: quotes } = await sdk.getCrossChainQuotes({
        fromChainId: selectedFromNetwork.chainId,
        toChainId: selectedToNetwork.chainId,
        fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
        fromTokenAddress: selectedFromAsset.address,
        toTokenAddress: selectedToAsset.address,
      });
      setAvailableQuotes(quotes);
    } catch (e) {
      //
    }

    setIsLoadingAvailableQuotes(false);
  }, 200), [
    sdk,
    selectedFromAsset,
    selectedToAsset, amount,
    selectedFromNetwork,
    selectedToNetwork,
  ]);

  useEffect(() => { updateAvailableQuotes(); }, [updateAvailableQuotes]);

  const onAmountChange = useCallback((newAmount: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    const decimals = selectedToAsset?.decimals ?? 18;
    const updatedAmount = formatAssetAmountInput(newAmount, decimals);
    setAmount(updatedAmount)
  }, [selectedFromAsset, selectedToAsset]);

  useEffect(() => {
    if (setTransactionBlockValues) {
      const quote = availableQuotes?.find((availableQuote) => availableQuote.provider === selectedQuote?.value);
      setTransactionBlockValues(transactionBlockId, {
        fromChainId: selectedFromNetwork?.chainId,
        toChainId: selectedToNetwork?.chainId,
        fromAssetAddress: selectedFromAsset?.address,
        fromAssetDecimals: selectedFromAsset?.decimals,
        fromAssetIconUrl: selectedFromAsset?.logoURI,
        toAssetAddress: selectedToAsset?.address,
        toAssetIconUrl: selectedToAsset?.logoURI,
        toAssetUsdPrice: selectedToAsset?.assetPriceUsd ?? undefined,
        amount,
        quote,
      });
    }
  }, [
    setTransactionBlockValues,
    selectedFromNetwork,
    selectedToNetwork,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedQuote,
  ]);

  const availableQuotesOptions = useMemo(
    () => availableQuotes?.map((availableQuote) => {
      const serviceDetails = bridgeServiceIdToDetails[availableQuote.provider];
      return {
        title: serviceDetails?.title ?? availableQuote.provider.toUpperCase(),
        value: availableQuote.provider,
        iconUrl: serviceDetails?.iconUrl,
      };
    }),
    [availableQuotes],
  );

  const remainingSelectedFromAssetBalance = useMemo(() => {
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero()) return 0;

    if (!amount) return +ethers.utils.formatUnits(selectedFromAsset.balance, selectedFromAsset.decimals);

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedFromAsset.decimals);
    return +ethers.utils.formatUnits(selectedFromAsset.balance.sub(assetAmountBN), selectedFromAsset.decimals);
  }, [amount, selectedFromAsset]);


  const renderOption = (option: SelectOption) => {
    const availableQuote = availableQuotes?.find((quote) => quote.provider === option.value);
    const valueToReceive = availableQuote?.estimate?.toAmount && formatAmountDisplay(ethers.utils.formatUnits(availableQuote.estimate.toAmount, selectedToAsset?.decimals));
    return (
      <OfferDetails>
        <RoundedImage title={option.title} url={option.iconUrl} size={24} />
        <OfferDetailsBlock>
          <Text size={12} marginBottom={2} medium block>{option.title}</Text>
          {!!valueToReceive && <Text size={16} medium>{valueToReceive} {selectedToAsset?.symbol}</Text>}
        </OfferDetailsBlock>
        {!!availableQuote?.estimate?.gasCosts?.amountUSD && (
          <OfferDetailsBlock>
            <Text size={12} marginBottom={2} color={theme.color?.text?.innerLabel} medium block>Gas price</Text>
            {!!valueToReceive && <Text size={16} medium>{formatAmountDisplay(availableQuote.estimate.gasCosts.amountUSD, '$')}</Text>}
          </OfferDetailsBlock>
        )}
      </OfferDetails>
    );
  };

  return (
    <>
      <Title>Asset bridge</Title>
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
        onAssetSelect={(asset, amountBN) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetAddress');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetDecimals');
          setSelectedFromAsset(asset);
          setAmount(amountBN ? formatMaxAmount(amountBN, asset.decimals) : '');
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromChainId');
          setSelectedFromNetwork(network);
        }}
        selectedNetwork={selectedFromNetwork}
        selectedAsset={selectedFromAsset}
        errorMessage={errorMessages?.fromChainId
          || errorMessages?.fromAssetAddress
          || errorMessages?.fromAssetDecimals
        }
        showPositiveBalanceAssets
        showQuickInputButtons
      />
      <NetworkAssetSelectInput
        label="To"
        onAssetSelect={(asset) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetDecimals');
          setSelectedToAsset(asset);
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'toChainId');
          setSelectedToNetwork(network);
        }}
        selectedNetwork={selectedToNetwork}
        selectedAsset={selectedToAsset}
        errorMessage={errorMessages?.toChainId
          || errorMessages?.toAssetAddress
          || errorMessages?.toAssetDecimals
        }
        disabled={!selectedFromNetwork || !selectedFromAsset}
        hideChainIds={selectedFromNetwork ? [selectedFromNetwork.chainId] : undefined}
      />
      {selectedFromAsset && selectedFromNetwork && (
        <TextInput
          label="You swap"
          onValueChange={onAmountChange}
          value={amount}
          placeholder="0"
          inputBottomText={selectedFromAsset?.assetPriceUsd && amount ? `${formatAmountDisplay(+amount * selectedFromAsset.assetPriceUsd, '$')}` : undefined}
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
      {!!selectedToAsset && selectedFromAsset && (remainingSelectedFromAssetBalance ?? 0) > 0 && (
        <SelectInput
          label={`Route`}
          options={availableQuotesOptions ?? []}
          isLoading={isLoadingAvailableQuotes}
          selectedOption={selectedQuote}
          onOptionSelect={(option) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'quote');
            setSelectedQuote(option);
          }}
          placeholder="Select route"
          renderOptionListItemContent={renderOption}
          renderSelectedOptionContent={renderOption}
          errorMessage={errorMessages?.quote}
          disabled={!availableQuotesOptions?.length || isLoadingAvailableQuotes}
        />
      )}
    </>
  );
};

export default AssetBridgeTransactionBlock;

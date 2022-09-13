import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled from 'styled-components';
import {
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
} from '../../utils/common';
import {
  ErrorMessages,
} from '../../utils/validation';
import SwitchInput from '../SwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { Chain } from '../../utils/chain';
import {
  AssetWithBalance,
} from '../../providers/EtherspotContextProvider';
import { CombinedRoundedImages } from '../Image';

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
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: "PTRootUIWebBold", sans-serif;
`;

const AssetBridgeTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
}: {
  id: string;
  errorMessages?: ErrorMessages;
}) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedFromAsset, setSelectedFromAsset] = useState<AssetWithBalance | null>(null);
  const [selectedToAsset, setSelectedToAsset] = useState<AssetWithBalance | null>(null);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(null);
  const [selectedToNetwork, setSelectedToNetwork] = useState<Chain | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<SelectOption | null>(null);
  const [availableQuotes, setAvailableQuotes] = useState<BridgingQuote[] | null>(null);
  const [isLoadingAvailableQuotes, setIsLoadingAvailableQuotes] = useState<boolean>(false);

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();

  const {
    sdk,
    providerAddress,
    accountAddress,
    totalWorthPerAddress,
  } = useEtherspot();

  useEffect(() => {
    if (selectedFromNetwork?.chainId === selectedToNetwork?.chainId) {
      setSelectedToNetwork(null);
      setSelectedToAsset(null);
    }
  }, [selectedFromNetwork, selectedToNetwork]);

  useEffect(() => {
    setAmount('');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetAddress');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetDecimals');
  }, [selectedFromNetwork, selectedFromAsset]);

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
        toAssetAddress: selectedToAsset?.address,
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
    () => {
      return availableQuotes
        ?.map((availableQuote) => ({
          title: `${availableQuote.provider.toUpperCase()}`,
          value: availableQuote.provider,
        }));
    },
    [availableQuotes],
  );

  const walletOptions = [
    { title: `Key based・$${formatAmountDisplay(totalWorthPerAddress[providerAddress as string] ?? 0)}`, value: 1 },
    { title: `Etherspot・$${formatAmountDisplay(totalWorthPerAddress[accountAddress as string] ?? 0)}`, value: 2 },
  ];

  return (
    <>
      <Title>Asset Bridge</Title>
      <SwitchInput
        label="From wallet"
        option1={walletOptions[0]}
        option2={walletOptions[1]}
        selectedOption={walletOptions[1]}
        onChange={(option) => {
          if (option.value === 1) alert('Unsupported yet!')
        }}
        errorMessage={errorMessages?.fromWallet}
      />
      <NetworkAssetSelectInput
        label="From"
        onAssetSelect={(asset) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetAddress');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetDecimals');
          setSelectedFromAsset(asset);
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
          inputBottomText={selectedFromAsset?.assetPriceUsd && amount ? `$${+amount * selectedFromAsset.assetPriceUsd}` : undefined}
          inputLeftComponent={
            <CombinedRoundedImages
              url1={selectedFromAsset.logoURI}
              url2={selectedFromNetwork.iconUrl}
              title1={selectedFromAsset.symbol}
              title2={selectedFromNetwork.title}
            />
          }
          errorMessage={errorMessages?.amount}
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
          placeholder="Select quote"
          errorMessage={errorMessages?.quote}
          disabled={!availableQuotesOptions?.length || isLoadingAvailableQuotes}
          displayLabelOutside
        />
      )}
    </>
  );
};

export default AssetBridgeTransactionBlock;

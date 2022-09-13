import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';

import TextInput from '../TextInput';
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import {
  formatAmountDisplay,
  formatAssetAmountInput,
} from '../../utils/common';
import {
  ErrorMessages,
} from '../../utils/validation';
import {
  Chain,
  supportedChains,
} from '../../utils/chain';
import SwitchInput from '../SwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { AssetWithBalance } from '../../providers/EtherspotContextProvider';
import { CombinedRoundedImages } from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';

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
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: "PTRootUIWebBold", sans-serif;
`;

const SendAssetTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
}: {
  id: string;
  errorMessages?: ErrorMessages;
}) => {
  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<AssetWithBalance | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<Chain | null>(null);
  const [isFromEtherspotWallet, setIsFromEtherspotWallet] = useState<boolean>(true);

  const theme: Theme = useTheme();
  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();

  const {
    providerAddress,
    accountAddress,
    chainId,
    totalWorthPerAddress,
  } = useEtherspot();

  useEffect(() => {
    setAmount('');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'assetAddress');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'assetDecimals');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'assetSymbol');
  }, [selectedNetwork]);

  const onAmountChange = useCallback((newAmount: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    const decimals = selectedAsset?.decimals ?? 18;
    const updatedAmount = formatAssetAmountInput(newAmount, decimals);
    setAmount(updatedAmount)
  }, [selectedAsset]);

  const onReceiverAddressChange = useCallback((newReceiverAddress: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
    setReceiverAddress(newReceiverAddress)
  }, []);

  useEffect(() => {
    if (setTransactionBlockValues) {
      setTransactionBlockValues(transactionBlockId, {
        chainId: isFromEtherspotWallet ? selectedNetwork?.chainId : chainId,
        assetAddress: selectedAsset?.address,
        assetSymbol: selectedAsset?.symbol,
        assetDecimals: selectedAsset?.decimals,
        amount,
        receiverAddress,
        isFromEtherspotWallet,
        fromAddress: (isFromEtherspotWallet ? accountAddress : providerAddress) as string,
      });
    }
  }, [
    setTransactionBlockValues,
    selectedNetwork,
    selectedAsset,
    receiverAddress,
    amount,
    isFromEtherspotWallet,
    accountAddress,
    providerAddress,
  ]);

  const walletOptions = [
    { title: `Key based・$${formatAmountDisplay(totalWorthPerAddress[providerAddress as string] ?? 0)}`, value: 1 },
    { title: `Etherspot・$${formatAmountDisplay(totalWorthPerAddress[accountAddress as string] ?? 0)}`, value: 2 },
  ];

  const hideChainIds = !isFromEtherspotWallet
    ? supportedChains
      .map((supportedChain) => supportedChain.chainId)
      .filter((supportedChainId) => supportedChainId !== chainId)
    : undefined;

  const remainingSelectedAssetBalance = useMemo(() => {
    if (!selectedAsset?.balance || selectedAsset.balance.isZero()) return 0;

    if (!amount) return +ethers.utils.formatUnits(selectedAsset.balance, selectedAsset.decimals);

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedAsset.decimals);
    return +ethers.utils.formatUnits(selectedAsset.balance.sub(assetAmountBN), selectedAsset.decimals);
  }, [amount, selectedAsset]);

  return (
    <>
      <Title>Send asset</Title>
      <SwitchInput
        label="From wallet"
        option1={walletOptions[0]}
        option2={walletOptions[1]}
        selectedOption={walletOptions[isFromEtherspotWallet ? 1 : 0]}
        onChange={(option) => {
          if (option.value === 1) {
            setSelectedNetwork(null);
            setSelectedAsset(null);
          }
          setIsFromEtherspotWallet(option.value === 2);
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAddress');
        }}
        errorMessage={errorMessages?.fromAddress}
      />
      <NetworkAssetSelectInput
        label="From"
        onAssetSelect={(asset) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'assetDecimals');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'assetAddress');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'assetSymbol');
          setSelectedAsset(asset);
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'chainId');
          setSelectedNetwork(network);
        }}
        selectedNetwork={selectedNetwork}
        selectedAsset={selectedAsset}
        errorMessage={errorMessages?.chainId
          || errorMessages?.assetDecimals
          || errorMessages?.assetAddress
          || errorMessages?.assetSymbol
        }
        hideChainIds={hideChainIds}
        walletAddress={isFromEtherspotWallet ? accountAddress : providerAddress}
        showPositiveBalanceAssets
      />
      {selectedAsset && selectedNetwork && (
        <TextInput
          label="You send"
          onValueChange={onAmountChange}
          value={amount}
          placeholder="0"
          inputBottomText={selectedAsset?.assetPriceUsd && amount ? `$${+amount * selectedAsset.assetPriceUsd}` : undefined}
          inputLeftComponent={
            <CombinedRoundedImages
              url1={selectedAsset.logoURI}
              url2={selectedNetwork.iconUrl}
              title1={selectedAsset.symbol}
              title2={selectedNetwork.title}
            />
          }
          inputTopRightComponent={
            <Pill
              label="Remaining"
              value={`${formatAmountDisplay(remainingSelectedAssetBalance ?? 0)} ${selectedAsset.symbol}`}
              valueColor={(remainingSelectedAssetBalance ?? 0) <= 0 ? theme.color?.text?.errorMessage : undefined}
            />
          }
          errorMessage={errorMessages?.amount}
        />
      )}
      <TextInput
        label={`Receiver address`}
        value={receiverAddress}
        onValueChange={(value) => onReceiverAddressChange(value)}
        errorMessage={errorMessages?.receiverAddress}
        displayLabelOutside
        smallerInput
      />
    </>
  );
};

export default SendAssetTransactionBlock;

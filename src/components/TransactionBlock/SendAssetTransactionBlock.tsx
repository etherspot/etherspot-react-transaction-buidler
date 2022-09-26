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
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { CombinedRoundedImages } from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';
import AccountSwitchInput from '../AccountSwitchInput';
import { AccountTypes } from 'etherspot';

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
  const [selectedAsset, setSelectedAsset] = useState<IAssetWithBalance | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<Chain | null>(null);
  const [isFromEtherspotWallet, setIsFromEtherspotWallet] = useState<boolean>(true);
  const [selectedAccountType, setSelectedAccountType] = useState<string>(AccountTypes.Contract);

  const theme: Theme = useTheme();
  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();

  const {
    providerAddress,
    accountAddress,
    chainId,
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
      <AccountSwitchInput
        label="From wallet"
        selectedAccountType={selectedAccountType}
        onChange={(accountType) => {
          if (accountType === AccountTypes.Key) {
            setSelectedNetwork(null);
            setSelectedAsset(null);
          }
          setIsFromEtherspotWallet(accountType === AccountTypes.Contract);
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAddress');
          setSelectedAccountType(accountType);
        }}
        errorMessage={errorMessages?.fromWallet}
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

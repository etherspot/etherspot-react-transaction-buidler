import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import styled from 'styled-components';

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
  color: #191726;
  font-family: "PTRootUIWebBold", sans-serif;
`;

const AssetImage = styled.img`
  height: 24px;
  width: 24px;
  border-radius: 50%;
  margin-right: 8px;
`;

const NetworkImage = styled.img`
  height: 32px;
  width: 32px;
  border-radius: 50%;
  margin-right: 11px;
`;

const NetworkAssetCombinedImagesWrapper = styled.div`
  position: relative;

  ${AssetImage} {
    position: absolute;
    top: -2px;
    right: -2px;
    height: 14px;
    width: 14px;
    border: 2px solid #fff;
    border-radius: 50%;
  }
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
    : undefined

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
          inputLeftComponent={(
            <NetworkAssetCombinedImagesWrapper>
              <NetworkImage src={selectedNetwork.iconUrl} alt={selectedNetwork.title} />
              <AssetImage src={selectedAsset.logoURI} alt={selectedAsset.symbol} />
            </NetworkAssetCombinedImagesWrapper>
          )}
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

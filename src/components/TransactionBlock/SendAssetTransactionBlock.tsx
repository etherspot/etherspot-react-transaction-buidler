import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';
import { AccountTypes } from 'etherspot';

import TextInput from '../TextInput';
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import {
  formatAmountDisplay,
  formatAssetAmountInput,
  formatMaxAmount,
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
import { ISendAssetTransactionBlock } from '../../types/transactionBlock';

export interface ISendAssetTransactionBlockValues {
  fromAddress?: string;
  receiverAddress?: string;
  chain?: Chain;
  selectedAsset?: IAssetWithBalance;
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
  values,
}: ISendAssetTransactionBlock) => {
  const [receiverAddress, setReceiverAddress] = useState<string>(values?.receiverAddress ?? '');
  const [amount, setAmount] = useState<string>(values?.amount ?? '');
  const [selectedAsset, setSelectedAsset] = useState<IAssetWithBalance | null>(values?.selectedAsset ?? null);
  const [selectedNetwork, setSelectedNetwork] = useState<Chain | null>(values?.chain ?? null);
  const [isFromEtherspotWallet, setIsFromEtherspotWallet] = useState<boolean>(values?.isFromEtherspotWallet ?? true);
  const [selectedAccountType, setSelectedAccountType] = useState<string>((values?.isFromEtherspotWallet ?? true) ? AccountTypes.Contract : AccountTypes.Key);

  const theme: Theme = useTheme();
  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();

  const {
    providerAddress,
    accountAddress,
    chainId,
  } = useEtherspot();

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
    setTransactionBlockValues(transactionBlockId, {
      chain: selectedNetwork ?? undefined,
      selectedAsset: selectedAsset ?? undefined,
      amount,
      receiverAddress,
      isFromEtherspotWallet,
      fromAddress: (isFromEtherspotWallet ? accountAddress : providerAddress) as string,
    });
  }, [
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
          if (accountType !== selectedAccountType) {
            setSelectedNetwork(null);
            setSelectedAsset(null);
          }
          setIsFromEtherspotWallet(accountType === AccountTypes.Contract);
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAddress');
          setSelectedAccountType(accountType);
        }}
        errorMessage={errorMessages?.accountType}
      />
      <NetworkAssetSelectInput
        label="From"
        onAssetSelect={(asset, amountBN) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'selectedAsset');
          setSelectedAsset(asset);
          setAmount(amountBN ? formatMaxAmount(amountBN, asset.decimals) : '');
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'chain');
          setSelectedNetwork(network);
        }}
        selectedNetwork={selectedNetwork}
        selectedAsset={selectedAsset}
        errorMessage={errorMessages?.chain || errorMessages?.selectedAsset}
        hideChainIds={hideChainIds}
        walletAddress={isFromEtherspotWallet ? accountAddress : providerAddress}
        showPositiveBalanceAssets
        showQuickInputButtons
      />
      {selectedAsset && selectedNetwork && (
        <TextInput
          label="You send"
          onValueChange={onAmountChange}
          value={amount}
          placeholder="0"
          inputBottomText={selectedAsset?.assetPriceUsd && amount ? `${formatAmountDisplay(+amount * selectedAsset.assetPriceUsd, '$')}` : undefined}
          inputLeftComponent={
            <CombinedRoundedImages
              url={selectedAsset.logoURI}
              smallImageUrl={selectedNetwork.iconUrl}
              title={selectedAsset.symbol}
              smallImageTitle={selectedNetwork.title}
            />
          }
          inputTopRightComponent={
            <Pill
              label="Remaining"
              value={`${formatAmountDisplay(remainingSelectedAssetBalance ?? 0)} ${selectedAsset.symbol}`}
              valueColor={(remainingSelectedAssetBalance ?? 0) < 0 ? theme.color?.text?.errorMessage : undefined}
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
        showPasteButton
      />
    </>
  );
};

export default SendAssetTransactionBlock;

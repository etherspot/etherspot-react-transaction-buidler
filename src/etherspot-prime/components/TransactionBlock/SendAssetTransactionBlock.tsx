import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';
import { AccountTypes } from '@etherspot/prime-sdk';

import TextInput from '../TextInput';
import { useEtherspotPrime, useTransactionBuilder } from '../../hooks';
import { formatAmountDisplay, formatAssetAmountInput, formatMaxAmount } from '../../utils/common';
import { Chain } from '../../utils/chain';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { CombinedRoundedImages } from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';
import AccountSwitchInput from '../AccountSwitchInput';
import { IMultiCallData, ISendAssetTransactionBlock } from '../../types/transactionBlock';

export interface ISendAssetTransactionBlockValues {
  fromAddress?: string;
  receiverAddress?: string;
  chain?: Chain;
  selectedAsset?: IAssetWithBalance;
  amount?: string;
  isFromEtherspotWallet?: boolean;
  accountType?: string;
  disableReceiverAddressInput?: boolean;
}

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: 'PTRootUIWebBold', sans-serif;
`;

const SendAssetTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  values,
  multiCallData,
  hideTitle = false,
  hideWalletSwitch = false,
}: ISendAssetTransactionBlock) => {
  const [receiverAddress, setReceiverAddress] = useState<string>(values?.receiverAddress ?? '');
  const [amount, setAmount] = useState<string>(values?.amount ?? '');
  const [selectedAsset, setSelectedAsset] = useState<IAssetWithBalance | null>(values?.selectedAsset ?? null);
  const [selectedNetwork, setSelectedNetwork] = useState<Chain | null>(values?.chain ?? null);
  const [disableReceiverAddressInput] = useState<boolean>(values?.disableReceiverAddressInput ?? false);
  const [isFromEtherspotWallet, setIsFromEtherspotWallet] = useState<boolean>(values?.isFromEtherspotWallet ?? true);
  const [selectedAccountType, setSelectedAccountType] = useState<string>(
    values?.isFromEtherspotWallet ?? true ? AccountTypes.Contract : AccountTypes.Key
  );
  const fixed = multiCallData?.fixed ?? false;

  const theme: Theme = useTheme();
  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();

  const {
    sdk,
    providerAddress,
    accountAddress,
    // chainId,
    getSupportedAssetsWithBalancesForChainId,
    smartWalletOnly,
    updateWalletBalances,
  } = useEtherspotPrime();

  const onAmountChange = useCallback(
    (newAmount: string) => {
      resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
      const decimals = selectedAsset?.decimals ?? 18;
      const updatedAmount = formatAssetAmountInput(newAmount, decimals);
      setAmount(updatedAmount);
    },
    [selectedAsset]
  );

  const onReceiverAddressChange = useCallback((newReceiverAddress: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
    setReceiverAddress(newReceiverAddress);
  }, []);

  useEffect(() => {
    updateWalletBalances();
  }, [sdk, accountAddress]);

  useEffect(() => {
    const preselectAsset = async (multiCallData: IMultiCallData) => {
      setSelectedNetwork(multiCallData.chain);
      const supportedAssets = await getSupportedAssetsWithBalancesForChainId(
        multiCallData.chain.chainId,
        false,
        selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress
      );
      const asset = supportedAssets.find((search) => search.address === multiCallData.token?.address);
      setSelectedAsset(asset || null);
    };

    resetTransactionBlockFieldValidationError(transactionBlockId, 'selectedAsset');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    if (!!multiCallData?.token) preselectAsset(multiCallData);
  }, [selectedNetwork, multiCallData]);

  useEffect(() => {
    setTransactionBlockValues(
      transactionBlockId,
      {
        chain: selectedNetwork ?? undefined,
        selectedAsset: selectedAsset ?? undefined,
        amount,
        receiverAddress,
        isFromEtherspotWallet,
        fromAddress: (isFromEtherspotWallet ? accountAddress : providerAddress) as string,
        accountType: selectedAccountType,
        disableReceiverAddressInput,
      },
      multiCallData || undefined
    );
  }, [selectedNetwork, selectedAsset, receiverAddress, amount, isFromEtherspotWallet, accountAddress, providerAddress]);

  const hideChainIds: number[] = [];

  const remainingSelectedAssetBalance = useMemo(() => {
    const multiCallCarryOver = multiCallData?.value || 0;
    if (!selectedAsset?.balance || selectedAsset.balance.isZero()) return 0 + multiCallCarryOver;

    if (!amount) return +ethers.utils.formatUnits(selectedAsset.balance, selectedAsset.decimals) + multiCallCarryOver;

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedAsset.decimals);
    return (
      +ethers.utils.formatUnits(selectedAsset.balance.sub(assetAmountBN), selectedAsset.decimals) + multiCallCarryOver
    );
  }, [amount, selectedAsset]);

  return (
    <>
      {!hideTitle && <Title>Send asset</Title>}
      {!hideWalletSwitch && (
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
          hideKeyBased={smartWalletOnly}
          errorMessage={errorMessages?.accountType}
          disabled={!!fixed || !!multiCallData}
          showTotals
          showHelperText
        />
      )}
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
        disabled={!!fixed || !!multiCallData}
        accountType={selectedAccountType}
      />
      {selectedAsset && selectedNetwork && (
        <TextInput
          label="You send"
          onValueChange={onAmountChange}
          value={amount}
          placeholder="0"
          inputBottomText={
            selectedAsset?.assetPriceUsd && amount
              ? `${formatAmountDisplay(+amount * selectedAsset.assetPriceUsd, '$')}`
              : undefined
          }
          inputLeftComponent={
            <CombinedRoundedImages
              url={selectedAsset.logoURI}
              smallImageUrl={selectedNetwork.iconUrl}
              title={selectedAsset.symbol}
              smallImageTitle={selectedNetwork.title}
              borderColor={theme?.color?.background?.textInput}
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
          disabled={!!fixed}
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
        disabled={!!fixed || disableReceiverAddressInput}
      />
    </>
  );
};

export default SendAssetTransactionBlock;

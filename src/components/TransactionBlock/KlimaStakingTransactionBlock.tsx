import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
import {
  AccountTypes,
} from 'etherspot';
import { BigNumber, ethers } from 'ethers';

import TextInput from '../TextInput';
import { SelectOption } from '../SelectInput/SelectInput';
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
  addressesEqual, isValidEthereumAddress,
} from '../../utils/validation';
import AccountSwitchInput from '../AccountSwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { Chain, CHAIN_ID, supportedChains } from '../../utils/chain';
import {
  IAssetWithBalance,
} from '../../providers/EtherspotContextProvider';
import {
  CombinedRoundedImages,
} from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';
import { IKlimaStakingTransactionBlock } from '../../types/transactionBlock';
import AccountSwitch3Input from '../AccountSwitch3Input';

export interface IKlimaStakingTransactionBlockValues {
  fromChainId?: number;
  fromAssetAddress?: string;
  fromAssetIconUrl?: string;
  fromAssetDecimals?: number;
  fromAssetSymbol?: string;
  amount?: string;
  accountType: AccountTypes;
  receiverAddress?: string;
}

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: "PTRootUIWebBold", sans-serif;
`;

const WalletReceiveWrapper = styled.div`
	display: flex;
	flex-direction: row;
`;

const KlimaStakingTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  values,
}: IKlimaStakingTransactionBlock) => {
  const { sdk, providerAddress, accountAddress } = useEtherspot();
  const [amount, setAmount] = useState<string>('');
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<string>(AccountTypes.Contract);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(null);
  const [selectedToNetwork, setSelectedToNetwork] = useState<Chain | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<SelectOption | null>(null);

  const defaultCustomReceiverAddress = values?.receiverAddress
    && !addressesEqual(providerAddress, values?.receiverAddress)
    && !addressesEqual(accountAddress, values?.receiverAddress)
    ? values.receiverAddress
    : null;
  const [customReceiverAddress, setCustomReceiverAddress] = useState<string | null>(defaultCustomReceiverAddress);
  const [useCustomAddress, setUseCustomAddress] = useState<boolean>(!!defaultCustomReceiverAddress);

  const defaultSelectedReceiveAccountType = (!values?.receiverAddress && values?.accountType === AccountTypes.Key)
    || (values?.receiverAddress && values?.accountType === AccountTypes.Contract && addressesEqual(providerAddress, values?.receiverAddress))
    ? AccountTypes.Key
    : AccountTypes.Contract;
  const [selectedReceiveAccountType, setSelectedReceiveAccountType] = useState<string>(defaultSelectedReceiveAccountType);

  const Klima_Asset: IAssetWithBalance = {
    address: '0x4e78011Ce80ee02d2c3e649Fb657E45898257815',
    chainId: supportedChains[1].chainId,
    name: 'Klima DAO',
    symbol: 'sKLIMA',
    decimals: 9,
    logoURI: 'https://polygonscan.com/token/images/klimadao_32.png',
    balance: BigNumber.from(0),
    assetPriceUsd: null,
    balanceWorthUsd: null,
  }

  const {
    setTransactionBlockValues,
    resetTransactionBlockFieldValidationError,
    setTransactionBlockFieldValidationError,
  } = useTransactionBuilder();

  const theme: Theme = useTheme();

  useEffect(() => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
  }, [selectedFromNetwork]);

  const onAmountChange = useCallback((newAmount: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    const decimals = selectedFromAsset?.decimals ?? 18;
    const updatedAmount = formatAssetAmountInput(newAmount, decimals);
    setAmount(updatedAmount)
  }, [selectedFromAsset]);

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
    if (receiverAddress && !isValidEthereumAddress(receiverAddress)) {
      setTransactionBlockFieldValidationError(
        transactionBlockId,
        'receiverAddress',
        'Invalid receiver address',
      );
      return;
    }
    resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
    setTransactionBlockValues(transactionBlockId, {
      fromChainId: selectedFromNetwork?.chainId ?? undefined,
      fromAssetAddress: selectedFromAsset?.address ?? undefined,
      fromAssetDecimals: selectedFromAsset?.decimals ?? undefined,
      fromAssetSymbol: selectedFromAsset?.symbol ?? undefined,
      fromAssetIconUrl: selectedFromAsset?.logoURI,
      amount,
      accountType: selectedAccountType,
      receiverAddress: receiverAddress ?? undefined,
    });
  }, [
    selectedFromNetwork,
    selectedToNetwork,
    selectedFromAsset,
    amount,
    selectedRoute,
    selectedAccountType,
    receiverAddress,
  ]);

  const remainingSelectedFromAssetBalance = useMemo(() => {
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero()) return 0;

    if (!amount) return +ethers.utils.formatUnits(selectedFromAsset.balance, selectedFromAsset.decimals);

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedFromAsset.decimals);
    return +ethers.utils.formatUnits(selectedFromAsset.balance.sub(assetAmountBN), selectedFromAsset.decimals);
  }, [amount, selectedFromAsset]);


  return (
    <>
      <Title>Stake into sKlima</Title>
      <AccountSwitchInput
        label="From wallet"
        selectedAccountType={selectedAccountType}
        onChange={(accountType) => {
          setSelectedAccountType(accountType);
        }}
        errorMessage={errorMessages?.accountType}
      />
      <NetworkAssetSelectInput
        label="From"
        onAssetSelect={(asset, amountBN) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetAddress');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetSymbol');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetDecimals');
          setSelectedFromAsset(asset);
          setAmount(amountBN ? formatMaxAmount(amountBN, asset.decimals) : '');
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromChainId');
          setSelectedFromNetwork(network);
        }}
        hideChainIds={[CHAIN_ID.POLYGON]}
        selectedNetwork={selectedFromNetwork}
        selectedAsset={selectedFromAsset}
        errorMessage={errorMessages?.fromChainId || errorMessages?.fromAssetSymbol || errorMessages?.fromAssetAddress || errorMessages?.fromAssetDecimals}
        walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
        showPositiveBalanceAssets
        showQuickInputButtons
      />
      <NetworkAssetSelectInput
        label="To"
        selectedNetwork={supportedChains[1]}
        selectedAsset={Klima_Asset}
        disabled={true}
        walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
      />
      {selectedFromAsset && selectedFromNetwork && (
        <TextInput
          label="You stake"
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
      <WalletReceiveWrapper>
        <AccountSwitch3Input
          label="You will receive on"
          selectedAccountType={selectedReceiveAccountType}
          onChange={(value) => {
            setSelectedReceiveAccountType(value);
            if (value == 'Custom') {
              setUseCustomAddress(true);
              return;
            }
            resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
            setUseCustomAddress(false);
            setCustomReceiverAddress(null);
          }}
        />
      </WalletReceiveWrapper>
      {useCustomAddress && (
        <TextInput
          value={customReceiverAddress ?? ''}
          onValueChange={(value) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
            setCustomReceiverAddress(value);
          }}
          errorMessage={errorMessages?.receiverAddress}
          placeholder="Insert address"
          noLabel
          showPasteButton
        />
      )}
    </>
  );
};

export default KlimaStakingTransactionBlock;

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
import { ethers } from 'ethers';

import TextInput from '../TextInput';
import { SelectOption } from '../SelectInput/SelectInput';
import {
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
} from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';

export interface KlimaStakingTransactionBlockValues {
  fromChainId?: number;
  fromAssetAddress?: string;
  fromAssetIconUrl?: string;
  fromAssetDecimals?: number;
  fromAssetSymbol?: string;
  amount?: string;
}

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: "PTRootUIWebBold", sans-serif;
`;

const KlimaStakingTransactionBlock = ({
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
  const [selectedRoute, setSelectedRoute] = useState<SelectOption | null>(null);

  const {
    setTransactionBlockValues,
    resetTransactionBlockFieldValidationError,
  } = useTransactionBuilder();

  const theme: Theme = useTheme();

  useEffect(() => {
    if (selectedFromNetwork?.chainId === selectedToNetwork?.chainId) {
      setSelectedToNetwork(null);
      setSelectedToAsset(null);
    }
  }, [selectedFromNetwork, selectedToNetwork]);

  useEffect(() => {
    setSelectedRoute(null);
    resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
  }, [selectedToNetwork, selectedFromNetwork]);

  const onAmountChange = useCallback((newAmount: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    const decimals = selectedToAsset?.decimals ?? 18;
    const updatedAmount = formatAssetAmountInput(newAmount, decimals);
    setAmount(updatedAmount)
  }, [selectedFromAsset, selectedToAsset]);

  useEffect(() => {
    if (setTransactionBlockValues) {
      setTransactionBlockValues(transactionBlockId, {
        fromChainId: selectedFromNetwork?.chainId,
        fromAssetAddress: selectedFromAsset?.address,
        fromAssetDecimals: selectedFromAsset?.decimals,
        fromAssetSymbol: selectedFromAsset?.symbol,
        fromAssetIconUrl: selectedFromAsset?.logoURI,
        amount,
      });
    }
  }, [
    setTransactionBlockValues,
    selectedFromNetwork,
    selectedToNetwork,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedRoute,
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
    </>
  );
};

export default KlimaStakingTransactionBlock;

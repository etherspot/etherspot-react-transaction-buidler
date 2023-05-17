import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import styled, { useTheme } from 'styled-components';
import { AccountStates, AccountTypes, BridgingQuote, CrossChainServiceProvider } from 'etherspot';
import { BigNumber, BigNumberish, ethers } from 'ethers';

// Types
import { IKlimaStakingTransactionBlock } from '../../types/transactionBlock';

// Components
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import AccountSwitchInput from '../AccountSwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { CombinedRoundedImages, RoundedImage } from '../Image';
import TextInput from '../TextInput';
import { Pill } from '../Text';
import Text from '../Text/Text';
import SelectInput from '../SelectInput';
import { SelectOption } from '../SelectInput/SelectInput';

// providers
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';

// utils
import { formatAmountDisplay, formatAssetAmountInput, formatMaxAmount } from '../../utils/common';
import { addressesEqual, isValidAmount, isValidEthereumAddress } from '../../utils/validation';
import { Theme } from '../../utils/theme';
import { Chain, CHAIN_ID, supportedChains, klimaAsset } from '../../utils/chain';

// constants
import { bridgeServiceIdToDetails } from '../../utils/bridge';
import { DestinationWalletEnum } from '../../enums/wallet.enum';

// hooks
import useAssetPriceUsd from '../../hooks/useAssetPriceUsd';
import { BiCheck } from "react-icons/bi";
import { getAssetPriceInUsd } from '../../services/coingecko';

export interface IKlimaStakingTransactionBlockValues {
  fromChainId?: number;
  fromAssetAddress?: string;
  fromAssetIconUrl?: string;
  fromAssetDecimals?: number;
  fromAssetSymbol?: string;
  amount?: string;
  accountType: AccountTypes;
  receiverAddress?: string;
  receiveAmount?: string;
  routeToUSDC?: BridgingQuote;
  routeToKlima?: BridgingQuote;
  toolUsed?: string;
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
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  font-family: "PTRootUIWebMedium", sans-serif;
  width: 100%;
`;

const OfferGasPriceContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  gap: 1rem;
  align-items: flex-end;
`;

const OfferChecked = styled.div`
  position: absolute;
  top: -10px;
  right: 5px;
  background: ${({ theme }) => theme.color.background.statusIconSuccess};
  width: 14px;
  height: 14px;
  font-size: 4px;
  border-radius: 7px;
  color: #fff;
`;

const mapRouteToOption = (route: BridgingQuote): SelectOption => {
  return {
    title: bridgeServiceIdToDetails['lifi'].title,
    value: route.estimate.toAmount,
    iconUrl: bridgeServiceIdToDetails['lifi'].iconUrl,
    extension: route.estimate.gasCosts.amountUSD,
  };
};

const KlimaStakingTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  values,
}: IKlimaStakingTransactionBlock) => {
  const { smartWalletOnly, providerAddress, accountAddress, sdk, getSdkForChainId } = useEtherspot();
  const [amount, setAmount] = useState<string>('');
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<string>(AccountTypes.Contract);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(null);
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [routeToUSDC, setRouteToUSDC] = useState<BridgingQuote[]>([]);
  const [routeToKlima, setRouteToKlima] = useState<BridgingQuote[]>([]);
  const [isRouteFetching, setIsRouteFetching] = useState<boolean>(false);
  const [selectedRoute, setSelectedRoute] = useState<SelectOption | null>(null);
  const [toolUsed, setToolUsed] = useState<string>('');
  const targetAssetPriceUsd = useAssetPriceUsd(klimaAsset.chainId, klimaAsset.address);

  const defaultCustomReceiverAddress =
    values?.receiverAddress &&
    !addressesEqual(providerAddress, values?.receiverAddress) &&
    !addressesEqual(accountAddress, values?.receiverAddress)
      ? values.receiverAddress
      : null;
  const [customReceiverAddress, setCustomReceiverAddress] = useState<string | null>(defaultCustomReceiverAddress);
  const [useCustomAddress, setUseCustomAddress] = useState<boolean>(!!defaultCustomReceiverAddress);

  const defaultSelectedReceiveAccountType =
    (!values?.receiverAddress && values?.accountType === AccountTypes.Key) ||
    (values?.receiverAddress &&
      values?.accountType === AccountTypes.Contract &&
      addressesEqual(providerAddress, values?.receiverAddress))
      ? AccountTypes.Key
      : AccountTypes.Contract;
  const [selectedReceiveAccountType, setSelectedReceiveAccountType] = useState<string>(
    defaultSelectedReceiveAccountType
  );

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

  const onAmountChange = useCallback(
    (newAmount: string) => {
      resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
      const decimals = selectedFromAsset?.decimals ?? 18;
      const updatedAmount = formatAssetAmountInput(newAmount, decimals);
      setAmount(updatedAmount);
    },
    [selectedFromAsset]
  );

  const receiverAddress = useMemo(() => {
    if (useCustomAddress) return customReceiverAddress;
    return selectedReceiveAccountType === AccountTypes.Key ? providerAddress : accountAddress;
  }, [
    useCustomAddress,
    customReceiverAddress,
    providerAddress,
    selectedReceiveAccountType,
    selectedAccountType,
    accountAddress,
  ]);

  useEffect(() => {
    if (selectedFromAsset?.assetPriceUsd && +amount * selectedFromAsset.assetPriceUsd < 0.4) {
      setTransactionBlockFieldValidationError(transactionBlockId, 'amount', 'Minimum amount 0.4 USD');
      return;
    }
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    if (receiverAddress && !isValidEthereumAddress(receiverAddress)) {
      setTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress', 'Invalid receiver address');
      return;
    }
    resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');

    if (routeToUSDC.length == 0 || routeToKlima.length == 0 || isRouteFetching || !toolUsed) {
      setTransactionBlockFieldValidationError(transactionBlockId, 'route', 'Please try with different inputs/amount');
      return;
    }

    resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
    setTransactionBlockValues(transactionBlockId, {
      fromChainId: selectedFromNetwork?.chainId ?? undefined,
      fromAssetAddress: selectedFromAsset?.address ?? undefined,
      fromAssetDecimals: selectedFromAsset?.decimals ?? undefined,
      fromAssetSymbol: selectedFromAsset?.symbol ?? undefined,
      fromAssetIconUrl: selectedFromAsset?.logoURI,
      amount,
      accountType: selectedAccountType,
      receiverAddress: receiverAddress ?? undefined,
      routeToUSDC: routeToUSDC[0],
      routeToKlima: routeToKlima[0],
      receiveAmount,
      toolUsed,
    });
  }, [
    selectedFromNetwork,
    selectedFromAsset,
    amount,
    selectedAccountType,
    receiverAddress,
    routeToUSDC,
    routeToKlima,
    receiveAmount,
    toolUsed,
  ]);

  const remainingSelectedFromAssetBalance = useMemo(() => {
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero()) return 0;

    if (!amount) return +ethers.utils.formatUnits(selectedFromAsset.balance, selectedFromAsset.decimals);

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedFromAsset.decimals);
    return +ethers.utils.formatUnits(selectedFromAsset.balance.sub(assetAmountBN), selectedFromAsset.decimals);
  }, [amount, selectedFromAsset]);

  const resetRoutes = () => {
    setRouteToUSDC([]);
    setRouteToKlima([]);
    setReceiveAmount('');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
    setIsRouteFetching(false);
    setSelectedRoute(null);
    setToolUsed('');
  };

  const computeReceiveAmount = useCallback(
    debounce(async () => {
      resetRoutes();
      if (
        !sdk ||
        !selectedFromNetwork ||
        !selectedFromAsset ||
        !isValidAmount(amount) ||
        remainingSelectedFromAssetBalance < 0
      ) {
        return;
      }

      setIsRouteFetching(true);

      if (selectedFromAsset?.assetPriceUsd) {
        if (+amount * selectedFromAsset.assetPriceUsd < 0.4) {
          setTransactionBlockFieldValidationError(transactionBlockId, 'amount', 'Minimum amount 0.4 USD');
          resetRoutes();
          return;
        }
      }

      try {
        const routeToUsdc = await sdk.getCrossChainQuotes({
          fromChainId: selectedFromNetwork.chainId,
          toChainId: CHAIN_ID.POLYGON,
          fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
          fromTokenAddress: selectedFromAsset.address,
          fromAddress: selectedAccountType === AccountTypes.Key ? sdk.state.walletAddress : sdk.state.accountAddress,
          toTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          toAddress: sdk.state.accountAddress,
          serviceProvider: CrossChainServiceProvider.LiFi,
        });

        setRouteToUSDC(routeToUsdc.items);

        if (routeToUsdc.items.length === 0) {
          setIsRouteFetching(false);
          resetRoutes();
          return;
        }

        const sdkChain = getSdkForChainId(CHAIN_ID.POLYGON);
        const gasInfo = await sdkChain?.getGatewayGasInfo();

        let priceUsd = await getAssetPriceInUsd(CHAIN_ID.POLYGON,ethers.constants.AddressZero,sdk);
        if (!gasInfo || !priceUsd) {
          setTransactionBlockFieldValidationError(transactionBlockId, 'amount', `No Offer found`);
          resetRoutes();
          return;
        }

        let estimatedGas: BigNumberish = 850000;
        let currentGasPrice = gasInfo.fast;

        if (sdk.state.account.state === AccountStates.UnDeployed) {
          estimatedGas += 330000;
        }          
     
        let gasFees = currentGasPrice.mul(estimatedGas);
        gasFees = gasFees.add(gasFees.mul(40).div(100));
        
        const gasFeesUSD = (Number(ethers.utils.formatEther(gasFees.toString())) * priceUsd) + 0.1
        const gasFeesUSDC = ethers.utils.parseUnits(gasFeesUSD.toFixed(6), 6);

        if (BigNumber.from(routeToUsdc.items[0].estimate.toAmount).lt(gasFeesUSDC.add("500000"))) {
          setTransactionBlockFieldValidationError(transactionBlockId, 'amount', `Minimum amount ${gasFeesUSD + 0.5} USD`);
          resetRoutes();
          return;
        }

        const routeToKlima = await sdk.getCrossChainQuotes({
          fromChainId: CHAIN_ID.POLYGON,
          toChainId: CHAIN_ID.POLYGON,
          fromAmount: BigNumber.from(routeToUsdc.items[0].estimate.toAmount).sub(gasFeesUSDC),
          fromTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          toTokenAddress: '0x4e78011Ce80ee02d2c3e649Fb657E45898257815',
          toAddress: receiverAddress ?? undefined,
          serviceProvider: CrossChainServiceProvider.LiFi,
        });

        if (routeToKlima.items.length > 0) {
          const bestRouteIndex = getBestRouteIndex(routeToKlima.items);

          setSelectedRoute(mapRouteToOption(routeToKlima.items[bestRouteIndex]));
          setToolUsed(routeToUsdc.items[bestRouteIndex].LiFiBridgeUsed ?? '');
          setRouteToKlima(routeToKlima.items);
          setReceiveAmount(
            ethers.utils.formatUnits(routeToKlima.items[bestRouteIndex].estimate.toAmount, klimaAsset.decimals)
          );
          resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
          setIsRouteFetching(false);
        } else {
          resetRoutes();
          setTransactionBlockFieldValidationError(
            transactionBlockId,
            'route',
            'Please try with different inputs/amount'
          );
        }
      } catch (err) {
        resetRoutes();
        setTransactionBlockFieldValidationError(transactionBlockId, 'route', 'Please try with different inputs/amount');
      }
    }, 200),
    [selectedFromNetwork, selectedFromAsset, amount, selectedAccountType, receiverAddress]
  );

  /**
   * Calculation of best route index here is done on the basis of the best route returned
   * that in turn is calculated on the basis of the amount to receive (usd) minus the gas fees usd
   */
  const getBestRouteIndex = (items: BridgingQuote[]) => {
    let index = 0;
    let maxReturnAmount =
      +ethers.utils.formatUnits(items[0].estimate.toAmount) * (targetAssetPriceUsd ? targetAssetPriceUsd : 0) -
      +items[0].estimate.gasCosts.amountUSD;

    for (let i = 1; i < items.length; i++) {
      const amountToRecieve = +ethers.utils.formatUnits(items[i].estimate.toAmount, klimaAsset.decimals);
      const gasPriceUsd = +items[i].estimate.gasCosts.amountUSD;
      const currentReturnAmount = amountToRecieve * (targetAssetPriceUsd ? targetAssetPriceUsd : 0) - gasPriceUsd;

      if (targetAssetPriceUsd && currentReturnAmount > maxReturnAmount) {
        index = i;
        maxReturnAmount = currentReturnAmount;
      }
    }

    return index;
  };

  useEffect(() => {
    computeReceiveAmount();
  }, [computeReceiveAmount]);

  const renderOption = (option: SelectOption) => (
    <OfferDetails>
      <RoundedImage title={option.title} url={option.iconUrl} size={24} />
      <div>
        <Text size={12} marginBottom={2} medium block>
          {option.title}
        </Text>
        <OfferGasPriceContainer>
          <div>
            <Text size={12} marginRight={4} color={theme.color?.text?.innerLabel} medium>
              Gas price:&nbsp;
            </Text>
            <Text size={14} marginRight={22} medium inline>
              {option.extension && `${formatAmountDisplay(option.extension, '$', 2)}`}
            </Text>
          </div>
          {!!receiveAmount && (
            <Text size={16} medium>
              {receiveAmount} {klimaAsset.symbol}
              {targetAssetPriceUsd && ` · ${formatAmountDisplay(+receiveAmount * targetAssetPriceUsd, '$')}`}
            </Text>
          )}
        </OfferGasPriceContainer>
      </div>
      <OfferChecked>
        <BiCheck size={14} />
      </OfferChecked>
    </OfferDetails>
  );

  return (
    <>
      <Title>Stake into sKlima</Title>
      <AccountSwitchInput
        label="From wallet"
        selectedAccountType={selectedAccountType}
        onChange={(accountType) => {
          setSelectedAccountType(accountType);
        }}
        hideKeyBased={smartWalletOnly}
        errorMessage={errorMessages?.accountType}
        showTotals
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
        errorMessage={
          errorMessages?.fromChainId ||
          errorMessages?.fromAssetSymbol ||
          errorMessages?.fromAssetAddress ||
          errorMessages?.fromAssetDecimals
        }
        walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
        showPositiveBalanceAssets
        showQuickInputButtons
        accountType={selectedAccountType}
      />
      <NetworkAssetSelectInput
        label="To"
        selectedNetwork={supportedChains[1]}
        selectedAsset={klimaAsset}
        disabled={true}
        walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
        accountType={selectedAccountType}
      />
      {selectedFromAsset && selectedFromNetwork && (
        <TextInput
          label="You stake"
          onValueChange={onAmountChange}
          value={amount}
          placeholder="0"
          inputBottomText={
            selectedFromAsset?.assetPriceUsd && amount
              ? `${formatAmountDisplay(+amount * selectedFromAsset.assetPriceUsd, '$')}`
              : undefined
          }
          inputLeftComponent={
            <CombinedRoundedImages
              url={selectedFromAsset.logoURI}
              smallImageUrl={selectedFromNetwork.iconUrl}
              title={selectedFromAsset.symbol}
              smallImageTitle={selectedFromNetwork.title}
              borderColor={theme?.color?.background?.textInput}
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
        <AccountSwitchInput
          label="You will receive on"
          selectedAccountType={selectedReceiveAccountType}
          onChange={(value) => {
            setSelectedReceiveAccountType(value);
            if (value == DestinationWalletEnum.Custom) {
              setUseCustomAddress(true);
              return;
            }
            resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
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
            resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
            setCustomReceiverAddress(value);
          }}
          errorMessage={errorMessages?.receiverAddress}
          placeholder="Insert address"
          noLabel
          showPasteButton
        />
      )}
      {!!selectedFromAsset && !!amount && (remainingSelectedFromAssetBalance ?? 0) >= 0 && (
        <SelectInput
          label={`Offer`}
          options={selectedRoute ? [selectedRoute] : []}
          isLoading={isRouteFetching}
          selectedOption={selectedRoute}
          renderOptionListItemContent={renderOption}
          renderSelectedOptionContent={renderOption}
          placeholder="Offer"
          errorMessage={!isRouteFetching ? errorMessages?.route : ''}
          noOpen={true}
          isOffer
        />
      )}
    </>
  );
};

export default KlimaStakingTransactionBlock;

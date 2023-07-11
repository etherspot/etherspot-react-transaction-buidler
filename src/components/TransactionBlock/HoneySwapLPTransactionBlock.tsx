import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import styled, { useTheme } from 'styled-components';
import { AccountStates, AccountTypes, BridgingQuote, CrossChainServiceProvider, ExchangeOffer } from 'etherspot';
import { Route } from '@lifi/sdk';
import { BigNumber, ethers, utils } from 'ethers';

// Types
import { IHoneySwapLPBlock, IKlimaStakingTransactionBlock } from '../../types/transactionBlock';

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
import { BiCheck } from 'react-icons/bi';
import { getNativeAssetPriceInUsd } from '../../services/coingecko';
import RouteOption from '../RouteOption/RouteOption';
import { GNOSIS_USDC_CONTRACT_ADDRESS } from '../../constants/assetConstants';
import HoneySwapRoute from '../HoneySwapRoute/HoneySwapRoute';

export interface IHoneySwapLPTransactionBlockValues {
  fromChainId?: number;
  fromAssetAddress?: string;
  fromAssetIconUrl?: string;
  fromAssetDecimals?: number;
  fromAssetSymbol?: string;
  amount?: string;
  toToken1?: IAssetWithBalance;
  toToken2?: IAssetWithBalance;
  accountType: AccountTypes;
  receiverAddress?: string;
  routeToUSDC?: Route;
  offer1?: ExchangeOffer;
  offer2?: ExchangeOffer;
  offer3?: ExchangeOffer;
  tokenOneAmount?: string;
  tokenTwoAmount?: string;
}

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: 'PTRootUIWebBold', sans-serif;
`;

const mapRouteToOption = (route: Route) => {
  const [firstStep] = route.steps;
  const serviceDetails = bridgeServiceIdToDetails[firstStep?.toolDetails?.key ?? 'lifi'];
  return {
    title: firstStep?.toolDetails?.name ?? serviceDetails?.title ?? 'LiFi',
    value: route.id,
    iconUrl: firstStep?.toolDetails?.logoURI ?? serviceDetails?.iconUrl,
    extension: route.gasCostUSD,
  };
};

const HoneySwapLPTransactionBlock = ({ id: transactionBlockId, errorMessages, values }: IHoneySwapLPBlock) => {
  const { smartWalletOnly, providerAddress, accountAddress, sdk, getSdkForChainId } = useEtherspot();
  const [amount, setAmount] = useState<string>('');
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<string>(AccountTypes.Key);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(null);
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [routeToUSDC, setRouteToUSDC] = useState<Route[]>([]);
  const [selectedOffer1, setSelectedOffer1] = useState<ExchangeOffer | null>();
  const [selectedOffer2, setSelectedOffer2] = useState<ExchangeOffer | null>();
  const [selectedOffer3, setSelectedOffer3] = useState<ExchangeOffer | null>();
  const [tokenOneAmount, setTokenOneAmount] = useState<string | null>(null);
  const [tokenTwoAmount, setTokenTwoAmount] = useState<string | null>(null);
  const [routeToKlima, setRouteToKlima] = useState<BridgingQuote[]>([]);
  const [isRouteFetching, setIsRouteFetching] = useState<boolean>(false);
  const [selectedRoute, setSelectedRoute] = useState<SelectOption | null>(null);
  const [toolUsed, setToolUsed] = useState<string>('');
  const targetAssetPriceUsd = useAssetPriceUsd(klimaAsset.chainId, klimaAsset.address);
  const [selectedToken1Asset, setSelectedToken1Asset] = useState<IAssetWithBalance | null>(values?.toToken1 ?? null);
  const [selectedToken2Asset, setSelectedToken2Asset] = useState<IAssetWithBalance | null>(values?.toToken2 ?? null);

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
  const [selectedReceiveAccountType, setSelectedReceiveAccountType] = useState<string>(AccountTypes.Key);

  const {
    setTransactionBlockValues,
    resetTransactionBlockFieldValidationError,
    setTransactionBlockFieldValidationError,
  } = useTransactionBuilder();

  const theme: Theme = useTheme();

  useEffect(() => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
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

    if (selectedFromAsset?.chainId !== CHAIN_ID.XDAI && routeToUSDC.length == 0) {
      setTransactionBlockFieldValidationError(
        transactionBlockId,
        'routeToUSDC',
        'Please try with different inputs/amount'
      );
      return;
    }

    if (selectedToken1Asset?.address === selectedToken2Asset?.address) {
      setTransactionBlockFieldValidationError(transactionBlockId, 'amount', 'Please try with different assets');
      return;
    }

    // resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
    setTransactionBlockValues(transactionBlockId, {
      fromChainId: selectedFromNetwork?.chainId ?? undefined,
      fromAssetAddress: selectedFromAsset?.address ?? undefined,
      fromAssetDecimals: selectedFromAsset?.decimals ?? undefined,
      fromAssetSymbol: selectedFromAsset?.symbol ?? undefined,
      fromAssetIconUrl: selectedFromAsset?.logoURI,
      amount,
      accountType: selectedAccountType,
      receiverAddress:
        (selectedReceiveAccountType === AccountTypes.Key ? providerAddress : accountAddress) ?? undefined,
      routeToUSDC: routeToUSDC[0],
      toToken1: selectedToken1Asset ?? undefined,
      toToken2: selectedToken2Asset ?? undefined,
      offer1: selectedOffer1,
      offer2: selectedOffer2,
      offer3: selectedOffer3,
      tokenOneAmount,
      tokenTwoAmount,
    });
  }, [
    selectedFromNetwork,
    selectedFromAsset,
    amount,
    selectedAccountType,
    receiverAddress,
    routeToUSDC,
    receiveAmount,
    selectedOffer1,
    selectedOffer2,
    selectedOffer3,
    tokenOneAmount,
    tokenTwoAmount,
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
    // resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
    setIsRouteFetching(false);
    setSelectedRoute(null);
    setToolUsed('');
  };

  const getBestRouteItem = (routes: Route[]) => {
    let bestRoute = routes[0];
    let minAmount = routes[0].gasCostUSD ? +routes[0].fromAmountUSD - +routes[0].gasCostUSD : Number.MAX_SAFE_INTEGER;

    routes.forEach((route) => {
      const { gasCostUSD, fromAmountUSD } = route;
      if (!gasCostUSD) return;
      if (+fromAmountUSD - +gasCostUSD > minAmount) bestRoute = route;
    });

    return bestRoute;
  };

  const computeReceiveAmount = useCallback(
    debounce(async () => {
      resetRoutes();
      if (
        !sdk ||
        !selectedFromNetwork ||
        !selectedFromAsset ||
        !selectedToken1Asset ||
        !selectedToken2Asset ||
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

      const sdkOnXdai = getSdkForChainId(CHAIN_ID.XDAI);

      if (!sdkOnXdai) return;

      const data = await sdkOnXdai.getGatewayGasInfo();

      const account = await sdkOnXdai.computeContractAccount();

      const convertedData = utils.formatEther(
        data.fast.mul(account.state === AccountStates.UnDeployed ? '1350000' : '1000000')
      );

      const nativePrice = await getNativeAssetPriceInUsd(CHAIN_ID.XDAI);

      const gasAmountUSD = utils
        .parseUnits((Number(convertedData) * Number(nativePrice) * 1.3).toFixed(6), 6)
        .toString();
      let remainingAmount: any = null;
      if (selectedFromNetwork.chainId !== CHAIN_ID.XDAI) {
        try {
          const { items: routes } = await sdk.getAdvanceRoutesLiFi({
            fromChainId: selectedFromNetwork.chainId,
            toChainId: CHAIN_ID.XDAI,
            fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
            fromTokenAddress: selectedFromAsset.address,
            toTokenAddress: GNOSIS_USDC_CONTRACT_ADDRESS,
            toAddress: sdk.state.accountAddress ?? undefined,
            allowSwitchChain: false,
          });

          const bestRoute = getBestRouteItem(routes);

          remainingAmount = Number(bestRoute.toAmount) - Number(gasAmountUSD);

          setRouteToUSDC(routes);

          setSelectedRoute(mapRouteToOption(bestRoute));
        } catch (e) {
          //
        }
      } else if (
        selectedFromNetwork.chainId === CHAIN_ID.XDAI &&
        selectedFromAsset.address !== GNOSIS_USDC_CONTRACT_ADDRESS
      ) {
        try {
          // needed computed account address before calling getExchangeOffers
          await sdkOnXdai.computeContractAccount();

          const offers = await sdkOnXdai.getExchangeOffers({
            fromChainId: CHAIN_ID.XDAI,
            fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
            fromTokenAddress: selectedFromAsset.address,
            toTokenAddress: GNOSIS_USDC_CONTRACT_ADDRESS,
          });

          remainingAmount = Number(offers[0].receiveAmount.toString()) - Number(gasAmountUSD);

          setSelectedOffer3(offers[0]);
        } catch {
          //
        }
      } else {
        remainingAmount =
          Number(ethers.utils.parseUnits(amount, selectedFromAsset.decimals).toString()) - Number(gasAmountUSD);
      }

      setIsRouteFetching(false);

      const halfOfRemainingAmount = Math.floor(remainingAmount / 2).toFixed(0);

      const tknAmt1 = String(Number(halfOfRemainingAmount) / 10 ** selectedToken1Asset.decimals);
      const tknAmt2 = String(Number(halfOfRemainingAmount) / 10 ** selectedToken2Asset.decimals);
      setTokenOneAmount(tknAmt1);
      setTokenTwoAmount(tknAmt2);

      console.log('TokenAmt', halfOfRemainingAmount, tknAmt1, tknAmt2);

      try {
        // needed computed account address before calling getExchangeOffers
        await sdkOnXdai.computeContractAccount();

        const offers = await sdkOnXdai.getExchangeOffers({
          fromChainId: CHAIN_ID.XDAI,
          fromAmount: halfOfRemainingAmount,
          fromTokenAddress: GNOSIS_USDC_CONTRACT_ADDRESS,
          toTokenAddress: selectedToken1Asset.address,
        });

        setSelectedOffer1(offers[0]);
      } catch {
        //
      }

      try {
        // needed computed account address before calling getExchangeOffers
        if (!accountAddress) await sdkOnXdai.computeContractAccount();

        const offers = await sdkOnXdai.getExchangeOffers({
          fromChainId: CHAIN_ID.XDAI,
          fromAmount: halfOfRemainingAmount,
          fromTokenAddress: GNOSIS_USDC_CONTRACT_ADDRESS,
          toTokenAddress: selectedToken2Asset.address,
        });

        setSelectedOffer2(offers[0]);
        // return offers;
      } catch {
        //
      }
    }, 200),
    [
      selectedFromNetwork,
      selectedFromAsset,
      amount,
      selectedAccountType,
      receiverAddress,
      selectedToken1Asset,
      selectedToken2Asset,
    ]
  );

  useEffect(() => {
    computeReceiveAmount();
  }, [computeReceiveAmount]);

  const renderOption = (option: SelectOption) => (
    <HoneySwapRoute
      route={routeToUSDC?.find((route) => route.id === option.value)}
      isChecked={selectedRoute?.value && selectedRoute?.value === option.value}
      cost={option.extension && `${formatAmountDisplay(option.extension, '$', 2)}`}
      token1={selectedToken1Asset}
      token2={selectedToken2Asset}
      offer1={selectedOffer1}
      offer2={selectedOffer2}
      tokenAmount={tokenOneAmount}
    />
  );

  return (
    <>
      <Title>Honey Swap Liquidity Pool</Title>
      <AccountSwitchInput
        label="From wallet"
        selectedAccountType={selectedAccountType}
        onChange={(accountType) => {
          setSelectedReceiveAccountType(accountType);
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 13,
        }}
      >
        <NetworkAssetSelectInput
          wFull
          label="Token 1"
          selectedNetwork={supportedChains.find((chain) => chain.chainId === CHAIN_ID.XDAI)}
          selectedAsset={selectedToken1Asset}
          onAssetSelect={(asset) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'toToken1');
            setSelectedToken1Asset(asset);
          }}
          customMessage="Select token"
          allowNetworkSelection={false}
          // disabled={true}
          walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
          accountType={selectedAccountType}
        />

        <NetworkAssetSelectInput
          wFull
          label="Token 2"
          selectedNetwork={supportedChains.find((chain) => chain.chainId === CHAIN_ID.XDAI)}
          selectedAsset={selectedToken2Asset}
          onAssetSelect={(asset) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'toToken2');
            setSelectedToken2Asset(asset);
          }}
          allowNetworkSelection={false}
          customMessage="Select token"
          // disabled={true}
          walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
          accountType={selectedAccountType}
        />
      </div>
      {selectedFromAsset && selectedFromNetwork && (
        <TextInput
          label="You add"
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

      {!!selectedFromAsset &&
        !!selectedToken1Asset &&
        !!selectedToken2Asset &&
        !!amount &&
        selectedToken1Asset?.address !== selectedToken2Asset?.address &&
        selectedFromAsset.chainId !== CHAIN_ID.XDAI &&
        (remainingSelectedFromAssetBalance ?? 0) >= 0 && (
          <SelectInput
            label={`Route`}
            options={selectedRoute ? [selectedRoute] : []}
            isLoading={isRouteFetching}
            selectedOption={selectedRoute}
            renderOptionListItemContent={(option) => renderOption(option)}
            renderSelectedOptionContent={(option) => renderOption(option)}
            placeholder="Route"
            errorMessage={!isRouteFetching ? errorMessages?.route : ''}
            noOpen={true}
            isOffer
          />
        )}

      {!!selectedFromAsset &&
        !!selectedToken1Asset &&
        !!selectedToken2Asset &&
        !!amount &&
        selectedFromAsset.chainId === CHAIN_ID.XDAI && (
          <HoneySwapRoute
            token1={selectedToken1Asset}
            token2={selectedToken2Asset}
            offer1={selectedOffer1}
            offer2={selectedOffer2}
            tokenAmount={tokenOneAmount}
          />
        )}
    </>
  );
};

export default HoneySwapLPTransactionBlock;

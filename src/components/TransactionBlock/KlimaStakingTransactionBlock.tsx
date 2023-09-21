import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import styled, { useTheme } from 'styled-components';
import { AccountStates, AccountTypes } from 'etherspot';
import { BigNumber, BigNumberish, ethers } from 'ethers';
import { Route } from '@lifi/sdk';

// Types
import { IKlimaStakingTransactionBlock } from '../../types/transactionBlock';

// Components
import { useEtherspot, useTransactionBuilder } from '../../hooks';
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
import { isValidAmount } from '../../utils/validation';
import { Theme } from '../../utils/theme';
import { Chain, CHAIN_ID, supportedChains, klimaAsset } from '../../utils/chain';

// constants
import { bridgeServiceIdToDetails } from '../../utils/bridge';

// hooks
import useAssetPriceUsd from '../../hooks/useAssetPriceUsd';
import { BiCheck } from 'react-icons/bi';
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
  routeToUSDC?: Route;
  routeToKlima?: Route;
}

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: 'PTRootUIWebBold', sans-serif;
`;


const OfferDetails = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  font-family: 'PTRootUIWebMedium', sans-serif;
  width: 100%;
`;

const OfferGasPriceContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  gap: 1rem;
  align-items: flex-end;
  font-size: 14px;
`;

const OfferChecked = styled.div`
  position: absolute;
  top: 2px;
  right: 5px;
  background: ${({ theme }) => theme.color.background.statusIconSuccess};
  width: 14px;
  height: 14px;
  font-size: 4px;
  border-radius: 7px;
  color: #fff;
`;

const OfferText = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  margin-bottom: 3px;
`;

const mapRouteToOption = (route: Route): SelectOption => {
  const [firstStep] = route.steps;
  const serviceDetails = bridgeServiceIdToDetails[firstStep?.toolDetails?.key ?? 'lifi'];

  return {
    title: firstStep?.toolDetails?.name ?? serviceDetails?.title ?? 'LiFi',
    value: route.toAmountMin,
    iconUrl: firstStep?.toolDetails?.logoURI ?? serviceDetails?.iconUrl,
    extension: route.gasCostUSD,
  };
};

const KlimaStakingTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  hideTitle = false,
}: IKlimaStakingTransactionBlock) => {
  const { providerAddress, sdk, getSdkForChainId } = useEtherspot();
  const [amount, setAmount] = useState<string>('');
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(null);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(null);
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [routeToUSDC, setRouteToUSDC] = useState<Route | null>(null);
  const [routeToKlima, setRouteToKlima] = useState<Route | null>(null);
  const [isRouteFetching, setIsRouteFetching] = useState<boolean>(false);
  const [selectedRoute, setSelectedRoute] = useState<SelectOption | null>(null);
  const targetAssetPriceUsd = useAssetPriceUsd(klimaAsset.chainId, klimaAsset.address);

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

  useEffect(() => {
    if (selectedFromAsset?.assetPriceUsd && +amount * selectedFromAsset.assetPriceUsd < 0.4) {
      setTransactionBlockFieldValidationError(transactionBlockId, 'amount', 'Minimum amount 0.4 USD');
      return;
    }
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');

    if (!routeToUSDC || !routeToKlima || isRouteFetching) {
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
      accountType: AccountTypes.Key,
      receiverAddress: providerAddress as string,
      routeToUSDC,
      routeToKlima,
      receiveAmount,
    });
  }, [
    selectedFromNetwork,
    selectedFromAsset,
    amount,
    routeToUSDC,
    routeToKlima,
    receiveAmount,
    providerAddress,
  ]);

  const remainingSelectedFromAssetBalance = useMemo(() => {
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero()) return 0;

    if (!amount) return +ethers.utils.formatUnits(selectedFromAsset.balance, selectedFromAsset.decimals);

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedFromAsset.decimals);
    return +ethers.utils.formatUnits(selectedFromAsset.balance.sub(assetAmountBN), selectedFromAsset.decimals);
  }, [amount, selectedFromAsset]);

  const resetRoutes = () => {
    setRouteToUSDC(null);
    setRouteToKlima(null);
    setReceiveAmount('');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
    setIsRouteFetching(false);
    setSelectedRoute(null);
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
        const { items: usdcRoutes } = await sdk.getAdvanceRoutesLiFi({
          fromChainId: selectedFromNetwork.chainId,
          toChainId: CHAIN_ID.POLYGON,
          fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
          fromTokenAddress: selectedFromAsset.address,
          fromAddress: sdk.state.walletAddress,
          toTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          toAddress: sdk.state.accountAddress,
        });

        if (usdcRoutes.length === 0) {
          setIsRouteFetching(false);
          resetRoutes();
          return;
        }

        setRouteToUSDC(usdcRoutes[0]);

        const sdkChain = getSdkForChainId(CHAIN_ID.POLYGON);
        const gasInfo = await sdkChain?.getGatewayGasInfo();

        let priceUsd = await getAssetPriceInUsd(CHAIN_ID.POLYGON, ethers.constants.AddressZero, sdk);
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

        const gasFeesUSD = Number(ethers.utils.formatEther(gasFees.toString())) * priceUsd + 0.1;
        const gasFeesUSDC = ethers.utils.parseUnits(gasFeesUSD.toFixed(6), 6);

        const usdcRouteAmountBN = BigNumber.from(usdcRoutes[0].toAmountMin);

        if (usdcRouteAmountBN.lt(gasFeesUSDC.add('500000'))) {
          setTransactionBlockFieldValidationError(
            transactionBlockId,
            'amount',
            `Minimum amount ${gasFeesUSD + 0.5} USD`
          );
          resetRoutes();
          return;
        }

        const { items: routesToKlima } = await sdk.getAdvanceRoutesLiFi({
          fromChainId: CHAIN_ID.POLYGON,
          toChainId: CHAIN_ID.POLYGON,
          fromAmount: usdcRouteAmountBN.sub(gasFeesUSDC),
          fromTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          toTokenAddress: '0x4e78011Ce80ee02d2c3e649Fb657E45898257815',
          toAddress: providerAddress as string,
        });

        if (routesToKlima.length > 0) {
          const bestRouteIndex = getBestRouteIndex(routesToKlima);
          const bestKlimaRoute = routesToKlima[bestRouteIndex];

          setSelectedRoute(mapRouteToOption(bestKlimaRoute));

          setRouteToKlima(bestKlimaRoute);
          setReceiveAmount(ethers.utils.formatUnits(bestKlimaRoute.toAmountMin, klimaAsset.decimals));
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
    [selectedFromNetwork, selectedFromAsset, amount, providerAddress]
  );

  /**
   * Calculation of best route index here is done on the basis of the best route returned
   * that in turn is calculated on the basis of the amount to receive (usd) minus the gas fees usd
   */
  const getBestRouteIndex = (items: Route[]) => {
    let index = 0;
    let maxReturnAmount =
      +ethers.utils.formatUnits(items[0].toAmountMin) * (targetAssetPriceUsd ? targetAssetPriceUsd : 0) -
      (items[0].gasCostUSD ? +items[0].gasCostUSD : Number.MAX_SAFE_INTEGER);

    for (let i = 1; i < items.length; i++) {
      const amountToReceive = +ethers.utils.formatUnits(items[i].toAmountMin, klimaAsset.decimals);
      const gasPriceUsd = items[i].gasCostUSD ? +(items[i].gasCostUSD as string) : Number.MAX_SAFE_INTEGER;
      const currentReturnAmount = amountToReceive * (targetAssetPriceUsd ? targetAssetPriceUsd : 0) - gasPriceUsd;

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
        <OfferText>
          {receiveAmount} {klimaAsset.symbol}
          <Text color={theme.color?.text?.innerLabel} marginLeft={6} medium block>
            {`via ${option.title}`}
          </Text>
        </OfferText>
        <OfferGasPriceContainer>
          <div>
            {targetAssetPriceUsd && `${formatAmountDisplay(+receiveAmount * targetAssetPriceUsd, '$')}`}
            <Text size={12} marginLeft={8} marginRight={4} color={theme.color?.text?.innerLabel} medium>
              Gas price:&nbsp;
            </Text>
            <Text size={14} medium inline>
              {option.extension && `${formatAmountDisplay(option.extension, '$', 2)}`}
            </Text>
          </div>
        </OfferGasPriceContainer>
      </div>
      <OfferChecked>
        <BiCheck size={14} />
      </OfferChecked>
    </OfferDetails>
  );

  return (
    <>
      {!hideTitle && <Title>Klima DAO Staking</Title>}
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
        walletAddress={providerAddress}
        showPositiveBalanceAssets
        showQuickInputButtons
        accountType={AccountTypes.Key}
      />
      <NetworkAssetSelectInput
        label="To"
        selectedNetwork={supportedChains[1]}
        selectedAsset={klimaAsset}
        readOnly={true}
        walletAddress={providerAddress}
        accountType={AccountTypes.Key}
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

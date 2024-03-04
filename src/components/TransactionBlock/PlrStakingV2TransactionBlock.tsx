import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountTypes, ExchangeOffer } from 'etherspot';
import { BigNumber, ethers } from 'ethers';
import debounce from 'debounce-promise';
import { Route } from '@lifi/sdk';

// types
import { IPlrStakingV2Block, AccountBalance } from '../../types/transactionBlock';

// components
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import { Pill, Text } from '../Text';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import { CombinedRoundedImages, RoundedImage } from '../Image';
import RouteOption from '../RouteOption';
import { PrimaryButton } from '../Button';

// providers
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';

// utils
import { formatAmountDisplay, formatMaxAmount, formatAssetAmountInput } from '../../utils/common';
import { addressesEqual, isValidAmount } from '../../utils/validation';
import { Chain, supportedChains as chains, CHAIN_ID } from '../../utils/chain';
import { swapServiceIdToDetails } from '../../utils/swap';
import { Theme } from '../../utils/theme';
import { bridgeServiceIdToDetails } from '../../utils/bridge';
import { getPlrAssetForChainId, stkPlrAsset } from '../../utils/asset';

// Hooks
import useGetContractState from '../../hooks/useGetContractState';

// constants
import { PLR_ADDRESS_PER_CHAIN, STKPLR_POLYGON_TOKEN_ADDRESS } from '../../constants/assetConstants';

interface ICrossChainSwap {
  type: 'CROSS_CHAIN_SWAP';
  route?: Route;
}

interface ISameChainSwap {
  type: 'SAME_CHAIN_SWAP';
  offer?: ExchangeOffer;
}

export type IPlrStakingV2BlockSwap = ICrossChainSwap | ISameChainSwap;

export interface IPlrStakingV2BlockValues {
  swap?: IPlrStakingV2BlockSwap;
  fromChain?: Chain;
  toChain?: Chain;
  fromAsset?: IAssetWithBalance;
  toAsset?: IAssetWithBalance;
  amount?: string;
  accountType?: string;
  receiverAddress?: string;
  isUnStake?: boolean;
}

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: 'PTRootUIWebBold', sans-serif;
`;

const OfferDetails = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  font-family: 'PTRootUIWebMedium', sans-serif;
`;

const Container = styled.div`
  align-items: center;
  font-family: 'PTRootUIWebMedium', sans-serif;
  background: ${({ theme }) => theme.color.background.card};
  color: ${({ theme }) => theme.color.text.tokenBalance};
  padding: 16px;
  border-radius: 7px;
`;

const ContainerWrapper = styled.div`
  background: ${({ theme }) => theme.color.background.horizontalLine};
  margin: 12px 0 14px 0;
  padding: 1px;
  border-radius: 8px;
`;

const Highlighted = styled.span<{ color?: string }>`
  ${({ color }) => color && `color: ${color};`};
  font-size: 20px;
`;

const HorizontalLine = styled.div`
  margin: 11px 0;
  width: 100%;
  height: 1px;
  background: ${({ theme }) => theme.color.background.horizontalLine};
`;

const UnstakeButton = styled(PrimaryButton)`
  text-align: center;
  padding: 8px 0;
  font-size: 16px;
  border-radius: 6px;
  background: ${({ theme }) => theme.color.background.primary};
  color: #fff;
`;

const mapOfferToOption = (offer: ExchangeOffer) => {
  const serviceDetails = swapServiceIdToDetails[offer.provider];
  return {
    title: serviceDetails?.title ?? offer.provider,
    value: offer.provider,
    iconUrl: serviceDetails?.iconUrl,
  };
};

const mapRouteToOption = (route: Route) => {
  const [firstStep] = route.steps;
  const serviceDetails = bridgeServiceIdToDetails[firstStep?.toolDetails?.key ?? 'lifi'];

  const {
    estimate: { feeCosts },
  } = firstStep;
  let totalFees = 0;
  feeCosts?.forEach(({ amountUSD = 0 }) => {
    totalFees += +amountUSD;
  });

  return {
    title: firstStep?.toolDetails?.name ?? serviceDetails?.title ?? 'LiFi',
    value: route.id,
    iconUrl: firstStep?.toolDetails?.logoURI ?? serviceDetails?.iconUrl,
    extension: route.gasCostUSD,
    fees: totalFees,
  };
};

interface IPlrBalancePerChain {
  [chainId: string]: BigNumber | undefined;
}

const MIN_PLR_STAKE_AMOUNT = '10000';

const chainIdsWithPlrTokens = [CHAIN_ID.ETHEREUM_MAINNET, CHAIN_ID.BINANCE, CHAIN_ID.XDAI, CHAIN_ID.POLYGON];

const isEnoughPlrBalanceToStake = (plrBalance: BigNumber | undefined): boolean => {
  if (!plrBalance) return false;
  const requiredAmountBN = ethers.utils.parseUnits(MIN_PLR_STAKE_AMOUNT, 18);
  return plrBalance.gte(requiredAmountBN);
};

const PlrStakingV2TransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  values,
  hideTitle = false,
  onlyPolygonInPLRStaking = false,
  plrStakingTitle,
}: IPlrStakingV2Block) => {
  const { sdk, providerAddress, accountAddress } = useEtherspot();

  const supportedChains = chains.filter(({ chainId }) => (onlyPolygonInPLRStaking ? chainId === 137 : true));
  const hideChainIds = chains
    .filter(({ chainId }) => (onlyPolygonInPLRStaking ? chainId !== 137 : chainId === 43114))
    .map(({ chainId }) => chainId);

  const addressList = [providerAddress];

  const [amount, setAmount] = useState<string>(values?.amount ?? '');
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(values?.fromChain ?? null);
  const [selectedToNetwork, setSelectedToNetwork] = useState<Chain | null>(values?.toChain ?? null);
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(values?.fromAsset ?? null);
  const [selectedToAsset, setSelectedToAsset] = useState<IAssetWithBalance | null>(values?.toAsset ?? null);
  const [addressPlrBalancePerChain, setAddressPlrBalancePerChain] = useState<{
    [address: string]: IPlrBalancePerChain;
  }>({});
  const [stkPlrBalance, setStkPlrBalance] = useState<BigNumber | undefined>(undefined);

  const { contractState, stakedAmount } = useGetContractState();

  const hasEnoughPlrToStake = useMemo(
    () =>
      addressList.some((address) => {
        if (!address || !addressPlrBalancePerChain?.[address]?.[CHAIN_ID.POLYGON]) return false;
        return isEnoughPlrBalanceToStake(addressPlrBalancePerChain[address][CHAIN_ID.POLYGON]);
      }),
    [providerAddress, addressPlrBalancePerChain]
  );

  const hasEnoughPlrCrossChainToStake = useMemo(() => {
    const plrBalanceCrossChain = addressList.reduce((total, address) => {
      if (!address) return total;

      const totalPerChains = supportedChains.reduce((chainsTotal, chain) => {
        if (!addressPlrBalancePerChain?.[address]?.[chain.chainId]) return chainsTotal;
        return chainsTotal.add(addressPlrBalancePerChain[address][chain.chainId] as BigNumber);
      }, BigNumber.from(0));

      return total.add(totalPerChains);
    }, BigNumber.from(0));

    return isEnoughPlrBalanceToStake(plrBalanceCrossChain);
  }, [providerAddress, addressPlrBalancePerChain]);

  useEffect(() => {
    if (!providerAddress || contractState !== 1) return;

    const balanceAddress = providerAddress;

    const polygonMainnetChain = supportedChains.find((chain) => chain.chainId === CHAIN_ID.POLYGON) as Chain;
    const plrAsset = getPlrAssetForChainId(
      CHAIN_ID.POLYGON,
      addressPlrBalancePerChain?.[balanceAddress]?.[CHAIN_ID.POLYGON] as BigNumber
    );

    if (
      isEnoughPlrBalanceToStake(addressPlrBalancePerChain?.[balanceAddress]?.[CHAIN_ID.POLYGON]) &&
      (!selectedFromAsset || addressesEqual(selectedFromAsset?.address, plrAsset.address))
    ) {
      if (!selectedFromNetwork) {
        setSelectedFromNetwork(polygonMainnetChain);
      }
      if (!selectedFromAsset) {
        setSelectedFromAsset(plrAsset);
      }
      setSelectedToNetwork(polygonMainnetChain);
      setSelectedToAsset(stkPlrAsset);
    } else if (!addressesEqual(selectedFromAsset?.address, plrAsset.address)) {
      setSelectedToNetwork(polygonMainnetChain);
      setSelectedToAsset(stkPlrAsset);
    }
  }, [selectedFromAsset, selectedFromNetwork, addressPlrBalancePerChain, providerAddress]);

  // cross chain swaps
  const defaultRoute = values?.swap?.type === 'CROSS_CHAIN_SWAP' && values?.swap?.route;
  const [selectedRoute, setSelectedRoute] = useState<SelectOption | null>(
    defaultRoute ? mapRouteToOption(defaultRoute) : null
  );
  const [availableRoutes, setAvailableRoutes] = useState<Route[] | null>(defaultRoute ? [defaultRoute] : null);
  const [isLoadingAvailableRoutes, setIsLoadingAvailableRoutes] = useState<boolean>(false);

  // same chain swaps
  const defaultOffer = values?.swap?.type === 'SAME_CHAIN_SWAP' && values?.swap?.offer;
  const [selectedOffer, setSelectedOffer] = useState<SelectOption | null>(
    defaultOffer ? mapOfferToOption(defaultOffer) : null
  );
  const [availableOffers, setAvailableOffers] = useState<ExchangeOffer[] | null>(defaultOffer ? [defaultOffer] : null);
  const [isLoadingAvailableOffers, setIsLoadingAvailableOffers] = useState<boolean>(false);

  const { setTransactionBlockValues, resetTransactionBlockFieldValidationError } = useTransactionBuilder();

  const theme: Theme = useTheme();

  useEffect(() => {
    setSelectedRoute(null);
    resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
  }, [selectedToNetwork, selectedFromNetwork]);

  const getAvailableRoutes = useCallback<() => Promise<Route[] | undefined>>(
    debounce(async () => {
      if (
        !sdk ||
        !selectedToAsset ||
        !selectedFromAsset ||
        !amount ||
        !selectedFromNetwork?.chainId ||
        !selectedToNetwork?.chainId ||
        !isValidAmount(amount)
      )
        return;

      try {
        const { items: routes } = await sdk.getAdvanceRoutesLiFi({
          fromChainId: selectedFromNetwork.chainId,
          toChainId: selectedToNetwork.chainId,
          fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
          fromTokenAddress: selectedFromAsset.address,
          toTokenAddress: selectedToAsset.address,
          toAddress: null,
        });
        return routes;
      } catch (e) {
        //
      }
    }, 200),
    [sdk, selectedFromAsset, selectedToAsset, amount, selectedFromNetwork, selectedToNetwork]
  );

  const getBestRouteItem = (routes: Route[]) => {
    let bestRoute = routes[0];
    let minAmount = routes[0].gasCostUSD ? +routes[0].fromAmountUSD - +routes[0].gasCostUSD : Number.MAX_SAFE_INTEGER;

    routes.forEach((route) => {
      const { gasCostUSD, fromAmountUSD } = route;
      if (!gasCostUSD) return;
      if (+fromAmountUSD - +gasCostUSD < minAmount) {
        bestRoute = route;
        minAmount = +fromAmountUSD - +gasCostUSD;
      }
    });

    return bestRoute;
  };

  useEffect(() => {
    let proceedUpdate = true;

    const updateRoutes = async () => {
      setIsLoadingAvailableRoutes(true);
      setSelectedRoute(null);
      setAvailableRoutes([]);

      const newRoutes = await getAvailableRoutes();
      if (!proceedUpdate) return;

      if (newRoutes?.length) {
        setAvailableRoutes(newRoutes);
        const bestRoute = getBestRouteItem(newRoutes);
        setSelectedRoute(mapRouteToOption(bestRoute));
      }

      setIsLoadingAvailableRoutes(false);
    };

    updateRoutes();

    return () => {
      proceedUpdate = false;
    };
  }, [getAvailableRoutes]);

  const getAvailableOffers = useCallback<() => Promise<ExchangeOffer[] | undefined>>(
    debounce(async () => {
      if (
        !sdk ||
        !selectedToAsset ||
        !selectedFromAsset ||
        !amount ||
        !selectedToNetwork ||
        selectedToNetwork?.chainId !== selectedFromNetwork?.chainId ||
        !isValidAmount(amount)
      )
        return;

      try {
        // needed computed account address before calling getExchangeOffers
        if (!accountAddress) await sdk.computeContractAccount();

        return sdk.getExchangeOffers({
          fromChainId: selectedToNetwork.chainId,
          fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
          fromTokenAddress: selectedFromAsset.address,
          toTokenAddress: selectedToAsset.address,
        });
      } catch (e) {
        //
      }
    }, 200),
    [sdk, selectedFromAsset, selectedToAsset, amount, selectedToNetwork, selectedFromNetwork, accountAddress]
  );

  useEffect(() => {
    let proceedUpdate = true;

    const updateOffers = async () => {
      setIsLoadingAvailableOffers(true);
      setSelectedOffer(null);
      setAvailableOffers([]);

      const newOffers = await getAvailableOffers();
      if (!proceedUpdate) return;

      if (newOffers?.length) setAvailableOffers(newOffers);

      setIsLoadingAvailableOffers(false);
    };

    updateOffers();

    return () => {
      proceedUpdate = false;
    };
  }, [getAvailableOffers]);

  const onAmountChange = useCallback(
    (newAmount: string) => {
      resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
      const decimals = selectedToAsset?.decimals ?? 18;
      const updatedAmount = formatAssetAmountInput(newAmount, decimals);
      setAmount(updatedAmount);
    },
    [selectedFromAsset, selectedToAsset]
  );

  useEffect(() => {
    let swap: IPlrStakingV2BlockSwap | undefined;

    if (contractState !== 1) return;

    if (selectedFromNetwork?.chainId !== selectedToNetwork?.chainId) {
      const route = availableRoutes?.find((availableRoute) => availableRoute.id === selectedRoute?.value);
      swap = {
        type: 'CROSS_CHAIN_SWAP',
        route,
      };
    } else if (
      selectedFromNetwork?.chainId === selectedToNetwork?.chainId &&
      !addressesEqual(selectedFromAsset?.address, stkPlrAsset.address) &&
      !addressesEqual(selectedToAsset?.address, stkPlrAsset.address)
    ) {
      const offer = availableOffers?.find((availableOffer) => availableOffer.provider === selectedOffer?.value);
      swap = {
        type: 'SAME_CHAIN_SWAP',
        offer,
      };
    }

    setTransactionBlockValues(transactionBlockId, {
      isUnStake: false,
      fromChain: selectedFromNetwork ?? undefined,
      toChain: selectedToNetwork ?? undefined,
      fromAsset: selectedFromAsset ?? undefined,
      toAsset: selectedToAsset ?? undefined,
      receiverAddress: undefined,
      accountType: AccountTypes.Key,
      amount,
      swap,
    });
  }, [
    selectedFromNetwork,
    selectedToNetwork,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedRoute,
    selectedOffer,
  ]);

  const availableRoutesOptions = useMemo(() => availableRoutes?.map(mapRouteToOption), [availableRoutes]);

  const availableOffersOptions = useMemo(() => availableOffers?.map(mapOfferToOption), [availableOffers]);

  useEffect(() => {
    let shouldUpdate = true;

    const updateBalances = async () => {
      // is connected
      if (!sdk) return;

      await Promise.all(
        addressList.map(async (address) => {
          if (!address) return;

          await Promise.all(
            supportedChains.map(async (chain) => {
              if (!chainIdsWithPlrTokens.includes(chain.chainId)) return;

              const plrAddressForChain = PLR_ADDRESS_PER_CHAIN[chain.chainId];

              const tokensForBalance =
                chain.chainId === CHAIN_ID.POLYGON
                  ? [plrAddressForChain, STKPLR_POLYGON_TOKEN_ADDRESS] // query for sktPLR balance on polygon network
                  : [plrAddressForChain];

              try {
                const { items: balances } = await sdk.getAccountBalances({
                  account: address,
                  tokens: tokensForBalance,
                  chainId: chain.chainId,
                });

                if (!shouldUpdate) return;

                const plrBalance = balances.find((balance: AccountBalance) =>
                  addressesEqual(plrAddressForChain, balance.token)
                )?.balance;

                setAddressPlrBalancePerChain((current) => ({
                  ...current,
                  [address]: {
                    ...(current[address] ?? {}),
                    [chain.chainId]: plrBalance,
                  },
                }));

                const stkPlrBalance = balances.find((balance: AccountBalance) =>
                  addressesEqual(STKPLR_POLYGON_TOKEN_ADDRESS, balance.token)
                )?.balance;

                setStkPlrBalance(stkPlrBalance ?? undefined);
              } catch (e) {
                console.warn('Failed to get token balances', tokensForBalance, e);
              }
            })
          );
        })
      );
    };

    updateBalances();

    return () => {
      shouldUpdate = false;
    };
  }, [sdk, providerAddress]);

  const remainingSelectedFromAssetBalance = useMemo(() => {
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero()) return 0;

    if (!amount) return +ethers.utils.formatUnits(selectedFromAsset.balance, selectedFromAsset.decimals);

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedFromAsset.decimals);
    return +ethers.utils.formatUnits(selectedFromAsset.balance.sub(assetAmountBN), selectedFromAsset.decimals);
  }, [amount, selectedFromAsset]);

  const inputTitle = useMemo(() => {
    if (!values?.swap) return 'You stake';
    return 'You swap';
  }, []);

  const renderRouteOption = (option: SelectOption) => (
    <RouteOption
      route={availableRoutes?.find((route) => route.id === option.value)}
      isChecked={selectedRoute?.value && selectedRoute?.value === option.value}
      cost={option.extension && formatAmountDisplay(option.extension, '$', 2)}
      fees={option?.fees && formatAmountDisplay(option.fees, '$', 2)}
      showActions
    />
  );

  const renderOfferOption = (option: SelectOption) => {
    const availableOffer = availableOffers?.find((offer) => offer.provider === option.value);
    return (
      <OfferDetails>
        <RoundedImage title={option.title} url={option.iconUrl} size={24} />
        <div>
          <Text size={12} marginBottom={2} medium block>
            {option.title}
          </Text>
          {!!availableOffer && !!selectedToAsset && (
            <Text size={16} medium>
              {formatAmountDisplay(ethers.utils.formatUnits(availableOffer.receiveAmount, selectedToAsset?.decimals))}
              &nbsp;{selectedToAsset?.symbol}
            </Text>
          )}
        </div>
      </OfferDetails>
    );
  };

  const plrTokensSum = useMemo(
    () =>
      Object.values(addressPlrBalancePerChain).reduce((sum, balancePerChain) => {
        let walletSum = 0;

        Object.keys(balancePerChain).forEach((chain) => {
          if (!balancePerChain[chain]) return;

          const plrBalance = balancePerChain[chain];
          if (!plrBalance) return;

          walletSum += +ethers.utils.formatUnits(plrBalance, 18);
        });

        return sum + walletSum;
      }, 0),
    [addressPlrBalancePerChain]
  );

  const onUnstake = async () => {
    const polygonMainnetChain = supportedChains.find((chain) => chain.chainId === CHAIN_ID.POLYGON) as Chain;
    const plrAsset = getPlrAssetForChainId(
      CHAIN_ID.POLYGON,
      addressPlrBalancePerChain?.[providerAddress]?.[CHAIN_ID.POLYGON] as BigNumber
    );
    setSelectedFromNetwork(polygonMainnetChain);
    setSelectedToNetwork(polygonMainnetChain);
    setSelectedFromAsset(stkPlrAsset);
    setSelectedToAsset(plrAsset);

    setTransactionBlockValues(transactionBlockId, {
      isUnStake: true,
      fromChain: polygonMainnetChain,
      toChain: polygonMainnetChain,
      fromAsset: stkPlrAsset,
      toAsset: plrAsset,
      receiverAddress: undefined,
      accountType: AccountTypes.Key,
      amount: stakedAmount,
    });
  };

  useEffect(() => {
    if (!providerAddress) {
      alert('Provider address not found!');
    }
  }, [providerAddress]);

  if (!providerAddress) {
    return null;
  }

  if (contractState !== 1) {
    return (
      <>
        {!hideTitle && <Title>{plrStakingTitle ?? 'Pillar Validator Staking'}</Title>}
        <ContainerWrapper>
          <Container>
            {contractState !== 0 && (
              <>
                <Text size={18} color={theme?.color?.text?.tokenValue}>
                  Thank You!
                </Text>
                <br />
                <br />
              </>
            )}
            {contractState === 0 && (
              <Text size={16} marginTop={2}>
                Waiting for staking period to be ready
              </Text>
            )}
            {contractState === 2 && (
              <Text size={16} marginTop={2}>
                You have staked your Pillar tokens
              </Text>
            )}
            {contractState === 3 && (
              <Text size={16} marginTop={2}>
                The token lockup period has passed. You can unstake your tokens
              </Text>
            )}
          </Container>
        </ContainerWrapper>
        {contractState === 3 && <UnstakeButton onClick={onUnstake}>Unstake</UnstakeButton>}
      </>
    );
  }

  const isStakingAssetSelected = addressesEqual(selectedToAsset?.address, stkPlrAsset.address);

  const hasStkPlrBalance = !!stkPlrBalance && stkPlrBalance.gt(0);

  return (
    <>
      {!hideTitle && <Title>{plrStakingTitle ?? 'Pillar Validator Staking'}</Title>}
      <ContainerWrapper>
        <Container>
          <Text size={14}>
            {!hasEnoughPlrToStake && (
              <>
                You need a minimum of &nbsp;
                <Highlighted color={theme.color?.text?.blockParagraphHighlight}>10,000 PLR</Highlighted>
                &nbsp;tokens on Polygon to participate in the staking program.
              </>
            )}
            {hasEnoughPlrToStake && <>You can stake your PLR tokens (Min 10,000 PLR and Max 250,000 PLR).</>}
          </Text>
          <HorizontalLine />
          {hasStkPlrBalance && (
            <Text size={14}>
              You have
              <Highlighted color={theme.color?.text?.blockParagraphHighlightSecondary}>
                &nbsp;{formatAmountDisplay(ethers.utils.formatUnits(stkPlrBalance, 18))} stkPLR
              </Highlighted>
              &nbsp;tokens:
            </Text>
          )}
          {plrTokensSum > 0 && (
            <>
              {!hasStkPlrBalance && (
                <Text size={14}>
                  You have
                  <Highlighted
                    color={
                      hasEnoughPlrCrossChainToStake
                        ? theme.color?.text?.blockParagraphHighlightSecondary
                        : theme.color?.text?.errorMessage
                    }
                  >
                    &nbsp;{formatAmountDisplay(plrTokensSum)} PLR
                  </Highlighted>
                  &nbsp;tokens:
                </Text>
              )}
              {supportedChains
                .filter(({ chainId }) => chainIdsWithPlrTokens.includes(chainId))
                .map(({ chainId, title }) => {
                  const [plrOnKeyBased] = [providerAddress].map((address) => {
                    if (!address || !addressPlrBalancePerChain?.[address]?.[chainId]) return;

                    const plrBalance = addressPlrBalancePerChain[address][chainId];
                    if (!plrBalance) return;

                    let textColor;
                    if (chainId === stkPlrAsset.chainId) {
                      textColor = isEnoughPlrBalanceToStake(plrBalance)
                        ? theme.color?.text?.blockParagraphHighlightSecondary
                        : theme.color?.text?.errorMessage;
                    }

                    return {
                      textColor,
                      amount: formatAmountDisplay(ethers.utils.formatUnits(plrBalance, 18)),
                    };
                  });

                  return (
                    <>
                      {plrOnKeyBased && (
                        <Text size={12} marginTop={4} color={plrOnKeyBased.textColor} block>
                          • {plrOnKeyBased.amount} PLR on {title} on Wallet
                        </Text>
                      )}
                    </>
                  );
                })}
            </>
          )}
          {plrTokensSum === 0 && <Text size={14}>You have 0 PLR tokens.</Text>}
        </Container>
      </ContainerWrapper>
      <NetworkAssetSelectInput
        label="From"
        onAssetSelect={(asset, amountBN) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAsset');
          setSelectedFromAsset(asset);
          setAmount(amountBN ? formatMaxAmount(amountBN, asset.decimals) : '');
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromChain');
          setSelectedFromNetwork(network);
        }}
        selectedNetwork={selectedFromNetwork}
        selectedAsset={selectedFromAsset}
        errorMessage={errorMessages?.fromChain || errorMessages?.fromAsset}
        walletAddress={providerAddress}
        hideChainIds={hideChainIds}
        showPositiveBalanceAssets
        showQuickInputButtons
        accountType={AccountTypes.Key}
        showOnlyPLRToken
      />
      <NetworkAssetSelectInput
        label="To"
        selectedNetwork={selectedToNetwork}
        selectedAsset={selectedToAsset}
        errorMessage={errorMessages?.toChain || errorMessages?.toAsset}
        readOnly
        walletAddress={providerAddress}
        accountType={AccountTypes.Key}
      />
      {!!selectedFromAsset && !!selectedFromNetwork && (
        <TextInput
          label={inputTitle}
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
      {!isStakingAssetSelected &&
        !!selectedToAsset &&
        !!selectedFromAsset &&
        !!amount &&
        (remainingSelectedFromAssetBalance ?? 0) >= 0 && (
          <>
            {selectedFromNetwork?.chainId !== selectedToNetwork?.chainId && (
              <SelectInput
                label={'Route'}
                options={availableRoutesOptions ?? []}
                isLoading={isLoadingAvailableRoutes}
                selectedOption={selectedRoute}
                onOptionSelect={(option) => {
                  resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
                  setSelectedRoute(option);
                }}
                placeholder="Select route"
                renderOptionListItemContent={renderRouteOption}
                renderSelectedOptionContent={renderRouteOption}
                errorMessage={errorMessages?.route}
                disabled={!availableRoutesOptions?.length || isLoadingAvailableRoutes}
                noOpen={!!selectedRoute && availableRoutesOptions?.length === 1}
                forceShow={!!availableRoutesOptions?.length && availableRoutesOptions?.length > 1 && !selectedRoute}
              />
            )}
            {selectedFromNetwork?.chainId === selectedToNetwork?.chainId && (
              <SelectInput
                label={'Offer'}
                options={availableOffersOptions ?? []}
                isLoading={isLoadingAvailableOffers}
                disabled={!availableOffersOptions?.length || isLoadingAvailableOffers}
                selectedOption={selectedOffer}
                onOptionSelect={(option) => {
                  resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
                  setSelectedOffer(option);
                }}
                renderOptionListItemContent={renderOfferOption}
                renderSelectedOptionContent={renderOfferOption}
                placeholder="Select offer"
                errorMessage={errorMessages?.offer}
                noOpen={!!selectedOffer && availableOffersOptions?.length === 1}
                forceShow={!!availableOffersOptions?.length && availableOffersOptions?.length > 1}
              />
            )}
          </>
        )}
    </>
  );
};

export default PlrStakingV2TransactionBlock;

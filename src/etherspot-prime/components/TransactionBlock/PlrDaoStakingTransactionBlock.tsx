import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountTypes, ExchangeOffer } from '@etherspot/prime-sdk';
import { ethers } from 'ethers';
import debounce from 'debounce-promise';
import { Route } from '@lifi/sdk';

// types
import { IPlrDaoStakingMembershipBlock } from '../../types/transactionBlock';

// components
import { useEtherspotPrime, useTransactionBuilder } from '../../hooks';
import { Pill, Text } from '../Text';
import AccountSwitchInput from '../AccountSwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import { CombinedRoundedImages } from '../Image';
import RouteOption from '../RouteOption';
import { OfferRoute } from '../OfferRoute/OfferRoute';

// providers
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';

// utils
import { formatAmountDisplay, formatMaxAmount, formatAssetAmountInput } from '../../utils/common';
import { addressesEqual, isValidEthereumAddress, isValidAmount } from '../../utils/validation';
import { Chain, supportedChains, plrDaoMemberNft, CHAIN_ID, MAINNET_CHAIN_ID } from '../../utils/chain';
import { plrDaoAsset, plrDaoAssetPerChainId } from '../../utils/asset';
import { swapServiceIdToDetails } from '../../utils/swap';
import { Theme } from '../../utils/theme';
import { bridgeServiceIdToDetails } from '../../utils/bridge';

//constants
import { DestinationWalletEnum } from '../../enums/wallet.enum';
import useAssetPriceUsd from '../../hooks/useAssetPriceUsd';

export interface IPlrDaoTransactionBlockValues {
  accountType: AccountTypes;
  fromAsset: IAssetWithBalance;
  selectedAsset?: IAssetWithBalance | null;
  offer: ExchangeOffer;
  toAsset: IAssetWithBalance;
  fromChainId: number;
  fromAssetDecimals?: number;
  fromAssetAddress?: string;
  fromAssetIconUrl?: string;
  fromAssetSymbol?: string;
  amount: string;
  receiverAddress?: string;
  hasEnoughPLR: boolean;
  enableAssetBridge: boolean;
  enableAssetSwap: boolean;
  route?: Route;
  membershipAddress?: string | null;
  isUnStake?: boolean;
}

interface AccountBalance {
  chainId: number;
  chainName: string;
  keyBasedWallet: number;
  smartWallet: number;
}

export interface INft {
  tokenId: number;
  name: string;
  amount: number;
  image: string;
  ipfsGateway: string;
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

// const OfferDetails = styled.div`
//   display: flex;
//   flex-direction: row;
//   align-items: center;
//   font-family: 'PTRootUIWebMedium', sans-serif;
// `;

const ContainerWrapper = styled.div`
  background: ${({ theme }) => theme.color.background.horizontalLine};
  margin: 12px 0 14px 0;
  padding: 1px;
  border-radius: 5px;
`;

const Container = styled.div`
  align-items: center;
  font-family: 'PTRootUIWebMedium', sans-serif;
  background: ${({ theme }) => theme.color.background.card};
  color: ${({ theme }) => theme.color.text.tokenBalance};
  padding: 16px;
  border-radius: 4px;
`;

const Value = styled.div`
  font-family: 'PTRootUIWebMedium', sans-serif;
  color: ${({ theme }) => theme.color.text.tokenValue};
  display: contents;
`;

const Total = styled.div`
  font-family: 'PTRootUIWebMedium', sans-serif;
  color: ${({ theme }) => theme.color.text.tokenTotal};
  display: contents;
  font-weight: bold;
`;

const HorizontalLine = styled.div`
  margin: 9px 0;
  width: 100%;
  height: 1px;
  background: ${({ theme }) => theme.color.background.horizontalLine};
`;

const Bold = styled.p`
  font-weight: bold;
`;

const Block = styled.div`
  font-size: 12px;
  padding: 2px;
  text-indent: 2px;
  display: flex;
  color: ${(props) => props.color};
`;

// const UnstakeButton = styled(PrimaryButton)`
//   text-align: center;
//   padding: 8px 0;
//   font-size: 16px;
//   border-radius: 6px;
//   background: ${({ theme }) => theme.color.background.primary};
//   color: #fff;
// `;

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

export const MAX_PLR_TOKEN_LIMIT = 10000;

const PlrDaoStakingTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  values,
  multiCallData,
  hideTitle = false,
}: IPlrDaoStakingMembershipBlock) => {
  const {
    smartWalletOnly,
    providerAddress,
    accountAddress,
    sdk,
    getSupportedAssetsWithBalancesForChainId,
    getRatesByNativeChainId,
    getNftsForChainId,
    // environment,
    chainId,
  } = useEtherspotPrime();
  const theme: Theme = useTheme();

  const [amount, setAmount] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<SelectOption | null>(
    values?.offer ? mapOfferToOption(values?.offer) : null
  );
  const [availableOffers, setAvailableOffers] = useState<ExchangeOffer[]>(values?.offer ? [values.offer] : []);
  const [isLoadingAvailableOffers, setIsLoadingAvailableOffers] = useState<boolean>(false);

  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(values?.selectedAsset ?? null);

  const [selectedAccountType, setSelectedAccountType] = useState<string>(AccountTypes.Contract);

  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(null);

  const [totalKeyBasedPLRTokens, setTotalKeyBasedPLRTokens] = useState<number>(0);
  const [totalSmartWalletPLRTokens, setTotalSmartWalletPLRTokens] = useState<number>(0);

  const [selectedRoute, setSelectedRoute] = useState<SelectOption | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<Route[]>([]);
  const [isLoadingAvailableRoutes, setIsLoadingAvailableRoutes] = useState<boolean>(false);
  const [exchangeRateByChainId, setExchangeRateByChainId] = useState<number>(0);

  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [nftMembershipAddress, setNFTMembershipAddress] = useState<string | null>(null);
  const [isNFTMember, setIsNFTMember] = useState<boolean>(false);
  const STAKING_CHAIN_ID = MAINNET_CHAIN_ID.POLYGON;

  const hasEnoughPLR =
    totalKeyBasedPLRTokens >= MAX_PLR_TOKEN_LIMIT || totalSmartWalletPLRTokens >= MAX_PLR_TOKEN_LIMIT;

  const getNftList = useCallback(async () => {
    if (!accountAddress || !providerAddress || !sdk) {
      return;
    }
    try {
      const [providerAddressNfts, accountAddressNfts] = await Promise.all([
        getNftsForChainId(CHAIN_ID.POLYGON, providerAddress, true),
        getNftsForChainId(CHAIN_ID.POLYGON, accountAddress, true),
      ]);

      const isMemberInProviderAddress = providerAddressNfts.some((nft) =>
        addressesEqual(nft.contractAddress, plrDaoMemberNft[STAKING_CHAIN_ID].address)
      );
      const isMemberInAccountAddress = accountAddressNfts.some((nft) =>
        addressesEqual(nft.contractAddress, plrDaoMemberNft[STAKING_CHAIN_ID].address)
      );

      if (isMemberInProviderAddress || isMemberInAccountAddress) {
        setIsNFTMember(true);
        setNFTMembershipAddress(isMemberInProviderAddress ? providerAddress : accountAddress);
      }
    } catch (error) {
      //
    }
  }, [accountAddress, providerAddress, sdk]);

  useEffect(() => {
    // Fetch a list of NFTs for the account to check if the user is existing member of PLR Dao.
    getNftList();
  }, [getNftList]);

  const hasEnoughPLRForPolygon = useCallback(() => {
    if (isNFTMember) return false;
    const selectedChainBalance = accounts.find((acc) => acc.chainId === CHAIN_ID.POLYGON);
    if (!selectedChainBalance) return false;

    if (selectedAccountType === AccountTypes.Contract) {
      return selectedChainBalance['smartWallet'] >= MAX_PLR_TOKEN_LIMIT;
    } else {
      return selectedChainBalance['keyBasedWallet'] >= MAX_PLR_TOKEN_LIMIT;
    }
  }, [accounts, selectedAccountType, selectedFromNetwork, isNFTMember]);

  const hasEnoughPLRInPolygon = hasEnoughPLRForPolygon();

  let enableAssetBridge = selectedFromNetwork?.chainId !== CHAIN_ID.POLYGON;
  let enableAssetSwap =
    selectedFromNetwork?.chainId === CHAIN_ID.POLYGON &&
    selectedFromAsset?.symbol !== plrDaoAssetPerChainId[STAKING_CHAIN_ID].symbol;

  if (
    hasEnoughPLRInPolygon &&
    selectedFromNetwork?.chainId === CHAIN_ID.POLYGON &&
    selectedFromAsset?.symbol === plrDaoAssetPerChainId[STAKING_CHAIN_ID].symbol
  ) {
    enableAssetBridge = false;
    enableAssetSwap = false;
  }

  const toAsset =
    hasEnoughPLRInPolygon && !enableAssetBridge && !enableAssetSwap
      ? plrDaoMemberNft[STAKING_CHAIN_ID]
      : plrDaoAssetPerChainId[STAKING_CHAIN_ID];

  const targetAssetPriceUsd = useAssetPriceUsd(toAsset.chainId, toAsset.address);

  const fixed = multiCallData?.fixed ?? false;
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

  useEffect(() => {
    // Reset transaction block field errors
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAssetAddress');
  }, [selectedFromNetwork]);

  useEffect(() => {
    if (selectedFromNetwork?.chainId) {
      getRatesByNativeChainId(selectedFromNetwork?.chainId).then((res) => {
        if (res) {
          setExchangeRateByChainId(res);
        }
      });
    }
  }, [selectedFromNetwork]);

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

  const updateAvailableRoutes = useCallback(
    debounce(async () => {
      setSelectedRoute(null);
      setAvailableRoutes([]);
      if (!sdk || !selectedFromAsset || !amount || !selectedFromNetwork?.chainId || !isValidAmount(amount)) return;

      if (receiverAddress && !isValidEthereumAddress(receiverAddress)) {
        setTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress', 'Invalid receiver address');
        return;
      }

      setIsLoadingAvailableRoutes(true);

      try {
        const { items: routes } = await sdk.getAdvanceRoutesLiFi({
          fromChainId: selectedFromNetwork.chainId,
          toChainId: plrDaoAsset.chainId,
          fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
          fromTokenAddress: selectedFromAsset.address,
          toTokenAddress: plrDaoAsset.address,
          toAddress: receiverAddress ?? undefined,
        });
        setAvailableRoutes(routes);
        const bestRoute = getBestRouteItem(routes);
        setSelectedRoute(mapRouteToOption(bestRoute));
      } catch (e) {
        //
      }

      setIsLoadingAvailableRoutes(false);
    }, 200),
    [sdk, selectedFromAsset, amount, accountAddress, selectedAccountType, selectedFromNetwork, receiverAddress]
  );

  useEffect(() => {
    updateAvailableRoutes();
  }, [updateAvailableRoutes]);

  const getWalletBalance = async (chainId: number, name: string) => {
    try {
      const accountsBalances = await Promise.all(
        [accountAddress, providerAddress].map(async (address) => {
          return await getSupportedAssetsWithBalancesForChainId(chainId, true, address);
        })
      );
      let smartWalletBalance = 0;
      let keyBasedBalance = 0;
      accountsBalances[0]?.forEach(({ symbol, decimals, balance }) => {
        if (symbol == plrDaoAssetPerChainId[STAKING_CHAIN_ID].symbol) {
          smartWalletBalance += +ethers.utils.formatUnits(balance, decimals);
        }
      });
      accountsBalances[1]?.forEach(({ symbol, decimals, balance }) => {
        if (symbol == plrDaoAssetPerChainId[STAKING_CHAIN_ID].symbol) {
          keyBasedBalance += +ethers.utils.formatUnits(balance, decimals);
        }
      });
      return {
        chainId,
        chainName: name,
        keyBasedWallet: keyBasedBalance,
        smartWallet: smartWalletBalance,
      };
    } catch (err) {
      return {
        chainId,
        chainName: name,
        keyBasedWallet: 0,
        smartWallet: 0,
      };
    }
  };

  const getTotal = (accountBalanceWithSupportedChains: AccountBalance[], key: 'keyBasedWallet' | 'smartWallet') => {
    const total = accountBalanceWithSupportedChains?.reduce((accumulator, object: AccountBalance) => {
      return accumulator + object[key];
    }, 0);
    return total;
  };

  const fetchAllAccountBalances = useCallback(async () => {
    try {
      if (!sdk || (!accountAddress && !providerAddress)) return;

      const filteredSupportedChains = supportedChains.filter((chain) =>
        [CHAIN_ID.ETHEREUM_MAINNET, CHAIN_ID.POLYGON, CHAIN_ID.XDAI, CHAIN_ID.BINANCE].includes(chain.chainId)
      );
      let accountBalanceWithSupportedChains: AccountBalance[] = await Promise.all(
        filteredSupportedChains.map((chain) => getWalletBalance(chain.chainId, chain.title))
      );
      accountBalanceWithSupportedChains = accountBalanceWithSupportedChains?.filter(
        (data: AccountBalance) => data.keyBasedWallet > 0 || data.smartWallet > 0
      );

      const totalKeyBasedPLRTokens = getTotal(accountBalanceWithSupportedChains as AccountBalance[], 'keyBasedWallet');
      const totalSmartWalletPLRTokens = getTotal(accountBalanceWithSupportedChains as AccountBalance[], 'smartWallet');

      setTotalKeyBasedPLRTokens(totalKeyBasedPLRTokens);
      setTotalSmartWalletPLRTokens(totalSmartWalletPLRTokens);
      setAccounts(accountBalanceWithSupportedChains);
    } catch (e) {
      //
    }
  }, [accountAddress, providerAddress, sdk]);

  useEffect(() => {
    // Fetch token balance for all the chains
    fetchAllAccountBalances();
  }, [fetchAllAccountBalances]);

  const updateAvailableOffers = useCallback<() => Promise<ExchangeOffer[] | undefined>>(
    debounce(async () => {
      // there is a race condition here
      if (multiCallData && fixed) {
        return;
      }
      setSelectedOffer(null);
      setAvailableOffers([]);

      if (!sdk || !selectedFromAsset || !amount || !selectedFromNetwork?.chainId || !isValidAmount(amount)) return;

      setIsLoadingAvailableOffers(true);

      try {
        // needed computed account address before calling getExchangeOffers
        if (!accountAddress) await sdk.getCounterFactualAddress();
        const offers = await sdk.getExchangeOffers({
          fromChainId: selectedFromAsset.chainId,
          fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
          toTokenAddress: plrDaoAsset.address,
          fromTokenAddress: selectedFromAsset.address,
        });
        return offers;
      } catch (e) {
        //
      }
    }, 200),
    [sdk, selectedFromAsset, amount, selectedFromNetwork, accountAddress, selectedAccountType, receiverAddress]
  );

  useEffect(() => {
    // this will ensure that the old data won't replace the new one
    let active = true;
    const update = async () => {
      try {
        const offers = await updateAvailableOffers();
        if (!active || !offers) return;
        setAvailableOffers(offers);
        setIsLoadingAvailableOffers(false);
        if (!offers.length) return;
        const bestOffer: ExchangeOffer | undefined = offers?.find(
          (offer) => offer.provider === swapServiceIdToDetails['Lifi'].title
        );
        const selectedOffer = bestOffer?.provider ? bestOffer : offers[0];
        setSelectedOffer(mapOfferToOption(selectedOffer));
      } catch (e) {
        //
      }
    };
    update();
    return () => {
      active = false;
    };
  }, [updateAvailableOffers]);

  const availableOffersOptions = useMemo(() => availableOffers?.map(mapOfferToOption), [availableOffers]);

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
    // update transaction block with best offer (LiFi)
    const offer = availableOffers.find((availableOffer) => availableOffer.provider === selectedOffer?.value);
    const route = availableRoutes.find((availableRoute) => availableRoute.id === selectedRoute?.value);

    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    if (receiverAddress && !isValidEthereumAddress(receiverAddress)) {
      setTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress', 'Invalid receiver address');
      return;
    }
    resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
    setTransactionBlockValues(transactionBlockId, {
      hasEnoughPLR: hasEnoughPLRInPolygon,
      enableAssetBridge,
      enableAssetSwap,
      fromChainId: selectedFromNetwork?.chainId ?? undefined,
      toAsset,
      fromAsset: selectedFromAsset ?? undefined,
      amount,
      offer,
      accountType: selectedAccountType,
      receiverAddress: receiverAddress ?? undefined,
      route,
    });
  }, [
    selectedFromNetwork,
    selectedFromAsset,
    amount,
    selectedOffer,
    availableOffers,
    selectedRoute,
    selectedAccountType,
    receiverAddress,
  ]);

  // const onUnstake = async () => {
  //   setTransactionBlockValues(transactionBlockId, {
  //     isUnStake: true,
  //     hasEnoughPLR: false,
  //     enableAssetBridge: false,
  //     enableAssetSwap: false,
  //     fromChainId: plrDaoMemberNft[STAKING_CHAIN_ID].chainId,
  //     amount: `${MAX_PLR_TOKEN_LIMIT}`,
  //     accountType: nftMembershipAddress === providerAddress ? AccountTypes.Key : AccountTypes.Contract,
  //     membershipAddress: nftMembershipAddress,
  //   });
  // };

  const availableRoutesOptions = useMemo(() => availableRoutes?.map(mapRouteToOption), [availableRoutes]);

  const remainingSelectedFromAssetBalance = useMemo(() => {
    const multiCallCarryOver = multiCallData?.value || 0;
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero()) return 0 + multiCallCarryOver;
    const balance = ethers.utils.formatUnits(selectedFromAsset.balance, selectedFromAsset.decimals);
    if (!amount) return +balance + multiCallCarryOver;
    const assetAmountBN = ethers.utils.parseUnits(amount, selectedFromAsset.decimals);
    const balanceWithAssetAmount = ethers.utils.formatUnits(
      selectedFromAsset.balance.sub(assetAmountBN),
      selectedFromAsset.decimals
    );
    return +balanceWithAssetAmount + multiCallCarryOver;
  }, [amount, selectedFromAsset]);

  // const RenderOption = (option: SelectOption) => {
  //   const availableOffer = availableOffers?.find((offer) => offer.provider === option.value);

  //   const valueToReceiveRaw = availableOffer
  //     ? ethers.utils.formatUnits(availableOffer.receiveAmount, plrDaoAssetPerChainId[STAKING_CHAIN_ID].decimals)
  //     : undefined;

  //   const valueToReceive = valueToReceiveRaw && formatAmountDisplay(valueToReceiveRaw);

  //   return (
  //     <OfferDetails>
  //       <RoundedImage title={option.title} url={option.iconUrl} size={24} />
  //       <div>
  //         <Text size={12} marginBottom={2} medium block>
  //           {option.title}
  //         </Text>
  //         {!!valueToReceive && (
  //           <Text size={16} medium>
  //             {valueToReceive} {plrDaoAssetPerChainId[STAKING_CHAIN_ID].symbol}
  //             {targetAssetPriceUsd && ` · ${formatAmountDisplay(+valueToReceiveRaw * targetAssetPriceUsd, '$', 2)}`}
  //           </Text>
  //         )}
  //       </div>
  //     </OfferDetails>
  //   );
  // };

  const renderRoute = (option: SelectOption) => (
    <RouteOption
      route={availableRoutes?.find((route) => route.id === option.value)}
      isChecked={selectedRoute?.value && selectedRoute?.value === option.value}
      cost={option.extension && formatAmountDisplay(option.extension, '$', 2)}
      fees={option?.fees && formatAmountDisplay(option.fees, '$', 2)}
      showActions
    />
  );

  const totalTokens = formatAmountDisplay(totalKeyBasedPLRTokens + totalSmartWalletPLRTokens);
  const tokenArray = hasEnoughPLRInPolygon && accounts.length == 1 ? [] : accounts;

  const preSelectFrom = useCallback(() => {
    const fromNetwork: Chain | undefined = supportedChains.find((chain) => chain.chainId === CHAIN_ID.POLYGON);
    const fromAsset = plrDaoAssetPerChainId[STAKING_CHAIN_ID];
    setAmount(formatAssetAmountInput(`${MAX_PLR_TOKEN_LIMIT}`, fromAsset.decimals));
    setSelectedFromAsset(fromAsset);
    if (fromNetwork) setSelectedFromNetwork(fromNetwork);
  }, [hasEnoughPLRInPolygon, selectedFromNetwork, selectedFromAsset]);

  if (!isNFTMember && hasEnoughPLRInPolygon && !selectedFromNetwork && !selectedFromAsset) {
    preSelectFrom();
  }

  const chain = accounts.length == 1 ? `${accounts[0].chainName} chain` : `${accounts.length} chains`;
  const wallet =
    totalKeyBasedPLRTokens > 0 && totalSmartWalletPLRTokens > 0
      ? '2 wallets'
      : totalKeyBasedPLRTokens > 0
      ? 'Wallet'
      : 'Smart Wallet';
  const selectedToChain = supportedChains.find((chain) => chain.chainId === CHAIN_ID.POLYGON);

  const renderOfferOption = (option: SelectOption) => (
    <OfferRoute
      option={option}
      isChecked={selectedOffer?.value && selectedOffer.value === option.value}
      availableOffers={availableOffers}
      targetAssetPriceUsd={targetAssetPriceUsd}
      selectedAccountType={selectedAccountType}
      selectedFromAsset={selectedFromAsset}
      selectedNetwork={selectedFromNetwork}
      exchnageRate={exchangeRateByChainId}
    />
  );

  if (isNFTMember) {
    return (
      <>
        {!hideTitle && <Title>Pillar DAO NFT Membership</Title>}
        <ContainerWrapper>
          <Container>
            <Text size={18} color={theme?.color?.text?.tokenValue}>
              Thank You!
            </Text>
            <br />
            <Text size={18} marginTop={2}>
              You are already a Pillar DAO member.
            </Text>
          </Container>
        </ContainerWrapper>
        {/* <UnstakeButton onClick={onUnstake}>Unstake</UnstakeButton> */}
      </>
    );
  }

  return (
    <>
      {!hideTitle && (
        <Title>{hasEnoughPLRInPolygon ? 'Pillar DAO NFT Membership' : 'Swap more assets to PLR on Polygon'}</Title>
      )}
      <ContainerWrapper>
        <Container>
          <Text size={16}>
            To become DAO member, you need to stake <Value>10,000 PLR</Value> tokens on Polygon.
          </Text>
          <HorizontalLine />
          {
            <Text size={14}>
              You have&nbsp;
              {hasEnoughPLR ? <Value>{totalTokens} PLR</Value> : <Total>{totalTokens} PLR</Total>}
              {' tokens '}
              {accounts.length > 0 ? `on ${chain} on ${wallet}` : ''}
            </Text>
          }
          {'\n'}
          {tokenArray.map(({ chainId, chainName, keyBasedWallet, smartWallet }) => (
            <Text size={12}>
              {keyBasedWallet > 0 && (
                <Block
                  color={
                    chainId === CHAIN_ID.POLYGON
                      ? keyBasedWallet < MAX_PLR_TOKEN_LIMIT
                        ? theme?.color?.text?.tokenTotal
                        : theme?.color?.text?.tokenValue
                      : ''
                  }
                >
                  {`\u25CF`}
                  <Bold>{formatAmountDisplay(keyBasedWallet)} PLR</Bold> on <Bold>{chainName}</Bold> on{' '}
                  <Bold>Wallet</Bold>
                </Block>
              )}
              {smartWallet > 0 && (
                <Block
                  color={
                    chainId === CHAIN_ID.POLYGON
                      ? smartWallet < MAX_PLR_TOKEN_LIMIT
                        ? theme?.color?.text?.tokenTotal
                        : theme?.color?.text?.tokenValue
                      : ''
                  }
                >
                  {`\u25CF`}
                  <Bold>{formatAmountDisplay(smartWallet)} PLR</Bold> on <Bold>{chainName}</Bold> on{' '}
                  <Bold> Smart Wallet</Bold>
                </Block>
              )}
            </Text>
          ))}
        </Container>
      </ContainerWrapper>
      <>
        <AccountSwitchInput
          label="From wallet"
          selectedAccountType={selectedAccountType}
          onChange={(accountType) => {
            setSelectedFromNetwork(null);
            setSelectedFromAsset(null);
            setSelectedAccountType(accountType);
            setSelectedReceiveAccountType(accountType);
            setAvailableOffers([]);
            setSelectedOffer(null);
          }}
          hideKeyBased={smartWalletOnly}
          errorMessage={errorMessages?.accountType}
          showTotals
          showHelperText
        />
        <NetworkAssetSelectInput
          label="From"
          onAssetSelect={(asset, amountBN) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
            resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetAddress');
            resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetSymbol');
            resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetDecimals');
            setSelectedFromAsset(asset);
            if (
              hasEnoughPLRInPolygon &&
              selectedFromNetwork?.chainId === CHAIN_ID.POLYGON &&
              asset?.symbol === plrDaoAssetPerChainId[STAKING_CHAIN_ID].symbol
            ) {
              setAmount(formatAssetAmountInput(`${MAX_PLR_TOKEN_LIMIT}`, asset.decimals));
              return;
            }
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
        />
        <NetworkAssetSelectInput
          label="To"
          selectedNetwork={selectedToChain}
          selectedAsset={toAsset}
          readOnly={true}
          walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
        />
        {!!selectedFromAsset && !!selectedFromNetwork && (enableAssetBridge || enableAssetSwap) && (
          <TextInput
            label="You swap"
            onValueChange={onAmountChange}
            value={amount}
            placeholder="0"
            inputBottomText={
              selectedFromAsset?.assetPriceUsd && amount
                ? formatAmountDisplay(+amount * selectedFromAsset.assetPriceUsd, '$')
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
            disabled={!!fixed}
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
        {enableAssetSwap && !!selectedFromAsset && !!amount && (
          <SelectInput
            label={`Offer`}
            options={availableOffersOptions ?? []}
            isLoading={isLoadingAvailableOffers}
            selectedOption={selectedOffer}
            onOptionSelect={(option) => {
              resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
              setSelectedOffer(option);
            }}
            renderOptionListItemContent={renderOfferOption}
            renderSelectedOptionContent={renderOfferOption}
            placeholder="Select offer"
            errorMessage={errorMessages?.offer}
          />
        )}
        {enableAssetBridge && !!selectedFromAsset && !!amount && (remainingSelectedFromAssetBalance ?? 0) >= 0 && (
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
            renderOptionListItemContent={renderRoute}
            renderSelectedOptionContent={renderRoute}
            errorMessage={errorMessages?.route}
            disabled={!availableRoutesOptions?.length || isLoadingAvailableRoutes}
            noOpen={!!selectedRoute && availableRoutesOptions?.length === 1}
            forceShow={!!availableRoutesOptions?.length && availableRoutesOptions?.length > 1 && !selectedRoute}
            isOffer
          />
        )}
      </>
    </>
  );
};

export default PlrDaoStakingTransactionBlock;

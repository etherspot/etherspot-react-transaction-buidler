import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountTypes, ExchangeOffer } from 'etherspot';
import { ethers } from 'ethers';
import debounce from 'debounce-promise';
import { Route } from '@lifi/sdk';

// types
import { IPlrDaoStakingMembershipBlock } from '../../types/transactionBlock';

// components
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import { Pill, Text } from '../Text';
import AccountSwitchInput from '../AccountSwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import { CombinedRoundedImages, RoundedImage } from '../Image';
import RouteOption from '../RouteOption';

// providers
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';

// utils
import { formatAmountDisplay, formatMaxAmount, formatAssetAmountInput } from '../../utils/common';
import { addressesEqual, isValidEthereumAddress, isValidAmount } from '../../utils/validation';
import { Chain, supportedChains, plrDaoMemberNFT, CHAIN_ID } from '../../utils/chain';
import { plrDaoAsset } from '../../utils/asset';
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
  isPolygonAccountWithEnoughPLR: boolean;
  enableAssetBridge: boolean;
  enableAssetSwap: boolean;
  route?: Route;
}

interface AccountBalance {
  chainId: number;
  chainName: string;
  keyBasedWallet: number;
  smartWallet: number;
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
  display: flex;
  flex-direction: row;
  align-items: center;
  font-family: 'PTRootUIWebMedium', sans-serif;
`;

const Container = styled.div`
  align-items: center;
  font-family: 'PTRootUIWebMedium', sans-serif;
  background: ${({ theme }) => theme.color.background.tokenBalanceContainer};
  color: ${({ theme }) => theme.color.text.tokenBalance};
  padding: 16px;
  margin: 5px;
  border-image: linear-gradient(#346ecd, #cd34a2) 30;
  border-width: 2px;
  border-style: solid;
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
  height: 2px;
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
  return {
    title: firstStep?.toolDetails?.name ?? serviceDetails?.title ?? 'LiFi',
    value: route.id,
    iconUrl: firstStep?.toolDetails?.logoURI ?? serviceDetails?.iconUrl,
  };
};

const MAX_PLR_TOKEN_LIMIT = 10000;

const PlrDaoStakingTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  values,
  multiCallData,
}: IPlrDaoStakingMembershipBlock) => {
  const { smartWalletOnly, providerAddress, accountAddress, sdk, getSupportedAssetsWithBalancesForChainId } =
    useEtherspot();

  const [amount, setAmount] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<SelectOption | null>(
    values?.offer ? mapOfferToOption(values?.offer) : null,
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

  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [isNFTMember, setIsNFTMember] = useState<boolean>(false);

  const hasEnoughPLR =
    totalKeyBasedPLRTokens >= MAX_PLR_TOKEN_LIMIT || totalSmartWalletPLRTokens >= MAX_PLR_TOKEN_LIMIT;
  const isPolygonAccountWithEnoughPLR = accounts.some(
    (account) =>
      account.chainId === CHAIN_ID.POLYGON &&
      selectedFromNetwork?.chainId === CHAIN_ID.POLYGON &&
      selectedFromAsset?.symbol === 'PLR' &&
      ((selectedAccountType === DestinationWalletEnum.Contract && account.smartWallet >= MAX_PLR_TOKEN_LIMIT) ||
        (selectedAccountType === DestinationWalletEnum.Key && account.keyBasedWallet >= MAX_PLR_TOKEN_LIMIT))
  );
  const enableAssetBridge = selectedFromNetwork?.chainId !== CHAIN_ID.POLYGON && selectedFromAsset?.symbol === 'PLR';
  const enableAssetSwap = selectedFromAsset?.symbol !== 'PLR';
  const toAsset = isPolygonAccountWithEnoughPLR ? plrDaoMemberNFT : plrDaoAsset;

  const targetAssetPriceUsd = useAssetPriceUsd(toAsset.chainId, toAsset.address);

  const theme: Theme = useTheme();

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
    defaultSelectedReceiveAccountType,
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
        if (routes.length === 1) setSelectedRoute(mapRouteToOption(routes[0]));
      } catch (e) {
        setTransactionBlockFieldValidationError(transactionBlockId, 'route', 'Cannot fetch routes');
      }

      setIsLoadingAvailableRoutes(false);
    }, 200),
    [sdk, selectedFromAsset, amount, selectedFromNetwork]
  );

  useEffect(() => {
    updateAvailableRoutes();
  }, [updateAvailableRoutes]);

  const getWalletBalance = async (chainId: number, name: string) => {
    try {
      const accountsBalances = await Promise.all(
        [accountAddress, providerAddress].map(async (address) => {
          return await getSupportedAssetsWithBalancesForChainId(chainId, true, address);
        }),
      );
      let smartWalletBalance = 0;
      let keyBasedBalance = 0;
      accountsBalances[0]?.forEach(({ symbol, decimals, balance }) => {
        if (symbol == plrDaoAsset.symbol) {
          smartWalletBalance += +ethers.utils.formatUnits(balance, decimals);
        }
      });
      accountsBalances[1]?.forEach(({ symbol, decimals, balance }) => {
        if (symbol == plrDaoAsset.symbol) {
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

  const fetchAllAccountBalances = async () => {
    try {
      const filteredSupportedChains = supportedChains.filter((chain) =>
        [CHAIN_ID.ETHEREUM_MAINNET, CHAIN_ID.POLYGON, CHAIN_ID.XDAI, CHAIN_ID.BINANCE].includes(chain.chainId)
      );
      let accountBalanceWithSupportedChains: AccountBalance[] = await Promise.all(
        filteredSupportedChains.map((chain) => getWalletBalance(chain.chainId, chain.title)),
      );
      accountBalanceWithSupportedChains = accountBalanceWithSupportedChains?.filter(
        (data: AccountBalance) => data.keyBasedWallet > 0 || data.smartWallet > 0,
      );

      const totalKeyBasedPLRTokens = getTotal(accountBalanceWithSupportedChains as AccountBalance[], 'keyBasedWallet');
      const totalSmartWalletPLRTokens = getTotal(accountBalanceWithSupportedChains as AccountBalance[], 'smartWallet');

      setTotalKeyBasedPLRTokens(totalKeyBasedPLRTokens);
      setTotalSmartWalletPLRTokens(totalSmartWalletPLRTokens);
      setAccounts(accountBalanceWithSupportedChains);
    } catch (e) {
      //
    }
  };

  useEffect(() => {
    // Fetch token balance for all the chains
    fetchAllAccountBalances();
  }, []);

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
        if (!accountAddress) await sdk.computeContractAccount();
        const offers = await sdk.getExchangeOffers({
          fromChainId: selectedFromAsset.chainId,
          fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
          toTokenAddress: toAsset.address,
          fromTokenAddress: selectedFromAsset.address,
        });
        return offers;
      } catch (e) {
        setTransactionBlockFieldValidationError(transactionBlockId, 'offer', 'Cannot fetch offers');
      }
    }, 200),
    [sdk, selectedFromAsset, amount, selectedFromNetwork, accountAddress, selectedAccountType],
  );

  const getNftList = async () => {
    try {
      if (!accountAddress || !providerAddress || !sdk) return;
      const output = await sdk.getNftList({
        account: accountAddress || providerAddress,
      });
      let hasNFTContractAddress = output?.items?.filter((nft) => nft.contractAddress === plrDaoMemberNFT.address);
      if (hasNFTContractAddress?.length) {
        setIsNFTMember(true);
      }
    } catch (error) {
      //
    }
  };

  useEffect(() => {
    // Fetch a list of NFTs for the account to check if the user is existing member of PLR Dao.
    getNftList();
  }, [getNftList]);

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
          (offer) => offer.provider === swapServiceIdToDetails['Lifi'].title,
        );
        const selectedOffer = bestOffer?.provider ? bestOffer : offers[0];
        setSelectedOffer(mapOfferToOption(selectedOffer));
      } catch (e) {}
    };
    update();
    return () => {
      active = false;
    };
  }, [updateAvailableOffers]);

  const availableOffersOptions = useMemo(() => availableOffers?.map(mapOfferToOption), [availableOffers]);

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
      hasEnoughPLR,
      enableAssetBridge,
      enableAssetSwap,
      isPolygonAccountWithEnoughPLR,
      fromChainId: selectedFromNetwork?.chainId ?? undefined,
      toAsset,
      fromAsset: selectedFromAsset ?? undefined,
      amount,
      offer,
      accountType: selectedAccountType,
      receiverAddress: receiverAddress ?? undefined,
      route
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

  const RenderOption = (option: SelectOption) => {
    const availableOffer = availableOffers?.find((offer) => offer.provider === option.value);

    const valueToReceiveRaw = availableOffer
      ? ethers.utils.formatUnits(availableOffer.receiveAmount, plrDaoAsset.decimals)
      : undefined;

    const valueToReceive = valueToReceiveRaw && formatAmountDisplay(valueToReceiveRaw);

    return (
      <OfferDetails>
        <RoundedImage title={option.title} url={option.iconUrl} size={24} />
        <div>
          <Text size={12} marginBottom={2} medium block>
            {option.title}
          </Text>
          {!!valueToReceive && (
            <Text size={16} medium>
              {valueToReceive} {plrDaoAsset.symbol}
              {targetAssetPriceUsd && ` · ${formatAmountDisplay(+valueToReceiveRaw * targetAssetPriceUsd, '$')}`}
            </Text>
          )}
        </div>
      </OfferDetails>
    );
  };

  const renderRoute = (option: SelectOption) => (
    <RouteOption
      route={availableRoutes?.find((route) => route.id === option.value)}
      isChecked={selectedRoute?.value && selectedRoute?.value === option.value}
    />
  );

  const totalTokens = formatAmountDisplay(totalKeyBasedPLRTokens + totalSmartWalletPLRTokens);
  const tokenArray = hasEnoughPLR ? [] : accounts;

  if (isNFTMember) {
    return (
      <>
        <Title>Pillar DAO Membership</Title>
        <Container>
          <Text size={16}>Thank You!. You are already a Pillar DAO member.</Text>
        </Container>
      </>
    );
  }

  const chain = accounts.length == 1 ? `${accounts[0].chainName} chain` : `${accounts.length} chains`;
  const wallet =
    totalKeyBasedPLRTokens > 0 && totalSmartWalletPLRTokens > 0
      ? '2 wallets'
      : totalKeyBasedPLRTokens > 0
      ? 'Key Based'
      : 'Smart Wallet';
  const selectedToChain = supportedChains.find((chain) => chain.chainId === CHAIN_ID.POLYGON);
  const stakingBalance = isPolygonAccountWithEnoughPLR ? `${MAX_PLR_TOKEN_LIMIT}` : '';

  return (
    <>
      <Title>Stake into Pillar DAO</Title>
      <Container>
        <Text size={16}>
          To become DAO member, you need to stake <Value>10,000 PLR</Value> tokens on Polygon.
        </Text>
        <HorizontalLine></HorizontalLine>
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
            {<Block></Block>}
            {keyBasedWallet > 0 && (
              <Block
                color={
                  chainId === CHAIN_ID.POLYGON && keyBasedWallet < MAX_PLR_TOKEN_LIMIT
                    ? theme?.color?.text?.tokenTotal
                    : ''
                }
              >
                {`\u25CF`}
                <Bold>{formatAmountDisplay(keyBasedWallet)} PLR</Bold> on <Bold>{chainName}</Bold> on{' '}
                <Bold> Keybased Wallet</Bold>
              </Block>
            )}
            {smartWallet > 0 && (
              <Block
                color={
                  chainId === CHAIN_ID.POLYGON && smartWallet < MAX_PLR_TOKEN_LIMIT
                    ? theme?.color?.text?.tokenTotal
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
      <>
        <AccountSwitchInput
          label="From wallet"
          selectedAccountType={selectedAccountType}
          onChange={(accountType) => {
            setSelectedAccountType(accountType);
            setAvailableOffers([]);
            setSelectedOffer(null);
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
            setAmount(amountBN && !stakingBalance ? formatMaxAmount(amountBN, asset.decimals) : stakingBalance);
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
          disabled={true}
          walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
        />
        {!!selectedFromAsset && !!selectedFromNetwork && !isPolygonAccountWithEnoughPLR && (
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
        {!enableAssetBridge && !!selectedFromAsset && !!amount && (
          <SelectInput
            label={`Offer`}
            options={availableOffersOptions ?? []}
            isLoading={isLoadingAvailableOffers}
            disabled={true}
            selectedOption={selectedOffer}
            onOptionSelect={(option) => {
              resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
              setSelectedOffer(option);
            }}
            renderOptionListItemContent={RenderOption}
            renderSelectedOptionContent={RenderOption}
            placeholder="Select offer"
            errorMessage={errorMessages?.offer}
          />
        )}
        {!isPolygonAccountWithEnoughPLR &&
          enableAssetBridge &&
          !!selectedFromAsset &&
          !!amount &&
          (remainingSelectedFromAssetBalance ?? 0) >= 0 && (
            <SelectInput
              label={`Route`}
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
              forceShow={!!availableRoutesOptions?.length && availableRoutesOptions?.length > 1}
            />
          )}
      </>
    </>
  );
};

export default PlrDaoStakingTransactionBlock;

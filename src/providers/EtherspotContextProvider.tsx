import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AccountTypes,
  EnvNames as EtherspotEnvNames,
  isWalletProvider,
  Sdk as EtherspotSdk,
  SessionStorage,
  WalletProviderLike,
  Web3WalletProvider,
  RateData,
  NftCollection,
  WalletConnectWalletProvider,
  ENSNode,
  Transactions,
  AccountBalance,
} from 'etherspot';
import {
  useEtherspot,
  useEtherspotAssets,
  useEtherspotBalances,
  useEtherspotNfts,
  useEtherspotPrices,
  useEtherspotTransactions,
  useEtherspotUtils,
  useWalletAddress,
} from '@etherspot/transaction-kit';
import { BigNumber, ethers } from 'ethers';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';

import { EtherspotContext } from '../contexts';
import { Chain, CHAIN_ID, MAINNET_CHAIN_ID, nativeAssetPerChainId, supportedChains } from '../utils/chain';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { isCaseInsensitiveMatch, isNativeAssetAddress } from '../utils/validation';
import { sessionStorageInstance } from '../services/etherspot';
import { isEtherspotPrime, sumAssetsBalanceWorth } from '../utils/common';
import { Theme } from '../utils/theme';
import { ETHERSPOT_PRIME } from '../constants/globalConstants';

import { ICrossChainAction } from '../types/crossChainAction';

export type IAsset = TokenListToken;

export type IAssetWithBalance = IAsset & {
  balance: BigNumber;
  assetPriceUsd: number | null;
  balanceWorthUsd: number | null;
};

export interface ITotalWorthPerAddress {
  [address: string]: number;
}

export interface IBalanceByChain {
  total: number;
  title: string;
  chain: number;
}

let sdkPerChain: { [chainId: number]: EtherspotSdk | null } = {};
export interface IAllChainTransactions {
  [chain: number]: [];
}
let supportedAssetsPerChainId: { [chainId: number]: IAsset[] } = {};
let gasTokenAddressesPerChainId: { [chainId: number]: string[] } = {};

interface IWalletConnectProvider<T> {
  isWalletConnect?: boolean;
}

const EtherspotContextProvider = ({
  children,
  provider: defaultProvider,
  chainId: defaultChainId = 1,
  etherspotSessionStorage,
  onLogout,
  smartWalletOnly = false,
  changeTheme,
  etherspotMode,
}: {
  children: ReactNode;
  provider: WalletProviderLike;
  changeTheme: (theme: Theme) => void;
  chainId?: number;
  etherspotSessionStorage?: SessionStorage | undefined;
  onLogout?: () => void;
  smartWalletOnly?: boolean;
  etherspotMode?: string;
}) => {
  const context = useContext(EtherspotContext);
  const { providerWalletAddress, connect: walletConnect } = useEtherspot();
  const { getAssets } = useEtherspotAssets();
  const { getAccountBalances } = useEtherspotBalances();
  const { getPrices, getPrice } = useEtherspotPrices();
  const { isZeroAddress, addressesEqual } = useEtherspotUtils();
  const { getAccountNfts } = useEtherspotNfts();
  const { chainId: walletChainId, getEtherspotPrimeSdkForChainId } = useEtherspotTransactions();
  const primeAccountAddress = useWalletAddress(
    ETHERSPOT_PRIME,
    isEtherspotPrime(etherspotMode) ? walletChainId : undefined
  );

  if (context !== null) {
    throw new Error('<EtherspotContextProvider /> has already been declared.');
  }

  const sessionStorage = etherspotSessionStorage ?? sessionStorageInstance;

  const [accountAddress, setAccountAddress] = useState<string | null | undefined>(null);
  const [providerAddress, setProviderAddress] = useState<string | null | undefined>(null);
  const [chainId, setChainId] = useState<number>(defaultChainId);
  const [provider, setProvider] = useState<WalletProviderLike | Web3WalletProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(false);
  const [totalWorthPerAddress] = useState<ITotalWorthPerAddress>({});
  const [smartWalletBalanceByChain, setSmartWalletBalanceByChain] = useState<IBalanceByChain[]>([]);
  const [keyBasedWalletBalanceByChain, setKeyBasedWalletBalanceByChain] = useState<IBalanceByChain[]>([]);
  const [environment, setEnvironment] = useState<EtherspotEnvNames>(EtherspotEnvNames.MainNets);

  // map from generic web3 provider if needed
  const setMappedProvider = useCallback(async () => {
    if (!defaultProvider) return;

    if (isWalletProvider(defaultProvider)) {
      setProvider(defaultProvider);
      return;
    }

    if ((defaultProvider as IWalletConnectProvider<Web3WalletProvider>).isWalletConnect) {
      const walletConnectProvider = WalletConnectWalletProvider.connect({
        // @ts-ignore
        ...defaultProvider,
        signPersonalMessage: async (params) => {
          // @ts-ignore
          return defaultProvider.signer.request({
            method: 'personal_sign',
            // @ts-ignore
            params: [params[0], params[1]],
          });
        },
      });
      setProvider(walletConnectProvider);
      return;
    }

    // @ts-ignore
    const mappedProvider = new Web3WalletProvider(defaultProvider);
    await mappedProvider.refresh();
    setProvider(mappedProvider);
  }, [defaultProvider]);

  useEffect(() => {
    setMappedProvider();
  }, [setMappedProvider]);

  useEffect(() => {
    if (isEtherspotPrime(etherspotMode) && primeAccountAddress && providerWalletAddress) {
      setAccountAddress(primeAccountAddress);
      setProviderAddress(providerWalletAddress);
    }
  }, [primeAccountAddress, providerWalletAddress]);

  useEffect(() => {
    if (isEtherspotPrime(etherspotMode)) {
      setChainId(walletChainId);
    }
  }, [walletChainId]);

  const getSdkForChainId = useCallback(
    (sdkChainId: number, forceNewInstance: boolean = false) => {
      if (sdkPerChain[sdkChainId] && !forceNewInstance) return sdkPerChain[sdkChainId];

      if (!provider) return null;

      const networkName = CHAIN_ID_TO_NETWORK_NAME[sdkChainId];
      const mainnetIds = Object.values(MAINNET_CHAIN_ID);
      const envName = mainnetIds.includes(sdkChainId) ? EtherspotEnvNames.MainNets : EtherspotEnvNames.TestNets;

      if (!networkName) return null;

      const sdkForChain = new EtherspotSdk(provider as WalletProviderLike, {
        networkName,
        env: envName,
        sessionStorage,
        projectKey: '__ETHERSPOT_PROJECT_KEY__' || undefined,
        omitWalletProviderNetworkCheck: true,
      });

      sdkPerChain = {
        ...sdkPerChain,
        [sdkChainId]: sdkForChain,
      };
      return sdkForChain;
    },
    [provider]
  );

  const sdk = useMemo(() => {
    if (!chainId) return null;
    if (isEtherspotPrime(etherspotMode)) return getEtherspotPrimeSdkForChainId(chainId);
    return getSdkForChainId(chainId);
  }, [getSdkForChainId, getEtherspotPrimeSdkForChainId, chainId, environment]);

  const connect = useCallback(async () => {
    if (!sdk || isConnecting) return;
    setIsConnecting(true);

    try {
      if (isEtherspotPrime(etherspotMode)) {
        setIsConnecting(false);
        return walletConnect();
      }
      const computed = await (sdk as EtherspotSdk).computeContractAccount({ sync: true });
      setIsConnecting(false);
      return computed?.address;
    } catch (e) {
      console.error(e);
      //
    }

    setIsConnecting(false);
  }, [sdk, isConnecting]);

  useEffect(() => {
    if (!sdk || isEtherspotPrime(etherspotMode)) return;

    try {
      (sdk as EtherspotSdk).state$.subscribe(async (sdkState) => {
        if (sdkState?.account?.type === AccountTypes.Key) {
          setProviderAddress(sdkState.account.address);
          const sessionStorage = etherspotSessionStorage ?? sessionStorageInstance;

          try {
            const session = await sessionStorage.getSession(sdkState.account.address);
            if (isRestoringSession || !session || +new Date(session.expireAt) <= +new Date()) return;
            setIsRestoringSession(true);
            await (sdk as EtherspotSdk).computeContractAccount({ sync: true });
          } catch (e) {
            console.error(e);
            //
          }

          setIsRestoringSession(false);

          return;
        }
        if (sdkState?.account?.type === AccountTypes.Contract) {
          setAccountAddress(sdkState.account.address);
          return;
        }
      });
    } catch (e) {
      //
    }

    return () => {
      try {
        if ((sdk as EtherspotSdk)?.state$?.closed) return;
        // TODO: check why subscription in the above cannot be resubscribed
        // sdk.state$.unsubscribe();
      } catch (e) {
        //
      }
    };
  }, [sdk, isRestoringSession]);

  const getSupportedAssetsForChainId = useCallback(
    async (assetsChainId: number, force: boolean = false) => {
      const sdk =
        assetsChainId !== CHAIN_ID.AVALANCHE && isEtherspotPrime(etherspotMode)
          ? await getEtherspotPrimeSdkForChainId(assetsChainId)
          : getSdkForChainId(assetsChainId); // Preload SDK if not Avalanche

      if (!sdk) return [];

      if (!force && supportedAssetsPerChainId[assetsChainId]?.length) return supportedAssetsPerChainId[assetsChainId];

      let assets: TokenListToken[] = [];

      if (isEtherspotPrime(etherspotMode)) {
        try {
          assets = await getAssets();
        } catch (e) {
          console.error(e);
        }
      } else {
        const chainsToUseNewAssets = [
          CHAIN_ID.OPTIMISM,
          CHAIN_ID.ARBITRUM,
          CHAIN_ID.XDAI,
          CHAIN_ID.BINANCE,
          CHAIN_ID.ETHEREUM_MAINNET,
          CHAIN_ID.POLYGON,
          CHAIN_ID.OKTC,
        ];

        const mainnetIds = Object.values(MAINNET_CHAIN_ID);
        try {
          if (mainnetIds.includes(assetsChainId)) {
            assets = await (sdk as EtherspotSdk).getTokenListTokens({
              name: chainsToUseNewAssets.includes(assetsChainId) ? 'EtherspotPopularTokens' : 'PillarTokens',
            });
          } else {
            assets = await (sdk as EtherspotSdk).getTokenListTokens();
          }
        } catch (e) {
          console.error(e);
          //
        }
      }

      const nativeAsset = nativeAssetPerChainId[assetsChainId];
      const hasNativeAsset = assets.some(
        (asset) => !asset.address || addressesEqual(asset.address, nativeAssetPerChainId[chainId]?.address)
      );

      supportedAssetsPerChainId[assetsChainId] = hasNativeAsset || !nativeAsset ? assets : [nativeAsset, ...assets];

      return supportedAssetsPerChainId[assetsChainId];
    },
    [sdk]
  );

  const getAssetsBalancesForChainId = useCallback(
    async (
      assets: TokenListToken[],
      assetsChainId: number,
      balancesForAddress: string | null | undefined = accountAddress,
      recompute: boolean = true
    ) => {
      if (!sdk) return [];
      let computedAccount;
      if (!balancesForAddress && recompute) {
        try {
          computedAccount = await connect();
        } catch (e) {
          console.error(e);
          //
        }
      }

      if (!balancesForAddress && !computedAccount) return [];

      // 0x0...0 is default native token address in our assets, but it's not a ERC20 token
      const assetAddressesWithoutZero = assets
        .filter((asset) => !isZeroAddress(asset.address))
        .map((asset) => asset.address);

      let balances: AccountBalance[] = [];

      try {
        if (isEtherspotPrime(etherspotMode)) {
          balances = await getAccountBalances(balancesForAddress!);
        } else {
          const { items } = await (sdk as EtherspotSdk).getAccountBalances({
            account: balancesForAddress ?? computedAccount,
            chainId: assetsChainId,
          });
          balances = items;
        }

        return balances.filter((assetBalance) => {
          const { balance, token: balanceAssetAddress } = assetBalance;

          const supportedAsset = assets.find(({ symbol: supportedSymbol, address: supportedAddress }) => {
            // `token === null` means it's chain native token
            if (balanceAssetAddress === null)
              return isCaseInsensitiveMatch(supportedSymbol, nativeAssetPerChainId[assetsChainId]?.symbol);
            return addressesEqual(supportedAddress, balanceAssetAddress);
          });

          if (!supportedAsset) return false;

          return +ethers.utils.formatUnits(balance, supportedAsset.decimals) > 0;
        });
      } catch (e) {
        console.error(e);
        //
      }

      return [];
    },
    [sdk, accountAddress]
  );

  const getSupportedAssetsWithBalancesForChainId = useCallback(
    async (
      assetsChainId: number,
      positiveBalancesOnly: boolean = false,
      balancesForAddress: string | null | undefined = accountAddress,
      recompute: boolean = true
    ): Promise<IAssetWithBalance[]> => {
      const supportedAssets = await getSupportedAssetsForChainId(assetsChainId);
      const fromAssetsBalances = await getAssetsBalancesForChainId(
        supportedAssets,
        assetsChainId,
        balancesForAddress,
        recompute
      );

      // only get prices for assets with balances
      const assetsPrices = await getRatesByTokenAddresses(
        assetsChainId,
        fromAssetsBalances.map((asset) => asset.token)
      );

      const assetsWithBalances: IAssetWithBalance[] = await Promise.all(
        supportedAssets.map(async (asset) => {
          let balance = ethers.BigNumber.from(0);
          let assetPriceUsd = null;
          let balanceWorthUsd = null;

          try {
            const assetBalance = fromAssetsBalances.find((fromAssetBalance) => {
              if (isNativeAssetAddress(asset.address, assetsChainId) && fromAssetBalance.token === null) return true;
              return addressesEqual(asset.address, fromAssetBalance.token);
            });
            balance = assetBalance?.balance ?? ethers.BigNumber.from(0);

            if (!balance.isZero()) {
              assetPriceUsd = isNativeAssetAddress(asset.address, assetsChainId)
                ? await getRatesByNativeChainId(assetsChainId)
                : assetsPrices?.[asset.address] ?? null;
            }

            balanceWorthUsd = assetPriceUsd
              ? // isZero check to avoid underflow
                +ethers.utils.formatUnits(balance, asset.decimals) * assetPriceUsd
              : null;
          } catch (e) {
            console.error(e);
            //
          }

          return {
            ...asset,
            balance,
            assetPriceUsd,
            balanceWorthUsd,
          };
        })
      );

      return positiveBalancesOnly ? assetsWithBalances.filter((asset) => !asset.balance.isZero()) : assetsWithBalances;
    },
    [getSupportedAssetsForChainId, accountAddress, getAssetsBalancesForChainId]
  );

  const loadSmartWalletBalancesByChain = useCallback(
    async (walletAddress: string, supportedChains: Chain[]) => {
      if (!sdk || !walletAddress) return;
      const balanceByChain: IBalanceByChain[] = [];
      await Promise.all(
        supportedChains
          .filter(({ chainId }) => chainId !== CHAIN_ID.AVALANCHE)
          .map(async (chain) => {
            try {
              const supportedAssets = await getSupportedAssetsWithBalancesForChainId(
                chain.chainId,
                true,
                walletAddress,
                false
              );
              balanceByChain.push({
                title: chain.title,
                chain: chain.chainId,
                total: sumAssetsBalanceWorth(supportedAssets),
              });
            } catch (e) {
              console.error(e);
              //
            }
          })
      );
      setSmartWalletBalanceByChain(balanceByChain);
    },
    [sdk, accountAddress, getSupportedAssetsWithBalancesForChainId]
  );

  const loadKeyBasedWalletBalancesPerChain = useCallback(
    async (walletAddress: string, supportedChains: Chain[]) => {
      if (!sdk || !walletAddress) return;
      const balanceByChain: IBalanceByChain[] = [];
      await Promise.all(
        supportedChains
          .filter((element) => element.chainId !== CHAIN_ID.AVALANCHE)
          .map(async (element) => {
            try {
              const supportedAssets = await getSupportedAssetsWithBalancesForChainId(
                element.chainId,
                true,
                walletAddress,
                false
              );
              balanceByChain.push({
                title: element.title,
                chain: element.chainId,
                total: sumAssetsBalanceWorth(supportedAssets),
              });
            } catch (e) {
              console.error(e);
              //
            }
          })
      );
      setKeyBasedWalletBalanceByChain(balanceByChain);
    },
    [sdk, providerAddress, getSupportedAssetsWithBalancesForChainId]
  );

  const getRatesByTokenAddresses = async (chainId: number, tokenAddresses: string[]) => {
    const tokens = tokenAddresses.filter((address) => address !== null && !isZeroAddress(address));
    if (!sdk || !tokens.length) return null;

    try {
      if (!isEtherspotPrime(etherspotMode)) {
        const rates: RateData = await (sdk as EtherspotSdk).fetchExchangeRates({ tokens, chainId });
        if (rates.errored || !rates?.items?.length) return null;
        return rates.items.reduce<Record<string, number>>(
          (currentRates, rate) => ({
            ...currentRates,
            [rate.address]: rate.usd,
          }),
          {}
        );
      } else {
        const prices = await getPrices(tokens, chainId);
        if (!prices?.length) return null;
        return prices.reduce<Record<string, number>>(
          (currentRates, rate) => ({
            ...currentRates,
            [rate.address]: rate.usd,
          }),
          {}
        );
      }
    } catch (error) {
      console.error(error);
      //
    }
  };

  const getRatesByNativeChainId = async (chainId: number) => {
    if (!sdk) return null;
    try {
      if (!isEtherspotPrime(etherspotMode)) {
        const rates: RateData = await (sdk as EtherspotSdk).fetchExchangeRates({
          tokens: [ethers.constants.AddressZero],
          chainId,
        });
        if (!rates.errored && rates.items.length) {
          return rates.items[0].usd;
        }
      } else {
        const price = await getPrice(ethers.constants.AddressZero, chainId);
        if (price) {
          return price.usd;
        }
      }
    } catch (error) {
      console.error(error);
      //
    }

    return null;
  };

  const getGasAssetsForChainId = useCallback(
    async (assetsChainId: number, senderAddress?: string): Promise<IAssetWithBalance[]> => {
      const sdkForChainId = isEtherspotPrime(etherspotMode)
        ? await getEtherspotPrimeSdkForChainId(assetsChainId)
        : getSdkForChainId(assetsChainId);
      if (!sdkForChainId) return [];

      let gasAssets: IAssetWithBalance[] = [];

      try {
        if (!gasTokenAddressesPerChainId[assetsChainId]?.length) {
          const gasTokens = await (sdkForChainId as EtherspotSdk).getGatewaySupportedTokens();
          gasTokenAddressesPerChainId[assetsChainId] = gasTokens.map((gasToken) => gasToken.address);
        }

        const supportedAssetsWithBalances = await getSupportedAssetsWithBalancesForChainId(
          assetsChainId,
          true,
          senderAddress
        );

        gasAssets = supportedAssetsWithBalances.filter((supportedAsset) =>
          gasTokenAddressesPerChainId[assetsChainId].some(
            (gasTokenAddress) =>
              isZeroAddress(supportedAsset.address) || addressesEqual(gasTokenAddress, supportedAsset.address)
          )
        );
      } catch (e) {
        console.error(e);
        //
      }

      return gasAssets;
    },
    [getSdkForChainId, getEtherspotPrimeSdkForChainId, getSupportedAssetsWithBalancesForChainId]
  );

  // NFTs
  const getNftsForChainId = useCallback(
    async (
      chainId: number,
      address: string | null | undefined = accountAddress,
      recompute: boolean = true
    ): Promise<NftCollection[]> => {
      const sdk = isEtherspotPrime(etherspotMode)
        ? await getEtherspotPrimeSdkForChainId(chainId)
        : getSdkForChainId(chainId);

      if (!sdk) return [];
      let computedAccount;
      if (!address && recompute) {
        try {
          computedAccount = await connect();
        } catch (e) {
          console.error(e);
          //
        }
      }

      if (!address && !computedAccount) return [];

      try {
        let nfts;
        if (!isEtherspotPrime(etherspotMode)) {
          const { items } = await (sdk as EtherspotSdk).getNftList({
            account: address || computedAccount || '',
          });
          nfts = items;
        } else {
          nfts = await getAccountNfts(address || computedAccount || '');
        }

        return nfts?.filter((nft) => !!nft?.items?.length && nft);
      } catch (e) {
        console.error(e);
        //
      }

      return [];
    },
    [sdk, accountAddress]
  );

  // get transaction data for particular  chain
  const getTransactionsFromChain = useCallback(
    async (chainId: number, address: string | null): Promise<Transactions[]> => {
      const sdk = getSdkForChainId(chainId);
      const account = address;
      if (!!sdk && !account) return [];

      await sdk.computeContractAccount();
      try {
        let transactions: any = [];
        const txs = await sdk.getTransactions({ account });
        if (txs?.items) transactions = txs.items?.map((item) => ({ ...item, chainId }));
        return { transactions };
      } catch (e) {
        // error if fails to load tx data from sdk through any reasons
        console.error(e);
      }

      return [];
    },
    [sdk, accountAddress]
  );

  // get all transaction data and pass to tx history
  const getAllTransactions = useCallback(
    async (address: string | null): Promise<IAllChainTransactions[]> => {
      let tempTransactions: IAllChainTransactions = {};
      let tempTransactionsChanges = 0;

      await Promise.all(
        supportedChains.map(async (chain) => {
          try {
            let transactionsResult = await getTransactionsFromChain(chain.chainId, address);
            let chain_id = chain.chainId;
            if (transactionsResult?.transactions) {
              tempTransactions[chain_id] = transactionsResult.transactions;
              tempTransactionsChanges++;
            }
          } catch (e) {
            // error if fails to load tx data from any of chain through sdk
            console.error(e);
          }
        })
      );
      return { ...tempTransactions };
    },
    [getSdkForChainId, accountAddress, getTransactionsFromChain]
  );

  // get ENS Node
  const getEnsNode = useCallback(
    async (
      chainId: number,
      address: string | null | undefined = accountAddress,
      recompute: boolean = true
    ): Promise<ENSNode | null> => {
      const sdkForChain = getSdkForChainId(chainId);

      if (!sdkForChain) return null;

      let computedAccount;
      if (!address && recompute) {
        try {
          computedAccount = await connect();
        } catch (e) {
          console.error(e);
          //
        }
      }

      if (!address && !computedAccount) return null;

      try {
        const ens = await (sdkForChain as EtherspotSdk).getENSNode({
          nameOrHashOrAddress: address || computedAccount,
        });
        return ens;
      } catch (e) {
        console.error(e);
        //
      }

      return null;
    },
    [sdk, accountAddress]
  );

  const logout = useCallback(() => {
    sdkPerChain = {};
    setProvider(null);
    if (onLogout) onLogout();
  }, [setProvider, onLogout]);

  const updateWalletBalances = useCallback(
    async (force?: boolean) => {
      if (!sdk || !accountAddress) return;

      if (!!force || !smartWalletBalanceByChain.length) {
        await loadSmartWalletBalancesByChain(accountAddress, supportedChains);
      }

      if (!providerAddress) return;

      if (!!force || !keyBasedWalletBalanceByChain.length) {
        await loadKeyBasedWalletBalancesPerChain(providerAddress, supportedChains);
      }
    },
    [sdk, accountAddress, providerAddress, smartWalletBalanceByChain, keyBasedWalletBalanceByChain]
  );

  const contextData = useMemo(
    () => ({
      connect,
      isConnecting,
      accountAddress,
      sdk,
      chainId,
      setChainId,
      getSdkForChainId,
      getEtherspotPrimeSdkForChainId,
      smartWalletBalanceByChain,
      keyBasedWalletBalanceByChain,
      getSupportedAssetsForChainId,
      getAssetsBalancesForChainId,
      loadSmartWalletBalancesByChain,
      getSupportedAssetsWithBalancesForChainId,
      getNftsForChainId,
      getTransactionsFromChain,
      getAllTransactions,
      getEnsNode,
      providerAddress,
      web3Provider: provider,
      totalWorthPerAddress,
      logout,
      smartWalletOnly,
      setSmartWalletBalanceByChain,
      setKeyBasedWalletBalanceByChain,
      loadKeyBasedWalletBalancesPerChain,
      getGasAssetsForChainId,
      updateWalletBalances,
      getRatesByNativeChainId,
      changeTheme,
      environment,
      setEnvironment,
      etherspotMode,
    }),
    [
      connect,
      isConnecting,
      accountAddress,
      sdk,
      chainId,
      setChainId,
      getSdkForChainId,
      getEtherspotPrimeSdkForChainId,
      smartWalletBalanceByChain,
      keyBasedWalletBalanceByChain,
      getSupportedAssetsForChainId,
      getAssetsBalancesForChainId,
      loadSmartWalletBalancesByChain,
      getSupportedAssetsWithBalancesForChainId,
      getNftsForChainId,
      getTransactionsFromChain,
      getAllTransactions,
      getEnsNode,
      providerAddress,
      provider,
      totalWorthPerAddress,
      logout,
      smartWalletOnly,
      setSmartWalletBalanceByChain,
      setKeyBasedWalletBalanceByChain,
      loadKeyBasedWalletBalancesPerChain,
      getGasAssetsForChainId,
      updateWalletBalances,
      getRatesByNativeChainId,
      changeTheme,
      environment,
      setEnvironment,
      etherspotMode,
    ]
  );

  return <EtherspotContext.Provider value={{ data: contextData }}>{children}</EtherspotContext.Provider>;
};

export default EtherspotContextProvider;

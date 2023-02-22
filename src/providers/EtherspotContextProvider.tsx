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
} from 'etherspot';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';
import { BigNumber, ethers } from 'ethers';

import { EtherspotContext } from '../contexts';
import { Chain, CHAIN_ID, nativeAssetPerChainId, supportedChains } from '../utils/chain';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { addressesEqual, isCaseInsensitiveMatch, isNativeAssetAddress, isZeroAddress } from '../utils/validation';
import { sessionStorageInstance } from '../services/etherspot';
import { sumAssetsBalanceWorth } from '../utils/common';

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

let sdkPerChain: { [chainId: number]: EtherspotSdk } = {};
let supportedAssetsPerChainId: { [chainId: number]: IAsset[] } = {};
let gasTokenAddressesPerChainId: { [chainId: number]: string[] } = {};

const EtherspotContextProvider = ({
  children,
  provider: defaultProvider,
  chainId: defaultChainId = 1,
  etherspotSessionStorage,
  onLogout,
  smartWalletOnly = false,
}: {
  children: ReactNode;
  provider: WalletProviderLike;
  chainId?: number;
  etherspotSessionStorage?: SessionStorage;
  onLogout?: () => void;
  smartWalletOnly?: boolean;
}) => {
  const context = useContext(EtherspotContext);

  if (context !== null) {
    throw new Error('<EtherspotContextProvider /> has already been declared.');
  }

  const sessionStorage = etherspotSessionStorage ?? sessionStorageInstance;

  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [providerAddress, setProviderAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number>(defaultChainId);
  const [provider, setProvider] = useState<WalletProviderLike | Web3WalletProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(false);
  const [totalWorthPerAddress] = useState<ITotalWorthPerAddress>({});
  const [smartWalletBalanceByChain, setSmartWalletBalanceByChain] = useState<IBalanceByChain[]>([]);
  const [keyBasedWalletBalanceByChain, setKeyBasedWalletBalanceByChain] = useState<IBalanceByChain[]>([]);

  // map from generic web3 provider if needed
  const setMappedProvider = useCallback(async () => {
    if (!defaultProvider) return;

    if (isWalletProvider(defaultProvider)) {
      setProvider(defaultProvider);
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

  const getSdkForChainId = useCallback(
    (sdkChainId: number, forceNewInstance: boolean = false) => {
      if (sdkPerChain[sdkChainId] && !forceNewInstance) return sdkPerChain[sdkChainId];

      if (!provider) return null;

      const networkName = CHAIN_ID_TO_NETWORK_NAME[sdkChainId];
      const envName = EtherspotEnvNames.MainNets; // TODO: add testnet support

      if (!networkName) return null;

      const sdkForChain = new EtherspotSdk(provider, {
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

    return getSdkForChainId(chainId);
  }, [getSdkForChainId, chainId]);

  const connect = useCallback(async () => {
    if (!sdk || isConnecting) return;
    setIsConnecting(true);

    try {
      const computed = await sdk.computeContractAccount({ sync: true });
      setIsConnecting(false);
      return computed?.address;
    } catch (e) {
      //
    }

    setIsConnecting(false);
  }, [sdk, isConnecting]);

  useEffect(() => {
    if (!sdk) return;

    try {
      sdk.state$.subscribe(async (sdkState) => {
        if (sdkState?.account?.type === AccountTypes.Key) {
          setProviderAddress(sdkState.account.address);
          const sessionStorage = etherspotSessionStorage ?? sessionStorageInstance;

          try {
            const session = await sessionStorage.getSession(sdkState.account.address);
            if (isRestoringSession || !session || +new Date(session.expireAt) <= +new Date()) return;
            setIsRestoringSession(true);
            await sdk.computeContractAccount({ sync: true });
          } catch (e) {
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
        if (sdk?.state$?.closed) return;
        // TODO: check why subscription in the above cannot be resubscribed
        // sdk.state$.unsubscribe();
      } catch (e) {
        //
      }
    };
  }, [sdk, isRestoringSession]);

  const getSupportedAssetsForChainId = useCallback(
    async (assetsChainId: number, force: boolean = false) => {
      if (!sdk) return [];

      if (!force && supportedAssetsPerChainId[assetsChainId]?.length) return supportedAssetsPerChainId[assetsChainId];

      let assets: TokenListToken[] = [];

      let loadMoreAssets = true;
      let page = 1;
      while (loadMoreAssets) {
        try {
          const { items: paginatedAssets } = await sdk.getExchangeSupportedAssets({
            chainId: assetsChainId,
            limit: 100,
            page,
          });
          assets = [...assets, ...paginatedAssets];
          loadMoreAssets = paginatedAssets?.length === 100;
          page++;
        } catch (e) {
          loadMoreAssets = false;
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
      balancesForAddress: string | null = accountAddress,
      recompute: boolean = true
    ) => {
      if (!sdk) return [];
      let computedAccount;
      if (!balancesForAddress && recompute) {
        try {
          computedAccount = await connect();
        } catch (e) {
          //
        }
      }

      if (!balancesForAddress && !computedAccount) return [];

      // 0x0...0 is default native token address in our assets, but it's not a ERC20 token
      const assetAddressesWithoutZero = assets
        .filter((asset) => !isZeroAddress(asset.address))
        .map((asset) => asset.address);

      try {
        const { items: balances } = await sdk.getAccountBalances({
          account: balancesForAddress ?? computedAccount,
          tokens: assetAddressesWithoutZero,
          chainId: assetsChainId,
        });

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
      balancesForAddress: string | null = accountAddress,
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

      const assetsWithBalances = await Promise.all(
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
      let balanceByChain: IBalanceByChain[] = [];
      await Promise.all(
        supportedChains
          .filter(({ chainId }) => chainId !== CHAIN_ID.AVALANCHE)
          .map(async (chain) => {
            try {
              let supportedAssets = await getSupportedAssetsWithBalancesForChainId(
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
      let balanceByChain: IBalanceByChain[] = [];
      await Promise.all(
        supportedChains
          .filter((element) => element.chainId !== CHAIN_ID.AVALANCHE)
          .map(async (element) => {
            try {
              let supportedAssets = await getSupportedAssetsWithBalancesForChainId(
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
      const rates: RateData = await sdk.fetchExchangeRates({ tokens, chainId });
      if (rates.errored || !rates?.items?.length) return null;
      return rates.items.reduce<Record<string, number>>(
        (currentRates, rate) => ({
          ...currentRates,
          [rate.address]: rate.usd,
        }),
        {}
      );
    } catch (error) {
      //
    }
  };

  const getRatesByNativeChainId = async (chainId: number) => {
    if (!sdk) return null;
    try {
      const rates: RateData = await sdk.fetchExchangeRates({
        tokens: [ethers.constants.AddressZero],
        chainId,
      });
      if (!rates.errored && rates.items.length) {
        return rates.items[0].usd;
      }
    } catch (error) {
      //
    }

    return null;
  };

  const getGasAssetsForChainId = useCallback(
    async (assetsChainId: number, senderAddress?: string): Promise<IAssetWithBalance[]> => {
      const sdkForChainId = getSdkForChainId(assetsChainId);
      if (!sdkForChainId) return [];

      let gasAssets: IAssetWithBalance[] = [];

      try {
        if (!gasTokenAddressesPerChainId[assetsChainId]?.length) {
          const gasTokens = await sdkForChainId.getGatewaySupportedTokens();
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
        //
      }

      return gasAssets;
    },
    [getSdkForChainId, getSupportedAssetsWithBalancesForChainId]
  );

  // NFTs
  const getNftsForChainId = useCallback(
    async (
      chainId: number,
      address: string | null = accountAddress,
      recompute: boolean = true
    ): Promise<NftCollection[]> => {
      const sdk = getSdkForChainId(chainId);

      if (!sdk) return [];
      let computedAccount;
      if (!address && recompute) {
        try {
          computedAccount = await connect();
        } catch (e) {
          //
        }
      }

      if (!address && !computedAccount) return [];

      try {
        const { items: nfts } = await sdk.getNftList({
          account: address || computedAccount || '',
        });

        return nfts?.filter((nft) => !!nft?.items?.length && nft);
      } catch (e) {
        //
      }

      return [];
    },
    [sdk, accountAddress]
  );

  const logout = useCallback(() => {
    sdkPerChain = {};
    setProvider(null);
    setProviderAddress(null);
    setAccountAddress(null);
    if (onLogout) onLogout();
  }, [setProvider, setProviderAddress, setAccountAddress, onLogout]);

  useEffect(() => {
    const handleBalanceGet = async () => {
      if (!sdk || !accountAddress) return;
      await loadSmartWalletBalancesByChain(accountAddress, supportedChains);
    };
    handleBalanceGet();
  }, [supportedChains, sdk, accountAddress]);

  useEffect(() => {
    const handleKeybasedBalanceGet = async () => {
      const isSdkConnected = sdk && accountAddress;
      if (!isSdkConnected || !providerAddress) return;
      await loadKeyBasedWalletBalancesPerChain(providerAddress, supportedChains);
    };
    handleKeybasedBalanceGet();
  }, [supportedChains, sdk, providerAddress, accountAddress]);

  const contextData = useMemo(
    () => ({
      connect,
      isConnecting,
      accountAddress,
      sdk,
      chainId,
      setChainId,
      getSdkForChainId,
      smartWalletBalanceByChain,
      keyBasedWalletBalanceByChain,
      getSupportedAssetsForChainId,
      getAssetsBalancesForChainId,
      loadSmartWalletBalancesByChain,
      getSupportedAssetsWithBalancesForChainId,
      getNftsForChainId,
      providerAddress,
      web3Provider: provider,
      totalWorthPerAddress,
      logout,
      smartWalletOnly,
      setSmartWalletBalanceByChain,
      setKeyBasedWalletBalanceByChain,
      loadKeyBasedWalletBalancesPerChain,
      getGasAssetsForChainId,
    }),
    [
      connect,
      isConnecting,
      accountAddress,
      sdk,
      chainId,
      setChainId,
      getSdkForChainId,
      smartWalletBalanceByChain,
      keyBasedWalletBalanceByChain,
      getSupportedAssetsForChainId,
      getAssetsBalancesForChainId,
      loadSmartWalletBalancesByChain,
      getSupportedAssetsWithBalancesForChainId,
      getNftsForChainId,
      providerAddress,
      provider,
      totalWorthPerAddress,
      logout,
      smartWalletOnly,
      setSmartWalletBalanceByChain,
      setKeyBasedWalletBalanceByChain,
      loadKeyBasedWalletBalancesPerChain,
      getGasAssetsForChainId,
    ]
  );

  return <EtherspotContext.Provider value={{ data: contextData }}>{children}</EtherspotContext.Provider>;
};

export default EtherspotContextProvider;

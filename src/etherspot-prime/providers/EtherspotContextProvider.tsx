/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  SessionStorage,
  NftCollection,
  isWalletProvider,
  WalletConnectWalletProvider,
  Web3WalletProvider,
} from '@etherspot/prime-sdk';
import { ENSNode, WalletProviderLike } from 'etherspot';

import { BigNumber, ethers } from 'ethers';

import { EtherspotContext } from '../contexts';
import { CHAIN_ID, Chain, nativeAssetPerChainId, supportedChains } from '../utils/chain';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { isCaseInsensitiveMatch, isNativeAssetAddress } from '../utils/validation';
import { sumAssetsBalanceWorth } from '../utils/common';
import { Theme } from '../utils/theme';
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

const supportedAssetsPerChainId: { [chainId: number]: IAsset[] } = {};
// const gasTokenAddressesPerChainId: { [chainId: number]: string[] } = {};

interface IWalletConnectProvider<T> {
  isWalletConnect?: boolean;
}

const EtherspotPrimeContextProvider = ({
  children,
  provider: defaultProvider,
  onLogout,
  smartWalletOnly = false,
  changeTheme,
}: {
  children: ReactNode;
  provider: WalletProviderLike;
  changeTheme: (theme: Theme) => void;
  chainId?: number;
  etherspotSessionStorage?: SessionStorage;
  onLogout?: () => void;
  smartWalletOnly?: boolean;
}) => {
  const context = useContext(EtherspotContext);
  const { providerWalletAddress: providerAddress, connect } = useEtherspot();
  const { getAssets } = useEtherspotAssets();
  const { getAccountBalances } = useEtherspotBalances();
  const { getPrices, getPrice } = useEtherspotPrices();
  const { isZeroAddress, addressesEqual } = useEtherspotUtils();
  const { getAccountNfts } = useEtherspotNfts();
  const { chainId, getEtherspotPrimeSdkForChainId: getSdkForChainId } = useEtherspotTransactions();
  const accountAddress = useWalletAddress('etherspot-prime', chainId);

  if (context !== null) {
    throw new Error('<EtherspotPrimeContextProvider /> has already been declared.');
  }

  const [provider, setProvider] = useState<WalletProviderLike | Web3WalletProvider | null>(null);
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

  const sdk = useMemo(() => {
    if (!chainId) return null;
    return getSdkForChainId(chainId);
  }, [getSdkForChainId, chainId]);

  const getSupportedAssetsForChainId = useCallback(
    async (assetsChainId: number, force: boolean = false) => {
      const sdk = await getSdkForChainId(assetsChainId); // Preload SDK if not Avalanche

      if (!sdk) return [];

      if (!force && supportedAssetsPerChainId[assetsChainId]?.length) return supportedAssetsPerChainId[assetsChainId];

      const assets = await getAssets();

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
      balancesForAddress: string | undefined = accountAddress,
      recompute: boolean = true
    ) => {
      const primeSdk = await sdk;
      if (!primeSdk) return [];

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
      // const assetAddressesWithoutZero = assets
      //   .filter((asset) => !isZeroAddress(asset.address))
      //   .map((asset) => asset.address);

      try {
        const balances = await getAccountBalances(balancesForAddress);

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
      balancesForAddress: string | undefined = accountAddress,
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
      const prices = await getPrices(tokens, chainId);
      if (!prices?.length) return null;
      return prices.reduce<Record<string, number>>(
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
      const price = await getPrice(ethers.constants.AddressZero, chainId);
      if (price) {
        return price.usd;
      }
    } catch (error) {
      //
    }

    return null;
  };

  const getGasAssetsForChainId = useCallback(
    async (assetsChainId: number, senderAddress?: string): Promise<IAssetWithBalance[]> => {
      const sdkForChainId = await getSdkForChainId(assetsChainId);
      if (!sdkForChainId) return [];

      let gasAssets: IAssetWithBalance[] = [];

      try {
        // if (!gasTokenAddressesPerChainId[assetsChainId]?.length) {
        //   const gasTokens = await sdkForChainId.getGatewaySupportedTokens();
        //   gasTokenAddressesPerChainId[assetsChainId] = gasTokens.map((gasToken) => gasToken.address);
        // }
        // const supportedAssetsWithBalances = await getSupportedAssetsWithBalancesForChainId(
        //   assetsChainId,
        //   true,
        //   senderAddress
        // );
        // gasAssets = supportedAssetsWithBalances.filter((supportedAsset) =>
        //   gasTokenAddressesPerChainId[assetsChainId].some(
        //     (gasTokenAddress) =>
        //       isZeroAddress(supportedAsset.address) || addressesEqual(gasTokenAddress, supportedAsset.address)
        //   )
        // );
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
      address: string | undefined = accountAddress,
      recompute: boolean = true
    ): Promise<NftCollection[]> => {
      const sdk = await getSdkForChainId(chainId);

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
        const nfts = await getAccountNfts(address || computedAccount || '');

        return nfts?.filter((nft) => !!nft?.items?.length && nft);
      } catch (e) {
        //
      }

      return [];
    },
    [sdk, accountAddress]
  );

  // get ENS Node
  const getEnsNode = useCallback(
    async (
      chainId: number,
      address: string | undefined = accountAddress,
      recompute: boolean = true
    ): Promise<ENSNode | null> => {
      const sdkForChain = await getSdkForChainId(chainId);

      if (!sdkForChain) return null;

      let computedAccount;
      if (!address && recompute) {
        try {
          computedAccount = await connect();
        } catch (e) {
          //
        }
      }

      if (!address && !computedAccount) return null;

      try {
        // const ens = await sdkForChain.getENSNode({
        //   nameOrHashOrAddress: address || computedAccount,
        // });
        // return ens;
      } catch (e) {
        //
      }

      return null;
    },
    [sdk, accountAddress]
  );

  const logout = useCallback(() => {
    if (onLogout) onLogout();
  }, [onLogout]);

  const updateWalletBalances = useCallback(
    async (force?: boolean) => {
      const primeSdk = await sdk;
      if (!primeSdk || !accountAddress) return;

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
      accountAddress,
      sdk,
      chainId,
      getSdkForChainId,
      smartWalletBalanceByChain,
      keyBasedWalletBalanceByChain,
      getSupportedAssetsForChainId,
      getAssetsBalancesForChainId,
      loadSmartWalletBalancesByChain,
      getSupportedAssetsWithBalancesForChainId,
      getNftsForChainId,
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
    }),
    [
      connect,
      accountAddress,
      sdk,
      chainId,
      getSdkForChainId,
      smartWalletBalanceByChain,
      keyBasedWalletBalanceByChain,
      getSupportedAssetsForChainId,
      getAssetsBalancesForChainId,
      loadSmartWalletBalancesByChain,
      getSupportedAssetsWithBalancesForChainId,
      getNftsForChainId,
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
    ]
  );

  return <EtherspotContext.Provider value={{ data: contextData }}>{children}</EtherspotContext.Provider>;
};

export default EtherspotPrimeContextProvider;

import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AccountTypes,
  EnvNames as EtherspotEnvNames,
  isWalletProvider,
  Sdk as EtherspotSdk,
  SessionStorage,
  WalletProviderLike,
  Web3WalletProvider,
} from 'etherspot';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';
import {
  BigNumber,
  ethers,
} from 'ethers';

import { EtherspotContext } from '../contexts';
import {
  nativeAssetPerChainId,
} from '../utils/chain';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import {
  addressesEqual,
  isCaseInsensitiveMatch,
  isNativeAssetAddress,
  isZeroAddress,
} from '../utils/validation';
import { sessionStorageInstance } from '../services/etherspot';
import {
  getAssetPriceKeyByAddress,
  getAssetsPrices,
  getNativeAssetPriceInUsd,
} from '../services/coingecko';

export type IAsset = TokenListToken;

export type IAssetWithBalance = IAsset & {
  balance: BigNumber;
  assetPriceUsd: number | null;
  balanceWorthUsd: number | null;
}

export interface ITotalWorthPerAddress {
  [address: string]: number
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
    throw new Error('<EtherspotContextProvider /> has already been declared.')
  }

  const sessionStorage = etherspotSessionStorage ?? sessionStorageInstance;

  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [providerAddress, setProviderAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number>(defaultChainId);
  const [provider, setProvider] = useState<WalletProviderLike | Web3WalletProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(false);
  const [totalWorthPerAddress] = useState<ITotalWorthPerAddress>({});

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

  useEffect(() => { setMappedProvider(); }, [setMappedProvider]);

  const getSdkForChainId = useCallback((sdkChainId: number, forceNewInstance: boolean = false) => {
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
    }

    return sdkForChain;
  }, [provider]);

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

  const getSupportedAssetsForChainId = useCallback(async (assetsChainId: number, force: boolean = false) => {
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
    const hasNativeAsset = assets.some((asset) => !asset.address || addressesEqual(asset.address, nativeAssetPerChainId[chainId]?.address));

    supportedAssetsPerChainId[assetsChainId] = hasNativeAsset || !nativeAsset
      ? assets
      : [nativeAsset, ...assets]

    return supportedAssetsPerChainId[assetsChainId];
  }, [sdk]);

  const getAssetsBalancesForChainId = useCallback(async (
    assets: TokenListToken[],
    assetsChainId: number,
    balancesForAddress: string | null = accountAddress,
  ) => {
    if (!sdk) return [];

    let computedAccount;
    if (!balancesForAddress) {
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
          if (balanceAssetAddress === null) return isCaseInsensitiveMatch(supportedSymbol, nativeAssetPerChainId[assetsChainId]?.symbol);
          return addressesEqual(supportedAddress, balanceAssetAddress);
        });

        if (!supportedAsset) return false;

        return +ethers.utils.formatUnits(balance, supportedAsset.decimals) > 0;
      });
    } catch (e) {
      //
    }

    return [];
  }, [sdk, accountAddress]);

  const getSupportedAssetsWithBalancesForChainId = useCallback(async (
    assetsChainId: number,
    positiveBalancesOnly: boolean = false,
    balancesForAddress: string | null = accountAddress,
  ): Promise<IAssetWithBalance[]> => {
    const supportedAssets = await getSupportedAssetsForChainId(assetsChainId);
    const fromAssetsBalances = await getAssetsBalancesForChainId(supportedAssets, assetsChainId, balancesForAddress);

    // only get prices for assets with balances
    const assetsPrices = await getAssetsPrices(assetsChainId, fromAssetsBalances.map((asset) => asset.token));

    const assetsWithBalances = await Promise.all(supportedAssets.map(async (asset) => {
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
            ? await getNativeAssetPriceInUsd(assetsChainId)
            : assetsPrices?.[getAssetPriceKeyByAddress(asset.address)] ?? null;
        }

        balanceWorthUsd = assetPriceUsd
          // isZero check to avoid underflow
          ? +ethers.utils.formatUnits(balance, asset.decimals) * assetPriceUsd
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
    }));

    return positiveBalancesOnly
      ? assetsWithBalances.filter((asset) => !asset.balance.isZero())
      : assetsWithBalances;
  }, [getSupportedAssetsForChainId, accountAddress, getAssetsBalancesForChainId]);

  const getGasAssetsForChainId = useCallback(async (assetsChainId: number, senderAddress?: string): Promise<IAssetWithBalance[]> => {
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
        senderAddress,
      );

      gasAssets = supportedAssetsWithBalances.filter((
        supportedAsset,
      ) => gasTokenAddressesPerChainId[assetsChainId].some((
        gasTokenAddress,
      ) => isZeroAddress(supportedAsset.address)
        || addressesEqual(gasTokenAddress, supportedAsset.address)));
    } catch (e) {
      //
    }

    return gasAssets;
  }, [getSdkForChainId, getSupportedAssetsWithBalancesForChainId]);

  const logout = useCallback(() => {
    sdkPerChain = {};
    setProvider(null);
    setProviderAddress(null);
    setAccountAddress(null);
    if (onLogout) onLogout();
  }, [setProvider, setProviderAddress, setAccountAddress, onLogout]);

  const contextData = useMemo(
    () => ({
      connect,
      isConnecting,
      accountAddress,
      sdk,
      chainId,
      setChainId,
      getSdkForChainId,
      getSupportedAssetsForChainId,
      getAssetsBalancesForChainId,
      getSupportedAssetsWithBalancesForChainId,
      providerAddress,
      web3Provider: provider,
      totalWorthPerAddress,
      logout,
      smartWalletOnly,
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
      getSupportedAssetsForChainId,
      getAssetsBalancesForChainId,
      getSupportedAssetsWithBalancesForChainId,
      providerAddress,
      provider,
      totalWorthPerAddress,
      logout,
      smartWalletOnly,
      getGasAssetsForChainId,
    ],
  );

  return (
    <EtherspotContext.Provider value={{ data: contextData }}>
      {children}
    </EtherspotContext.Provider>
  );
};

export default EtherspotContextProvider;

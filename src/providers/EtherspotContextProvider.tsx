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
  WalletProviderLike,
  Web3WalletProvider,
} from 'etherspot';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';
import { ethers } from 'ethers';

import { EtherspotContext } from '../contexts';
import { nativeAssetPerChainId } from '../utils/chain';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import {
  addressesEqual,
  isCaseInsensitiveMatch,
} from '../utils/validation';

let sdkPerChain: { [chainId: number]: EtherspotSdk } = {};

const EtherspotContextProvider = ({
  children,
  provider: defaultProvider,
  chainId: defaultChainId = 1,
}: {
  children: ReactNode;
  provider: WalletProviderLike;
  chainId?: number;
}) => {
  const context = useContext(EtherspotContext);

  if (context.initialized) {
    throw new Error('<EtherspotContextProvider /> has already been declared.')
  }

  const initialized = useMemo(() => true, []);

  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [providerAddress, setProviderAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number>(defaultChainId);
  const [provider, setProvider] = useState<WalletProviderLike | Web3WalletProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

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

  useEffect(() => {
    if (!sdk) return;

    sdk.state$.subscribe((sdkState) => {
      if (sdkState?.account?.type === AccountTypes.Key) {
        setProviderAddress(sdkState.account.address);
        return;
      }
      if (sdkState?.account?.type === AccountTypes.Contract) {
        setAccountAddress(sdkState.account.address);
        return;
      }
    });

    return () => sdk.state$.unsubscribe();
  }, [sdk]);

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

  const getSupportedAssetsForChainId = useCallback(async (assetsChainId: number) => {
    if (!sdk) return [];

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
        //
      }
    }

    const nativeAsset = nativeAssetPerChainId[assetsChainId];
    const hasNativeAsset = assets.some((asset) => isCaseInsensitiveMatch(asset.symbol, nativeAsset.symbol) || addressesEqual(asset.address, ethers.constants.AddressZero))

    return hasNativeAsset ? assets : [nativeAsset, ...assets];
  }, [sdk]);

  const getAssetsBalancesForChainId = useCallback(async (assets: TokenListToken[], assetsChainId: number) => {
    if (!sdk) return [];

    let computedAccount;
    if (!accountAddress) {
      try {
        computedAccount = await connect();
      } catch (e) {
        //
      }
    }

    if (!accountAddress && !computedAccount) return [];

    // 0x0...0 is default native token address in our assets, but it's not a ERC20 token
    const assetAddressesWithoutZero = assets
      .filter((asset) => !addressesEqual(asset.address, ethers.constants.AddressZero))
      .map((asset) => asset.address);

    try {
      const { items: balances } = await sdk.getAccountBalances({
        account: accountAddress ?? computedAccount,
        tokens: assetAddressesWithoutZero,
        chainId: assetsChainId,
      });

      return balances.filter((assetBalance) => {
        const { balance, token: balanceAssetAddress } = assetBalance;

        const supportedAsset = assets.find(({ symbol: supportedSymbol, address: supportedAddress }) => {
          // `token === null` means it's chain native token
          if (balanceAssetAddress === null) return isCaseInsensitiveMatch(supportedSymbol, nativeAssetPerChainId[assetsChainId].symbol);
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
      providerAddress,
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
      providerAddress,
    ],
  );

  return (
    <EtherspotContext.Provider value={{ initialized, data: contextData }}>
      {children}
    </EtherspotContext.Provider>
  );
};

export default EtherspotContextProvider;

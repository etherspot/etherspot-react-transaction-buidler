import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  WalletProviderLike,
  Sdk as EtherspotSdk,
  EnvNames as EtherspotEnvNames,
  isWalletProvider,
  Web3WalletProvider,
} from 'etherspot';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';
import { ethers } from 'ethers';

import { EtherspotContext } from '../contexts';
import {  nativeAssetPerChainId } from '../utils/chain';
import {
  addressesEqual,
  isCaseInsensitiveMatch,
} from '../utils/common';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';

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

  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number>(defaultChainId);
  const [provider, setProvider] = useState<WalletProviderLike | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // map from generic web3 provider if needed
  const setMappedProvider = useCallback(async () => {
    if (!defaultProvider) return;

    if (isWalletProvider(defaultProvider)) {
      setProvider(defaultProvider);
      return;
    }

    // @ts-ignore
    const mappedProvider = await Web3WalletProvider.connect(defaultProvider);

    setProvider(mappedProvider);
  }, [defaultProvider]);

  useEffect(() => { setMappedProvider(); }, [setMappedProvider]);

  const getSdkForChainId = useCallback((sdkChainId: number) => {
    if (!provider) return null;

    const networkName = CHAIN_ID_TO_NETWORK_NAME[sdkChainId];
    const envName = EtherspotEnvNames.MainNets; // TODO: add testnet support

    if (!networkName) return null;

    return new EtherspotSdk(provider, {
      networkName,
      env: envName,
      omitWalletProviderNetworkCheck: true,
    });
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
      if (computed?.address) setAccount(computed.address);
    } catch (e) {
      //
    }

    setIsConnecting(false);
  }, [sdk, isConnecting]);

  const getSupportedAssetsForChainId = useCallback(async (assetsChainId: number) => {
    if (!sdk) return [];

    try {
      const { items: assets } = await sdk.getExchangeSupportedAssets({
        chainId: assetsChainId,
      });

      const nativeAsset = nativeAssetPerChainId[assetsChainId];
      const hasNativeAsset = assets.some((asset) => asset.symbol === nativeAsset.symbol || asset.address.toLowerCase() === ethers.constants.AddressZero);

      return hasNativeAsset ? assets : [nativeAsset, ...assets];
    } catch (e) {
      //
    }

    return [];
  }, [sdk]);

  const getAssetsBalancesForChainId = useCallback(async (assets: TokenListToken[], assetsChainId: number) => {
    if (!sdk) return [];

    let computedAccount;
    if (!account) {
      try {
        ({ address: computedAccount } = await sdk.computeContractAccount({ sync: true }));
      } catch (e) {
        //
      }
    }

    if (!account && !computedAccount) return [];

    // 0x0...0 is default native token address in our assets, but it's not a ERC20 token
    const assetAddressesWithoutZero = assets
      .filter((asset) => !addressesEqual(asset.address, ethers.constants.AddressZero))
      .map((asset) => asset.address);

    try {
      const { items: balances } = await sdk.getAccountBalances({
        account: account ?? computedAccount,
        tokens: assetAddressesWithoutZero,
        chainId: assetsChainId,
      });

      return balances.filter((assetBalance) => {
        const { balance, token: balanceAssetAddress } = assetBalance;

        const supportedAsset = assets.find(({ symbol: supportedSymbol, address: supportedAddress }) => {
          // `token === null` means it's chain native token
          if (balanceAssetAddress === null) return isCaseInsensitiveMatch(supportedSymbol, nativeAssetPerChainId[chainId].symbol);
          return addressesEqual(supportedAddress, balanceAssetAddress);
        });

        if (!supportedAsset) return false;

        return +ethers.utils.formatUnits(balance, supportedAsset.decimals) > 0;
      });
    } catch (e) {
      //
    }

    return [];
  }, [sdk, account]);

  const contextData = useMemo(
    () => ({
      connect,
      isConnecting,
      account,
      sdk,
      chainId,
      setChainId,
      getSdkForChainId,
      getSupportedAssetsForChainId,
      getAssetsBalancesForChainId,
    }),
    [
      connect,
      isConnecting,
      account,
      sdk,
      chainId,
      setChainId,
      getSdkForChainId,
      getSupportedAssetsForChainId,
      getAssetsBalancesForChainId,
    ],
  );

  return (
    <EtherspotContext.Provider value={{ initialized, data: contextData }}>
      {children}
    </EtherspotContext.Provider>
  );
};

export default EtherspotContextProvider;

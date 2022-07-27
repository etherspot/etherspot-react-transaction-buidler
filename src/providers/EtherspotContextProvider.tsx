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

import { EtherspotContext } from '../contexts';

const EtherspotContextProvider = ({
  children,
  provider: defaultProvider,
  chainId = 1,
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

  const sdk = useMemo(() => {
    if (!provider) return null;

    const networkName = CHAIN_ID_TO_NETWORK_NAME[chainId];
    const envName = EtherspotEnvNames.MainNets; // TODO: add testnet support

    return new EtherspotSdk(provider, {
      networkName,
      env: envName,
      omitWalletProviderNetworkCheck: true,
    });
  }, [provider, chainId]);

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

  const contextData = useMemo(
    () => ({
      connect,
      isConnecting,
      account,
      sdk,
    }),
    [
      connect,
      isConnecting,
      account,
      sdk,
    ],
  );

  return (
    <EtherspotContext.Provider value={{ initialized, data: contextData }}>
      {children}
    </EtherspotContext.Provider>
  );
};

export default EtherspotContextProvider;

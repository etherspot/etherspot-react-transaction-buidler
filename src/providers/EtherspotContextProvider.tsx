import React, {
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  WalletProviderLike,
  Sdk as EtherspotSdk,
  EnvNames as EtherspotEnvNames
} from 'etherspot';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';

import { EtherspotContext } from '../contexts';

const EtherspotContextProvider = ({
  children,
  provider,
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
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

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

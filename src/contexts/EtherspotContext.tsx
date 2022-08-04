import React, { createContext } from 'react';
import { Sdk as EtherspotSdk } from 'etherspot/dist/sdk/sdk';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { AccountBalance } from 'etherspot';

export interface EtherspotContextData {
  initialized: boolean;
  data: {
    account: string | null;
    connect: () => Promise<void>;
    chainId: number;
    setChainId: (chainId: number) => void;
    getSdkForChainId: (chainId: number) => EtherspotSdk | null;
    isConnecting: boolean;
    sdk: EtherspotSdk | null;
    getSupportedAssetsForChainId: (chainId: number) => Promise<TokenListToken[]>;
    getAssetsBalancesForChainId: (assets: TokenListToken[], chainId: number) => Promise<AccountBalance[]>;
  }
}

const EtherspotContext = createContext<EtherspotContextData>({
  initialized: false,
  data: {
    account: null,
    connect: () => new Promise(() => null),
    chainId: 0,
    setChainId: () => null,
    getSdkForChainId: () => null,
    isConnecting: false,
    sdk: null,
    getSupportedAssetsForChainId: () => new Promise(() => []),
    getAssetsBalancesForChainId: () => new Promise(() => []),
  }
});

export default EtherspotContext;

import React, { createContext } from 'react';
import { Sdk as EtherspotSdk } from 'etherspot/dist/sdk/sdk';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import {
  AccountBalance,
  WalletProviderLike,
  Web3WalletProvider,
} from 'etherspot';

export interface EtherspotContextData {
  data: {
    accountAddress: string | null;
    providerAddress: string | null;
    connect: () => Promise<string | undefined>;
    chainId: number;
    setChainId: (chainId: number) => void;
    getSdkForChainId: (chainId: number, forceNewInstance?: boolean) => EtherspotSdk | null;
    isConnecting: boolean;
    sdk: EtherspotSdk | null;
    getSupportedAssetsForChainId: (chainId: number) => Promise<TokenListToken[]>;
    getAssetsBalancesForChainId: (assets: TokenListToken[], chainId: number, address?: string | null) => Promise<AccountBalance[]>;
    web3Provider: WalletProviderLike | Web3WalletProvider | null;
  }
}

const EtherspotContext = createContext<EtherspotContextData | null>(null);

export default EtherspotContext;

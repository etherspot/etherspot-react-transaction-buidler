import React, { createContext } from 'react';
import { Sdk as EtherspotSdk } from 'etherspot/dist/sdk/sdk';
import {
  AccountBalance,
  WalletProviderLike,
  Web3WalletProvider,
} from 'etherspot';

import { AssetWithBalance, Asset, TotalWorthPerAddress } from '../providers/EtherspotContextProvider';

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
    getSupportedAssetsForChainId: (chainId: number) => Promise<Asset[]>;
    getAssetsBalancesForChainId: (assets: Asset[], chainId: number, address?: string | null) => Promise<AccountBalance[]>;
    getSupportedAssetsWithBalancesForChainId: (chainId: number, positiveBalancesOnly?: boolean, address?: string | null) => Promise<AssetWithBalance[]>;
    web3Provider: WalletProviderLike | Web3WalletProvider | null;
    totalWorthPerAddress: TotalWorthPerAddress;
  }
}

const EtherspotContext = createContext<EtherspotContextData | null>(null);

export default EtherspotContext;

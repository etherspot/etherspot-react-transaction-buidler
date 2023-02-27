import React, { createContext } from 'react';
import { Sdk as EtherspotSdk } from 'etherspot/dist/sdk/sdk';
import { AccountBalance, NftCollection, WalletProviderLike, Web3WalletProvider } from 'etherspot';

import {
  IAssetWithBalance,
  IAsset,
  ITotalWorthPerAddress,
  IBalanceByChain,
} from '../providers/EtherspotContextProvider';
import { Chain } from '../utils/chain';

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
    smartWalletBalanceByChain: IBalanceByChain[] | null;
    keybasedWalletBalanceByChain: IBalanceByChain[] | null;
    getSupportedAssetsForChainId: (chainId: number) => Promise<IAsset[]>;
    getAssetsBalancesForChainId: (
      assets: IAsset[],
      chainId: number,
      address?: string | null,
      recompute?: boolean
    ) => Promise<AccountBalance[]>;
    getSupportedAssetsWithBalancesForChainId: (
      chainId: number,
      positiveBalancesOnly?: boolean,
      address?: string | null,
      recompute?: boolean
    ) => Promise<IAssetWithBalance[]>;
    getSmartWalletBalancesByChain: (walletAddress: string, supportedChains: Chain[]) => Promise<any>;
    getKeybasedWalletBalancesPerChain: (walletAddress: string, supportedChains: Chain[]) => Promise<any>;
    getAccountBalanceByChainId: (chainId: number, address?: string | null) => Promise<any>;
    getNftsForChainId: (chainId: number, address?: string | null, recompute?: boolean) => Promise<NftCollection[]>;
    web3Provider: WalletProviderLike | Web3WalletProvider | null;
    totalWorthPerAddress: ITotalWorthPerAddress;
    logout: () => void;
    smartWalletOnly: boolean;
    setSmartWalletBalanceByChain: React.Dispatch<React.SetStateAction<IBalanceByChain[]>>;
    setKeybasedWalletBalanceByChain: React.Dispatch<React.SetStateAction<IBalanceByChain[]>>;
    getGasAssetsForChainId: (chainId: number, sender?: string) => Promise<IAssetWithBalance[]>;
    updateWalletBalances: (force?: boolean) => void;
  };
}

const EtherspotContext = createContext<EtherspotContextData | null>(null);

export default EtherspotContext;

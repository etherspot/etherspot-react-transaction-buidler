import React, { createContext } from 'react';
import { Sdk as EtherspotSdk } from 'etherspot/dist/sdk/sdk';
import {
  AccountBalance,
  ENSNode,
  NftCollection,
  WalletProviderLike,
  Web3WalletProvider,
  EnvNames as EtherspotEnvNames,
} from 'etherspot';

import {
  IAssetWithBalance,
  IAsset,
  ITotalWorthPerAddress,
  IBalanceByChain,
} from '../providers/EtherspotContextProvider';
import { Chain } from '../utils/chain';
import { Theme } from '../utils/theme';

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
    keyBasedWalletBalanceByChain: IBalanceByChain[] | null;
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
    loadSmartWalletBalancesByChain: (walletAddress: string, supportedChains: Chain[]) => Promise<void>;
    loadKeyBasedWalletBalancesPerChain: (walletAddress: string, supportedChains: Chain[]) => Promise<void>;
    getNftsForChainId: (chainId: number, address?: string | null, recompute?: boolean) => Promise<NftCollection[]>;
    getEnsNode: (chainId: number, address?: string | null, recompute?: boolean) => Promise<ENSNode>;
    web3Provider: WalletProviderLike | Web3WalletProvider | null;
    totalWorthPerAddress: ITotalWorthPerAddress;
    logout: () => void;
    smartWalletOnly: boolean;
    setSmartWalletBalanceByChain: React.Dispatch<React.SetStateAction<IBalanceByChain[]>>;
    setKeyBasedWalletBalanceByChain: React.Dispatch<React.SetStateAction<IBalanceByChain[]>>;
    getGasAssetsForChainId: (chainId: number, sender?: string) => Promise<IAssetWithBalance[]>;
    updateWalletBalances: (force?: boolean) => void;
    getRatesByNativeChainId: (chainId: number) => Promise<number | null>;
    changeTheme: (theme: Theme) => void;
    environment: EtherspotEnvNames;
    setEnvironment: (environment: EtherspotEnvNames) => void;
  };
}

const EtherspotContext = createContext<EtherspotContextData | null>(null);

export default EtherspotContext;

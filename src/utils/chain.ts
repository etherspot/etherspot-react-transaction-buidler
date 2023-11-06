/* eslint-disable @typescript-eslint/ban-ts-comment */
import { BigNumber, ethers } from 'ethers';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { EnvNames as EtherspotEnvNames } from 'etherspot';
import { IAssetWithBalance } from '../providers/EtherspotContextProvider';

// Based on: https://chainid.network/
export const MAINNET_CHAIN_ID = {
  ETHEREUM_MAINNET: 1,
  POLYGON: 137,
  BINANCE: 56,
  XDAI: 100,
  AVALANCHE: 43114,
  OPTIMISM: 10,
  ARBITRUM: 42161,
  AURORA: 1313161554,
  FANTOM: 250,
  CELO: 42220,
  MOONBEAM: 1284,
  OKTC: 66,
};

export const TESTNET_CHAIN_ID = {
  ETHEREUM_MAINNET: 5,
  POLYGON: 80001,
  BINANCE: 97,
  XDAI: 10200,
  AVALANCHE: 43113,
  OPTIMISM: 420,
  ARBITRUM: 421613,
  AURORA: 1313161555,
  FANTOM: 4002,
  CELO: 44787,
  MOONBEAM: 1287,
  ETHERSPOT: 4386,
  BASEGOERLI: 84531,
  FUSESPARKNET: 123,
  NEONDEVNET: 245022926,
  KLAYTNBAOBAB: 1001,
  OKTC: 65,
};

export interface Chain {
  chainId: number;
  title: string;
  iconUrl: string;
  explorerUrl: string;
}

export const mainnetSupportedChains: Chain[] = [
  {
    chainId: MAINNET_CHAIN_ID.ETHEREUM_MAINNET,
    title: 'Ethereum',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/ethereum.png',
    explorerUrl: 'https://etherscan.io/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.POLYGON,
    title: 'Polygon',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/polygon.svg',
    explorerUrl: 'https://polygonscan.com/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.BINANCE,
    title: 'BNB Chain',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/binance.svg',
    explorerUrl: 'https://bscscan.com/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.XDAI,
    title: 'Gnosis Chain',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/gnosis.png',
    explorerUrl: 'https://blockscout.com/xdai/mainnet/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.AVALANCHE,
    title: 'Avalanche',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/avalanche.svg',
    explorerUrl: 'https://snowtrace.io/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.OPTIMISM,
    title: 'Optimism',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/optimism.png',
    explorerUrl: 'https://optimistic.etherscan.io/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.ARBITRUM,
    title: 'Arbitrum',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/arbitrum.svg',
    explorerUrl: 'https://arbiscan.io/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.AURORA,
    title: 'Aurora',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/aurora.svg',
    explorerUrl: 'https://aurorascan.dev/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.FANTOM,
    title: 'Fantom',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/fantom.svg',
    explorerUrl: 'https://ftmscan.com/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.MOONBEAM,
    title: 'Moonbeam',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/moonbeam.png',
    explorerUrl: 'https://moonscan.io/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.CELO,
    title: 'CELO',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/celo.png',
    explorerUrl: 'https://explorer.celo.org/mainnet/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.OKTC,
    title: 'OKTC',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/oktc.png',
    explorerUrl: 'https://www.oklink.com/en/okc/tx/',
  },
];

export const testnetSupportedChains: Chain[] = [
  {
    chainId: TESTNET_CHAIN_ID.ETHEREUM_MAINNET,
    title: 'Goerli',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/ethereum.png',
    explorerUrl: 'https://goerli.etherscan.io/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.POLYGON,
    title: 'Mumbai',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/polygon.svg',
    explorerUrl: 'https://mumbai.polygonscan.com/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.BINANCE,
    title: 'BscTest',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/binance.svg',
    explorerUrl: 'https://testnet.bscscan.com/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.XDAI,
    title: 'Chiado',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/gnosis.png',
    explorerUrl: 'https://blockscout.chiadochain.net/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.AVALANCHE,
    title: 'Avalanche Fuji Testnet',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/avalanche.svg',
    explorerUrl: 'https://testnet.snowtrace.io/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.OPTIMISM,
    title: 'Optimism Goerli Testnet',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/optimism.png',
    explorerUrl: 'https://goerli-optimism.etherscan.io/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.ARBITRUM,
    title: 'ArbitrumNitro',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/arbitrum.svg',
    explorerUrl: 'https://goerli-rollup-explorer.arbitrum.io/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.AURORA,
    title: 'Aurora Testnet',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/aurora.svg',
    explorerUrl: 'https://testnet.aurorascan.dev/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.FANTOM,
    title: 'Fantom Testnet',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/fantom.svg',
    explorerUrl: 'https://testnet.ftmscan.com/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.MOONBEAM,
    title: 'Moonbase',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/moonbeam.png',
    explorerUrl: 'https://moonbase.moonscan.io/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.CELO,
    title: 'Celo Alfajores Testnet',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/celo.png',
    explorerUrl: 'https://explorer.celo.org/alfajores/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.ETHERSPOT,
    title: 'Etherspot',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/etherspot.png',
    explorerUrl: 'https://explorer.etherspot.dev/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.BASEGOERLI,
    title: 'BaseGoerli',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/ethereum.png',
    explorerUrl: 'https://goerli.basescan.org/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.FUSESPARKNET,
    title: 'FuseSparknet',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/fuse.png',
    explorerUrl: 'https://explorer.fusespark.io/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.NEONDEVNET,
    title: 'NeonDevnet',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/neon.png',
    explorerUrl: 'https://devnet.explorer.neon-labs.org/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.KLAYTNBAOBAB,
    title: 'KlaytnBaobab',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/klaytn.png',
    explorerUrl: 'https://baobab.scope.klaytn.com/tx/',
  },
  {
    chainId: TESTNET_CHAIN_ID.OKTC,
    title: 'OktcTest',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/oktc.png',
    explorerUrl: 'https://www.oklink.com/okexchain-test/tx/',
  },
];

export const primeNativeAssets: { [chainId: number]: TokenListToken } = {
  [MAINNET_CHAIN_ID.POLYGON]: {
    chainId: MAINNET_CHAIN_ID.POLYGON,
    address: ethers.constants.AddressZero,
    name: 'Matic',
    symbol: 'MATIC',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/native_tokens/matic.png',
  },
  [MAINNET_CHAIN_ID.OPTIMISM]: {
    chainId: MAINNET_CHAIN_ID.OPTIMISM,
    address: ethers.constants.AddressZero,
    name: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/ethereum.png',
  },
  [MAINNET_CHAIN_ID.ARBITRUM]: {
    chainId: MAINNET_CHAIN_ID.ARBITRUM,
    address: ethers.constants.AddressZero,
    name: 'Arbitrum',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/ethereum.png',
  },
};

export const mainnetNativeAssets: { [chainId: number]: TokenListToken } = {
  [MAINNET_CHAIN_ID.ETHEREUM_MAINNET]: {
    chainId: MAINNET_CHAIN_ID.ETHEREUM_MAINNET,
    address: ethers.constants.AddressZero,
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/ethereum.png',
  },
  [MAINNET_CHAIN_ID.POLYGON]: {
    chainId: MAINNET_CHAIN_ID.POLYGON,
    address: ethers.constants.AddressZero,
    name: 'Matic',
    symbol: 'MATIC',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/native_tokens/matic.png',
  },
  [MAINNET_CHAIN_ID.BINANCE]: {
    chainId: MAINNET_CHAIN_ID.BINANCE,
    address: ethers.constants.AddressZero,
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/binance.svg',
  },
  [MAINNET_CHAIN_ID.XDAI]: {
    chainId: MAINNET_CHAIN_ID.XDAI,
    address: ethers.constants.AddressZero,
    name: 'xDAI',
    symbol: 'XDAI',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/native_tokens/xdai.png',
  },
  [MAINNET_CHAIN_ID.AVALANCHE]: {
    chainId: MAINNET_CHAIN_ID.AVALANCHE,
    address: ethers.constants.AddressZero,
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/avalanche.svg',
  },
  [MAINNET_CHAIN_ID.OPTIMISM]: {
    chainId: MAINNET_CHAIN_ID.OPTIMISM,
    address: ethers.constants.AddressZero,
    name: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/ethereum.png',
  },
  [MAINNET_CHAIN_ID.AURORA]: {
    chainId: MAINNET_CHAIN_ID.AURORA,
    address: ethers.constants.AddressZero,
    name: 'Aurora',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/aurora.svg',
  },
  [MAINNET_CHAIN_ID.ARBITRUM]: {
    chainId: MAINNET_CHAIN_ID.ARBITRUM,
    address: ethers.constants.AddressZero,
    name: 'Arbitrum',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/ethereum.png',
  },
  [MAINNET_CHAIN_ID.FANTOM]: {
    chainId: MAINNET_CHAIN_ID.FANTOM,
    address: ethers.constants.AddressZero,
    name: 'Fantom',
    symbol: 'FTM',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/fantom.svg',
  },
  [MAINNET_CHAIN_ID.MOONBEAM]: {
    chainId: MAINNET_CHAIN_ID.MOONBEAM,
    address: ethers.constants.AddressZero,
    name: 'Moonbeam',
    symbol: 'GLMR',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/moonbeam.png',
  },
  [MAINNET_CHAIN_ID.CELO]: {
    chainId: MAINNET_CHAIN_ID.CELO,
    address: ethers.constants.AddressZero,
    name: 'Celo',
    symbol: 'CELO',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/celo.png',
  },
  [MAINNET_CHAIN_ID.OKTC]: {
    chainId: MAINNET_CHAIN_ID.OKTC,
    address: ethers.constants.AddressZero,
    name: 'OKTC',
    symbol: 'OKT',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/oktc.png',
  },
};

export const testnetNativeAssets: { [chainId: number]: TokenListToken } = {
  [TESTNET_CHAIN_ID.ETHEREUM_MAINNET]: {
    chainId: TESTNET_CHAIN_ID.ETHEREUM_MAINNET,
    address: ethers.constants.AddressZero,
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/ethereum.png',
  },
  [TESTNET_CHAIN_ID.POLYGON]: {
    chainId: TESTNET_CHAIN_ID.POLYGON,
    address: ethers.constants.AddressZero,
    name: 'Matic',
    symbol: 'MATIC',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/native_tokens/matic.png',
  },
  [TESTNET_CHAIN_ID.BINANCE]: {
    chainId: TESTNET_CHAIN_ID.BINANCE,
    address: ethers.constants.AddressZero,
    name: 'tBNB',
    symbol: 'tBNB',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/binance.svg',
  },
  [TESTNET_CHAIN_ID.AVALANCHE]: {
    chainId: TESTNET_CHAIN_ID.AVALANCHE,
    address: ethers.constants.AddressZero,
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/avalanche.svg',
  },
  [TESTNET_CHAIN_ID.OPTIMISM]: {
    chainId: TESTNET_CHAIN_ID.OPTIMISM,
    address: ethers.constants.AddressZero,
    name: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/ethereum.png',
  },
  [TESTNET_CHAIN_ID.AURORA]: {
    chainId: TESTNET_CHAIN_ID.AURORA,
    address: ethers.constants.AddressZero,
    name: 'Aurora',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/aurora.svg',
  },
  [TESTNET_CHAIN_ID.ARBITRUM]: {
    chainId: TESTNET_CHAIN_ID.ARBITRUM,
    address: ethers.constants.AddressZero,
    name: 'ArbitrumNitro',
    symbol: 'AGOR',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/ethereum.png',
  },
  [TESTNET_CHAIN_ID.FANTOM]: {
    chainId: TESTNET_CHAIN_ID.FANTOM,
    address: ethers.constants.AddressZero,
    name: 'Fantom',
    symbol: 'FTM',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/fantom.svg',
  },
  [TESTNET_CHAIN_ID.MOONBEAM]: {
    chainId: TESTNET_CHAIN_ID.MOONBEAM,
    address: ethers.constants.AddressZero,
    name: 'Moonbase',
    symbol: 'DEV',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/moonbeam.png',
  },
  [TESTNET_CHAIN_ID.CELO]: {
    chainId: TESTNET_CHAIN_ID.CELO,
    address: ethers.constants.AddressZero,
    name: 'Celo',
    symbol: 'CELO',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/celo.png',
  },
  [TESTNET_CHAIN_ID.ETHERSPOT]: {
    chainId: TESTNET_CHAIN_ID.ETHERSPOT,
    address: ethers.constants.AddressZero,
    name: 'Etherspot',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/etherspot.png',
  },
  [TESTNET_CHAIN_ID.BASEGOERLI]: {
    chainId: TESTNET_CHAIN_ID.BASEGOERLI,
    address: ethers.constants.AddressZero,
    name: 'BaseGoerli',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/ethereum.png',
  },
  [TESTNET_CHAIN_ID.FUSESPARKNET]: {
    chainId: TESTNET_CHAIN_ID.FUSESPARKNET,
    address: ethers.constants.AddressZero,
    name: 'FuseSparknet',
    symbol: 'SPARK',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/fuse.png',
  },
  [TESTNET_CHAIN_ID.NEONDEVNET]: {
    chainId: TESTNET_CHAIN_ID.NEONDEVNET,
    address: ethers.constants.AddressZero,
    name: 'NeonDevnet',
    symbol: 'NEON',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/neon.png',
  },
  [TESTNET_CHAIN_ID.KLAYTNBAOBAB]: {
    chainId: TESTNET_CHAIN_ID.KLAYTNBAOBAB,
    address: ethers.constants.AddressZero,
    name: 'KlaytnBaobab',
    symbol: 'KLAY',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/klaytn.png',
  },
  [TESTNET_CHAIN_ID.OKTC]: {
    chainId: TESTNET_CHAIN_ID.OKTC,
    address: ethers.constants.AddressZero,
    name: 'OktcTest',
    symbol: 'OKT',
    decimals: 18,
    logoURI: 'https://public.etherspot.io/buidler/chain_logos/oktc.png',
  },
};

export let CHAIN_ID = MAINNET_CHAIN_ID;
const primeSupportedChains = [
  {
    chainId: MAINNET_CHAIN_ID.POLYGON,
    title: 'Polygon',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/polygon.svg',
    explorerUrl: 'https://polygonscan.com/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.ARBITRUM,
    title: 'Arbitrum',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/arbitrum.svg',
    explorerUrl: 'https://arbiscan.io/tx/',
  },
  {
    chainId: MAINNET_CHAIN_ID.OPTIMISM,
    title: 'Optimism',
    iconUrl: 'https://public.etherspot.io/buidler/chain_logos/optimism.png',
    explorerUrl: 'https://optimistic.etherscan.io/tx/',
  },
];
export let supportedChains: Chain[] = mainnetSupportedChains;
export let nativeAssetPerChainId = mainnetNativeAssets;
export const primeSdkSupportedChains: Chain[] = primeSupportedChains;
export const primeNativeAssetPerChainId = primeNativeAssets;

export const changeChainId = (value: EtherspotEnvNames) => {
  if (value === EtherspotEnvNames.MainNets) {
    CHAIN_ID = MAINNET_CHAIN_ID;
    supportedChains = mainnetSupportedChains;
    nativeAssetPerChainId = mainnetNativeAssets;
  } else {
    CHAIN_ID = TESTNET_CHAIN_ID;
    supportedChains = testnetSupportedChains;
    nativeAssetPerChainId = testnetNativeAssets;
  }
};

export const klimaAsset: IAssetWithBalance = {
  address: '0x4e78011Ce80ee02d2c3e649Fb657E45898257815',
  chainId: CHAIN_ID.POLYGON,
  name: 'Klima DAO',
  symbol: 'sKLIMA',
  decimals: 9,
  logoURI: 'https://public.etherspot.io/buidler/chain_logos/klimadao.png',
  balance: BigNumber.from(0),
  assetPriceUsd: null,
  balanceWorthUsd: null,
};

export const plrDaoMemberNft = {
  [MAINNET_CHAIN_ID.POLYGON]: {
    address: '0x96515c38c6542a698Fa6550DD8C7de9BE602953c',
    chainId: MAINNET_CHAIN_ID.POLYGON,
    name: 'Pillar DAO NFT',
    symbol: 'PLR DAO',
    decimals: 18,
    logoURI: 'https://public.pillar.fi/files/pillar-dao-member-badge.png',
    balance: BigNumber.from(0),
    assetPriceUsd: null,
    balanceWorthUsd: null,
  },
  [TESTNET_CHAIN_ID.POLYGON]: {
    address: '0xF2367C021b1f7E1E96E4d9F1B8eB07C13AFb0526',
    chainId: TESTNET_CHAIN_ID.POLYGON,
    name: 'PLR NFT',
    symbol: 'PLR NFT',
    decimals: 18,
    logoURI: 'https://public.pillar.fi/files/pillar-dao-member-badge.png',
    balance: BigNumber.from(0),
    assetPriceUsd: null,
    balanceWorthUsd: null,
  },
};

export const changeToChain = async (chainId: number): Promise<boolean> => {
  // @ts-ignore
  if (!window?.ethereum) {
    alert('Unsupported browser!');
    return false;
  }

  const supportedChain = supportedChains.find((supportedChain) => supportedChain.chainId === chainId);
  if (!supportedChain) {
    alert('Unsupported chain!');
    return false;
  }

  try {
    // @ts-ignore
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + chainId.toString(16) }], // chainId must be in hexadecimal numbers
    });
    return true;
  } catch (error) {
    // @ts-ignore
    if (error.code === 4902) {
      try {
        // @ts-ignore
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              title: supportedChain.title,
              chainId: '0x' + chainId.toString(16),
            },
          ],
        });
        return true;
      } catch (e) {
        //
      }
    }
  }

  return false;
};

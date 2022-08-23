import { ethers } from 'ethers';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';

// Based on: https://chainid.network/
export const CHAIN_ID = {
  ETHEREUM_MAINNET: 1,
  POLYGON: 137,
  BINANCE: 56,
  XDAI: 100,
  AVALANCHE: 43114,
  OPTIMISM: 10,
  ARBITRUM: 42161,
  AURORA: 1313161554,
  FANTOM: 250,
};

export const supportedChains = [
  { chainId: CHAIN_ID.ETHEREUM_MAINNET, title: 'Ethereum' },
  { chainId: CHAIN_ID.POLYGON, title: 'Polygon' },
  { chainId: CHAIN_ID.BINANCE, title: 'Binance Smart Chain' },
  { chainId: CHAIN_ID.XDAI, title: 'Gnosis Chain (xDai)' },
  { chainId: CHAIN_ID.OPTIMISM, title: 'Optimism' },
  { chainId: CHAIN_ID.ARBITRUM, title: 'Arbitrum' },
  { chainId: CHAIN_ID.AURORA, title: 'Aurora' },
  { chainId: CHAIN_ID.FANTOM, title: 'Fantom' },
];

export const nativeAssetPerChainId: { [chainId: number]: TokenListToken } = {
  [CHAIN_ID.ETHEREUM_MAINNET]: {
    chainId: CHAIN_ID.ETHEREUM_MAINNET,
    address: ethers.constants.AddressZero,
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://tokens.1inch.exchange/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
  },
  [CHAIN_ID.POLYGON]: {
    chainId: CHAIN_ID.POLYGON,
    address: ethers.constants.AddressZero,
    name: 'Matic',
    symbol: 'MATIC',
    decimals: 18,
    logoURI: 'https://tokens.1inch.exchange/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png',
  },
  [CHAIN_ID.BINANCE]: {
    chainId: CHAIN_ID.BINANCE,
    address: ethers.constants.AddressZero,
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
    logoURI: 'https://tokens.1inch.exchange/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png',
  },
  [CHAIN_ID.XDAI]: {
    chainId: CHAIN_ID.XDAI,
    address: ethers.constants.AddressZero,
    name: 'xDAI',
    symbol: 'XDAI',
    decimals: 18,
    logoURI: 'https://tokens.1inch.exchange/0x6b175474e89094c44da98b954eedeac495271d0f.png',
  },
  [CHAIN_ID.AVALANCHE]: {
    chainId: CHAIN_ID.AVALANCHE,
    address: ethers.constants.AddressZero,
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
    logoURI: 'https://image.pngaaa.com/19/5554019-middle.png',
  },
  [CHAIN_ID.OPTIMISM]: {
    chainId: CHAIN_ID.OPTIMISM,
    address: ethers.constants.AddressZero,
    name: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0x4200000000000000000000000000000000000042.png',
  },
  [CHAIN_ID.AURORA]: {
    chainId: CHAIN_ID.AURORA,
    address: ethers.constants.AddressZero,
    name: 'Aurora',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://app.1inch.io/assets/images/network-logos/aurora.svg',
  },
  [CHAIN_ID.ARBITRUM]: {
    chainId: CHAIN_ID.ARBITRUM,
    address: ethers.constants.AddressZero,
    name: 'Arbitrum',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://app.1inch.io/assets/images/network-logos/arbitrum.svg',
  },
  [CHAIN_ID.FANTOM]: {
    chainId: CHAIN_ID.FANTOM,
    address: ethers.constants.AddressZero,
    name: 'Fantom',
    symbol: 'FTM',
    decimals: 18,
    logoURI: 'https://app.1inch.io/assets/images/network-logos/fantom.svg',
  },
};

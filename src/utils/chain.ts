import { BigNumber, ethers } from 'ethers';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { IAssetWithBalance } from '../providers/EtherspotContextProvider';

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
  CELO: 42220,
  MOONBEAM: 1284,
};

export interface Chain {
  chainId: number;
  title: string;
  iconUrl: string;
  explorerUrl: string;
}

export const supportedChains: Chain[] = [
  {
    chainId: CHAIN_ID.ETHEREUM_MAINNET,
    title: 'Ethereum',
    iconUrl: 'https://tokens.1inch.exchange/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
    explorerUrl: 'https://etherscan.io/tx/',
  },
  {
    chainId: CHAIN_ID.POLYGON,
    title: 'Polygon',
    iconUrl: 'https://chainlist.org/_next/image?url=https%3A%2F%2Fdefillama.com%2Fchain-icons%2Frsz_polygon.jpg&w=64&q=75',
    explorerUrl: 'https://polygonscan.com/tx/',
  },
  {
    chainId: CHAIN_ID.BINANCE,
    title: 'BNB Chain',
    iconUrl: 'https://chainlist.org/_next/image?url=https%3A%2F%2Fdefillama.com%2Fchain-icons%2Frsz_binance.jpg&w=64&q=75',
    explorerUrl: 'https://bscscan.com/tx/',
  },
  {
    chainId: CHAIN_ID.XDAI,
    title: 'Gnosis Chain (xDai)',
    iconUrl: 'https://chainlist.org/_next/image?url=https%3A%2F%2Fdefillama.com%2Fchain-icons%2Frsz_xdai.jpg&w=64&q=75',
    explorerUrl: 'https://blockscout.com/xdai/mainnet/tx/',
  },
  {
    chainId: CHAIN_ID.AVALANCHE,
    title: 'Avalanche',
    iconUrl: 'https://chainlist.org/_next/image?url=https%3A%2F%2Fdefillama.com%2Fchain-icons%2Frsz_avalanche.jpg&w=64&q=75',
    explorerUrl: 'https://snowtrace.io/tx/',
  },
  {
    chainId: CHAIN_ID.OPTIMISM,
    title: 'Optimism',
    iconUrl: 'https://tokens.1inch.io/0x4200000000000000000000000000000000000042.png',
    explorerUrl: 'https://optimistic.etherscan.io/tx/',
  },
  {
    chainId: CHAIN_ID.ARBITRUM,
    title: 'Arbitrum',
    iconUrl: 'https://app.1inch.io/assets/images/network-logos/arbitrum.svg',
    explorerUrl: 'https://arbiscan.io/tx/',
  },
  {
    chainId: CHAIN_ID.AURORA,
    title: 'Aurora',
    iconUrl: 'https://app.1inch.io/assets/images/network-logos/aurora.svg',
    explorerUrl: 'https://aurorascan.dev/tx/',
  },
  {
    chainId: CHAIN_ID.FANTOM,
    title: 'Fantom',
    iconUrl: 'https://app.1inch.io/assets/images/network-logos/fantom.svg',
    explorerUrl: 'https://ftmscan.com/tx/',
  },
  {
    chainId: CHAIN_ID.MOONBEAM,
    title: 'Moonbeam',
    iconUrl: 'https://chainlist.org/_next/image?url=https%3A%2F%2Fdefillama.com%2Fchain-icons%2Frsz_moonbeam.jpg&w=64&q=75',
    explorerUrl: 'https://moonscan.io/tx/',
  },
  {
    chainId: CHAIN_ID.CELO,
    title: 'CELO',
    iconUrl: 'https://chainlist.org/_next/image?url=https%3A%2F%2Fdefillama.com%2Fchain-icons%2Frsz_celo.jpg&w=64&q=75',
    explorerUrl: 'https://explorer.celo.org/mainnet/tx/',
  },
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
    logoURI: 'https://chainlist.org/_next/image?url=https%3A%2F%2Fdefillama.com%2Fchain-icons%2Frsz_binance.jpg&w=64&q=75',
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
    logoURI: 'https://chainlist.org/_next/image?url=https%3A%2F%2Fdefillama.com%2Fchain-icons%2Frsz_avalanche.jpg&w=64&q=75',
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
  [CHAIN_ID.MOONBEAM]: {
    chainId: CHAIN_ID.MOONBEAM,
    address: ethers.constants.AddressZero,
    name: 'Moonbeam',
    symbol: 'GLMR',
    decimals: 18,
    logoURI: 'https://chainlist.org/_next/image?url=https%3A%2F%2Fdefillama.com%2Fchain-icons%2Frsz_moonbeam.jpg&w=64&q=75',
  },
  [CHAIN_ID.CELO]: {
    chainId: CHAIN_ID.CELO,
    address: ethers.constants.AddressZero,
    name: 'Celo',
    symbol: 'CELO',
    decimals: 18,
    logoURI: 'https://chainlist.org/_next/image?url=https%3A%2F%2Fdefillama.com%2Fchain-icons%2Frsz_celo.jpg&w=64&q=75',
  },
};

export const klimaAsset: IAssetWithBalance = {
  address: '0x4e78011Ce80ee02d2c3e649Fb657E45898257815',
  chainId: CHAIN_ID.POLYGON,
  name: 'Klima DAO',
  symbol: 'sKLIMA',
  decimals: 9,
  logoURI: 'https://polygonscan.com/token/images/klimadao_32.png',
  balance: BigNumber.from(0),
  assetPriceUsd: null,
  balanceWorthUsd: null,
}

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
      params: [{ chainId: ethers.utils.hexlify(chainId) }], // chainId must be in hexadecimal numbers
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
              chainId: ethers.utils.hexlify(chainId),
            },
          ],
        });
        return true;
      } catch (e) {
        //
      }
    }
  }

  alert(`Please manually switch to ${supportedChain.title}.`);
  return false;
}

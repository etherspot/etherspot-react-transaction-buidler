import axios from 'axios';
import { CHAIN_ID } from '../utils/chain';

const requestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
};

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

export const chainToCoinGeckoNativeCoinId = {
  [CHAIN_ID.ETHEREUM_MAINNET]: 'ethereum',
  [CHAIN_ID.POLYGON]: 'matic-network',
  [CHAIN_ID.BINANCE]: 'binancecoin',
  [CHAIN_ID.XDAI]: 'xdai',
  [CHAIN_ID.AVALANCHE]: 'avalanche-2',
  [CHAIN_ID.OPTIMISM]: 'ethereum', // gas paid in eth
  [CHAIN_ID.ARBITRUM]: 'ethereum', // gas paid in eth
  [CHAIN_ID.AURORA]: 'ethereum', // gas paid in eth
  [CHAIN_ID.FANTOM]: 'fantom',
  [CHAIN_ID.CELO]: 'celo',
  [CHAIN_ID.MOONBEAM]: 'moonbeam',
};

export const getNativeAssetPriceInUsd = async (chainId: number): Promise<number | null> => {
  const coinId = chainToCoinGeckoNativeCoinId[chainId];
  if (!coinId) return null;

  try {
    const { data } = await axios.get(
      `${COINGECKO_API_URL}/simple/price?ids=${coinId}&vs_currencies=usd`,
      requestConfig,
    );

    return data?.[coinId]?.usd ?? null;
  } catch (error) {
    //
  }

  return null;

};

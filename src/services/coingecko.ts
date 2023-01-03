import axios from 'axios';
import {
  CHAIN_ID,
} from '../utils/chain';
import {
  isZeroAddress,
} from '../utils/validation';
import {
  chunk,
  uniq,
} from 'lodash';

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

const chainToCoinGeckoNetwork = {
  [CHAIN_ID.ETHEREUM_MAINNET]: 'ethereum',
  [CHAIN_ID.POLYGON]: 'polygon-pos',
  [CHAIN_ID.BINANCE]: 'binance-smart-chain',
  [CHAIN_ID.XDAI]: 'xdai',
  [CHAIN_ID.AVALANCHE]: 'avalanche-2',
  [CHAIN_ID.OPTIMISM]: 'optimistic-ethereum',
  [CHAIN_ID.ARBITRUM]: '',
  [CHAIN_ID.AURORA]: '',
  [CHAIN_ID.FANTOM]: '',
  [CHAIN_ID.CELO]: '',
  [CHAIN_ID.MOONBEAM]: '',
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

export const getAssetPriceKeyByAddress = (address: string) => address.toLowerCase();

interface AssetsPrices { [address: string]: number }

export const getAssetsPrices = async (
  chainId: number,
  assetsAddresses: string[],
): Promise<AssetsPrices | null> => {
  const coinGeckoNetwork = chainToCoinGeckoNetwork[chainId];
  if (!chainToCoinGeckoNetwork) return null;

  let prices: AssetsPrices | null = null;

  const nonZeroAddresses = assetsAddresses.filter((address) => !!address && !isZeroAddress(address));
  const assetsAddressesChunks = chunk(uniq(nonZeroAddresses.map((address) => address.toLowerCase())), 100);

  await Promise.all(assetsAddressesChunks.map(async (assetsAddressesChunk) => {
    try {
      const { data } = await axios.get(
        `${COINGECKO_API_URL}/simple/token_price/${coinGeckoNetwork}` +
        `?contract_addresses=${assetsAddressesChunk.join(',')}` +
        `&vs_currencies=usd`,
        requestConfig,
      );

      prices = Object.keys(data).reduce((mapped, contractAddress) => ({
        ...mapped,
        [getAssetPriceKeyByAddress(contractAddress)]: +data[contractAddress].usd,
      }), prices ?? {});
    } catch (e) {
      //
    }
  }));

  return prices;
};

export const getAssetPriceInUsd = async (chainId: number, assetAddress: string): Promise<number | null> => {
  const coinId = chainToCoinGeckoNativeCoinId[chainId];
  if (!coinId) return null;

  try {
    const prices = await getAssetsPrices(chainId, [assetAddress]);
    if (prices) return Object.values(prices)[0];
  } catch (error) {
    //
  }

  return null;
};

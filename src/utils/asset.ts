import { BigNumber } from 'ethers';
import { IAssetWithBalance } from '../providers/EtherspotContextProvider';
import { CHAIN_ID } from './chain';
import { PLR_ADDRESS_PER_CHAIN } from '../constants/assetConstants';

export const plrDaoAsset: IAssetWithBalance = {
  address: '0xa6b37fc85d870711c56fbcb8afe2f8db049ae774',
  chainId: CHAIN_ID.POLYGON,
  name: 'Pillar',
  symbol: 'PLR',
  decimals: 18,
  logoURI: 'https://public.etherspot.io/buidler/chain_logos/polygon.svg',
  balance: BigNumber.from(0),
  assetPriceUsd: null,
  balanceWorthUsd: null,
};

export const getPlrAssetForChainId = (
  chainId: number,
  balance: BigNumber = BigNumber.from(0),
): IAssetWithBalance => ({
  address: PLR_ADDRESS_PER_CHAIN[chainId],
  chainId,
  name: 'Pillar',
  symbol: 'PLR',
  decimals: 18,
  logoURI: 'https://assets.coingecko.com/coins/images/809/small/v2logo-1.png',
  balance,
  assetPriceUsd: null,
  balanceWorthUsd: null,
});

// TODO: replace with actual values once deployed to mainnet, deployment said to happen after qa passes
export const plrStakedAssetEthereumMainnet: IAssetWithBalance = {
  address: '0xa6b37fc85d870711c56fbcb8afe2f8db049ae774',
  chainId: CHAIN_ID.ETHEREUM_MAINNET,
  name: 'Staked Pillar',
  symbol: 'stkPLR',
  decimals: 18,
  logoURI: 'https://assets.coingecko.com/coins/images/809/small/v2logo-1.png',
  balance: BigNumber.from(0),
  assetPriceUsd: null,
  balanceWorthUsd: null,
};

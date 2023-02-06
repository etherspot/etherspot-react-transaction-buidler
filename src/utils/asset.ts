import { BigNumber } from 'ethers';
import { IAssetWithBalance } from '../providers/EtherspotContextProvider';
import { CHAIN_ID } from './chain';

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

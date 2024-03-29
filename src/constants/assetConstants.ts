import { CHAIN_ID, MAINNET_CHAIN_ID, TESTNET_CHAIN_ID } from '../utils/chain';

export const POLYGON_USDC_CONTRACT_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

export const GNOSIS_USDC_CONTRACT_ADDRESS = '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83';

export const PLR_ADDRESS_ETHEREUM_MAINNET = '0xe3818504c1b32bf1557b16c238b2e01fd3149c17';
export const PLR_ADDRESS_BNB = '0x790cfdc6ab2e0ee45a433aac5434f183be1f6a20';
export const PLR_ADDRESS_POLYGON = '0xa6b37fc85d870711c56fbcb8afe2f8db049ae774';
export const PLR_ADDRESS_GNOSIS_CHAIN = '0x10beea85519a704a63765d396415f9ea5aa30a17';

export const PLR_ADDRESS_PER_CHAIN = {
  [CHAIN_ID.ETHEREUM_MAINNET]: PLR_ADDRESS_ETHEREUM_MAINNET,
  [CHAIN_ID.BINANCE]: PLR_ADDRESS_BNB,
  [CHAIN_ID.POLYGON]: PLR_ADDRESS_POLYGON,
  [CHAIN_ID.XDAI]: PLR_ADDRESS_GNOSIS_CHAIN,
};

export const PLR_DAO_CONTRACT_PER_CHAIN = {
  [MAINNET_CHAIN_ID.POLYGON]: '0xc380f15Db7be87441d0723F19fBb440AEaa734aB',
  [TESTNET_CHAIN_ID.POLYGON]: '0x23690E5981996cDC5eFc1e126ce9377B9876C95e',
};

export const PLR_STAKING_ADDRESS_ETHEREUM_MAINNET = '0x4fa3d9Cf11Dc94e5E0f3BCCa980aA8FB3a0d27f3';

export const STKPLR_ADDRESS_ETHEREUM_MAINNET = '0xdfc4575b3cec99d756f45ed22289fa3f1fc530d7';

export const PLR_STAKING_POLYGON_CONTRACT_ADDRESS = '0x826a26e65266c5834977D4f552d31b9e29F668d4';
export const STKPLR_POLYGON_TOKEN_ADDRESS = '0x99B4071d2509f3bfb4C1f9CbE174Da1f3dC43480';

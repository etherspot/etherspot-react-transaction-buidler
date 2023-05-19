import { CHAIN_ID, MAINNET_CHAIN_ID, TESTNET_CHAIN_ID } from '../utils/chain';

export const POLYGON_USDC_CONTRACT_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

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
  [MAINNET_CHAIN_ID.POLYGON]: '0xdf5cFefc1CE077Fc468E3CFF130f955421D9B95a',
  [TESTNET_CHAIN_ID.POLYGON]: '0xD54aE8275fCe00930d732F93Cf2fC0d588752f9A',
};

// TODO: to be added once available, contract said to be deployed once QA passes UI
export const PLR_STAKING_ADDRESS_ETHEREUM_MAINNET = '0x';


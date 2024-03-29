export const TRANSACTION_BLOCK_TYPE = {
  ASSET_BRIDGE: 'ASSET_BRIDGE' as 'ASSET_BRIDGE',
  SEND_ASSET: 'SEND_ASSET' as 'SEND_ASSET',
  ASSET_SWAP: 'ASSET_SWAP' as 'ASSET_SWAP',
  KLIMA_STAKE: 'KLIMA_STAKE' as 'KLIMA_STAKE',
  PLR_DAO_STAKE: 'PLR_DAO_STAKE' as 'PLR_DAO_STAKE',
  PLR_STAKING_V2: 'PLR_STAKING_V2' as 'PLR_STAKING_V2',
  HONEY_SWAP_LP: 'HONEY_SWAP_LP' as 'HONEY_SWAP_LP',
  DISABLED: 'DISABLED' as 'DISABLED',
};

export type TRANSACTION_BLOCK_TYPE_KEY = keyof typeof TRANSACTION_BLOCK_TYPE;

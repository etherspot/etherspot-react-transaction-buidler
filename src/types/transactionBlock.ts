import { TokenListToken } from 'etherspot';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { ISendAssetTransactionBlockValues } from '../components/TransactionBlock/SendAssetTransactionBlock';
import { IAssetBridgeTransactionBlockValues } from '../components/TransactionBlock/AssetBridgeTransactionBlock';
import { ISwapAssetTransactionBlockValues } from '../components/TransactionBlock/AssetSwapTransactionBlock';
import { IKlimaStakingTransactionBlockValues } from '../components/TransactionBlock/KlimaStakingTransactionBlock';
import { IPlrDaoTransactionBlockValues } from '../components/TransactionBlock/PlrDaoStakingTransactionBlock';
import { ErrorMessages } from '../utils/validation';
import { Chain } from '../utils/chain';
import { IPlrStakingV2BlockValues } from '../components/TransactionBlock/PlrStakingV2TransactionBlock';
import { IHoneySwapLPTransactionBlockValues } from '../components/TransactionBlock/HoneySwapLPTransactionBlock';

export type IMultiCallData = {
  id: string;
  index: number;
  lastCallId: string | null;
  chain: Chain;
  token?: TokenListToken | null;
  value?: number;
  fixed?: boolean;
};

export type ITransactionBlockBase = {
  id: string;
  title?: string;
  errorMessages?: ErrorMessages;
  multiCallData?: IMultiCallData | null;
};

export type ITransactionBlockType =
  | typeof TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE
  | typeof TRANSACTION_BLOCK_TYPE.SEND_ASSET
  | typeof TRANSACTION_BLOCK_TYPE.ASSET_SWAP
  | typeof TRANSACTION_BLOCK_TYPE.KLIMA_STAKE
  | typeof TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE
  | typeof TRANSACTION_BLOCK_TYPE.DISABLED
  | typeof TRANSACTION_BLOCK_TYPE.PLR_STAKING_V2
  | typeof TRANSACTION_BLOCK_TYPE.HONEY_SWAP_LP;

export type IDefaultTransactionBlock = {
  title?: string;
  type: ITransactionBlockType;
};

export interface IAssetBridgeTransactionBlock extends ITransactionBlockBase {
  type: typeof TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE;
  values?: IAssetBridgeTransactionBlockValues;
}

export interface ISendAssetTransactionBlock extends ITransactionBlockBase {
  type: typeof TRANSACTION_BLOCK_TYPE.SEND_ASSET;
  values?: ISendAssetTransactionBlockValues;
}

export interface IAssetSwapTransactionBlock extends ITransactionBlockBase {
  type: typeof TRANSACTION_BLOCK_TYPE.ASSET_SWAP;
  values?: ISwapAssetTransactionBlockValues;
}

export interface IKlimaStakingTransactionBlock extends ITransactionBlockBase {
  type: typeof TRANSACTION_BLOCK_TYPE.KLIMA_STAKE;
  values?: IKlimaStakingTransactionBlockValues;
}

export interface IPlrDaoStakingMembershipBlock extends ITransactionBlockBase {
  type: typeof TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE;
  values?: IPlrDaoTransactionBlockValues;
}

export interface IPlrStakingV2Block extends ITransactionBlockBase {
  type: typeof TRANSACTION_BLOCK_TYPE.PLR_STAKING_V2;
  values?: IPlrStakingV2BlockValues;
}

export interface IHoneySwapLPBlock extends ITransactionBlockBase {
  type: typeof TRANSACTION_BLOCK_TYPE.HONEY_SWAP_LP;
  values?: IHoneySwapLPTransactionBlockValues;
}

interface IDisabledTransactionBlock extends ITransactionBlockBase {
  type: typeof TRANSACTION_BLOCK_TYPE.DISABLED;
}

export type ITransactionBlock =
  | IAssetBridgeTransactionBlock
  | ISendAssetTransactionBlock
  | IAssetSwapTransactionBlock
  | IKlimaStakingTransactionBlock
  | IPlrDaoStakingMembershipBlock
  | IPlrStakingV2Block
  | IHoneySwapLPBlock
  | IDisabledTransactionBlock;

export type ITransactionBlockValues =
  | IAssetBridgeTransactionBlockValues
  | ISwapAssetTransactionBlockValues
  | ISendAssetTransactionBlockValues
  | IKlimaStakingTransactionBlockValues
  | IPlrDaoTransactionBlockValues
  | IHoneySwapLPTransactionBlockValues
  | IPlrStakingV2BlockValues;

export type IMulticallBlock = { icon: string } & ITransactionBlock;

import { TokenListToken } from 'etherspot';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { ISendAssetTransactionBlockValues } from '../components/TransactionBlock/SendAssetTransactionBlock';
import { IAssetBridgeTransactionBlockValues } from '../components/TransactionBlock/AssetBridgeTransactionBlock';
import { ISwapAssetTransactionBlockValues } from '../components/TransactionBlock/AssetSwapTransactionBlock';
import { IKlimaStakingTransactionBlockValues } from '../components/TransactionBlock/KlimaStakingTransactionBlock';
import { ErrorMessages } from '../utils/validation';
import { Chain } from '../utils/chain';

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
	| typeof TRANSACTION_BLOCK_TYPE.DISABLED
	| typeof TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE;

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

interface IDisabledTransactionBlock extends ITransactionBlockBase {
	type: typeof TRANSACTION_BLOCK_TYPE.DISABLED;
}

export type ITransactionBlock =
	| IAssetBridgeTransactionBlock
	| ISendAssetTransactionBlock
	| IAssetSwapTransactionBlock
	| IKlimaStakingTransactionBlock
	| IDisabledTransactionBlock;

export type ITransactionBlockValues =
	| IAssetBridgeTransactionBlockValues
	| ISwapAssetTransactionBlockValues
	| ISendAssetTransactionBlockValues
	| IKlimaStakingTransactionBlockValues;

export type IMulticallBlock = { icon: string } & ITransactionBlock;

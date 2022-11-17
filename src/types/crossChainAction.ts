import { ExecuteAccountTransactionDto } from 'etherspot/dist/sdk/dto/execute-account-transaction.dto';
import { BigNumber } from 'ethers';
import { Route } from '@lifi/sdk';

import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';

interface AssetTransfer {
	address: string;
	decimals: number;
	symbol: string;
	amount: string;
	iconUrl?: string;
	usdPrice?: number;
}

interface AssetBridgeActionPreview {
	fromChainId: number;
	toChainId: number;
	fromAsset: AssetTransfer;
	toAsset: AssetTransfer;
	providerName: string;
	providerIconUrl: string | undefined;
	receiverAddress?: string;
  route: Route;
}

interface SendAssetActionPreview {
	chainId: number;
	asset: AssetTransfer;
	fromAddress: string;
	receiverAddress: string;
	isFromEtherspotWallet: boolean;
}

interface KlimaStakingActionPreview {
	fromChainId: number;
	fromAsset: AssetTransfer;
}

interface AssetSwapActionPreview {
	chainId: number;
	fromAsset: AssetTransfer;
	toAsset: AssetTransfer;
	providerName: string;
	providerIconUrl: string | undefined;
	receiverAddress?: string;
}

interface AssetBridgeAction {
	type: typeof TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE;
	preview: AssetBridgeActionPreview;
}

interface SendAssetAction {
	type: typeof TRANSACTION_BLOCK_TYPE.SEND_ASSET;
	preview: SendAssetActionPreview;
}

interface AssetSwapAction {
	type: typeof TRANSACTION_BLOCK_TYPE.ASSET_SWAP;
	preview: AssetSwapActionPreview;
}

interface KlimaStakingAction {
	type: typeof TRANSACTION_BLOCK_TYPE.KLIMA_STAKE;
	preview: KlimaStakingActionPreview;
}

export interface ICrossChainActionTransaction extends ExecuteAccountTransactionDto {
	status?: string;
	transactionHash?: string;
	createTimestamp: number;
	submitTimestamp?: number;
	finishTimestamp?: number;
}

export interface ICrossChainActionEstimation {
	gasCost?: BigNumber | null;
	usdPrice?: number | null;
	errorMessage?: string;
}

export type ICrossChainAction = {
	id: string;
	relatedTransactionBlockId: string;
	chainId: number;
	transactions: ICrossChainActionTransaction[];
	isEstimating: boolean;
	estimated: ICrossChainActionEstimation | null;
	useWeb3Provider?: boolean;
	batchTransactions?: ICrossChainAction[];
	batchHash?: string;
} & (AssetBridgeAction | SendAssetAction | AssetSwapAction | KlimaStakingAction);

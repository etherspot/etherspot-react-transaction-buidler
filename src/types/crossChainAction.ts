import { ExecuteAccountTransactionDto } from 'etherspot/dist/sdk/dto/execute-account-transaction.dto';
import { BigNumber } from 'ethers';
import { Route } from '@lifi/sdk';

import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { IMultiCallData } from './transactionBlock';
import { IPlrStakingV2BlockSwap } from '../components/TransactionBlock/PlrStakingV2TransactionBlock';

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

export interface SendAssetActionPreview {
  chainId: number;
  asset: AssetTransfer;
  fromAddress: string;
  receiverAddress: string;
  isFromEtherspotWallet: boolean;
}

interface KlimaStakingActionPreview {
	fromChainId: number;
	fromAsset: AssetTransfer;
	toAsset: AssetTransfer;
	providerName: string;
	providerIconUrl: string | undefined;
	receiverAddress?: string;
}

interface GmxStakingActionPreview {
	fromChainId: number;
	fromAsset: AssetTransfer;
	toAsset: AssetTransfer;
	providerName: string;
	providerIconUrl: string | undefined;
	receiverAddress?: string;
}

interface PlrStakingActionPreview {
  fromChainId: number;
  hasEnoughPLR: boolean;
  enableAssetSwap: boolean;
  enableAssetBridge: boolean;
  fromAsset: AssetTransfer;
  toAsset: AssetTransfer;
  providerName?: string;
  providerIconUrl?: string | undefined;
  receiverAddress?: string;
}

interface PlrStakingV2ActionPreview {
  fromChainId: number;
  toChainId: number;
  fromAsset: AssetTransfer;
  toAsset: AssetTransfer;
  providerName?: string;
  providerIconUrl?: string;
  receiverAddress?: string;
  swap?: IPlrStakingV2BlockSwap;
}

export interface AssetSwapActionPreview {
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
	destinationCrossChainAction: ICrossChainAction[];
	containsSwitchChain?: boolean;
	receiveAmount?: string;
	bridgeUsed?: string;
  gasCost?: string;
  transactionHash?: string;
}

interface GmxStakingAction {
	type: typeof TRANSACTION_BLOCK_TYPE.GMX_STAKE;
	preview: GmxStakingActionPreview;
	destinationCrossChainAction: ICrossChainAction[];
	containsSwitchChain?: boolean;
	receiveAmount?: string;
	bridgeUsed?: string;
  gasCost?: string;
  transactionHash?: string;
}

interface PlrStakingAction {
  type: typeof TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE;
  preview: PlrStakingActionPreview;
  destinationCrossChainAction: ICrossChainAction[];
  containsSwitchChain?: boolean;
  receiveAmount?: string;
  bridgeUsed?: string;
}

interface PlrStakingV2Action {
  type: typeof TRANSACTION_BLOCK_TYPE.PLR_STAKING_V2;
  preview: PlrStakingV2ActionPreview;
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
	feeAmount?: BigNumber | null;
}

export type ICrossChainAction = {
  id: string;
  relatedTransactionBlockId: string;
  chainId: number;
  transactions: ICrossChainActionTransaction[];
  isEstimating: boolean;
  estimated: ICrossChainActionEstimation | null;
  gasTokenAddress?: string | null;
  gasTokenDecimals?: number | null;
  gasTokenSymbol?: string | null;
  useWeb3Provider?: boolean;
  batchTransactions?: ICrossChainAction[];
  batchHash?: string;
  multiCallData?: IMultiCallData | null;
} & (
  AssetBridgeAction
  | SendAssetAction
  | AssetSwapAction
  | KlimaStakingAction
  | GmxStakingAction
  | PlrStakingAction
  | PlrStakingV2Action
);

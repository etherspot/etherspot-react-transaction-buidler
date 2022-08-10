import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';

import { TransactionBlock } from '../providers/TransactionBuilderContextProvider';
import { isValidEthereumAddress } from './common';
import { AssetBridgeTransactionBlockValues } from '../components/TransactionBlock/AssetBridgeTransactionBlock';
import { SendAssetTransactionBlockValues } from '../components/TransactionBlock/SendAssetTransactionBlock';


export const isValidAmount = (amount?: string): boolean => {
  if (!amount) return false;
  if (+amount <= 0) return false;
  return !isNaN(+amount);
}

export interface ErrorMessages {
  [field: string]: string;
}

export const validateTransactionBlockValues = (
  transactionBlock: TransactionBlock,
): ErrorMessages => {
  const errors: ErrorMessages = {};

  if (typeof transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION) {
    const transactionBlockValues: AssetBridgeTransactionBlockValues | undefined = transactionBlock.values;
    if (!transactionBlockValues?.fromChainId) errors.fromChainId = 'No source chain selected!';
    if (!transactionBlockValues?.toChainId) errors.toChainId = 'No destination chain selected!';
    if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlockValues?.fromAssetAddress) errors.fromAssetAddress = 'Invalid source asset selected!';
    if (!transactionBlockValues?.fromAssetDecimals) errors.fromAssetDecimals = 'Invalid source asset selected!';
    if (!transactionBlockValues?.toAssetAddress) errors.toAssetAddress = 'Invalid destination asset selected!';
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET_TRANSACTION) {
    const transactionBlockValues: SendAssetTransactionBlockValues | undefined = transactionBlock.values;
    if (!transactionBlockValues?.chainId) errors.chainId = 'No chain selected!';
    if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlockValues?.assetAddress) errors.assetAddress = 'Invalid asset selected!';
    if (!transactionBlockValues?.assetDecimals) errors.assetDecimals = 'Invalid asset selected!';
    if (!isValidEthereumAddress(transactionBlockValues?.receiverAddress)) errors.fromAssetDecimals = 'Invalid receiver address!';
  }

  return errors;
}

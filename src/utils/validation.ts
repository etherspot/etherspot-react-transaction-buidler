import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';

import { TransactionBlock } from '../providers/TransactionBuilderContextProvider';


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

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION) {
    if (!transactionBlock.values?.fromChainId) errors.fromChainId = 'No source chain selected!';
    if (!transactionBlock.values?.toChainId) errors.toChainId = 'No destination chain selected!';
    if (!isValidAmount(transactionBlock.values?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlock.values?.fromAssetAddress) errors.fromAssetAddress = 'Invalid source asset selected!';
    if (!transactionBlock.values?.fromAssetDecimals) errors.fromAssetDecimals = 'Invalid source asset selected!';
    if (!transactionBlock.values?.toAssetAddress) errors.toAssetAddress = 'Invalid destination asset selected!';
  }

  return errors;
}

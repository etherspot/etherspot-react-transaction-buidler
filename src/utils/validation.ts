import { ethers } from 'ethers';

import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { TransactionBlock } from '../providers/TransactionBuilderContextProvider';
import { AssetBridgeTransactionBlockValues } from '../components/TransactionBlock/AssetBridgeTransactionBlock';
import { SendAssetTransactionBlockValues } from '../components/TransactionBlock/SendAssetTransactionBlock';

export const isValidEthereumAddress = (address: string | undefined): boolean => {
  if (!address) return false;

  try {
    return ethers.utils.isAddress(address);
  } catch (e) {
    //
  }

  return false;
};

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
    if (!isValidEthereumAddress(transactionBlockValues?.receiverAddress)) errors.receiverAddress = 'Invalid receiver address!';
  }

  return errors;
}

export const isCaseInsensitiveMatch = (a: string | undefined, b: string | undefined): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
};

export const addressesEqual = (address1: string | undefined, address2: string | undefined): boolean => {
  if (address1 === address2) return true;
  if (!address1 || !address2) return false;

  return isCaseInsensitiveMatch(address1, address2);
};

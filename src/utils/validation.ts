import { ethers } from 'ethers';

import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { AddedTransactionBlock } from '../providers/TransactionBuilderContextProvider';
import { AssetBridgeTransactionBlockValues } from '../components/TransactionBlock/AssetBridgeTransactionBlock';
import { SendAssetTransactionBlockValues } from '../components/TransactionBlock/SendAssetTransactionBlock';
import { SwapAssetTransactionBlockValues } from '../components/TransactionBlock/AssetSwapTransactionBlock';

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
  transactionBlock: AddedTransactionBlock,
): ErrorMessages => {
  const errors: ErrorMessages = {};

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE) {
    const transactionBlockValues: AssetBridgeTransactionBlockValues | undefined = transactionBlock.values;
    if (!transactionBlockValues?.fromChainId) errors.fromChainId = 'No source chain selected!';
    if (!transactionBlockValues?.toChainId) errors.toChainId = 'No destination chain selected!';
    if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlockValues?.fromAssetAddress) errors.fromAssetAddress = 'Invalid source asset selected!';
    if (!transactionBlockValues?.fromAssetDecimals) errors.fromAssetDecimals = 'Invalid source asset selected!';
    if (!transactionBlockValues?.toAssetAddress) errors.toAssetAddress = 'Invalid destination asset selected!';
    if (!transactionBlockValues?.quote) errors.toAssetAddress = 'No quote selected!';
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) {
    const transactionBlockValues: SendAssetTransactionBlockValues | undefined = transactionBlock.values;
    if (!transactionBlockValues?.chainId) errors.chainId = 'No chain selected!';
    if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlockValues?.assetAddress) errors.assetAddress = 'Invalid asset selected!';
    if (!transactionBlockValues?.assetDecimals) errors.assetDecimals = 'Invalid asset selected!';
    if (!isValidEthereumAddress(transactionBlockValues?.fromAddress)) errors.fromAddress = 'Invalid source address!';
    if (!isValidEthereumAddress(transactionBlockValues?.receiverAddress)) errors.receiverAddress = 'Invalid receiver address!';
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP) {
    const transactionBlockValues: SwapAssetTransactionBlockValues | undefined = transactionBlock.values;
    if (!transactionBlockValues?.chainId) errors.chainId = 'No chain selected!';
    if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlockValues?.fromAssetAddress) errors.fromAssetAddress = 'Invalid source asset selected!';
    if (!transactionBlockValues?.fromAssetDecimals) errors.fromAssetDecimals = 'Invalid source asset selected!';
    if (!transactionBlockValues?.fromAssetSymbol) errors.fromAssetSymbol = 'Invalid source asset selected!';
    if (!transactionBlockValues?.toAssetAddress) errors.toAssetAddress = 'Invalid destination asset selected!';
    if (!transactionBlockValues?.toAssetDecimals) errors.toAssetDecimals = 'Invalid destination asset selected!';
    if (!transactionBlockValues?.toAssetSymbol) errors.toAssetSymbol = 'Invalid destination asset selected!';
    if (!transactionBlockValues?.offer) errors.offer = 'No offer selected!';
    if (transactionBlockValues?.isDifferentReceiverAddress && !isValidEthereumAddress(transactionBlockValues?.receiverAddress)) errors.receiverAddress = 'Invalid receiver address!!';
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

export const isZeroAddress = (address: string | undefined): boolean => addressesEqual(address, ethers.constants.AddressZero)

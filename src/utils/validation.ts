import { ethers } from 'ethers';

import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { IAssetBridgeTransactionBlockValues } from '../components/TransactionBlock/AssetBridgeTransactionBlock';
import { ISendAssetTransactionBlockValues } from '../components/TransactionBlock/SendAssetTransactionBlock';
import { ISwapAssetTransactionBlockValues } from '../components/TransactionBlock/AssetSwapTransactionBlock';
import { nativeAssetPerChainId } from './chain';
import { ITransactionBlock } from '../types/transactionBlock';
import { IKlimaStakingTransactionBlockValues } from '../components/TransactionBlock/KlimaStakingTransactionBlock';
import { IPlrDaoTransactionBlockValues } from '../components/TransactionBlock/PlrDaoStakingTransactionBlock';
import { IPlrStakingV2BlockValues } from '../components/TransactionBlock/PlrStakingV2TransactionBlock';
import { IHoneySwapLPTransactionBlockValues } from '../components/TransactionBlock/HoneySwapLPTransactionBlock';
import { GNOSIS_USDC_CONTRACT_ADDRESS } from '../constants/assetConstants';

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
};

export interface ErrorMessages {
  [field: string]: string;
}

export const validateTransactionBlockValues = (transactionBlock: ITransactionBlock): ErrorMessages => {
  const errors: ErrorMessages = {};

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE) {
    const transactionBlockValues: IKlimaStakingTransactionBlockValues | undefined = transactionBlock.values;
    if (!transactionBlockValues?.fromChainId) errors.fromChainId = 'No source chain selected!';
    if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlockValues?.fromAssetAddress) errors.fromAssetAddress = 'Invalid source asset selected!';
    if (!transactionBlockValues?.fromAssetSymbol) errors.fromAssetSymbol = 'Invalid source asset selected!';
    if (!transactionBlockValues?.fromAssetDecimals) errors.fromAssetDecimals = 'Invalid source asset selected!';
    if (transactionBlockValues?.receiverAddress && !isValidEthereumAddress(transactionBlockValues?.receiverAddress))
      errors.receiverAddress = 'Invalid receiver address!';
    if (!transactionBlockValues?.accountType) errors.accountType = 'No account type selected!';
    if (!transactionBlockValues?.routeToKlima) errors.route = 'No Offer selected';
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE) {
    const transactionBlockValues: IPlrDaoTransactionBlockValues | undefined = transactionBlock.values;
    if (!transactionBlockValues?.fromChainId) errors.fromChainId = 'No source chain selected!';
    if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlockValues?.fromAsset?.address) errors.fromAssetAddress = 'Invalid source asset selected!';
    if (!transactionBlockValues?.fromAsset?.symbol) errors.fromAssetSymbol = 'Invalid source asset selected!';
    if (!transactionBlockValues?.fromAsset?.decimals) errors.fromAssetDecimals = 'Invalid source asset selected!';
    if (transactionBlockValues?.receiverAddress && !isValidEthereumAddress(transactionBlockValues?.receiverAddress))
      errors.receiverAddress = 'Invalid receiver address!';
    if (!transactionBlockValues?.accountType) errors.accountType = 'No account type selected!';
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE) {
    const transactionBlockValues: IAssetBridgeTransactionBlockValues | undefined = transactionBlock.values;
    if (!transactionBlockValues?.fromChain) errors.fromChain = 'No source chain selected!';
    if (!transactionBlockValues?.toChain) errors.toChain = 'No destination chain selected!';
    if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlockValues?.fromAsset) errors.fromAsset = 'Invalid source asset selected!';
    if (!transactionBlockValues?.toAsset) errors.toAsset = 'Invalid destination asset selected!';
    if (!transactionBlockValues?.route) errors.route = 'No route selected!';
    if (transactionBlockValues?.receiverAddress && !isValidEthereumAddress(transactionBlockValues?.receiverAddress))
      errors.receiverAddress = 'Invalid receiver address!';
    if (!transactionBlockValues?.accountType) errors.accountType = 'No account type selected!';
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) {
    const transactionBlockValues: ISendAssetTransactionBlockValues | undefined = transactionBlock.values;
    if (!transactionBlockValues?.chain) errors.chain = 'No chain selected!';
    if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlockValues?.selectedAsset) errors.selectedAsset = 'Invalid asset selected!';
    if (!isValidEthereumAddress(transactionBlockValues?.fromAddress)) errors.fromAddress = 'Invalid source address!';
    if (!isValidEthereumAddress(transactionBlockValues?.receiverAddress))
      errors.receiverAddress = 'Invalid receiver address!';
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP) {
    const transactionBlockValues: ISwapAssetTransactionBlockValues | undefined = transactionBlock.values;
    if (!transactionBlockValues?.chain) errors.chain = 'No chain selected!';
    if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlockValues?.fromAsset) errors.fromAsset = 'Invalid source asset selected!';
    if (!transactionBlockValues?.toAsset) errors.toAsset = 'Invalid destination asset selected!';
    if (!transactionBlockValues?.offer) errors.offer = 'No offer selected!';
    if (
      transactionBlockValues?.isDifferentReceiverAddress &&
      !isValidEthereumAddress(transactionBlockValues?.receiverAddress)
    )
      errors.receiverAddress = 'Invalid receiver address!';
    if (!transactionBlockValues?.accountType) errors.accountType = 'No account type selected!';
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.PLR_STAKING_V2) {
    const transactionBlockValues: IPlrStakingV2BlockValues | undefined = transactionBlock.values;
    if (!transactionBlockValues?.fromChain) errors.fromChain = 'No source chain selected!';
    if (!transactionBlockValues?.toChain) errors.toChain = 'No destination chain selected!';
    if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlockValues?.fromAsset) errors.fromAsset = 'Invalid source asset selected!';
    if (!transactionBlockValues?.toAsset) errors.toAsset = 'Invalid destination asset selected!';
    if (transactionBlockValues?.swap?.type === 'CROSS_CHAIN_SWAP' && !transactionBlockValues?.swap?.route) {
      errors.route = 'No route selected!';
    }
    if (transactionBlockValues?.swap?.type === 'SAME_CHAIN_SWAP' && !transactionBlockValues?.swap?.offer) {
      errors.route = 'No offer selected!';
    }
    if (transactionBlockValues?.receiverAddress && !isValidEthereumAddress(transactionBlockValues?.receiverAddress)) {
      errors.receiverAddress = 'Invalid receiver address!';
    }
    if (!transactionBlockValues?.accountType) errors.accountType = 'No account type selected!';
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.HONEY_SWAP_LP) {
    const transactionBlockValues: IHoneySwapLPTransactionBlockValues | undefined = transactionBlock.values;
    if (!transactionBlockValues?.fromChainId) errors.fromChainId = 'No source chain selected!';
    if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    // if (!isValidAmount(transactionBlockValues?.amount)) errors.amount = 'Incorrect asset amount!';
    if (!transactionBlockValues?.fromAssetAddress) errors.fromAssetAddress = 'Invalid source asset selected!';
    if (!transactionBlockValues?.fromAssetSymbol) errors.fromAssetSymbol = 'Invalid source asset selected!';
    if (!transactionBlockValues?.fromAssetSymbol) errors.fromAssetSymbol = 'Invalid source asset selected!';
    if (!transactionBlockValues?.toToken1) errors.toToken1 = 'Select the first token';
    if (!transactionBlockValues?.toToken2) errors.toToken2 = 'Select the second token';
    if (!transactionBlockValues?.offer1 && transactionBlockValues?.toToken1?.address !== GNOSIS_USDC_CONTRACT_ADDRESS)
      errors.offer1 = 'Select the second token';
    if (!transactionBlockValues?.offer2 && transactionBlockValues?.toToken2?.address !== GNOSIS_USDC_CONTRACT_ADDRESS)
      errors.offer2 = 'Select the second token';
  }

  return errors;
};

export const isCaseInsensitiveMatch = (a: string | undefined, b: string | undefined): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
};

export const addressesEqual = (address1: string | undefined | null, address2: string | undefined | null): boolean => {
  if (address1 === address2) return true;
  if (!address1 || !address2) return false;

  return isCaseInsensitiveMatch(address1, address2);
};

const zeroAddressConstants = [
  ethers.constants.AddressZero,
  '0x000000000000000000000000000000000000dEaD',
  '0xdeaDDeADDEaDdeaDdEAddEADDEAdDeadDEADDEaD',
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd',
  '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
];

export const isZeroAddress = (address: string | undefined | null): boolean =>
  !address || (!!address && zeroAddressConstants.some((zeroAddress) => addressesEqual(address, zeroAddress)));

export const isNativeAssetAddress = (address: string | undefined, chainId: number): boolean =>
  !address || isZeroAddress(address) || addressesEqual(address, nativeAssetPerChainId[chainId]?.address);

export const containsText = (text: string | undefined, query: string): boolean => {
  try {
    return !!text && text.toLowerCase().includes(query.toLowerCase());
  } catch (e) {
    //
  }
  return false;
};

import { Sdk as EtherspotSdk } from 'etherspot';
import { ethers } from 'ethers';
import { uniqueId } from 'lodash';
import { ERC20TokenContract } from 'etherspot/dist/sdk/contract/internal/erc20-token.contract';

import { ExecuteAccountTransactionDto } from 'etherspot/dist/sdk/dto/execute-account-transaction.dto';

import { ContractNames, getContractAbi } from '@etherspot/contracts';

import { AddedTransactionBlock } from '../providers/TransactionBuilderContextProvider';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import {
  addressesEqual,
  isValidEthereumAddress,
} from './validation';
import { nativeAssetPerChainId } from './chain';


interface AssetTransfer {
  address: string;
  decimals: number;
  symbol: string;
  amount: string;
}

interface AssetBridgeActionPreview {
  fromChainId: number;
  toChainId: number;
  fromAsset: AssetTransfer;
  toAsset: AssetTransfer;
}

interface SendAssetActionPreview {
  chainId: number;
  asset: AssetTransfer;
  receiverAddress: string;
}

interface AssetSwapActionPreview {
  chainId: number;
  fromAsset: AssetTransfer;
  toAsset: AssetTransfer;
  providerName: string;
  receiverAddress?: string;
}

export type CrossChainActionPreview = AssetBridgeActionPreview
  | SendAssetActionPreview
  | AssetSwapActionPreview;

export interface CrossChainActionTransaction extends ExecuteAccountTransactionDto {
  chainId: number;
}

export interface CrossChainAction {
  id: string;
  submitTimestamp: number;
  type: string;
  preview: CrossChainActionPreview;
  transactions: CrossChainActionTransaction[];
}

export const buildCrossChainAction = async (
  sdk: EtherspotSdk,
  transactionBlock: AddedTransactionBlock,
): Promise<{ errorMessage?: string; crossChainAction?: CrossChainAction; }> => {
  const submitTimestamp = +new Date();
  const crossChainActionId = uniqueId(`${submitTimestamp}-`);

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE
    && !!transactionBlock?.values?.fromChainId
    && !!transactionBlock?.values?.toChainId
    && !!transactionBlock?.values?.toAssetAddress
    && !!transactionBlock?.values?.fromAssetAddress
    && !!transactionBlock?.values?.fromAssetDecimals
    && !!transactionBlock?.values?.amount) {
    try {
      const {
        values: {
          amount,
          fromChainId,
          toChainId,
          fromAssetAddress: fromTokenAddress,
          toAssetAddress: toTokenAddress,
          fromAssetDecimals,
        },
      } = transactionBlock;

      const amountBN = ethers.utils.parseUnits(amount, fromAssetDecimals);

      let quote;
      if (!transactionBlock?.values?.quote) {
        const { items } = await sdk.getCrossChainQuotes({
          fromChainId,
          toChainId,
          fromAmount: amountBN,
          fromTokenAddress,
          toTokenAddress,
        });
        ([quote] = items);
      } else {
        quote = transactionBlock.values.quote;
      }

      const preview = {
        fromChainId,
        toChainId,
        fromAsset: {
          address: quote.estimate.data.fromToken.address,
          decimals: quote.estimate.data.fromToken.decimals,
          symbol: quote.estimate.data.fromToken.symbol,
          amount: quote.estimate.fromAmount,
        },
        toAsset: {
          address: quote.estimate.data.toToken.address,
          decimals: quote.estimate.data.toToken.decimals,
          symbol: quote.estimate.data.toToken.symbol,
          amount: quote.estimate.toAmount,
        },
      };

      const bridgeTransaction = {
        to: quote.transaction.to,
        value: quote.transaction.value,
        data: quote.transaction.data,
        chainId: fromChainId
      };

      let transactions: CrossChainActionTransaction[] = [bridgeTransaction];

      const approvalAddress = quote?.approvalData?.approvalAddress;
      const approvalAmount = quote?.approvalData?.amount;
      const assetContractAddress = quote.estimate.data.fromToken.address;
      if (approvalAddress
        && approvalAmount
        && ethers.utils.isAddress(assetContractAddress)
        && !addressesEqual(assetContractAddress, ethers.constants.AddressZero)) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, assetContractAddress);
        const approvalTransactionRequest = erc20Contract?.encodeApprove?.(approvalAddress, approvalAmount);
        if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
          return { errorMessage: 'Failed build bridge approval transaction!' };
        }

        const approvalTransaction = {
          to: approvalTransactionRequest.to,
          data: approvalTransactionRequest.data,
          chainId: fromChainId,
          value: 0,
        };

        transactions = [approvalTransaction, ...transactions];
      }

      const crossChainAction: CrossChainAction = {
        id: crossChainActionId,
        submitTimestamp,
        type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE,
        preview,
        transactions,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get bridge quote!' };
    }
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET
    && !!transactionBlock?.values?.chainId
    && !!transactionBlock?.values?.assetAddress
    && !!transactionBlock?.values?.assetDecimals
    && !!transactionBlock?.values?.assetSymbol
    && !!transactionBlock?.values?.receiverAddress
    && !!transactionBlock?.values?.amount) {
    try {
      const {
        values: {
          chainId,
          assetAddress,
          assetDecimals,
          assetSymbol,
          receiverAddress,
          amount,
        },
      } = transactionBlock;

      const amountBN = ethers.utils.parseUnits(amount, assetDecimals);

      const preview = {
        chainId,
        receiverAddress,
        asset: {
          address: assetAddress,
          decimals: assetDecimals,
          symbol: assetSymbol,
          amount: amountBN.toString(),
        },
      };

      let transferTransaction: CrossChainActionTransaction = {
        chainId,
        to: receiverAddress,
        value: amountBN,
      };

      if (ethers.utils.isAddress(assetAddress) && !addressesEqual(assetAddress, ethers.constants.AddressZero)) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, assetAddress);
        const transferTransactionRequest = erc20Contract?.encodeTransfer?.(receiverAddress, amountBN);
        if (!transferTransactionRequest || !transferTransactionRequest.to) {
          return { errorMessage: 'Failed build transfer transaction!' };
        }

        transferTransaction = {
          chainId,
          to: transferTransactionRequest.to,
          data: transferTransactionRequest.data,
          value: 0,
        }
      }

      const crossChainAction: CrossChainAction = {
        id: crossChainActionId,
        submitTimestamp,
        type: TRANSACTION_BLOCK_TYPE.SEND_ASSET,
        preview,
        transactions: [transferTransaction],
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get create asset transfer!' };
    }
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP
    && !!transactionBlock?.values?.chainId
    && !!transactionBlock?.values?.fromAssetAddress
    && !!transactionBlock?.values?.fromAssetDecimals
    && !!transactionBlock?.values?.fromAssetSymbol
    && !!transactionBlock?.values?.toAssetAddress
    && !!transactionBlock?.values?.toAssetDecimals
    && !!transactionBlock?.values?.toAssetSymbol
    && !!transactionBlock?.values?.amount
    && !!transactionBlock?.values?.offer) {
    try {
      const {
        values: {
          amount,
          chainId,
          fromAssetAddress,
          fromAssetDecimals,
          fromAssetSymbol,
          toAssetAddress,
          toAssetDecimals,
          toAssetSymbol,
          offer,
          receiverAddress,
        },
      } = transactionBlock;

      const fromAmountBN = ethers.utils.parseUnits(amount, fromAssetDecimals);

      let preview = {
        chainId,
        fromAsset: {
          address: fromAssetAddress,
          decimals: fromAssetDecimals,
          symbol: fromAssetSymbol,
          amount: fromAmountBN.toString(),
        },
        toAsset: {
          address: toAssetAddress,
          decimals: toAssetDecimals,
          symbol: toAssetSymbol,
          amount: offer.receiveAmount.toString(),
        },
        providerName: offer.provider,
        receiverAddress,
      };

      let transactions: CrossChainActionTransaction[] = offer.transactions.map((transaction) => ({
        ...transaction,
        chainId,
      }));

      // not native asset and no erc20 approval transaction included
      if (fromAssetAddress && !addressesEqual(fromAssetAddress, nativeAssetPerChainId[chainId].address) && transactions.length === 1) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
        const approvalTransactionRequest = erc20Contract?.encodeApprove?.(transactions[0].to, fromAmountBN);
        if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
          return { errorMessage: 'Failed build bridge approval transaction!' };
        }

        const approvalTransaction = {
          to: approvalTransactionRequest.to,
          data: approvalTransactionRequest.data,
          chainId,
          value: 0,
        };

        transactions = [approvalTransaction, ...transactions];
      }

      if (receiverAddress && isValidEthereumAddress(receiverAddress)) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
        const transferTransactionRequest = erc20Contract?.encodeTransfer?.(receiverAddress, offer.receiveAmount);
        if (!transferTransactionRequest || !transferTransactionRequest.to) {
          return { errorMessage: 'Failed build transfer transaction!' };
        }

        const transferTransaction = {
          chainId,
          to: transferTransactionRequest.to,
          data: transferTransactionRequest.data,
          value: 0,
        }

        transactions = [...transactions, transferTransaction];
      }

      const crossChainAction: CrossChainAction = {
        id: crossChainActionId,
        submitTimestamp,
        type: TRANSACTION_BLOCK_TYPE.ASSET_SWAP,
        preview,
        transactions,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to build swap transaction!' };
    }
  }

  return { errorMessage: 'Failed to build transaction!' }
}

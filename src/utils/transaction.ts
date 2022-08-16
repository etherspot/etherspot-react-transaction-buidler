import { Sdk as EtherspotSdk } from 'etherspot';
import { ethers } from 'ethers';
import { uniqueId } from 'lodash';
import { ERC20TokenContract } from 'etherspot/dist/sdk/contract/internal/erc20-token.contract';

import { ExecuteAccountTransactionDto } from 'etherspot/dist/sdk/dto/execute-account-transaction.dto';

import { ContractNames, getContractAbi } from '@etherspot/contracts';

import { TransactionBlock } from '../providers/TransactionBuilderContextProvider';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { addressesEqual } from './validation';


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

export type CrossChainActionPreview = AssetBridgeActionPreview | SendAssetActionPreview;

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
  transactionBlock: TransactionBlock,
): Promise<{ errorMessage?: string; crossChainAction?: CrossChainAction; }> => {
  const submitTimestamp = +new Date();
  const crossChainActionId = uniqueId(`${submitTimestamp}-`);

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION
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

      const { items } = await sdk.getCrossChainQuotes({
        fromChainId,
        toChainId,
        fromAmount: amountBN,
        fromTokenAddress,
        toTokenAddress,
      });

      const [quote] = items;

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
        type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION,
        preview,
        transactions,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get bridge quote!' };
    }
  }

  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET_TRANSACTION
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
        type: TRANSACTION_BLOCK_TYPE.SEND_ASSET_TRANSACTION,
        preview,
        transactions: [transferTransaction],
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get create asset transfer!' };
    }
  }

  return { errorMessage: 'Failed to build transaction!' }
}

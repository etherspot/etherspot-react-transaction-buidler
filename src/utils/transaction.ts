import { Sdk as EtherspotSdk } from 'etherspot';
import {
  BigNumberish,
  ethers,
} from 'ethers';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { ExecuteAccountTransactionDto } from 'etherspot/dist/sdk/dto/execute-account-transaction.dto';

import { ContractNames, getContractAbi } from '@etherspot/contracts';

import { TransactionBlock } from '../providers/TransactionBuilderContextProvider';
import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';


interface ERC20Contract {
  encodeApprove?(spender: string, value: BigNumberish): TransactionRequest;
  callAllowance?(owner: string, spender: string): Promise<string>;
}

interface AssetTransfer {
  address: string;
  decimals: number;
  symbol: string;
  amount: string;
}

interface AssetBridgeActionPreview {
  fromChainId: number;
  toChainId: number;
  fromAsset: AssetTransfer,
  toAsset: AssetTransfer,
}

export type CrossChainActionPreview = AssetBridgeActionPreview;

export interface CrossChainActionTransaction extends ExecuteAccountTransactionDto {
  chainId: number;
}

export interface CrossChainAction {
  type: string;
  preview: CrossChainActionPreview;
  transactions: CrossChainActionTransaction[];
}

export const buildCrossChainAction = async (
  sdk: EtherspotSdk,
  transactionBlock: TransactionBlock,
): Promise<{ errorMessage?: string; crossChainAction?: CrossChainAction; }> => {
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
        && assetContractAddress.toLowerCase() !== ethers.constants.AddressZero) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20Contract>('erc20Contract', abi, assetContractAddress);
        const approvalTransactionRequest = erc20Contract?.encodeApprove?.(approvalAddress, approvalAmount);
        if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
          return { errorMessage: 'Failed build bridge approval transaction!' };
        }

        const approvalTransaction = {
          to: approvalTransactionRequest.to,
          value: approvalTransactionRequest.value,
          data: approvalTransactionRequest.data,
          chainId: fromChainId,
        };

        transactions = [approvalTransaction, ...transactions];
      }

      const crossChainAction: CrossChainAction = {
        type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION,
        preview,
        transactions,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get bridge quote!' };
    }
  }

  return { errorMessage: 'Failed to build transaction!' }
}

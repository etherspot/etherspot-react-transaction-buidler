import { Sdk as EtherspotSdk } from 'etherspot';
import {
  BigNumberish,
  ethers,
} from 'ethers';
import { TransactionRequest } from '@ethersproject/abstract-provider';
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

interface AssetBridgeTransactionPreview {
  fromChainId: number;
  toChainId: number;
  fromAsset: AssetTransfer,
  toAsset: AssetTransfer,
}

export type DraftTransactionPreview = AssetBridgeTransactionPreview;

export interface DraftTransaction {
  type: string;
  preview: DraftTransactionPreview;
  transactions: TransactionRequest[];
}

export const buildDraftTransaction = async (
  sdk: EtherspotSdk,
  transactionBlock: TransactionBlock,
): Promise<{ errorMessage?: string; draftTransaction?: DraftTransaction; }> => {
  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION
    && transactionBlock?.values?.fromChainId
    && transactionBlock?.values?.toChainId
    && transactionBlock?.values?.toAssetAddress
    && transactionBlock?.values?.fromAssetAddress
    && transactionBlock?.values?.fromAssetDecimals
    && transactionBlock?.values?.amount) {
    try {
      const {
        amount,
        fromChainId,
        toChainId,
        fromAssetAddress: fromTokenAddress,
        toAssetAddress: toTokenAddress,
        fromAssetDecimals,
      } = transactionBlock.values;

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



      const { to, value, data }: TransactionRequest = quote.transaction;
      const bridgeTransaction = { to, value, data };

      let transactions = [bridgeTransaction];

      const approvalAddress = quote?.approvalData?.approvalAddress;
      const approvalAmount = quote?.approvalData?.amount;
      const assetContractAddress = quote.estimate.data.fromToken.address;
      if (approvalAddress
        && approvalAmount
        && ethers.utils.isAddress(assetContractAddress)
        && assetContractAddress.toLowerCase() !== ethers.constants.AddressZero) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20Contract>('erc20Contract', abi, assetContractAddress);
        const approvalTransaction = erc20Contract?.encodeApprove?.(approvalAddress, approvalAmount);
        if (approvalTransaction) {
          // @ts-ignore
          // TODO: check confusing type mismatch later
          transactions = [approvalTransaction, ...transactions];
        }
      }

      const draftTransaction: DraftTransaction = {
        type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION,
        preview,
        transactions,
      };

      console.log(draftTransaction)

      return { draftTransaction };
    } catch (e) {
      return { errorMessage: 'Failed to get bridge quote!' };
    }
  }

  return { errorMessage: 'Failed to build transaction!' }
}

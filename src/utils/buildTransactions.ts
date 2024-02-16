import { ExchangeOffer, Sdk as EtherspotSdk } from 'etherspot';
import { Route } from '@lifi/sdk';
import { BigNumber, ethers } from 'ethers';
import { ERC20TokenContract } from 'etherspot/dist/sdk/contract/internal/erc20-token.contract';

import { ContractNames, getContractAbi } from '@etherspot/contracts';

import { addressesEqual, isValidEthereumAddress } from './validation';
import { nativeAssetPerChainId } from './chain';
import { ICrossChainActionTransaction } from '../types/crossChainAction';
import { CROSS_CHAIN_ACTION_STATUS } from '../constants/transactionDispatcherConstants';

export const fetchSwapAssetTransaction = async (
  chainId: number,
  fromAmountBN: BigNumber,
  fromAssetAddress: string,
  offer: ExchangeOffer | null,
  receiverAddress?: string,
  sdk?: EtherspotSdk | null
): Promise<{ errorMessage?: string; result?: { transactions: ICrossChainActionTransaction[] } }> => {
  if (!sdk) return { errorMessage: 'No sdk found' };

  if (!offer) {
    return { errorMessage: 'Failed build PLR Dao Staking transaction!' };
  }
  try {
    const createTimestamp = +new Date();
    let transactions: ICrossChainActionTransaction[] = offer.transactions.map((transaction) => ({
      ...transaction,
      chainId,
      createTimestamp,
      status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
    }));

    // not native asset and no erc20 approval transaction included
    if (
      fromAssetAddress &&
      !addressesEqual(fromAssetAddress, nativeAssetPerChainId[chainId].address) &&
      transactions.length === 1
    ) {
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
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
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
        to: transferTransactionRequest.to,
        data: transferTransactionRequest.data,
        value: 0,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      };

      transactions = [...transactions, transferTransaction];
    }
    return { result: { transactions } };
  } catch (err) {
    return { errorMessage: 'Failed build transfer transaction!' };
  }
};

export const buildLiFiBridgeTransactions = async (
  chainId: number,
  route: Route | null,
  sdk?: EtherspotSdk | null
): Promise<{ errorMessage?: string; transactions?: ICrossChainActionTransaction[] }> => {
  try {
    const createTimestamp = +new Date();
    if (!sdk) return { errorMessage: 'No sdk found' };
    if (!route) return { errorMessage: 'Failed to fetch routes' };
    const { items: advancedRouteSteps } = await sdk.getStepTransaction({ route });

    let transactions: ICrossChainActionTransaction[] = advancedRouteSteps.map(
      ({ to, value, data, chainId: routeChainId }) => ({
        to: to as string,
        value,
        data,
        chainId: routeChainId,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      })
    );

    if (
      ethers.utils.isAddress(route.fromToken.address) &&
      !addressesEqual(route.fromToken.address, nativeAssetPerChainId[chainId].address) &&
      transactions.length === 1 &&
      route.fromAmount
    ) {
      const abi = getContractAbi(ContractNames.ERC20Token);
      const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, route.fromToken.address);
      const approvalTransactionRequest = erc20Contract?.encodeApprove?.(transactions[0].to, route.fromAmount);
      if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
        return { errorMessage: 'Failed build bridge approval transaction!' };
      }

      const approvalTransaction = {
        to: approvalTransactionRequest.to,
        data: approvalTransactionRequest.data,
        value: 0,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      };

      transactions = [approvalTransaction, ...transactions];
    }
    return { transactions };
  } catch (err) {
    return { errorMessage: 'Failed build transfer transaction!' };
  }
};

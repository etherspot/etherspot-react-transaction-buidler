import { Sdk as EtherspotSdk } from 'etherspot';
import { Route } from '@lifi/sdk';
import { BigNumberish } from 'ethers';
import { TransactionRequest } from 'etherspot/dist/sdk/common';
import { ERC20TokenContract } from 'etherspot/dist/sdk/contract/internal/erc20-token.contract';
import { ContractNames, getContractAbi } from '@etherspot/contracts';

// Type
import { ICrossChainActionTransaction } from '../types/crossChainAction';

// Constants
import { CROSS_CHAIN_ACTION_STATUS } from '../constants/transactionDispatcherConstants';

// Local
import { addressesEqual } from './validation';
import { CHAIN_ID, nativeAssetPerChainId } from './chain';
import { bridgeServiceIdToDetails } from './bridge';

export const klimaDaoStaking = async (
  routeToKlima?: Route | null,
  receiverAddress?: string,
  sdk?: EtherspotSdk | null
): Promise<{
  errorMessage?: string;
  result?: { transactions: ICrossChainActionTransaction[]; provider?: string; iconUrl?: string };
}> => {
  if (!sdk) return { errorMessage: 'No sdk found' };

  if (!routeToKlima) {
    return { errorMessage: 'No routes found for staking. Please try again' };
  }

  try {
    const fromAssetAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const createTimestamp = +new Date();

    const bestRoute = routeToKlima;

    const { items: advancedRouteSteps } = await sdk.getStepTransaction({ route: bestRoute });

    let transactions = advancedRouteSteps.map((transaction) => ({
      to: transaction.to as string,
      value: transaction.value,
      data: transaction.data,
      createTimestamp,
      status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
    }));

    // not native asset and no erc20 approval transaction included
    if (
      !addressesEqual(fromAssetAddress, nativeAssetPerChainId[CHAIN_ID.POLYGON].address) &&
      transactions.length === 1
    ) {
      const abi = getContractAbi(ContractNames.ERC20Token);
      const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
      const approvalTransactionRequest = erc20Contract?.encodeApprove?.(
        transactions[0].to as string,
        bestRoute.toAmountMin
      );
      if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
        return { errorMessage: 'Failed build bridge approval transaction!' };
      }

      const approvalTransaction = {
        to: approvalTransactionRequest.to,
        data: approvalTransactionRequest.data,
        chainId: CHAIN_ID.POLYGON,
        value: '0',
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      };

      transactions = [approvalTransaction, ...transactions];
    }

    const abi = getContractAbi(ContractNames.ERC20Token);
    const erc20Contract = sdk.registerContract<ERC20TokenContract>(
      'erc20Contract',
      abi,
      '0x4e78011ce80ee02d2c3e649fb657e45898257815'
    ); // Klima on Polygon
    const klimaApprovalTransactionRequest = erc20Contract?.encodeApprove?.(
      '0x4D70a031Fc76DA6a9bC0C922101A05FA95c3A227',
      bestRoute.toAmountMin
    ); // Klima staking
    if (!klimaApprovalTransactionRequest || !klimaApprovalTransactionRequest.to) {
      return { errorMessage: 'Failed build bridge approval transaction!' };
    }

    const klimaApprovalTransaction = {
      to: klimaApprovalTransactionRequest.to,
      data: klimaApprovalTransactionRequest.data,
      chainId: CHAIN_ID.POLYGON,
      value: '0',
      createTimestamp,
      status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
    };

    const klimaStakingAbi = ['function stake(uint256 value)'];
    const klimaStakingContract = sdk.registerContract<{ encodeStake: (amount: BigNumberish) => TransactionRequest }>(
      'klimaStakingContract',
      klimaStakingAbi,
      '0x4D70a031Fc76DA6a9bC0C922101A05FA95c3A227'
    ); // Klima on Polygon
    const klimaStakeTransactionRequest = klimaStakingContract.encodeStake?.(bestRoute.toAmountMin); // Klima staking
    if (!klimaStakeTransactionRequest || !klimaStakeTransactionRequest.to) {
      return { errorMessage: 'Failed build bridge approval transaction!' };
    }

    const klimaStakingTransaction = {
      to: klimaStakeTransactionRequest.to,
      data: klimaStakeTransactionRequest.data,
      chainId: CHAIN_ID.POLYGON,
      value: '0',
      createTimestamp,
      status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
    };

    transactions = [...transactions, klimaApprovalTransaction, klimaStakingTransaction];

    // transfer back to receiver address if not the same as contract
    if (receiverAddress && !addressesEqual(receiverAddress, sdk.state.accountAddress)) {
      const erc20Abi = getContractAbi(ContractNames.ERC20Token);
      const sKlimaContractAddress = '0xb0c22d8d350c67420f06f48936654f567c73e8c8';
      const sKlimaContract = sdk.registerContract<ERC20TokenContract>('erc20Contract', erc20Abi, sKlimaContractAddress);
      const sKlimaTransferTransactionRequest = sKlimaContract?.encodeTransfer?.(receiverAddress, bestRoute.toAmountMin);
      if (!sKlimaTransferTransactionRequest || !sKlimaTransferTransactionRequest.to) {
        return { errorMessage: 'Failed build transfer back transaction!' };
      }

      const sKlimaTransferTransaction = {
        to: sKlimaTransferTransactionRequest.to,
        data: sKlimaTransferTransactionRequest.data,
        chainId: CHAIN_ID.POLYGON,
        value: '0',
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      };

      transactions = [...transactions, sKlimaTransferTransaction];
    }

    return {
      result: {
        transactions,
        provider: bridgeServiceIdToDetails['lifi'].title,
        iconUrl: bridgeServiceIdToDetails['lifi'].iconUrl,
      },
    };
  } catch (e) {
    return { errorMessage: 'Failed to get staking exchange transaction' };
  }
};

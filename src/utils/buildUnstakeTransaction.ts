import { AccountTypes, Sdk as EtherspotSdk } from 'etherspot';
import { BigNumber } from 'ethers';
import { uniqueId } from 'lodash';
import { ERC20TokenContract } from 'etherspot/dist/sdk/contract/internal/erc20-token.contract';

import { ContractNames, getContractAbi } from '@etherspot/contracts';

import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { CHAIN_ID, plrDaoMemberNft } from './chain';
import { plrDaoAssetPerChainId } from './asset';
import { ICrossChainAction } from '../types/crossChainAction';
import { CROSS_CHAIN_ACTION_STATUS } from '../constants/transactionDispatcherConstants';
import { ITransactionBlock } from '../types/transactionBlock';
import { PLR_DAO_CONTRACT_PER_CHAIN, PLR_STAKING_POLYGON_CONTRACT_ADDRESS } from '../constants/assetConstants';
import { MAX_PLR_TOKEN_LIMIT } from '../components/TransactionBlock/PlrDaoStakingTransactionBlock';

interface IPillarDao {
  encodeDeposit(amount: BigNumber): {
    to: string;
    data: string;
  };
  encodeWithdraw(): {
    to: string;
    data: string;
  };
}

interface IPillarUnStake {
  encodeUnstake(): {
    to: string;
    data: string;
  };
}

interface IPlrTransaction {
  to: string;
  data: string;
  chainId: number;
  value: number;
  createTimestamp: number;
  status: string;
}

export const buildPlrDaoUnStakeTransaction = (
  sdk: EtherspotSdk | null,
  transactionBlockId: string,
  membershipAddress: string,
  useWeb3Provider: boolean
): { errorMessage?: string; crossChainAction?: ICrossChainAction } => {
  if (!sdk) {
    return { errorMessage: 'Failed to build Unstake transaction!' };
  }

  try {
    const createTimestamp = +new Date();
    const crossChainActionId = uniqueId(`${createTimestamp}-`);

    let transactions: IPlrTransaction[] = [];
    let contractAddress = PLR_DAO_CONTRACT_PER_CHAIN[CHAIN_ID.POLYGON];

    try {
      const plrDaoStakingContract = sdk.registerContract<IPillarDao>(
        'plrDaoStakingContract',
        ['function withdraw()'],
        contractAddress
      );
      const stakeTransactionRequest = plrDaoStakingContract?.encodeWithdraw?.();
      if (!stakeTransactionRequest || !stakeTransactionRequest.to) {
        return { errorMessage: 'Failed to build Unstake transaction!' };
      }

      const approvalTransaction = {
        to: stakeTransactionRequest.to,
        data: stakeTransactionRequest.data,
        chainId: plrDaoMemberNft[CHAIN_ID.POLYGON].chainId,
        value: 0,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      };

      transactions = [approvalTransaction];
    } catch (e) {
      return { errorMessage: 'Failed to build Unstake transaction!' };
    }

    const preview = {
      fromChainId: plrDaoMemberNft[CHAIN_ID.POLYGON].chainId,
      isUnStake: true,
      hasEnoughPLR: false,
      enableAssetSwap: false,
      enableAssetBridge: false,
      fromAsset: {
        address: plrDaoMemberNft[CHAIN_ID.POLYGON].address,
        decimals: plrDaoMemberNft[CHAIN_ID.POLYGON].decimals,
        symbol: plrDaoMemberNft[CHAIN_ID.POLYGON].symbol,
        amount: '1',
        iconUrl: plrDaoMemberNft[CHAIN_ID.POLYGON].logoURI,
      },
      amount: `${MAX_PLR_TOKEN_LIMIT}`,
      toAsset: {
        address: plrDaoAssetPerChainId[CHAIN_ID.POLYGON].address,
        decimals: plrDaoAssetPerChainId[CHAIN_ID.POLYGON].decimals,
        symbol: plrDaoAssetPerChainId[CHAIN_ID.POLYGON].name,
        amount: `${MAX_PLR_TOKEN_LIMIT}`,
        iconUrl: plrDaoAssetPerChainId[CHAIN_ID.POLYGON].logoURI,
      },
      receiverAddress: membershipAddress ?? '',
    };

    const crossChainAction: ICrossChainAction = {
      id: crossChainActionId,
      relatedTransactionBlockId: transactionBlockId,
      chainId: plrDaoMemberNft[CHAIN_ID.POLYGON].chainId,
      type: TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE,
      preview,
      transactions,
      isEstimating: false,
      estimated: null,
      receiveAmount: `${MAX_PLR_TOKEN_LIMIT}`,
      useWeb3Provider: useWeb3Provider,
      destinationCrossChainAction: [],
    };
    return { crossChainAction };
  } catch (e) {
    return { errorMessage: 'Failed to build Unstake transaction!' };
  }
};

export const buildPlrUnStakeTransaction = (
  sdk: EtherspotSdk | null,
  transactionBlock: ITransactionBlock | any
): { errorMessage?: string; crossChainAction?: ICrossChainAction } => {
  if (!sdk) {
    return { errorMessage: 'Failed to build Unstake transaction!' };
  }

  const {
    amount,
    fromChain: { chainId: fromChainId },
    toChain: { chainId: toChainId },
    fromAsset: {
      address: fromAssetAddress,
      symbol: fromAssetSymbol,
      decimals: fromAssetDecimals,
      logoURI: fromAssetIconUrl,
    },
    toAsset: { address: toAssetAddress, symbol: toAssetSymbol, decimals: toAssetDecimals, logoURI: toAssetIconUrl },
    receiverAddress,
    accountType,
  } = transactionBlock?.values;

  try {
    const createTimestamp = +new Date();
    const crossChainActionId = uniqueId(`${createTimestamp}-`);

    let transactions: IPlrTransaction[] = [];

    try {
      const plrUnstakeContract = sdk.registerContract<IPillarUnStake>(
        'plrUnstakeContract',
        ['function unstake()'],
        PLR_STAKING_POLYGON_CONTRACT_ADDRESS
      );

      const unStakeTransactionRequest = plrUnstakeContract?.encodeUnstake?.();
      if (!unStakeTransactionRequest || !unStakeTransactionRequest?.to) {
        return { errorMessage: 'Failed to build Unstake transaction!' };
      }

      const stakedTransaction = {
        to: unStakeTransactionRequest.to,
        data: unStakeTransactionRequest.data,
        chainId: fromChainId,
        value: 0,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      };

      transactions = [stakedTransaction];
    } catch (e) {
      return { errorMessage: 'Failed to build Unstake transaction!' };
    }

    if (transactions.length === 1) {
      try {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
        const approvalTransactionRequest = erc20Contract?.encodeApprove?.(transactions[0].to, amount);
        if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
          return { errorMessage: 'Failed build unstake approval transaction!' };
        }

        const approvalTransaction = {
          to: approvalTransactionRequest.to,
          data: approvalTransactionRequest.data,
          chainId: fromChainId,
          value: 0,
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        };

        transactions = [approvalTransaction, ...transactions];
      } catch (e) {
        return { errorMessage: 'Failed to build approval transaction!' };
      }
    }

    const preview = {
      isUnStake: true,
      fromChainId,
      toChainId,
      fromAsset: {
        address: fromAssetAddress,
        decimals: fromAssetDecimals,
        symbol: fromAssetSymbol,
        amount,
        iconUrl: fromAssetIconUrl,
      },
      toAsset: {
        address: toAssetAddress,
        decimals: toAssetDecimals,
        symbol: toAssetSymbol,
        amount: amount,
        iconUrl: toAssetIconUrl,
      },
      receiverAddress,
    };

    const crossChainAction: ICrossChainAction = {
      id: crossChainActionId,
      relatedTransactionBlockId: transactionBlock.id,
      chainId: fromChainId,
      type: TRANSACTION_BLOCK_TYPE.PLR_STAKING_V2,
      preview,
      transactions,
      isEstimating: false,
      estimated: null,
      useWeb3Provider: accountType === AccountTypes.Key,
      multiCallData: transactionBlock?.multiCallData,
    };
    return { crossChainAction };
  } catch (e) {
    return { errorMessage: 'Failed to build Unstake transaction!' };
  }
};

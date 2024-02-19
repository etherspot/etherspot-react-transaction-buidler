import {
  AccountTypes,
  GatewayTransactionStates,
  NotificationTypes,
  Sdk as EtherspotSdk,
  TransactionStatuses,
  WalletProviderLike,
  Web3WalletProvider,
} from 'etherspot';
import { BigNumber, ethers } from 'ethers';
import { uniqueId } from 'lodash';
import { ERC20TokenContract } from 'etherspot/dist/sdk/contract/internal/erc20-token.contract';

import { ExecuteAccountTransactionDto } from 'etherspot/dist/sdk/dto/execute-account-transaction.dto';

import { ContractNames, getContractAbi } from '@etherspot/contracts';

import { Subscription } from 'rxjs';
import { map as rxjsMap } from 'rxjs/operators';

import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { addressesEqual, isValidEthereumAddress, isZeroAddress } from './validation';
import { CHAIN_ID, changeToChain, nativeAssetPerChainId, plrDaoMemberNft, supportedChains } from './chain';
import { plrDaoAssetPerChainId, stkPlrAsset } from './asset';
import { parseEtherspotErrorMessageIfAvailable } from './etherspot';
import { bridgeServiceIdToDetails } from './bridge';
import { swapServiceIdToDetails } from './swap';
import { sleep } from 'etherspot/dist/sdk/common';
import { ICrossChainActionTransaction, ICrossChainAction } from '../types/crossChainAction';
import { CROSS_CHAIN_ACTION_STATUS } from '../constants/transactionDispatcherConstants';
import { ITransactionBlock } from '../types/transactionBlock';
import {
  GNOSIS_USDC_CONTRACT_ADDRESS,
  PLR_DAO_CONTRACT_PER_CHAIN,
  PLR_STAKING_POLYGON_CONTRACT_ADDRESS,
  POLYGON_USDC_CONTRACT_ADDRESS,
} from '../constants/assetConstants';
import { PlrV2StakingContract } from '../types/etherspotContracts';
import { klimaDaoStaking } from './klimaDaoStakingTxs';
import { buildPlrDaoUnStakeTransaction, buildPlrUnStakeTransaction } from './buildUnstakeTransaction';
import { honeyswapLP } from './honeyswapLP';
import { buildLiFiBridgeTransactions, fetchSwapAssetTransaction } from './buildTransactions';

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

interface IPlrTransaction {
  to: string;
  data: string;
  chainId: number;
  value: number;
  createTimestamp: number;
  status: string;
}

export const buildCrossChainAction = async (
  sdk: EtherspotSdk,
  transactionBlock: ITransactionBlock
): Promise<{ errorMessage?: string; crossChainAction?: ICrossChainAction }> => {
  const createTimestamp = +new Date();
  const crossChainActionId = uniqueId(`${createTimestamp}-`);

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE &&
    !!transactionBlock?.values?.fromChainId &&
    !!transactionBlock?.values?.fromAssetAddress &&
    !!transactionBlock?.values?.fromAssetDecimals &&
    !!transactionBlock?.values?.fromAssetSymbol &&
    !!transactionBlock?.values?.amount &&
    !!transactionBlock?.values?.receiverAddress &&
    !!transactionBlock?.values?.routeToKlima &&
    !!transactionBlock?.values?.routeToUSDC &&
    !!transactionBlock?.values?.receiveAmount
  ) {
    try {
      const {
        values: {
          fromChainId,
          fromAssetAddress,
          fromAssetDecimals,
          fromAssetSymbol,
          fromAssetIconUrl,
          amount,
          accountType,
          routeToKlima,
          routeToUSDC,
          receiveAmount,
          receiverAddress,
        },
      } = transactionBlock;

      const amountBN = ethers.utils.parseUnits(amount, fromAssetDecimals);

      if (fromChainId !== CHAIN_ID.POLYGON) {
        try {
          let destinationTxns: ICrossChainActionTransaction[] = [];

          const { items: advancedRouteSteps } = await sdk.getStepTransaction({ route: routeToUSDC });

          let transactions: ICrossChainActionTransaction[] = advancedRouteSteps.map((transaction) => ({
            to: transaction.to as string,
            value: transaction.value,
            data: transaction.data,
            createTimestamp,
            status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
          }));

          if (
            ethers.utils.isAddress(fromAssetAddress) &&
            !addressesEqual(fromAssetAddress, nativeAssetPerChainId[fromChainId].address) &&
            transactions.length === 1
          ) {
            const abi = getContractAbi(ContractNames.ERC20Token);
            const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
            const approvalTransactionRequest = erc20Contract?.encodeApprove?.(
              transactions[0].to as string,
              routeToUSDC.toAmountMin
            );
            if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
              return { errorMessage: 'Failed build bridge approval transaction!' };
            }

            const approvalTransaction = {
              to: approvalTransactionRequest.to,
              data: approvalTransactionRequest.data,
              value: '0',
              createTimestamp,
              status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
            };

            transactions = [approvalTransaction, ...transactions];
          }

          const result = await klimaDaoStaking(routeToKlima, receiverAddress, sdk);

          if (result.errorMessage) return { errorMessage: result.errorMessage };

          if (result.result?.transactions?.length) {
            result.result?.transactions.map((element) => {
              destinationTxns.push(element);
            });
          }

          const preview = {
            fromChainId,
            fromAsset: {
              address: fromAssetAddress,
              decimals: fromAssetDecimals,
              symbol: fromAssetSymbol,
              amount: amountBN.toString(),
              iconUrl: fromAssetIconUrl,
            },
            amount: ethers.utils.parseUnits(receiveAmount ?? '0', 9),
            toAsset: {
              address: '0x4e78011ce80ee02d2c3e649fb657e45898257815',
              decimals: 9,
              symbol: 'sKlima',
              amount: ethers.utils.parseUnits(receiveAmount ?? '0', 9).toString(),
              iconUrl: 'https://polygonscan.com/token/images/klimadao_32.png',
            },
            receiverAddress: transactionBlock?.values?.receiverAddress,
            providerName: result.result?.provider ?? 'Unknown provider',
            providerIconUrl: result.result?.iconUrl ?? result.result?.provider ?? '',
          };

          const crossChainAction: ICrossChainAction = {
            id: crossChainActionId,
            relatedTransactionBlockId: transactionBlock.id,
            chainId: fromChainId,
            type: TRANSACTION_BLOCK_TYPE.KLIMA_STAKE,
            preview,
            transactions,
            isEstimating: false,
            estimated: null,
            containsSwitchChain: false,
            receiveAmount: ethers.utils.parseUnits(routeToUSDC.toAmountMin ?? '0', 6).toString(),
            useWeb3Provider: accountType === AccountTypes.Key,
            gasCost: routeToUSDC.gasCostUSD,
            destinationCrossChainAction: [
              {
                id: uniqueId(`${createTimestamp}-`),
                relatedTransactionBlockId: transactionBlock.id,
                chainId: CHAIN_ID.POLYGON,
                type: TRANSACTION_BLOCK_TYPE.KLIMA_STAKE,
                preview,
                transactions: destinationTxns,
                isEstimating: false,
                estimated: null,
                useWeb3Provider: false,
                destinationCrossChainAction: [],
                gasTokenAddress: POLYGON_USDC_CONTRACT_ADDRESS,
                gasTokenDecimals: 6,
              },
            ],
          };

          return { crossChainAction };
        } catch (e) {
          return { errorMessage: 'Failed to get bridge route!' };
        }
      } else {
        return { errorMessage: 'Failed to fetch any offers for this asset to USDC' };
      }
    } catch (e) {
      return { errorMessage: 'Failed to get KLIMA staking transaction!' };
    }
  }

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE &&
    transactionBlock?.values?.isUnStake &&
    transactionBlock?.values?.membershipAddress
  ) {
    let result = buildPlrDaoUnStakeTransaction(
      sdk,
      transactionBlock.id,
      transactionBlock?.values?.membershipAddress,
      transactionBlock?.values?.accountType === AccountTypes.Key
    );

    if (result.errorMessage) return { errorMessage: result.errorMessage };
    if (result.crossChainAction) return { crossChainAction: result.crossChainAction };
  }

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE &&
    (!transactionBlock?.values?.fromChainId ||
      !transactionBlock?.values?.fromAsset ||
      !transactionBlock?.values?.amount ||
      !transactionBlock?.values?.receiverAddress ||
      !transactionBlock?.values?.toAsset)
  ) {
    return { errorMessage: 'Failed to build transaction!' };
  }
  if (transactionBlock.type === TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE) {
    if (
      !transactionBlock?.values?.enableAssetBridge &&
      !transactionBlock?.values?.enableAssetSwap &&
      transactionBlock?.values?.toAsset
    ) {
      // Staking
      try {
        const {
          values: {
            fromChainId,
            fromAsset: {
              address: fromAssetAddress,
              symbol: fromAssetSymbol,
              decimals: fromAssetDecimals,
              logoURI: fromAssetIconUrl,
            },
            toAsset: { decimals: toAssetDecimals },
            amount,
            accountType,
          },
        } = transactionBlock;
        let transactions: IPlrTransaction[] = [];
        let contractAddress = PLR_DAO_CONTRACT_PER_CHAIN[fromChainId];
        const amountBN = ethers.utils.parseUnits(amount, fromAssetDecimals);

        if (fromAssetAddress && !addressesEqual(fromAssetAddress, nativeAssetPerChainId[fromChainId].address)) {
          try {
            const abi = getContractAbi(ContractNames.ERC20Token);
            const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
            const approvalTransactionRequest = erc20Contract?.encodeApprove?.(contractAddress, amountBN);
            if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
              return { errorMessage: 'Failed to build PLR DAO stake approval transaction!' };
            }
            const approvalTransaction = {
              to: approvalTransactionRequest.to,
              data: approvalTransactionRequest.data,
              chainId: fromChainId,
              value: 0,
              createTimestamp,
              status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
            };
            transactions = [approvalTransaction];
          } catch (e) {
            return { errorMessage: 'Failed to build approval transaction!' };
          }
        }

        try {
          const plrDaoStakingContract = sdk.registerContract<IPillarDao>(
            'plrDaoStakingContract',
            ['function deposit(uint256)'],
            contractAddress
          );
          const stakeTransactionRequest = plrDaoStakingContract?.encodeDeposit?.(amountBN);
          if (!stakeTransactionRequest || !stakeTransactionRequest.to) {
            return { errorMessage: 'Failed build transfer transaction!' };
          }
          const approvalTransaction = {
            to: stakeTransactionRequest.to,
            data: stakeTransactionRequest.data,
            chainId: fromChainId,
            value: 0,
            createTimestamp,
            status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
          };

          transactions = [...transactions, approvalTransaction];
        } catch (e) {
          return { errorMessage: 'Failed build transfer transaction!' };
        }

        const preview = {
          fromChainId,
          hasEnoughPLR: transactionBlock?.values?.hasEnoughPLR,
          enableAssetSwap: transactionBlock.values?.enableAssetSwap,
          enableAssetBridge: transactionBlock.values?.enableAssetBridge,
          fromAsset: {
            address: fromAssetAddress,
            decimals: fromAssetDecimals,
            symbol: fromAssetSymbol,
            amount: amountBN.toString(),
            iconUrl: fromAssetIconUrl,
          },
          amount: 1,
          toAsset: {
            address: plrDaoMemberNft[fromChainId].address,
            decimals: toAssetDecimals,
            symbol: plrDaoMemberNft[fromChainId].name,
            amount: '1',
            iconUrl: 'https://public.pillar.fi/files/pillar-dao-member-badge.png',
          },
          receiverAddress: transactionBlock?.values?.receiverAddress,
        };
        const crossChainAction: ICrossChainAction = {
          id: crossChainActionId,
          relatedTransactionBlockId: transactionBlock.id,
          chainId: fromChainId,
          type: TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE,
          preview,
          transactions,
          isEstimating: false,
          estimated: null,
          receiveAmount: '1',
          useWeb3Provider: accountType === AccountTypes.Key,
          destinationCrossChainAction: [],
        };

        return { crossChainAction };
      } catch (e) {
        return { errorMessage: 'Failed to get PLR Dao staking transaction!' };
      }
    }
    if (transactionBlock?.values?.enableAssetBridge && transactionBlock.values?.route) {
      try {
        const {
          values: {
            fromChainId,
            fromAsset: { logoURI: fromAssetIconUrl },
            toAsset: { logoURI: toAssetIconUrl, assetPriceUsd: toAssetUsdPrice },
            route,
            accountType,
          },
        } = transactionBlock;

        const [firstStep] = route.steps;
        const bridgeServiceDetails = bridgeServiceIdToDetails[firstStep?.toolDetails?.key ?? ''];

        const preview = {
          fromChainId,
          toChainId: plrDaoAssetPerChainId[CHAIN_ID.POLYGON].chainId,
          providerName: firstStep?.toolDetails?.name ?? bridgeServiceDetails?.title ?? 'LiFi',
          providerIconUrl: firstStep?.toolDetails?.logoURI ?? bridgeServiceDetails?.iconUrl,
          hasEnoughPLR: transactionBlock?.values?.hasEnoughPLR,
          enableAssetSwap: transactionBlock.values?.enableAssetSwap,
          enableAssetBridge: transactionBlock.values?.enableAssetBridge,
          fromAsset: {
            address: route.fromToken.address,
            decimals: route.fromToken.decimals,
            symbol: route.fromToken.symbol,
            amount: route.fromAmount,
            iconUrl: fromAssetIconUrl,
          },
          toAsset: {
            address: route.toToken.address,
            decimals: route.toToken.decimals,
            symbol: route.toToken.symbol,
            amount: route.toAmount,
            iconUrl: toAssetIconUrl,
            usdPrice: toAssetUsdPrice ?? undefined,
          },
          receiverAddress: transactionBlock?.values?.receiverAddress,
          route,
        };

        const result = await buildLiFiBridgeTransactions(fromChainId, route, sdk);

        if (result?.errorMessage) return { errorMessage: result.errorMessage };
        const crossChainAction: ICrossChainAction = {
          id: crossChainActionId,
          relatedTransactionBlockId: transactionBlock.id,
          chainId: fromChainId,
          type: TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE,
          preview,
          transactions: result?.transactions || [],
          destinationCrossChainAction: [],
          isEstimating: false,
          estimated: null,
          useWeb3Provider: accountType === AccountTypes.Key,
          multiCallData: transactionBlock?.multiCallData,
        };

        return { crossChainAction };
      } catch (e) {
        return { errorMessage: 'Failed to build PLR DAO stake transaction!' };
      }
    }
    // Swap
    try {
      if (!transactionBlock?.values) return { errorMessage: 'Failed to build PLR DAO swap transaction!' };

      const {
        values: {
          amount,
          fromChainId: chainId,
          fromAsset: {
            address: fromAssetAddress,
            symbol: fromAssetSymbol,
            decimals: fromAssetDecimals,
            logoURI: fromAssetIconUrl,
          },
          toAsset: {
            address: toAssetAddress,
            symbol: toAssetSymbol,
            decimals: toAssetDecimals,
            logoURI: toAssetIconUrl,
          },
          offer,
          receiverAddress,
          accountType,
        },
      } = transactionBlock;

      const fromAmountBN = ethers.utils.parseUnits(amount, fromAssetDecimals);

      const swapServiceDetails = swapServiceIdToDetails[offer.provider];

      let preview = {
        fromChainId: chainId,
        chainId,
        hasEnoughPLR: transactionBlock?.values?.hasEnoughPLR,
        enableAssetSwap: transactionBlock.values?.enableAssetSwap,
        enableAssetBridge: transactionBlock.values?.enableAssetBridge,
        fromAsset: {
          address: fromAssetAddress,
          decimals: fromAssetDecimals,
          symbol: fromAssetSymbol,
          amount: fromAmountBN.toString(),
          iconUrl: fromAssetIconUrl,
        },
        toAsset: {
          address: toAssetAddress,
          decimals: toAssetDecimals,
          symbol: toAssetSymbol,
          amount: offer.receiveAmount.toString(),
          iconUrl: toAssetIconUrl,
        },
        providerName: swapServiceDetails.title ?? 'Unknown provider',
        providerIconUrl: swapServiceDetails?.iconUrl,
        receiverAddress,
      };
      let result = await fetchSwapAssetTransaction(
        chainId,
        fromAmountBN,
        fromAssetAddress,
        offer,
        receiverAddress,
        sdk
      );
      if (result.errorMessage) return { errorMessage: result.errorMessage };

      const crossChainAction: ICrossChainAction = {
        id: crossChainActionId,
        relatedTransactionBlockId: transactionBlock.id,
        chainId,
        type: TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE,
        preview,
        transactions: result?.result?.transactions || [],
        isEstimating: false,
        estimated: null,
        destinationCrossChainAction: [],
        useWeb3Provider: accountType === AccountTypes.Key,
        receiveAmount: transactionBlock.values.amount,
        multiCallData: transactionBlock?.multiCallData,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to build PLR DAO swap transaction!' };
    }
  }

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE &&
    !!transactionBlock?.values?.fromChain &&
    !!transactionBlock?.values?.toChain &&
    !!transactionBlock?.values?.toAsset &&
    !!transactionBlock?.values?.fromAsset &&
    !!transactionBlock?.values?.amount &&
    !!transactionBlock?.values?.route
  ) {
    try {
      const {
        values: {
          fromChain: { chainId: fromChainId },
          toChain: { chainId: toChainId },
          fromAsset: { logoURI: fromAssetIconUrl },
          toAsset: { logoURI: toAssetIconUrl, assetPriceUsd: toAssetUsdPrice },
          route,
          accountType,
        },
      } = transactionBlock;

      const [firstStep] = route.steps;
      const bridgeServiceDetails = bridgeServiceIdToDetails[firstStep?.toolDetails?.key ?? ''];

      const preview = {
        fromChainId,
        toChainId,
        providerName: firstStep?.toolDetails?.name ?? bridgeServiceDetails?.title ?? 'LiFi',
        providerIconUrl: firstStep?.toolDetails?.logoURI ?? bridgeServiceDetails?.iconUrl,
        fromAsset: {
          address: route.fromToken.address,
          decimals: route.fromToken.decimals,
          symbol: route.fromToken.symbol,
          amount: route.fromAmount,
          iconUrl: fromAssetIconUrl,
        },
        toAsset: {
          address: route.toToken.address,
          decimals: route.toToken.decimals,
          symbol: route.toToken.symbol,
          amount: route.toAmount,
          iconUrl: toAssetIconUrl,
          usdPrice: toAssetUsdPrice ?? undefined,
        },
        receiverAddress: transactionBlock?.values?.receiverAddress,
        route,
      };

      const { items: advancedRouteSteps } = await sdk.getStepTransaction({ route });

      let transactions: ICrossChainActionTransaction[] = advancedRouteSteps.map(({ to, value, data, chainId }) => ({
        to: to as string,
        value,
        data,
        chainId: chainId ?? fromChainId,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      }));

      if (
        ethers.utils.isAddress(route.fromToken.address) &&
        !addressesEqual(route.fromToken.address, nativeAssetPerChainId[fromChainId].address) &&
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

      const crossChainAction: ICrossChainAction = {
        id: crossChainActionId,
        relatedTransactionBlockId: transactionBlock.id,
        chainId: fromChainId,
        type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE,
        preview,
        transactions,
        isEstimating: false,
        estimated: null,
        useWeb3Provider: accountType === AccountTypes.Key,
        multiCallData: transactionBlock?.multiCallData,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get bridge route!' };
    }
  }

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.HONEY_SWAP_LP &&
    !!transactionBlock?.values?.fromChainId &&
    !!transactionBlock?.values?.toToken1 &&
    !!transactionBlock?.values?.toToken2 &&
    !!transactionBlock?.values?.fromAssetAddress &&
    !!transactionBlock?.values?.fromAssetDecimals &&
    !!transactionBlock?.values?.fromAssetSymbol &&
    !!transactionBlock?.values?.amount &&
    // !!transactionBlock?.values?.routeToUSDC &&
    !!transactionBlock?.values?.tokenOneAmount &&
    !!transactionBlock?.values?.tokenTwoAmount
  ) {
    try {
      const {
        values: {
          fromChainId,
          fromAssetAddress,
          fromAssetDecimals,
          fromAssetSymbol,
          fromAssetIconUrl,
          amount,
          accountType,
          routeToUSDC,
          receiverAddress,
          offer1,
          offer2,
          offer3,
          tokenOneAmount,
          tokenTwoAmount,
          toToken1,
          toToken2,
        },
      } = transactionBlock;

      let destinationTxns: ICrossChainActionTransaction[] = [];
      let transactions: ICrossChainActionTransaction[] = [];

      let fromTokenOneAmountBN: any = null;
      let fromTokenTwoAmountBN: any = null;

      try {
        // This is used in case token 1 is USDC
        fromTokenOneAmountBN = ethers.utils.parseUnits(tokenOneAmount, toToken1.decimals);

        // This is used in case token 2 is USDC
        fromTokenTwoAmountBN = ethers.utils.parseUnits(tokenTwoAmount, toToken2.decimals);
      } catch {}

      const fromAmountBN = ethers.utils.parseUnits(amount, fromAssetDecimals);

      // // not native asset and no erc20 approval transaction included
      if (toToken1.address && offer1) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>(
          'erc20Contract',
          abi,
          GNOSIS_USDC_CONTRACT_ADDRESS
        );
        const approvalTransactionRequest = erc20Contract?.encodeApprove?.(
          offer1?.transactions[0].to,
          fromTokenOneAmountBN
        );
        if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
          return { errorMessage: 'Failed build bridge approval transaction!' };
        }

        const approvalTransaction = {
          to: approvalTransactionRequest.to,
          data: approvalTransactionRequest.data,
          chainId: CHAIN_ID.XDAI,
          value: 0,
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        };

        if (offer1?.transactions.length === 1) {
          destinationTxns = [approvalTransaction, ...destinationTxns];
        }
      }

      if (offer1 && !addressesEqual(toToken1.address, GNOSIS_USDC_CONTRACT_ADDRESS)) {
        destinationTxns = [
          ...destinationTxns,
          ...offer1.transactions.map((transaction) => ({
            ...transaction,
            chainId: CHAIN_ID.XDAI,
            createTimestamp,
            status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
          })),
        ];
      }

      if (toToken2.address && offer2) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>(
          'erc20Contract',
          abi,
          GNOSIS_USDC_CONTRACT_ADDRESS
        );
        const approvalTransactionRequest = erc20Contract?.encodeApprove?.(
          offer2?.transactions[0].to,
          fromTokenTwoAmountBN
        );
        if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
          return { errorMessage: 'Failed build bridge approval transaction!' };
        }

        const approvalTransaction = {
          to: approvalTransactionRequest.to,
          data: approvalTransactionRequest.data,
          chainId: CHAIN_ID.XDAI,
          value: 0,
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        };

        if (offer2?.transactions.length === 1) {
          destinationTxns = [...destinationTxns, approvalTransaction]; // must go later before another swap
        }
      }

      if (offer2 && !addressesEqual(toToken2.address, GNOSIS_USDC_CONTRACT_ADDRESS)) {
        destinationTxns = [
          ...destinationTxns,
          ...offer2.transactions.map((transaction) => ({
            ...transaction,
            chainId: CHAIN_ID.XDAI,
            createTimestamp,
            status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
          })),
        ];
      }

      if (fromChainId !== CHAIN_ID.XDAI && routeToUSDC) {
        try {
          const [firstStep] = routeToUSDC.steps;
          const bridgeServiceDetails = bridgeServiceIdToDetails[firstStep?.toolDetails?.key ?? ''];

          const { items: advancedRouteSteps } = await sdk.getStepTransaction({ route: routeToUSDC });
          transactions = advancedRouteSteps.map(({ to, value, data, chainId }) => ({
            to: to as string,
            value,
            data,
            chainId: chainId ?? fromChainId,
            createTimestamp,
            status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
          }));

          if (
            ethers.utils.isAddress(routeToUSDC.fromToken.address) &&
            !addressesEqual(routeToUSDC.fromToken.address, nativeAssetPerChainId[fromChainId].address) &&
            transactions.length === 1 &&
            routeToUSDC.fromAmount
          ) {
            const abi = getContractAbi(ContractNames.ERC20Token);
            const erc20Contract = sdk.registerContract<ERC20TokenContract>(
              'erc20Contract',
              abi,
              routeToUSDC.fromToken.address
            );
            const approvalTransactionRequest = erc20Contract?.encodeApprove?.(
              transactions[0].to,
              routeToUSDC.fromAmount
            );
            if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
              return { errorMessage: 'Failed to build bridge approval transaction!' };
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

          const addressToSendTo = receiverAddress ?? sdk.state.accountAddress;

          const honeySwapTransaction = await honeyswapLP(
            sdk,
            offer1 ? offer1.receiveAmount : fromTokenOneAmountBN,
            toToken1.address,
            offer2 ? offer2.receiveAmount : fromTokenTwoAmountBN,
            toToken2.address,
            addressToSendTo
          );

          if (honeySwapTransaction.errorMessage) return { errorMessage: honeySwapTransaction.errorMessage };

          if (honeySwapTransaction.result?.transactions?.length) {
            destinationTxns = [...destinationTxns, ...honeySwapTransaction.result?.transactions];
          }

          const preview = {
            fromChainId,
            toChainId: CHAIN_ID.XDAI,
            fromAsset: {
              address: fromAssetAddress,
              decimals: fromAssetDecimals,
              symbol: fromAssetSymbol,
              amount: amount,
              iconUrl: fromAssetIconUrl,
            },
            amount: ethers.utils.parseUnits(amount ?? '0', 6),
            toAsset: {
              address: GNOSIS_USDC_CONTRACT_ADDRESS,
              decimals: 6,
              symbol: 'usdc',
              amount: ethers.utils.parseUnits(amount ?? '0', 6).toString(),
              iconUrl: 'https://polygonscan.com/token/images/klimadao_32.png',
            },
            route: routeToUSDC,
            receiverAddress: transactionBlock?.values?.receiverAddress,
            providerName: firstStep?.toolDetails?.name ?? bridgeServiceDetails?.title ?? 'LiFi',
            providerIconUrl: firstStep?.toolDetails?.logoURI ?? bridgeServiceDetails?.iconUrl,
            offer1,
            offer2,
            token1: toToken1,
            token2: toToken2,
            tokenOneAmount,
            tokenTwoAmount,
          };

          const crossChainAction: ICrossChainAction = {
            id: crossChainActionId,
            relatedTransactionBlockId: transactionBlock.id,
            chainId: fromChainId,
            type: TRANSACTION_BLOCK_TYPE.HONEY_SWAP_LP,
            preview,
            transactions,
            isEstimating: false,
            estimated: null,
            useWeb3Provider: accountType === AccountTypes.Key,
            multiCallData: transactionBlock?.multiCallData,
            receiveAmount: amount,
            destinationCrossChainAction: [
              {
                id: uniqueId(`${createTimestamp}-`),
                relatedTransactionBlockId: transactionBlock.id,
                chainId: CHAIN_ID.XDAI,
                type: TRANSACTION_BLOCK_TYPE.HONEY_SWAP_LP,
                preview,
                transactions: destinationTxns,
                isEstimating: false,
                estimated: null,
                useWeb3Provider: false,
                gasTokenAddress: GNOSIS_USDC_CONTRACT_ADDRESS,
                destinationCrossChainAction: [],
              },
            ],
          };

          return { crossChainAction: crossChainAction };
        } catch (e) {
          return { errorMessage: 'Failed to get bridge route!' };
        }
      } else if (fromChainId === CHAIN_ID.XDAI) {
        try {
          let transferTransaction: ICrossChainActionTransaction = {
            to: sdk.state.accountAddress,
            value: ethers.utils.parseUnits(amount, fromAssetDecimals),
            createTimestamp,
            status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
          };

          if (ethers.utils.isAddress(fromAssetAddress) && !isZeroAddress(fromAssetAddress)) {
            const abi = getContractAbi(ContractNames.ERC20Token);
            const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
            const transferTransactionRequest = erc20Contract?.encodeTransfer?.(
              sdk.state.accountAddress,
              ethers.utils.parseUnits(amount, fromAssetDecimals)
            );
            if (!transferTransactionRequest || !transferTransactionRequest.to) {
              return { errorMessage: 'Failed build transfer transaction!' };
            }

            transferTransaction = {
              ...transferTransaction,
              to: transferTransactionRequest.to,
              data: transferTransactionRequest.data,
              value: 0,
              createTimestamp,
              status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
            };
          }

          if (offer3 && fromAssetAddress !== GNOSIS_USDC_CONTRACT_ADDRESS) {
            destinationTxns = [
              ...offer3.transactions.map((transaction) => ({
                ...transaction,
                chainId: CHAIN_ID.XDAI,
                createTimestamp,
                status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
              })),
              ...destinationTxns,
            ];
          }

          if (
            fromAssetAddress &&
            !addressesEqual(fromAssetAddress, nativeAssetPerChainId[CHAIN_ID.XDAI].address) &&
            offer3
          ) {
            const abi = getContractAbi(ContractNames.ERC20Token);
            const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
            const approvalTransactionRequest = erc20Contract?.encodeApprove?.(offer3?.transactions[0].to, fromAmountBN);
            if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
              return { errorMessage: 'Failed build bridge approval transaction!' };
            }

            const approvalTransaction = {
              to: approvalTransactionRequest.to,
              data: approvalTransactionRequest.data,
              chainId: CHAIN_ID.XDAI,
              value: 0,
              createTimestamp,
              status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
            };

            if (offer3?.transactions.length === 1) {
              destinationTxns = [approvalTransaction, ...destinationTxns]; // must go as first swap approval
            }
          }

          const addressToSendTo = receiverAddress ?? sdk.state.accountAddress;

          const honeySwapTransaction = await honeyswapLP(
            sdk,
            offer1 ? offer1.receiveAmount : fromTokenOneAmountBN,
            toToken1.address,
            offer2 ? offer2.receiveAmount : fromTokenTwoAmountBN,
            toToken2.address,
            addressToSendTo
          );

          if (honeySwapTransaction.errorMessage) return { errorMessage: honeySwapTransaction.errorMessage };

          if (honeySwapTransaction.result?.transactions?.length) {
            destinationTxns = [...destinationTxns, ...honeySwapTransaction.result?.transactions];
          }

          const preview = {
            fromChainId,
            toChainId: CHAIN_ID.XDAI,
            fromAsset: {
              address: fromAssetAddress,
              decimals: fromAssetDecimals,
              symbol: fromAssetSymbol,
              amount: amount,
              iconUrl: fromAssetIconUrl,
            },
            amount: ethers.utils.parseUnits(amount ?? '0', 6),
            toAsset: {
              address: GNOSIS_USDC_CONTRACT_ADDRESS,
              decimals: 6,
              symbol: 'usdc',
              amount: ethers.utils.parseUnits(amount ?? '0', 6).toString(),
              iconUrl: 'https://polygonscan.com/token/images/klimadao_32.png',
            },
            route: routeToUSDC,
            receiverAddress: transactionBlock?.values?.receiverAddress,
            providerName: 'LiFi',
            providerIconUrl: '',
            offer1,
            offer2,
            token1: toToken1,
            token2: toToken2,
            tokenTwoAmount,
            tokenOneAmount,
          };

          const crossChainAction: ICrossChainAction = {
            id: crossChainActionId,
            relatedTransactionBlockId: transactionBlock.id,
            chainId: fromChainId,
            type: TRANSACTION_BLOCK_TYPE.HONEY_SWAP_LP,
            preview,
            transactions: accountType === AccountTypes.Key ? [transferTransaction] : destinationTxns,
            isEstimating: false,
            estimated: null,
            useWeb3Provider: accountType === AccountTypes.Key,
            multiCallData: transactionBlock?.multiCallData,
            receiveAmount: amount,
            destinationCrossChainAction:
              accountType !== AccountTypes.Key
                ? []
                : [
                    {
                      id: uniqueId(`${createTimestamp}-`),
                      relatedTransactionBlockId: transactionBlock.id,
                      chainId: CHAIN_ID.XDAI,
                      type: TRANSACTION_BLOCK_TYPE.HONEY_SWAP_LP,
                      preview,
                      transactions: destinationTxns,
                      isEstimating: false,
                      estimated: null,
                      useWeb3Provider: false,
                      gasTokenAddress: GNOSIS_USDC_CONTRACT_ADDRESS,
                      destinationCrossChainAction: [],
                    },
                  ],
          };

          return { crossChainAction: crossChainAction };
        } catch (e) {
          return { errorMessage: 'Failed to do swap!' };
        }
      } else {
        return { errorMessage: 'Failed to fetch any offers for this asset to USDC' };
      }
    } catch (e) {
      return { errorMessage: 'Failed to get bridge route!' };
    }
  }

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET &&
    !!transactionBlock?.values?.chain &&
    !!transactionBlock?.values?.selectedAsset &&
    !!transactionBlock?.values?.receiverAddress &&
    !!transactionBlock?.values?.fromAddress &&
    transactionBlock?.values?.isFromEtherspotWallet !== undefined &&
    !!transactionBlock?.values?.amount
  ) {
    try {
      const {
        values: {
          chain: { chainId },
          selectedAsset: {
            address: assetAddress,
            decimals: assetDecimals,
            symbol: assetSymbol,
            logoURI: assetIconUrl,
            assetPriceUsd: assetUsdPrice,
          },
          receiverAddress,
          amount,
          fromAddress,
          isFromEtherspotWallet,
        },
      } = transactionBlock;

      const amountBN = ethers.utils.parseUnits(amount, assetDecimals);

      const preview = {
        chainId,
        receiverAddress,
        fromAddress,
        isFromEtherspotWallet,
        asset: {
          address: assetAddress,
          decimals: assetDecimals,
          symbol: assetSymbol,
          amount: amountBN.toString(),
          iconUrl: assetIconUrl,
          usdPrice: assetUsdPrice ?? undefined,
        },
      };

      let transferTransaction: ICrossChainActionTransaction = {
        to: receiverAddress,
        value: amountBN,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      };

      if (ethers.utils.isAddress(assetAddress) && !isZeroAddress(assetAddress)) {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, assetAddress);
        const transferTransactionRequest = erc20Contract?.encodeTransfer?.(receiverAddress, amountBN);
        if (!transferTransactionRequest || !transferTransactionRequest.to) {
          return { errorMessage: 'Failed build transfer transaction!' };
        }

        transferTransaction = {
          ...transferTransaction,
          to: transferTransactionRequest.to,
          data: transferTransactionRequest.data,
          value: 0,
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        };
      }

      const crossChainAction: ICrossChainAction = {
        id: crossChainActionId,
        relatedTransactionBlockId: transactionBlock.id,
        chainId,
        type: TRANSACTION_BLOCK_TYPE.SEND_ASSET,
        preview,
        transactions: [transferTransaction],
        isEstimating: false,
        estimated: null,
        useWeb3Provider: !isFromEtherspotWallet,
        multiCallData: transactionBlock?.multiCallData,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to get create asset transfer!' };
    }
  }

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP &&
    !!transactionBlock?.values?.chain &&
    !!transactionBlock?.values?.fromAsset &&
    !!transactionBlock?.values?.toAsset &&
    !!transactionBlock?.values?.amount &&
    !!transactionBlock?.values?.offer
  ) {
    try {
      const {
        values: {
          amount,
          chain: { chainId },
          fromAsset: {
            address: fromAssetAddress,
            symbol: fromAssetSymbol,
            decimals: fromAssetDecimals,
            logoURI: fromAssetIconUrl,
          },
          toAsset: {
            address: toAssetAddress,
            symbol: toAssetSymbol,
            decimals: toAssetDecimals,
            logoURI: toAssetIconUrl,
          },
          offer,
          receiverAddress,
          accountType,
        },
      } = transactionBlock;

      const fromAmountBN = ethers.utils.parseUnits(amount, fromAssetDecimals);

      const swapServiceDetails = swapServiceIdToDetails[offer.provider];

      let preview = {
        chainId,
        fromAsset: {
          address: fromAssetAddress,
          decimals: fromAssetDecimals,
          symbol: fromAssetSymbol,
          amount: fromAmountBN.toString(),
          iconUrl: fromAssetIconUrl,
        },
        toAsset: {
          address: toAssetAddress,
          decimals: toAssetDecimals,
          symbol: toAssetSymbol,
          amount: offer.receiveAmount.toString(),
          iconUrl: toAssetIconUrl,
        },
        providerName: swapServiceDetails.title ?? 'Unknown provider',
        providerIconUrl: swapServiceDetails?.iconUrl,
        receiverAddress,
      };

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

      const crossChainAction: ICrossChainAction = {
        id: crossChainActionId,
        relatedTransactionBlockId: transactionBlock.id,
        chainId,
        type: TRANSACTION_BLOCK_TYPE.ASSET_SWAP,
        preview,
        transactions,
        isEstimating: false,
        estimated: null,
        useWeb3Provider: accountType === AccountTypes.Key,
        multiCallData: transactionBlock?.multiCallData,
      };

      return { crossChainAction };
    } catch (e) {
      return { errorMessage: 'Failed to build swap transaction!' };
    }
  }

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.PLR_STAKING_V2 &&
    transactionBlock?.values?.isUnStake &&
    transactionBlock?.values?.amount
  ) {
    let result = buildPlrUnStakeTransaction(sdk, transactionBlock);

    if (result.errorMessage) return { errorMessage: result.errorMessage };
    if (result.crossChainAction) return { crossChainAction: result.crossChainAction };
  }

  if (
    transactionBlock.type === TRANSACTION_BLOCK_TYPE.PLR_STAKING_V2 &&
    !!transactionBlock?.values?.fromChain &&
    !!transactionBlock?.values?.toChain &&
    !!transactionBlock?.values?.fromAsset &&
    !!transactionBlock?.values?.toAsset &&
    !!transactionBlock?.values?.amount &&
    !transactionBlock?.values?.isUnStake
  ) {
    const {
      values: {
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
        swap,
        receiverAddress,
        accountType,
      },
    } = transactionBlock;

    const fromAmountBN = ethers.utils.parseUnits(amount, fromAssetDecimals);

    let toAssetAmount = addressesEqual(toAssetAddress, stkPlrAsset.address) ? fromAmountBN : '0';

    let providerName;
    let providerIconUrl;
    let transactions: ICrossChainActionTransaction[] = [];

    if (swap?.type === 'SAME_CHAIN_SWAP' && swap.offer) {
      try {
        const swapServiceDetails = swapServiceIdToDetails[swap.offer.provider];
        providerName = swapServiceDetails.title ?? 'Unknown provider';
        providerIconUrl = swapServiceDetails?.iconUrl;
        transactions = swap.offer.transactions.map((transaction) => ({
          ...transaction,
          chainId: fromChainId,
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        }));
        toAssetAmount = swap.offer.receiveAmount;
      } catch (e) {
        return { errorMessage: 'Failed to build same chain swap transaction!' };
      }
    } else if (swap?.type === 'CROSS_CHAIN_SWAP' && swap.route) {
      const result = await buildLiFiBridgeTransactions(fromChainId, swap.route, sdk);

      if (result?.errorMessage) return { errorMessage: result.errorMessage };

      if (!result?.transactions?.length) return { errorMessage: 'Failed build swap transactions!' };

      transactions = result.transactions;
      toAssetAmount = BigNumber.from(swap.route.toAmount);
    } else if (addressesEqual(toAssetAddress, stkPlrAsset.address)) {
      try {
        const plrV2StakingContract = sdk.registerContract<PlrV2StakingContract>(
          'plrV2StakingContract',
          ['function stake(uint256)'],
          PLR_STAKING_POLYGON_CONTRACT_ADDRESS
        );
        const stakeTransactionRequest = plrV2StakingContract?.encodeStake?.(toAssetAmount);

        if (!stakeTransactionRequest || !stakeTransactionRequest.to) {
          return { errorMessage: 'Failed build stake transaction!' };
        }

        const stakingTransaction = {
          to: stakeTransactionRequest.to,
          data: stakeTransactionRequest.data,
          value: stakeTransactionRequest?.value || 0,
          chainId: fromChainId,
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        };

        transactions = [stakingTransaction];
      } catch (e) {
        return { errorMessage: 'Failed to build stake transaction!' };
      }
    }

    let preview = {
      fromChainId,
      toChainId,
      fromAsset: {
        address: fromAssetAddress,
        decimals: fromAssetDecimals,
        symbol: fromAssetSymbol,
        amount: fromAmountBN.toString(),
        iconUrl: fromAssetIconUrl,
      },
      toAsset: {
        address: toAssetAddress,
        decimals: toAssetDecimals,
        symbol: toAssetSymbol,
        amount: toAssetAmount.toString(),
        iconUrl: toAssetIconUrl,
      },
      providerName,
      providerIconUrl,
      receiverAddress,
      swap,
    };

    // not native asset and no erc20 approval transaction included
    if (
      fromAssetAddress &&
      !addressesEqual(fromAssetAddress, nativeAssetPerChainId[fromChainId].address) &&
      transactions.length === 1
    ) {
      try {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
        const approvalTransactionRequest = erc20Contract?.encodeApprove?.(transactions[0].to, fromAmountBN);
        if (!approvalTransactionRequest || !approvalTransactionRequest.to) {
          return { errorMessage: 'Failed build swap approval transaction!' };
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

    // cross chain swaps transfers to receiver already
    if (
      receiverAddress &&
      isValidEthereumAddress(receiverAddress) &&
      !addressesEqual(toAssetAddress, nativeAssetPerChainId[toChainId].address) &&
      transactions.length > 0 &&
      swap?.type !== 'CROSS_CHAIN_SWAP'
    ) {
      try {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, toAssetAddress);
        const transferTransactionRequest = erc20Contract?.encodeTransfer?.(receiverAddress, toAssetAmount);
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
      } catch (e) {
        return { errorMessage: 'Failed to build asset transfer transaction!' };
      }
    }

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
  }

  return { errorMessage: 'Failed to build transaction!' };
};

export const submitEtherspotTransactionsBatch = async (
  sdk: EtherspotSdk,
  transactions: ExecuteAccountTransactionDto[],
  feeTokenAddress?: string
): Promise<{
  batchHash?: string;
  errorMessage?: string;
}> => {
  let errorMessage;
  let batchHash;

  try {
    if (!sdk?.state?.account?.type || sdk.state.account.type === AccountTypes.Key) {
      await sdk.computeContractAccount({ sync: true });
    }

    sdk.clearGatewayBatch();

    // sequential
    for (const transaction of transactions) {
      const { to, value, data } = transaction;
      await sdk.batchExecuteAccountTransaction({ to, value, data });
    }

    const feeToken = isZeroAddress(feeTokenAddress) ? undefined : feeTokenAddress;
    await sdk.estimateGatewayBatch({ feeToken });
    const result = await sdk.submitGatewayBatch();
    ({ hash: batchHash } = result);
  } catch (e) {
    errorMessage = parseEtherspotErrorMessageIfAvailable(e);
    if (!errorMessage && e instanceof Error) {
      errorMessage = e?.message;
    }
  }

  return { batchHash, errorMessage };
};

export const submitEtherspotAndWaitForTransactionHash = async (
  sdk: EtherspotSdk,
  transactions: ExecuteAccountTransactionDto[],
  feeTokenAddress?: string
): Promise<{
  transactionHash?: string;
  errorMessage?: string;
}> => {
  let errorMessage;

  try {
    if (!sdk?.state?.account?.type || sdk.state.account.type === AccountTypes.Key) {
      await sdk.computeContractAccount({ sync: true });
    }

    sdk.clearGatewayBatch();

    // sequential
    for (const transaction of transactions) {
      const { to, value, data } = transaction;
      await sdk.batchExecuteAccountTransaction({ to, value, data });
    }

    const feeToken = isZeroAddress(feeTokenAddress) ? undefined : feeTokenAddress;
    await sdk.estimateGatewayBatch({ feeToken: feeToken });
    const result = await sdk.submitGatewayBatch();
    let temporaryBatchSubscription: Subscription;

    return new Promise<{
      transactionHash?: string;
      errorMessage?: string;
    }>((resolve) => {
      temporaryBatchSubscription = sdk.notifications$
        .pipe(
          rxjsMap(async (notification) => {
            if (notification.type === NotificationTypes.GatewayBatchUpdated) {
              const submittedBatch = await sdk.getGatewaySubmittedBatch({ hash: result.hash });

              const failedStates = [
                GatewayTransactionStates.Canceling,
                GatewayTransactionStates.Canceled,
                GatewayTransactionStates.Reverted,
              ];

              let finishSubscription;
              if (submittedBatch?.transaction?.state && failedStates.includes(submittedBatch?.transaction?.state)) {
                finishSubscription = () => resolve({ errorMessage: 'Failed Transaction sent' });
              } else if (submittedBatch?.transaction?.hash) {
                finishSubscription = () => resolve({ transactionHash: submittedBatch.transaction.hash });
              }

              if (finishSubscription) {
                if (temporaryBatchSubscription) temporaryBatchSubscription.unsubscribe();
                finishSubscription();
              }
            }
          })
        )
        .subscribe();
    });
  } catch (e) {
    errorMessage = parseEtherspotErrorMessageIfAvailable(e);
    if (!errorMessage && e instanceof Error) {
      errorMessage = e?.message;
    }
    return { errorMessage };
  }
};

export const submitWeb3ProviderTransactions = async (
  sdk: EtherspotSdk,
  web3Provider: WalletProviderLike | Web3WalletProvider | null,
  transactions: ExecuteAccountTransactionDto[],
  chainId: number,
  providerAddress: string | null
): Promise<{
  transactionHash?: string;
  errorMessage?: string;
}> => {
  let transactionHash;
  let errorMessage;

  if (!web3Provider) {
    return { errorMessage: 'Unable to find connected Web3 provider!' };
  }

  // @ts-ignore
  if (web3Provider?.type !== 'WalletConnect') {
    // Even if its on same chain it returns correctly so that we dont have to check against current chainId
    const changed = await changeToChain(chainId);
    if (!changed) return { errorMessage: 'Unable to change to selected network!' };
  }

  try {
    for (const transaction of transactions) {
      const { to, value, data } = transaction;
      const tx = {
        from: providerAddress,
        to,
        data,
        value: prepareValueForRpcCall(value),
      };
      // @ts-ignore
      transactionHash = await sendWeb3ProviderRequest(web3Provider, 'eth_sendTransaction', [tx], chainId);
    }
  } catch (e) {
    if (e instanceof Error) {
      errorMessage = e?.message;
    }
  }

  return { transactionHash, errorMessage };
};

export const submitWeb3ProviderTransaction = async (
  web3Provider: WalletProviderLike | Web3WalletProvider | null,
  transaction: ExecuteAccountTransactionDto,
  chainId: number,
  providerAddress: string | null,
  waitForCompleted: boolean = true
): Promise<{
  transactionHash?: string;
  errorMessage?: string;
}> => {
  let transactionHash;
  let errorMessage;

  if (!web3Provider) {
    return { errorMessage: 'Unable to find connected Web3 provider!' };
  }

  let currentChainId;
  try {
    // @ts-ignore
    currentChainId = +ethers.BigNumber.from(web3Provider.web3.chainId).toString();
  } catch (e) {
    console.warn('Unable to extract current chain ID');
  }

  // @ts-ignore
  if (chainId !== currentChainId && web3Provider?.type !== 'WalletConnect') {
    const changed = await changeToChain(chainId);
    if (!changed) return { errorMessage: 'Unable to change to selected network!' };
  }

  try {
    const { to, value, data } = transaction;
    const tx = {
      from: providerAddress,
      to,
      data,
      value: prepareValueForRpcCall(value),
    };
    // @ts-ignore
    transactionHash = await sendWeb3ProviderRequest(web3Provider, 'eth_sendTransaction', [tx], chainId);
  } catch (e) {
    if (e instanceof Error) {
      errorMessage = e?.message;
    }
  }

  if (transactionHash && waitForCompleted) {
    let transactionStatus = null;

    while (transactionStatus === null) {
      try {
        // @ts-ignore
        let status = await sendWeb3ProviderRequest(
          web3Provider,
          'eth_getTransactionByHash',
          [transactionHash],
          chainId
        );
        if (status && status.blockNumber !== null) {
          transactionStatus = status;
        }
        await sleep(2);
      } catch (err) {
        //
      }
    }
  }

  return { transactionHash, errorMessage };
};

const prepareValueForRpcCall = (rawValue: any): string | undefined => {
  let value;

  try {
    const valueBN = ethers.BigNumber.isBigNumber(rawValue) ? rawValue : ethers.BigNumber.from(rawValue);
    if (!valueBN.isZero()) value = valueBN.toHexString();
  } catch (e) {
    //
  }

  return value;
};

export const getTransactionStatus = async (sdk: EtherspotSdk, hash: string): Promise<string> => {
  if (!sdk) return CROSS_CHAIN_ACTION_STATUS.FAILED;

  const result = await sdk.getTransaction({ hash });

  if (result.status === TransactionStatuses.Completed) {
    return CROSS_CHAIN_ACTION_STATUS.CONFIRMED;
  } else if (result.status === TransactionStatuses.Reverted) {
    return CROSS_CHAIN_ACTION_STATUS.FAILED;
  }

  return CROSS_CHAIN_ACTION_STATUS.PENDING;
};

export const getTransactionExplorerLink = (chainId: number, transactionHash?: string): string | null => {
  const explorerUrl = supportedChains.find((chain) => chain.chainId === chainId)?.explorerUrl;
  if (!explorerUrl || !transactionHash) return null;
  return `${explorerUrl}${transactionHash}`;
};

// 0,10 – first 4 bytes
const ERC20ApprovalMethodId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('approve(address,uint256)')).slice(0, 10);

export const isERC20ApprovalTransactionData = (data: string | undefined): boolean => {
  if (!data) return false;
  return data.toLowerCase().startsWith(ERC20ApprovalMethodId.toLowerCase());
};

export const deployAccount = async (sdk: EtherspotSdk | null) => {
  if (!sdk) return;
  sdk.clearGatewayBatch();
  await sdk.batchDeployAccount();
  await sdk.estimateGatewayBatch();
  return sdk.submitGatewayBatch();
};

export const sendWeb3ProviderRequest = async (web3Provider: any, method: string, params: any[], chainId: number) => {
  // @ts-ignore
  if (web3Provider.type === 'WalletConnect') {
    let updatedParams;
    if (method === 'eth_sendTransaction') {
      updatedParams = [{ ...params[0], data: params[0].data ?? '0x' }];
    }
    return web3Provider.connector.signer.request({ method, params: updatedParams ?? params }, `eip155:${chainId}`);
  }
  return web3Provider.sendRequest(method, params);
};

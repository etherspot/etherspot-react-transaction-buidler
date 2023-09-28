import {
  AccountTypes,
  BridgingQuote,
  CrossChainServiceProvider,
  ExchangeOffer,
  GatewayTransactionStates,
  LiFiStatus,
  NotificationTypes,
  Sdk as EtherspotSdk,
  TransactionStatuses,
  WalletProviderLike,
  Web3WalletProvider,
} from 'etherspot';
import { Route } from '@lifi/sdk';
import { BigNumber, BigNumberish, ethers, utils } from 'ethers';
import { uniqueId } from 'lodash';
import { ERC20TokenContract } from 'etherspot/dist/sdk/contract/internal/erc20-token.contract';

import { ExecuteAccountTransactionDto } from 'etherspot/dist/sdk/dto/execute-account-transaction.dto';

import { ContractNames, getContractAbi } from '@etherspot/contracts';

import { Subscription } from 'rxjs';
import { map as rxjsMap } from 'rxjs/operators';

import { TRANSACTION_BLOCK_TYPE } from '../constants/transactionBuilderConstants';
import { addressesEqual, isValidEthereumAddress, isZeroAddress } from './validation';
import { CHAIN_ID, changeToChain, nativeAssetPerChainId, plrDaoMemberNft, supportedChains } from './chain';
import { plrDaoAsset, plrDaoAssetPerChainId, plrStakedAssetEthereumMainnet } from './asset';
import { parseEtherspotErrorMessageIfAvailable } from './etherspot';
import { getAssetPriceInUsd, getNativeAssetPriceInUsd } from '../services/coingecko';
import { bridgeServiceIdToDetails } from './bridge';
import { swapServiceIdToDetails } from './swap';
import { TransactionRequest, sleep } from 'etherspot/dist/sdk/common';
import {
  ICrossChainActionEstimation,
  ICrossChainActionTransaction,
  ICrossChainAction,
} from '../types/crossChainAction';
import { CROSS_CHAIN_ACTION_STATUS } from '../constants/transactionDispatcherConstants';
import { ITransactionBlock } from '../types/transactionBlock';
import {
  GNOSIS_USDC_CONTRACT_ADDRESS,
  PLR_DAO_CONTRACT_PER_CHAIN,
  PLR_STAKING_ADDRESS_ETHEREUM_MAINNET,
  POLYGON_USDC_CONTRACT_ADDRESS,
} from '../constants/assetConstants';
import { PlrV2StakingContract } from '../types/etherspotContracts';
import { UNISWAP_ROUTER_ABI } from '../constants/uniswapRouterAbi';
import { UniswapV2RouterContract } from '../contracts/UniswapV2Router';
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

interface IPlrTransaction {
  to: string;
  data: string;
  chainId: number;
  value: number;
  createTimestamp: number;
  status: string;
}

const fetchBestRoute = async (
  sdk: EtherspotSdk,
  fromChainId: number,
  toChainId: number,
  fromAmount: BigNumber,
  fromTokenAddress: string,
  toTokenAddress: string,
  toAddress?: string
) => {
  try {
    const createTimestamp = +new Date();
    const routes = await sdk.getAdvanceRoutesLiFi({
      fromChainId,
      toChainId, //Polygon
      fromAmount,
      fromTokenAddress,
      toTokenAddress,
      toAddress,
    });
    const bestRoute = routes.items.reduce((best: Route, route) => {
      if (!best?.toAmount || BigNumber.from(best.toAmount).lt(route.toAmount)) return route;
      return best;
    });

    if (!bestRoute) {
      return { errorMessage: 'Failed to get bridge route' };
    }
    const { items: advancedRouteSteps } = await sdk.getStepTransaction({ route: bestRoute });

    let destinationTxns: ICrossChainActionTransaction[] = [];
    let transactions: ICrossChainActionTransaction[] = [];

    if (bestRoute.containsSwitchChain) {
      advancedRouteSteps.forEach((step) => {
        if (step.chainId === plrDaoAsset.chainId) {
          return destinationTxns.push({
            to: step.to as string,
            value: step.value,
            data: step.data,
            createTimestamp,
            status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
          });
        }
        return transactions.push({
          to: step.to as string,
          value: step.value,
          data: step.data,
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        });
      });
    } else {
      transactions = advancedRouteSteps.map(({ to, value, data, chainId }) => ({
        to: to as string,
        value,
        data,
        chainId: chainId ?? fromChainId,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      }));
    }

    if (
      ethers.utils.isAddress(bestRoute.fromToken.address) &&
      !addressesEqual(bestRoute.fromToken.address, nativeAssetPerChainId[fromChainId].address) &&
      transactions.length === 1 &&
      bestRoute.fromAmount
    ) {
      const abi = getContractAbi(ContractNames.ERC20Token);
      const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, bestRoute.fromToken.address);
      const approvalTransactionRequest = erc20Contract?.encodeApprove?.(transactions[0].to, bestRoute.fromAmount);
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
    return { bestRoute, transactions, destinationTxns };
  } catch (err) {
    return { errorMessage: 'Failed to get bridge route' };
  }
};

const fetchSwapAssetTransaction = async (
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

const buildBridgeAssetToPlrTransactions = async (
  chainId: number,
  route: Route | null,
  sdk?: EtherspotSdk | null
): Promise<{ errorMessage?: string; result?: { transactions: ICrossChainActionTransaction[] } }> => {
  try {
    const createTimestamp = +new Date();
    if (!sdk) return { errorMessage: 'No sdk found' };
    if (!route) return { errorMessage: 'Failed to fetch routes' };
    const { items: advancedRouteSteps } = await sdk.getStepTransaction({ route });

    let transactions: ICrossChainActionTransaction[] = advancedRouteSteps.map(({ to, value, data, chainId }) => ({
      to: to as string,
      value,
      data,
      chainId: chainId,
      createTimestamp,
      status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
    }));

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
    return { result: { transactions } };
  } catch (err) {
    return { errorMessage: 'Failed build transfer transaction!' };
  }
};

export const klimaDaoStaking = async (
  routeToKlima?: BridgingQuote | null,
  receiverAddress?: string,
  sdk?: EtherspotSdk | null,
  flag?: Boolean,
  amount?: string
): Promise<{
  errorMessage?: string;
  result?: { transactions: ICrossChainActionTransaction[]; provider?: string; iconUrl?: string };
}> => {
  if (!sdk) return { errorMessage: 'No sdk found' };

  if (!routeToKlima) {
    const quotes = await sdk.getCrossChainQuotes({
      fromChainId: CHAIN_ID.POLYGON,
      toChainId: CHAIN_ID.POLYGON,
      fromAmount: BigNumber.from(amount).sub('250000'),
      fromTokenAddress: POLYGON_USDC_CONTRACT_ADDRESS,
      toTokenAddress: '0x4e78011Ce80ee02d2c3e649Fb657E45898257815',
      toAddress: receiverAddress ?? undefined,
      serviceProvider: CrossChainServiceProvider.LiFi,
    });
    if (quotes.items.length > 0) routeToKlima = quotes.items[0];
    else return { errorMessage: 'No routes found for staking. Please try again' };
  }

  try {
    const fromAssetAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const createTimestamp = +new Date();

    const bestRoute = routeToKlima;

    let transactions = [
      {
        to: bestRoute.transaction.to,
        value: bestRoute.transaction.value as string,
        data: bestRoute.transaction.data as string,
        createTimestamp,
        status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
      },
    ];

    if (flag) {
      return {
        result: {
          transactions,
          provider: bridgeServiceIdToDetails['lifi'].title,
          iconUrl: bridgeServiceIdToDetails['lifi'].iconUrl,
        },
      };
    }

    // not native asset and no erc20 approval transaction included
    if (
      !addressesEqual(fromAssetAddress, nativeAssetPerChainId[CHAIN_ID.POLYGON].address) &&
      transactions.length === 1 &&
      bestRoute.approvalData
    ) {
      const abi = getContractAbi(ContractNames.ERC20Token);
      const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
      const approvalTransactionRequest = erc20Contract?.encodeApprove?.(
        bestRoute.approvalData.approvalAddress,
        bestRoute.approvalData.amount
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
      bestRoute.estimate.toAmount
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
    ); // Klima ojn Polygon
    const klimaStakeTransactionRequest = klimaStakingContract.encodeStake?.(bestRoute.estimate.toAmount); // Klima staking
    if (!klimaStakeTransactionRequest || !klimaStakeTransactionRequest.to) {
      return { errorMessage: 'Failed build bridge approval transaction!' };
    }

    const klimaStakinglTransaction = {
      to: klimaStakeTransactionRequest.to,
      data: klimaStakeTransactionRequest.data,
      chainId: CHAIN_ID.POLYGON,
      value: '0',
      createTimestamp,
      status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
    };

    transactions = [...transactions, klimaApprovalTransaction, klimaStakinglTransaction];

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

export const honeyswapLP = async (
  sdk: EtherspotSdk | null,
  amount1: BigNumber,
  tokenAddress1: string,
  amount2: BigNumber,
  tokenAddress2: string,
  receiverAddress: string
) => {
  if (!sdk) return { errorMessage: 'No sdk found' };

  const contractAddress = '0x1C232F01118CB8B424793ae03F870aa7D0ac7f77';
  const contractAddressProxy = '0xf8D1677c8a0c961938bf2f9aDc3F3CFDA759A9d9';

  const createTimestamp = Date.now() + 100;

  try {
    const amountMin1 = (Number(amount1) - Number(amount1) * 0.05).toFixed(0);
    const amountMin2 = (Number(amount2) - Number(amount2) * 0.05).toFixed(0);

    const uniswapV2AbiAddLiquidity = [
      {
        inputs: [
          { internalType: 'address', name: 'tokenA', type: 'address' },
          { internalType: 'address', name: 'tokenB', type: 'address' },
          { internalType: 'uint256', name: 'amountADesired', type: 'uint256' },
          { internalType: 'uint256', name: 'amountBDesired', type: 'uint256' },
          { internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
          { internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
          { internalType: 'address', name: 'to', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
        ],
        name: 'addLiquidity',
        outputs: [
          { internalType: 'uint256', name: 'amountA', type: 'uint256' },
          { internalType: 'uint256', name: 'amountB', type: 'uint256' },
          { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ];

    const uniswapV2AbiAddLiquidityETH = [
      {
        inputs: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amountTokenDesired', type: 'uint256' },
          { internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
          { internalType: 'uint256', name: 'amountETHMin', type: 'uint256' },
          { internalType: 'address', name: 'to', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
        ],
        name: 'addLiquidityETH',
        outputs: [
          { internalType: 'uint256', name: 'amountToken', type: 'uint256' },
          { internalType: 'uint256', name: 'amountETH', type: 'uint256' },
          { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
        ],
        stateMutability: 'payable',
        type: 'function',
      },
    ];

    const ContractInterface = new ethers.utils.Interface(uniswapV2AbiAddLiquidity);

    const ContractInterfaceEth = new ethers.utils.Interface(uniswapV2AbiAddLiquidityETH);

    let encodedEthData = null;

    if (isZeroAddress(tokenAddress1)) {
      encodedEthData = ContractInterfaceEth.encodeFunctionData('addLiquidityETH', [
        tokenAddress2,
        amount2,
        amountMin2,
        amountMin1,
        receiverAddress,
        createTimestamp,
      ]);
    }

    if (isZeroAddress(tokenAddress2)) {
      encodedEthData = ContractInterfaceEth.encodeFunctionData('addLiquidityETH', [
        tokenAddress1,
        amount1,
        amountMin1,
        amountMin2,
        receiverAddress,
        createTimestamp,
      ]);
    }

    const encodedData = ContractInterface.encodeFunctionData('addLiquidity', [
      tokenAddress1,
      tokenAddress2,
      amount1,
      amount2,
      amountMin1,
      amountMin2,
      receiverAddress,
      createTimestamp,
    ]);

    const approveAbi = [
      {
        constant: false,
        inputs: [
          { name: '_to', type: 'address' },
          { name: '_value', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: 'result', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ];

    const ERC20Intance = new ethers.utils.Interface(approveAbi);

    const approvalData1 = ERC20Intance.encodeFunctionData('approve', [contractAddress, amount1]);

    const approvalData2 = ERC20Intance.encodeFunctionData('approve', [contractAddress, amount2]);

    const newEncodeAddLiquidityTransactions = {
      to: contractAddress,
      data: encodedData,
      chainId: CHAIN_ID.XDAI,
      value: '0',
      createTimestamp,
      status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
    };

    const newApprovalTransaction1 = {
      to: tokenAddress1,
      data: approvalData1,
      chainId: CHAIN_ID.XDAI,
      value: '0',
      createTimestamp,
      status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
    };

    const newApprovalTransaction2 = {
      to: tokenAddress2,
      data: approvalData2,
      chainId: CHAIN_ID.XDAI,
      value: '0',
      createTimestamp,
      status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
    };

    let newNativeTokenEndodedData = encodedEthData
      ? {
          to: contractAddress,
          data: encodedEthData,
          chainId: CHAIN_ID.XDAI,
          value: isZeroAddress(tokenAddress1) ? amount1 : amount2,
          createTimestamp,
          status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
        }
      : null;

    const isAnyTokenAddressZero = isZeroAddress(tokenAddress1) || isZeroAddress(tokenAddress2);

    let transactions: any[] = [];

    if (isZeroAddress(tokenAddress1)) {
      transactions = [newApprovalTransaction2];
    } else if (isZeroAddress(tokenAddress2)) {
      transactions = [newApprovalTransaction1];
    } else {
      transactions = [newApprovalTransaction1, newApprovalTransaction2];
    }

    if (isAnyTokenAddressZero && newNativeTokenEndodedData) {
      transactions = [...transactions, newNativeTokenEndodedData];
    } else {
      transactions = [...transactions, newEncodeAddLiquidityTransactions];
    }

    return { result: { transactions, provider: 'LiFi' } };
  } catch (error) {
    return { errorMessage: 'Failed to build transaction!' };
  }
};

const buildPlrDaoUnStakeTransaction = (
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
          toolUsed,
        },
      } = transactionBlock;

      const amountBN = ethers.utils.parseUnits(amount, fromAssetDecimals);

      if (fromChainId !== CHAIN_ID.POLYGON) {
        try {
          let destinationTxns: ICrossChainActionTransaction[] = [];
          let transactions: ICrossChainActionTransaction[] = [];

          transactions = [
            {
              to: routeToUSDC.transaction.to,
              value: routeToUSDC.transaction.value as string,
              data: routeToUSDC.transaction.data as string,
              createTimestamp,
              status: CROSS_CHAIN_ACTION_STATUS.UNSENT,
            },
          ];

          if (
            ethers.utils.isAddress(fromAssetAddress) &&
            !addressesEqual(fromAssetAddress, nativeAssetPerChainId[fromChainId].address) &&
            routeToUSDC.approvalData?.approvalAddress
          ) {
            const abi = getContractAbi(ContractNames.ERC20Token);
            const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
            const approvalTransactionRequest = erc20Contract?.encodeApprove?.(
              routeToUSDC.approvalData.approvalAddress,
              routeToUSDC.approvalData.amount
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

          const result = await klimaDaoStaking(routeToKlima, receiverAddress, sdk, true, '0');

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
            bridgeUsed: toolUsed,
            receiveAmount: ethers.utils.parseUnits(routeToUSDC.estimate.toAmount ?? '0', 6).toString(),
            useWeb3Provider: accountType === AccountTypes.Key,
            gasCost: routeToUSDC.estimate.gasCosts.amountUSD,
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

        const result = await buildBridgeAssetToPlrTransactions(fromChainId, route, sdk);

        if (result?.errorMessage) return { errorMessage: result.errorMessage };
        const crossChainAction: ICrossChainAction = {
          id: crossChainActionId,
          relatedTransactionBlockId: transactionBlock.id,
          chainId: fromChainId,
          type: TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE,
          preview,
          transactions: result?.result?.transactions || [],
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
      if (
        toToken1.address &&
        offer1
      ) {
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

      if (
        toToken2.address &&
        offer2
      ) {
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
            destinationCrossChainAction: accountType !== AccountTypes.Key
              ? []
              : [{
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
                }]
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
    !!transactionBlock?.values?.fromChain &&
    !!transactionBlock?.values?.toChain &&
    !!transactionBlock?.values?.fromAsset &&
    !!transactionBlock?.values?.toAsset &&
    !!transactionBlock?.values?.amount
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

    let toAssetAmount = addressesEqual(toAssetAddress, plrStakedAssetEthereumMainnet.address) ? fromAmountBN : '0';

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
      try {
        const routeData = await fetchBestRoute(
          sdk,
          fromChainId,
          toChainId,
          fromAmountBN,
          fromAssetAddress,
          toAssetAddress,
          receiverAddress
        );

        if (routeData.errorMessage) return { errorMessage: routeData.errorMessage };
        if (!routeData.bestRoute) return { errorMessage: 'Failed build swap transaction!' };

        transactions = routeData.destinationTxns ?? [];
        toAssetAmount = BigNumber.from(routeData.bestRoute.toAmount);
      } catch (e) {
        return { errorMessage: 'Failed to build cross chain swap transaction!' };
      }
    } else if (addressesEqual(toAssetAddress, PLR_STAKING_ADDRESS_ETHEREUM_MAINNET)) {
      try {
        const plrV2StakingContract = sdk.registerContract<PlrV2StakingContract>(
          'plrV2StakingContract',
          ['function stake(uint256)'],
          PLR_STAKING_ADDRESS_ETHEREUM_MAINNET
        );
        const stakeTransactionRequest = plrV2StakingContract?.encodeStake?.(toAssetAmount);
        if (!stakeTransactionRequest || !stakeTransactionRequest.to) {
          return { errorMessage: 'Failed build stake transaction!' };
        }
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

    if (receiverAddress && isValidEthereumAddress(receiverAddress)) {
      try {
        const abi = getContractAbi(ContractNames.ERC20Token);
        const erc20Contract = sdk.registerContract<ERC20TokenContract>('erc20Contract', abi, fromAssetAddress);
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

export const getCrossChainStatusByHash = async (
  sdk: EtherspotSdk,
  fromChainId: number,
  toChainId: number,
  hash: string,
  bridge?: string
): Promise<LiFiStatus | null> => {
  if (!sdk) return null;
  try {
    const options = { method: 'GET', headers: { accept: 'application/json' } };

    const result = await (
      await fetch(
        `https://li.quest/v1/status?bridge=${bridge}&fromChain=${fromChainId}&toChain=${toChainId}&txHash=${hash}`,
        options
      )
    ).json();

    return {
      receivingTxnHash: result.receiving?.txHash,
      sendingTxnHash: result.sending?.txHash,
      bridgeExplorerLink: result['bridgeExplorerLink'],
      status: result.status,
      subStatus: result.substatus,
      subStatusMsg: result.substatusMessage,
    };
  } catch (err) {
    return null;
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

  // TODO: check against current
  // @ts-ignore
  if (chainId !== 1 && web3Provider?.type !== 'WalletConnect') {
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

    let transactionStatus = null;

    while (transactionStatus === null) {
      try {
        // @ts-ignore
        let status = await sendWeb3ProviderRequest(web3Provider, 'eth_getTransactionByHash', [transactionHash], chainId);
        if (status && status.blockNumber !== null) {
          transactionStatus = status;
        }
        await sleep(2);
      } catch (err) {
        //
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      errorMessage = e?.message;
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

export const estimateCrossChainAction = async (
  sdk: EtherspotSdk | null,
  web3Provider: WalletProviderLike | Web3WalletProvider | null,
  crossChainAction: ICrossChainAction,
  providerAddress?: string | null,
  accountAddress?: string | null
): Promise<ICrossChainActionEstimation> => {
  let gasCost = null;
  let usdPrice = null;
  let errorMessage;
  let feeAmount = null;

  if (!sdk || (crossChainAction.useWeb3Provider && !web3Provider)) {
    return { errorMessage: 'Failed to estimate!' };
  }
  let feeAssetBalanceBN = ethers.BigNumber.from(0);
  try {
    const balancesForAddress = crossChainAction.useWeb3Provider && providerAddress ? providerAddress : accountAddress;
    const getAccountBalancesTokens =
      !crossChainAction.gasTokenAddress || isZeroAddress(crossChainAction?.gasTokenAddress)
        ? undefined
        : [crossChainAction.gasTokenAddress];
    const { items: balances } = await sdk.getAccountBalances({
      account: balancesForAddress as string,
      tokens: getAccountBalancesTokens,
      chainId: crossChainAction.chainId,
    });

    const feeAssetBalance = balances.find(
      (balance) =>
        (!isZeroAddress(crossChainAction.gasTokenAddress) &&
          addressesEqual(balance.token, crossChainAction.gasTokenAddress)) ||
        (isZeroAddress(crossChainAction.gasTokenAddress) && balance.token === null)
    );

    if (feeAssetBalance) feeAssetBalanceBN = feeAssetBalance.balance;

    crossChainAction.transactions.map((transactionsToSend) => {
      const { value } = transactionsToSend;
      if (!value) return;

      // sub value from balance if native asset
      if (isZeroAddress(crossChainAction.gasTokenAddress)) {
        feeAssetBalanceBN = feeAssetBalanceBN.sub(value);
        return;
      }

      const outgoingAsset =
        crossChainAction.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET
          ? crossChainAction.preview.asset
          : crossChainAction.preview.fromAsset;

      // sub outgoing erc20 only if it matches gas token address
      if (outgoingAsset.address && !addressesEqual(crossChainAction.gasTokenAddress, outgoingAsset.address)) return;
      feeAssetBalanceBN = feeAssetBalanceBN.sub(outgoingAsset.amount);
    });
  } catch (e) {
    //
  }

  // @ts-ignore
  if (crossChainAction.useWeb3Provider && web3Provider?.type !== 'WalletConnect') {
    let gasLimit = ethers.BigNumber.from(0);

    try {
      for (const transactionsToSend of crossChainAction.transactions) {
        const { to, data, value } = transactionsToSend;
        // @ts-ignore
        const estimatedTx = await sendWeb3ProviderRequest(
          web3Provider,
          'eth_estimateGas',
          [
            {
              from: providerAddress,
              to,
              value: prepareValueForRpcCall(value),
              data,
            },
          ],
          crossChainAction.chainId,
        );
        gasLimit = gasLimit.add(estimatedTx);
      }
      if (!gasLimit.isZero()) gasCost = gasLimit;
    } catch (e) {
      if (e instanceof Error) {
        errorMessage = e?.message;
      }
    }
  } else if (!crossChainAction.useWeb3Provider) {
    try {
      if (!sdk?.state?.account?.type || sdk.state.account.type === AccountTypes.Key) {
        await sdk.computeContractAccount({ sync: true });
      }

      sdk.clearGatewayBatch();

      // sequential
      for (const transactionsToSend of crossChainAction.transactions) {
        const { to, value, data } = transactionsToSend;
        await sdk.batchExecuteAccountTransaction({ to, value, data });
      }

      const feeToken =
        !crossChainAction.gasTokenAddress || isZeroAddress(crossChainAction.gasTokenAddress)
          ? undefined
          : crossChainAction.gasTokenAddress;

      const { estimation: gatewayBatchEstimation } = await sdk.estimateGatewayBatch({ feeToken });
      gasCost = gatewayBatchEstimation.estimatedGasPrice.mul(gatewayBatchEstimation.estimatedGas);
      feeAmount = feeToken ? gatewayBatchEstimation.feeAmount : null;
    } catch (e) {
      errorMessage = parseEtherspotErrorMessageIfAvailable(e);
      if (!errorMessage && e instanceof Error) {
        errorMessage = e?.message;
      }
    }
  }

  if (
    feeAssetBalanceBN.isZero() ||
    (!feeAmount && gasCost && feeAssetBalanceBN.lt(gasCost)) ||
    (feeAmount && feeAssetBalanceBN.lt(feeAmount))
  ) {
    return { errorMessage: 'Not enough gas!' };
  }

  try {
    usdPrice =
      feeAmount && crossChainAction.gasTokenAddress
        ? await getAssetPriceInUsd(crossChainAction.chainId, crossChainAction.gasTokenAddress)
        : await getNativeAssetPriceInUsd(crossChainAction.chainId);
  } catch (e) {
    //
  }

  return { gasCost, errorMessage, usdPrice, feeAmount };
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

export const getFirstCrossChainActionByStatus = (
  crossChainActions: ICrossChainAction[],
  status: string
): ICrossChainAction | undefined =>
  crossChainActions.find(({ transactions }) => transactions.find((transaction) => transaction.status === status));

export const filterCrossChainActionsByStatus = (
  crossChainActions: ICrossChainAction[],
  status: string
): ICrossChainAction[] =>
  crossChainActions.filter(({ transactions }) => transactions.find((transaction) => transaction.status === status));

export const getCrossChainActionTransactionsByStatus = (
  crossChainActionTransactions: ICrossChainActionTransaction[],
  status: string
): ICrossChainActionTransaction[] =>
  crossChainActionTransactions.filter((transaction) => transaction.status === status);

export const updateCrossChainActionsTransactionsStatus = (
  crossChainActions: ICrossChainAction[],
  status: string
): ICrossChainAction[] =>
  crossChainActions.map((crossChainActionToDispatch) =>
    updateCrossChainActionTransactionsStatus(crossChainActionToDispatch, status)
  );

export const updateCrossChainActionTransactionsStatus = (
  crossChainAction: ICrossChainAction,
  status: string
): ICrossChainAction => ({
  ...crossChainAction,
  transactions: crossChainAction.transactions.map((transaction) => ({
    ...transaction,
    status: transaction.status === CROSS_CHAIN_ACTION_STATUS.CONFIRMED ? CROSS_CHAIN_ACTION_STATUS.CONFIRMED : status,
  })),
});

export const rejectUnsentCrossChainActionsTransactions = (
  crossChainActions: ICrossChainAction[]
): ICrossChainAction[] =>
  crossChainActions.map((crossChainActionToDispatch) => ({
    ...crossChainActionToDispatch,
    transactions: crossChainActionToDispatch.transactions.map((transaction) => {
      if (transaction.status !== CROSS_CHAIN_ACTION_STATUS.UNSENT) return transaction;
      return { ...transaction, status: CROSS_CHAIN_ACTION_STATUS.REJECTED_BY_USER };
    }),
  }));

export const deployAccount = async (sdk: EtherspotSdk | null) => {
  if (!sdk) return;
  sdk.clearGatewayBatch();
  await sdk.batchDeployAccount();
  await sdk.estimateGatewayBatch();
  return sdk.submitGatewayBatch();
};

export const sendWeb3ProviderRequest = async (
  web3Provider: any,
  method: string,
  params: any[],
  chainId: number,
) => {
  // @ts-ignore
  if (web3Provider.type === 'WalletConnect') {
    let updatedParams;
    if (method === 'eth_sendTransaction') {
      updatedParams = [{ ...params[0], data: params[0].data ?? '0x' }]
    }
    return web3Provider.connector.signer.request({ method, params: updatedParams ?? params }, `eip155:${chainId}`);
  }
  return web3Provider.sendRequest(method, params);
};

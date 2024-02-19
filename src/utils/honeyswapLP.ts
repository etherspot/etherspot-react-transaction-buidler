import { Sdk as EtherspotSdk } from 'etherspot';
import { BigNumber, ethers } from 'ethers';

import { isZeroAddress } from './validation';
import { CHAIN_ID } from './chain';
import { CROSS_CHAIN_ACTION_STATUS } from '../constants/transactionDispatcherConstants';

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
  // const contractAddressProxy = '0xf8D1677c8a0c961938bf2f9aDc3F3CFDA759A9d9';

  const createTimestamp = Date.now() + 100;
  const deadline = Math.ceil(Date.now() / 1000) + 60 * 20; // 20 minutes from now, default on honeyswap interface

  try {
    const amountMin1 = 0;
    const amountMin2 = 0;

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
        deadline,
      ]);
    }

    if (isZeroAddress(tokenAddress2)) {
      encodedEthData = ContractInterfaceEth.encodeFunctionData('addLiquidityETH', [
        tokenAddress1,
        amount1,
        amountMin1,
        amountMin2,
        receiverAddress,
        deadline,
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
      deadline,
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

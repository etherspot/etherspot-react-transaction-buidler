import { BigNumberish, BytesLike } from "ethers";
import { TransactionRequest } from "etherspot";
import { BaseContract } from "./Base";
import { UNISWAP_ROUTER_ABI } from "../constants/uniswapRouterAbi";

export class UniswapV2RouterContract extends BaseContract {
  constructor(address: string) {
    super("UniswapV2Router", UNISWAP_ROUTER_ABI, address);
  }

  callFactory?(): Promise<string>;
  callGetAmountIn?(
    amountOut: BigNumberish,
    reserveIn: BigNumberish,
    reserveOut: BigNumberish
  ): Promise<BigNumberish>;
  callGetAmountOut?(
    amountIn: BigNumberish,
    reserveIn: BigNumberish,
    reserveOut: BigNumberish
  ): Promise<BigNumberish>;
  callGetAmountsIn?(
    amountOut: BigNumberish,
    path: string[]
  ): Promise<BigNumberish[]>;
  callGetAmountsOut?(
    amountIn: BigNumberish,
    path: string[]
  ): Promise<BigNumberish[]>;
  callQuote?(
    amountA: BigNumberish,
    reserveA: BigNumberish,
    reserveB: BigNumberish
  ): Promise<BigNumberish>;
  callWETH?(): Promise<string>;

  encodeAddLiquidity?(
    tokenA: string,
    tokenB: string,
    amountADesired: BigNumberish,
    amountBDesired: BigNumberish,
    amountAMin: BigNumberish,
    amountBMin: BigNumberish,
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeAddLiquidityETH?(
    token: string,
    amountTokenDesired: BigNumberish,
    amountTokenMin: BigNumberish,
    amountETHMin: BigNumberish,
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeRemoveLiquidity?(
    tokenA: string,
    tokenB: string,
    liquidity: BigNumberish,
    amountAMin: BigNumberish,
    amountBMin: BigNumberish,
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeRemoveLiquidityETH?(
    token: string,
    liquidity: BigNumberish,
    amountTokenMin: BigNumberish,
    amountETHMin: BigNumberish,
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeRemoveLiquidityETHSupportingFeeOnTransferTokens?(
    token: string,
    liquidity: BigNumberish,
    amountTokenMin: BigNumberish,
    amountETHMin: BigNumberish,
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeRemoveLiquidityETHWithPermit?(
    token: string,
    liquidity: BigNumberish,
    amountTokenMin: BigNumberish,
    amountETHMin: BigNumberish,
    to: string,
    deadline: BigNumberish,
    approveMax: boolean,
    v: BigNumberish,
    r: BytesLike,
    s: BytesLike
  ): TransactionRequest;
  encodeRemoveLiquidityETHWithPermitSupportingFeeOnTransferTokens?(
    token: string,
    liquidity: BigNumberish,
    amountTokenMin: BigNumberish,
    amountETHMin: BigNumberish,
    to: string,
    deadline: BigNumberish,
    approveMax: boolean,
    v: BigNumberish,
    r: BytesLike,
    s: BytesLike
  ): TransactionRequest;
  encodeRemoveLiquidityWithPermit?(
    tokenA: string,
    tokenB: string,
    liquidity: BigNumberish,
    amountAMin: BigNumberish,
    amountBMin: BigNumberish,
    to: string,
    deadline: BigNumberish,
    approveMax: boolean,
    v: BigNumberish,
    r: BytesLike,
    s: BytesLike
  ): TransactionRequest;
  encodeSwapETHForExactTokens?(
    amountOut: BigNumberish,
    path: string[],
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeSwapExactETHForTokens?(
    amountOutMin: BigNumberish,
    path: string[],
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeSwapExactETHForTokensSupportingFeeOnTransferTokens?(
    amountOutMin: BigNumberish,
    path: string[],
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeSwapExactTokensForETH?(
    amountIn: BigNumberish,
    amountOutMin: BigNumberish,
    path: string[],
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeSwapExactTokensForETHSupportingFeeOnTransferTokens?(
    amountIn: BigNumberish,
    amountOutMin: BigNumberish,
    path: string[],
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeSwapExactTokensForTokens?(
    amountIn: BigNumberish,
    amountOutMin: BigNumberish,
    path: string[],
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeSwapExactTokensForTokensSupportingFeeOnTransferTokens?(
    amountIn: BigNumberish,
    amountOutMin: BigNumberish,
    path: string[],
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeSwapTokensForExactETH?(
    amountOut: BigNumberish,
    amountInMax: BigNumberish,
    path: string[],
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
  encodeSwapTokensForExactTokens?(
    amountOut: BigNumberish,
    amountInMax: BigNumberish,
    path: string[],
    to: string,
    deadline: BigNumberish
  ): TransactionRequest;
}

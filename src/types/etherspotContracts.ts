import { InternalContract } from 'etherspot';
import { TransactionRequest } from 'etherspot/dist/sdk/common';
import { BigNumberish } from 'ethers';

export declare class PlrV2StakingContract extends InternalContract {
  constructor();
  encodeStake?(value: BigNumberish): TransactionRequest;
}

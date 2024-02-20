import { useEffect, useState } from 'react';

// Constant
import { PLR_STAKING_POLYGON_CONTRACT_ADDRESS } from '../constants/assetConstants';

// Local
import { useEtherspot } from '.';
import { AccountTypes } from 'etherspot';

/**
 * contractState
 * 0 - contract has been initialized
 * 1 - you can stake into it (the swap interface is shown)
 * 2 - locked up (the staking period has started, no staking or unstaking can be made during this period)
 * 3 - can be unstaked (the staking period has ended and the rewards are ready to claim. just the unstake button shown)
 * @returns number
 */
const useGetContractState = (selectedAccountType: string) => {
  const [contractState, setContractState] = useState<Number>(1);
  const [stakedAmount, setStakedAmount] = useState('0');

  const { sdk, providerAddress, accountAddress } = useEtherspot();

  useEffect(() => {
    (async () => {
      try {
        const plrStakingGetContract = sdk.registerContract(
          'plrStakingGetContractState',
          [
            {
              inputs: [],
              name: 'getContractState',
              outputs: [{ internalType: 'enum PStaking.StakingState', name: '', type: 'uint8' }],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
              name: 'getStakedAmountForAccount',
              outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          PLR_STAKING_POLYGON_CONTRACT_ADDRESS
        );
        const getContactState = await plrStakingGetContract?.callGetContractState();
        const staked = await plrStakingGetContract?.callGetStakedAmountForAccount?.(
          selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress
        );

        if (Number(staked)) {
          setStakedAmount(staked);
          setContractState(getContactState);
        } else {
          if(getContactState === 0) setContractState(0);  
          else setContractState(1);
        }
      } catch (e) {
        setContractState(1);
        console.error(e);
      }
    })();
  }, [selectedAccountType, accountAddress, providerAddress]);

  return { contractState, stakedAmount };
};

export default useGetContractState;

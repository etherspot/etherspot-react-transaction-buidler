import { useContext } from 'react';

import { EtherspotContext } from '../contexts';

const useEtherspotPrime = () => {
  const context = useContext(EtherspotContext);

  if (context === null) {
    throw new Error('No parent <EtherspotContextProvider />');
  }

  return context.data;
};

export default useEtherspotPrime;

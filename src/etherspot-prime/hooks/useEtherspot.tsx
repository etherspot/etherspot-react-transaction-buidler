import React, { useContext } from 'react';

import { EtherspotContext } from '../contexts';

const useEtherspot = () => {
  const context = useContext(EtherspotContext);

  if (context === null) {
    throw new Error('No parent <EtherspotContextProvider />');
  }

  return context.data;
};

export default useEtherspot;

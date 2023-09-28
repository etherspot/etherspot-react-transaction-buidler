import React, { useContext } from 'react';

import { TransactionBuilderContext } from '../contexts';

const useTransactionBuilder = () => {
  const context = useContext(TransactionBuilderContext);

  if (context === null) {
    throw new Error('No parent <TransactionBuilderContextProvider />');
  }

  return context.data;
};

export default useTransactionBuilder;

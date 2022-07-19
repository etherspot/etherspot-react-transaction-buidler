import React, { useContext } from 'react';

import { TransactionBuilderContext } from '../contexts';
import { TransactionBuilderContextData } from '../contexts/TransactionBuilderContext';

const useTransactionBuilder = () => {
  const context = useContext<TransactionBuilderContextData>(TransactionBuilderContext);

  if (context === null) {
    throw new Error('No parent <TransactionBuilderContextProvider />');
  }

  return context.data;
};

export default useTransactionBuilder;

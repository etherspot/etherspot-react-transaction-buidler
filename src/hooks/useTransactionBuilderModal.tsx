import React, { useContext } from 'react';

import { TransactionBuilderModalContext } from '../contexts';
import { TransactionBuilderModalContextData } from '../contexts/TransactionBuilderModalContext';

const useTransactionBuilderModal = () => {
  const context = useContext<TransactionBuilderModalContextData>(TransactionBuilderModalContext);

  if (context === null) {
    throw new Error('No parent <TransactionBuilderModalContextProvider />');
  }

  return context.data;
};

export default useTransactionBuilderModal;

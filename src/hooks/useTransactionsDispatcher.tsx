import React, { useContext } from 'react';

import { TransactionsDispatcherContext } from '../contexts';
import { TransactionsDispatcherContextData } from '../contexts/TransactionsDispatcherContext';

const useTransactionsDispatcher = () => {
  const context = useContext<TransactionsDispatcherContextData>(TransactionsDispatcherContext);

  if (context === null) {
    throw new Error('No parent <TransactionsDispatcherContextProvider />');
  }

  return context.data;
};

export default useTransactionsDispatcher;

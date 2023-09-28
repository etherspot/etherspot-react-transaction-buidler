import { useContext } from 'react';

import { TransactionsDispatcherContext } from '../contexts';

const useTransactionsDispatcher = () => {
  const context = useContext(TransactionsDispatcherContext);

  if (context === null) {
    throw new Error('No parent <TransactionsDispatcherContextProvider />');
  }

  return context.data;
};

export default useTransactionsDispatcher;

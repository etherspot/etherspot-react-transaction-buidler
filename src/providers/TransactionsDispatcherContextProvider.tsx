import React, {
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { TransactionsDispatcherContext } from '../contexts';
import { DraftTransaction } from '../utils/transaction';

const TransactionsDispatcherContextProvider = ({ children }: { children: ReactNode }) => {
  const context = useContext(TransactionsDispatcherContext);

  if (context.initialized) {
    throw new Error('<TransactionsDispatcherContextProvider /> has already been declared.')
  }

  const initialized = useMemo(() => true, []);

  const [transactions, setTransactions] = useState<DraftTransaction[]>([]);

  const dispatchTransactions = useCallback((dispatchedTransactions: DraftTransaction[]) => {
    setTransactions(dispatchedTransactions);
  }, [setTransactions]);

  const contextData = useMemo(
    () => ({
      dispatchedTransactions: transactions,
      dispatchTransactions,
    }),
    [
      transactions,
      dispatchTransactions,
    ],
  );

  return (
    <TransactionsDispatcherContext.Provider value={{ initialized, data: contextData }}>
      {children}
    </TransactionsDispatcherContext.Provider>
  );
};

export default TransactionsDispatcherContextProvider;

import React, { createContext } from 'react';
import { DraftTransaction } from '../utils/transaction';

export interface TransactionsDispatcherContextData {
  initialized: boolean;
  data: {
    dispatchedTransactions: DraftTransaction[];
    dispatchTransactions: (transactions: DraftTransaction[]) => void;
  }
}

const TransactionsDispatcherContext = createContext<TransactionsDispatcherContextData>({
  initialized: false,
  data: {
    dispatchedTransactions: [],
    dispatchTransactions: () => {},
  }
});

export default TransactionsDispatcherContext;

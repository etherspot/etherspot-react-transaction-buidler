import React, { createContext } from 'react';
import { CrossChainAction } from '../utils/transaction';

export interface TransactionsDispatcherContextData {
  initialized: boolean;
  data: {
    crossChainActions: CrossChainAction[];
    dispatchCrossChainActions: (transactions: CrossChainAction[]) => void;
    processingDispatched: boolean;
  }
}

const TransactionsDispatcherContext = createContext<TransactionsDispatcherContextData>({
  initialized: false,
  data: {
    crossChainActions: [],
    dispatchCrossChainActions: () => {},
    processingDispatched: false,
  }
});

export default TransactionsDispatcherContext;

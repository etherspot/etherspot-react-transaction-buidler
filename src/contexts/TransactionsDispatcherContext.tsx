import React, { createContext } from 'react';
import { CrossChainAction } from '../utils/transaction';
import { DispatchedCrossChainAction } from '../providers/TransactionsDispatcherContextProvider';

export interface TransactionsDispatcherContextData {
  initialized: boolean;
  data: {
    dispatchedCrossChainActions: DispatchedCrossChainAction[];
    dispatchCrossChainActions: (transactions: CrossChainAction[]) => void;
    processingCrossChainActionId: string | null;
  }
}

const TransactionsDispatcherContext = createContext<TransactionsDispatcherContextData>({
  initialized: false,
  data: {
    dispatchedCrossChainActions: [],
    dispatchCrossChainActions: () => {},
    processingCrossChainActionId: null,
  }
});

export default TransactionsDispatcherContext;

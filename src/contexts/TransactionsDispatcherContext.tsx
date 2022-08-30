import React, { createContext } from 'react';
import { CrossChainAction } from '../utils/transaction';
import { DispatchedCrossChainAction } from '../providers/TransactionsDispatcherContextProvider';

export interface TransactionsDispatcherContextData {
  data: {
    dispatchedCrossChainActions: DispatchedCrossChainAction[];
    dispatchCrossChainActions: (transactions: CrossChainAction[]) => void;
    processingCrossChainActionId: string | null;
  }
}

const TransactionsDispatcherContext = createContext<TransactionsDispatcherContextData | null>(null);

export default TransactionsDispatcherContext;

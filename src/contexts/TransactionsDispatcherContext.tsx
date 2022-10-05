import React, { createContext } from 'react';
import { CrossChainAction } from '../utils/transaction';

export interface TransactionsDispatcherContextData {
  data: {
    dispatchedCrossChainActions: CrossChainAction[];
    dispatchCrossChainActions: (actions: CrossChainAction[], status?: string) => void;
    processingCrossChainActionId: string | null;
  }
}

const TransactionsDispatcherContext = createContext<TransactionsDispatcherContextData | null>(null);

export default TransactionsDispatcherContext;

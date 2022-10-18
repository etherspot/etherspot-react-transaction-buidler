import React, { createContext } from 'react';
import { ICrossChainAction } from '../types/crossChainAction';

export interface TransactionsDispatcherContextData {
  data: {
    dispatchedCrossChainActions: ICrossChainAction[];
    dispatchCrossChainActions: (actions: ICrossChainAction[], status?: string) => void;
    processingCrossChainActionId: string | null;
  }
}

const TransactionsDispatcherContext = createContext<TransactionsDispatcherContextData | null>(null);

export default TransactionsDispatcherContext;

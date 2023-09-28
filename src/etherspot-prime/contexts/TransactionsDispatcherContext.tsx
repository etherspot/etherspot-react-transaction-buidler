import { createContext } from 'react';
import { ICrossChainAction } from '../types/crossChainAction';

export interface TransactionsDispatcherContextData {
  data: {
    dispatchedCrossChainActions: ICrossChainAction[];
    dispatchCrossChainActions: (actions: ICrossChainAction[], status?: string) => void;
    processingCrossChainActionIds: string[] | null;
    resetDispatchedCrossChainActions: (errorMessage?: string, processingIdToRemove?: string) => void;
  };
}

const TransactionsDispatcherContext = createContext<TransactionsDispatcherContextData | null>(null);

export default TransactionsDispatcherContext;

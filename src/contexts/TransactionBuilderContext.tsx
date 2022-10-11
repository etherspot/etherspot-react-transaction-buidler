import React, { createContext } from 'react';

import { TransactionBlockValues } from '../providers/TransactionBuilderContextProvider';

export interface TransactionBuilderContextData {
  data: {
    setTransactionBlockValues: (id: string, values: TransactionBlockValues) => void;
    resetTransactionBlockFieldValidationError: (id: string, field: string) => void;
    resetAllTransactionBlockFieldValidationError: (id: string) => void;
    setTransactionBlockFieldValidationError: (id: string, field: string, errorMessage: string) => void;
  }
}

const TransactionBuilderContext = createContext<TransactionBuilderContextData | null>(null);

export default TransactionBuilderContext;

import React, { createContext } from 'react';

import { TransactionBlockValues } from '../providers/TransactionBuilderContextProvider';

export interface TransactionBuilderContextData {
  initialized: boolean;
  data: {
    setTransactionBlockValues: (id: number, values: TransactionBlockValues) => void;
    resetTransactionBlockFieldValidationError: (id: number, field: string) => void;
  }
}

const TransactionBuilderContext = createContext<TransactionBuilderContextData>({
  initialized: false,
  data: {
    setTransactionBlockValues: () => {},
    resetTransactionBlockFieldValidationError: () => {},
  }
});

export default TransactionBuilderContext;

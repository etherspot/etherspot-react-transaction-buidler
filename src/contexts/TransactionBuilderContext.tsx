import React, { createContext } from 'react';
import { ITransactionBlockValues } from '../types/transactionBlock';

export interface TransactionBuilderContextData {
  data: {
    setTransactionBlockValues: (id: string, values: ITransactionBlockValues) => void;
    resetTransactionBlockFieldValidationError: (id: string, field: string) => void;
    resetAllTransactionBlockFieldValidationError: (id: string) => void;
    setTransactionBlockFieldValidationError: (id: string, field: string, errorMessage: string) => void;
  }
}

const TransactionBuilderContext = createContext<TransactionBuilderContextData | null>(null);

export default TransactionBuilderContext;

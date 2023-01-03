import React, { createContext } from 'react';
import { IMultiCallData, ITransactionBlockValues } from '../types/transactionBlock';

export interface TransactionBuilderContextData {
  data: {
    setTransactionBlockValues: (
      id: string,
      values: ITransactionBlockValues,
      multiCallData?: IMultiCallData,
    ) => void;
    resetTransactionBlockFieldValidationError: (id: string, field: string) => void;
    resetAllTransactionBlockFieldValidationError: (id: string) => void;
    setTransactionBlockFieldValidationError: (id: string, field: string, errorMessage: string) => void;
    setCrossChainActionGasToken: (
      crossChainActionId: string,
      gasTokenAddress: string | null,
      gasTokenDecimals: number | null,
      gasTokenSymbol: string | null,
    ) => void;
  };
}

const TransactionBuilderContext = createContext<TransactionBuilderContextData | null>(null);

export default TransactionBuilderContext;

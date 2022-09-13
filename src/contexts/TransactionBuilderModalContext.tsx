import React, {
  createContext,
  ReactNode,
} from 'react';

export interface TransactionBuilderModalContextData {
  data: {
    showConfirmModal: (message: string, callback: () => void) => void;
    hideConfirmModal: () => void;
    showAlertModal: (content: ReactNode) => void;
    hideAlertModal: () => void;
  }
}

const TransactionBuilderModalContext = createContext<TransactionBuilderModalContextData | null>(null);

export default TransactionBuilderModalContext;

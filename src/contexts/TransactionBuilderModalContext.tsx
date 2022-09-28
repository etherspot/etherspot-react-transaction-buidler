import React, {
  createContext,
  ReactNode,
} from 'react';

export interface TransactionBuilderModalContextData {
  data: {
    showConfirmModal: (message: string, callback: () => void) => void;
    showAlertModal: (content: ReactNode) => void;
    showModal: (content: ReactNode) => void;
    hideModal: () => void;
  }
}

const TransactionBuilderModalContext = createContext<TransactionBuilderModalContextData | null>(null);

export default TransactionBuilderModalContext;

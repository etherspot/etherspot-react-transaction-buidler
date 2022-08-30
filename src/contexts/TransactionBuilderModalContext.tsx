import React, {
  createContext,
  ReactNode,
} from 'react';

import { SelectOption } from '../components/SelectInput/SelectInput';

export interface TransactionBuilderModalContextData {
  data: {
    showSelectModal: (options: SelectOption[], callback: (option: SelectOption) => void) => void;
    hideSelectModal: () => void;
    showConfirmModal: (message: string, callback: () => void) => void;
    hideConfirmModal: () => void;
    showAlertModal: (content: ReactNode) => void;
    hideAlertModal: () => void;
  }
}

const TransactionBuilderModalContext = createContext<TransactionBuilderModalContextData | null>(null);

export default TransactionBuilderModalContext;

import { useContext } from 'react';

import { TransactionBuilderModalContext } from '../contexts';

const useTransactionBuilderModal = () => {
  const context = useContext(TransactionBuilderModalContext);

  if (context === null) {
    throw new Error('No parent <TransactionBuilderModalContextProvider />');
  }

  return context.data;
};

export default useTransactionBuilderModal;

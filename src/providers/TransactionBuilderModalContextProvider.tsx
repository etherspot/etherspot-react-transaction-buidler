import React, {
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';

import Modal from '../components/Modal';
import {
  CloseButton,
  PrimaryButton,
  SecondaryButton,
} from '../components/Button';
import { Paragraph } from '../components/Text';
import { TransactionBuilderModalContext } from '../contexts';
import { Theme } from '../utils/theme';

const AlertWrapper = styled.div`
  margin: 15px 0;
`;

let confirmCallback: (() => void) | null = null;

const TransactionBuilderModalContextProvider = ({ children }: { children: ReactNode }) => {
  const context = useContext(TransactionBuilderModalContext);

  if (context !== null) {
    throw new Error('<TransactionBuilderContextProvider /> has already been declared.')
  }

  const [confirmModal, setConfirmModal] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<ReactNode | null>(null);
  const theme: Theme = useTheme();

  const hideAlertModal = () => {
    setAlertModal(null);
  };

  const hideConfirmModal = () => {
    setConfirmModal(null)
    confirmCallback = null;
  };

  const contextData = useMemo(
    () => ({
      showConfirmModal: (message: string, callback: () => void) => {
        setConfirmModal(message);
        confirmCallback = callback;
      },
      showAlertModal: (content: ReactNode) => {
        setAlertModal(content);
      },
      hideConfirmModal,
      hideAlertModal,
    }),
    [],
  );
  return (
    <TransactionBuilderModalContext.Provider value={{ data: contextData }}>
      {children}
      {!!confirmModal && (
        <Modal>
          <Paragraph>{confirmModal}</Paragraph>
          <PrimaryButton
            onClick={() => {
              if (confirmCallback) confirmCallback();
              hideConfirmModal();
            }}
          >
            Confirm
          </PrimaryButton><br/>
          <SecondaryButton
            color={theme.color?.text?.card}
            onClick={hideConfirmModal}
          >
            Cancel
          </SecondaryButton>
        </Modal>
      )}
      {!!alertModal && (
        <Modal>
          <CloseButton onClick={hideAlertModal} top={12} right={20} />
          <AlertWrapper>{alertModal}</AlertWrapper>
        </Modal>
      )}
    </TransactionBuilderModalContext.Provider>
  );
};

export default TransactionBuilderModalContextProvider;

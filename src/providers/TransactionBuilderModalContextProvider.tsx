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
  const [modal, setModal] = useState<ReactNode | null>(null);

  const theme: Theme = useTheme();

  const hideModal = () => {
    setAlertModal(null);
    setConfirmModal(null);
    setModal(null);
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
      showModal: (content: ReactNode) => {
        setModal(content);
      },
      hideModal,
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
              hideModal();
            }}
          >
            Confirm
          </PrimaryButton><br/>
          <SecondaryButton
            color={theme.color?.text?.card}
            onClick={hideModal}
          >
            Cancel
          </SecondaryButton>
        </Modal>
      )}
      {!!alertModal && (
        <Modal>
          <CloseButton onClick={hideModal} top={12} right={20} />
          <AlertWrapper>{alertModal}</AlertWrapper>
        </Modal>
      )}
      {!!modal && (
        <Modal noBackground>
          {modal}
          <CloseButton onClick={hideModal} top={12} right={20} />
        </Modal>
      )}
    </TransactionBuilderModalContext.Provider>
  );
};

export default TransactionBuilderModalContextProvider;

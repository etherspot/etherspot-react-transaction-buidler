import React, {
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import styled from 'styled-components';

import Modal from '../components/Modal';
import {
  CloseButton,
  PrimaryButton,
  SecondaryButton,
} from '../components/Button';
import Paragraph from '../components/Paragraph';
import { SelectOption } from '../components/SelectInput/SelectInput';
import { TransactionBuilderModalContext } from '../contexts';

const SearchInput = styled.input`
  font-size: 12px;
  width: calc(100% - 18px);
  height: 20px;
  background: none;
  border: 1px solid #000;
  border-radius: 5px;
  margin: 30px 0 20px;
  padding: 5px 8px;
`;

const ListItem = styled.div`
  color: #000;
  text-align: left;
  margin-bottom: 15px;
  cursor: pointer;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    text-decoration: underline;
  }
`;

const AlertWrapper = styled.div`
  margin: 15px 0;
`;

let confirmCallback: (() => void) | null = null;
let optionSelectCallback: ((option: SelectOption) => void) | null = null;

const TransactionBuilderModalContextProvider = ({ children }: { children: ReactNode }) => {
  const context = useContext(TransactionBuilderModalContext);

  if (context !== null) {
    throw new Error('<TransactionBuilderContextProvider /> has already been declared.')
  }

  const [confirmModal, setConfirmModal] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<ReactNode | null>(null);
  const [selectModalOptions, setSelectModalOptions] = useState<SelectOption[] | null>(null);
  const [selectModalSearchText, setSelectModalSearchText] = useState<string>('');

  const hideAlertModal = () => {
    setAlertModal(null);
  };

  const hideSelectModal = () => {
    setSelectModalOptions(null);
    setSelectModalSearchText('');
    optionSelectCallback = null;
  };

  const hideConfirmModal = () => {
    setConfirmModal(null)
    confirmCallback = null;
  };

  const contextData = useMemo(
    () => ({
      showSelectModal: (options: SelectOption[], callback: (option: SelectOption) => void) => {
        setSelectModalOptions(options);
        optionSelectCallback = callback;
      },
      showConfirmModal: (message: string, callback: () => void) => {
        setConfirmModal(message);
        confirmCallback = callback;
      },
      showAlertModal: (content: ReactNode) => {
        setAlertModal(content);
      },
      hideSelectModal,
      hideConfirmModal,
      hideAlertModal,
    }),
    [],
  );

  const filteredSelectModalOptions: SelectOption[] = useMemo(() => {
    return selectModalOptions
      ?.filter((selectModalOption) => `${selectModalOption?.title || ''}`.toLowerCase().includes(selectModalSearchText)
        || `${selectModalOption?.value || ''}`.toLowerCase().includes(selectModalSearchText))
      ?? [];
  }, [selectModalOptions, selectModalSearchText])

  return (
    <TransactionBuilderModalContext.Provider value={{ data: contextData }}>
      {children}
      {!!selectModalOptions?.length && (
        <Modal>
          <CloseButton onClick={hideSelectModal} top={12} right={20} />
          <SearchInput onChange={(e) => setSelectModalSearchText(e?.target?.value)} placeholder="Search" />
          {!filteredSelectModalOptions?.length && <p>No results.</p>}
          {filteredSelectModalOptions.map((option, index) => (
            <ListItem
              key={`${option.value}-${index}`}
              onClick={() => {
                if (optionSelectCallback) optionSelectCallback(option);
                hideSelectModal();
              }}
            >
              &bull; {option.title}
            </ListItem>
          ))}
        </Modal>
      )}
      {!!confirmModal && (
        <Modal>
          <Paragraph>{confirmModal}</Paragraph>
          <PrimaryButton
            background="#fff"
            onClick={() => {
              if (confirmCallback) confirmCallback();
              hideConfirmModal();
            }}
          >
            Confirm
          </PrimaryButton><br/>
          <SecondaryButton
            color="#000"
            onClick={hideConfirmModal}
            marginTop={10}
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

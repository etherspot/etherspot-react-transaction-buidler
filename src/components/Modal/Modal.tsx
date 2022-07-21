import styled from 'styled-components';
import React from 'react';

const ModalOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100% - 30px);
  height: calc(100% - 30px);
  padding: 15px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 15px;
`;

const ModalContentWrapper = styled.div`
  max-height: calc(100% - 30px);
  overflow-x: hidden;
  overflow-y: scroll;
  -ms-overflow-style: none; 
  scrollbar-width: none;
  border-radius: 15px;
  padding: 15px;
  background: #fff;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Modal = ({ children }: { children: React.ReactNode}) => {
  if (!children) return null;

  return (
    <ModalOverlay>
      <ModalContentWrapper>
        {children}
      </ModalContentWrapper>
    </ModalOverlay>
  )
};

export default Modal;

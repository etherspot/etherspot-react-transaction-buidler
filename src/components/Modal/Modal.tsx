import styled from 'styled-components';
import React from 'react';

const ModalOverlay = styled.div<{ noBackground?: boolean, isComponentOnTop?: boolean}>`
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100% - 30px);
  height: calc(100% - 30px);
  padding: 15px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  z-index: ${({ isComponentOnTop }) => !!isComponentOnTop && '1'};
`;

const ModalContentWrapper = styled.div<{ noBackground?: boolean }>`
  max-height: 100%;
  overflow-x: hidden;
  overflow-y: scroll;
  -ms-overflow-style: none; 
  scrollbar-width: none;
  
  ${({ noBackground, theme }) => !noBackground && `
    max-height: calc(100% - 30px);
    border-radius: 15px;
    padding: 15px;
    background: ${theme.color.background.card};
    color: ${theme.color.text.card};
  `}

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Modal = ({ children, noBackground, isComponentOnTop }: {
  children: React.ReactNode;
  noBackground?: boolean;
  isComponentOnTop?: boolean;
}) => {
  if (!children) return null;

  return (
    <ModalOverlay isComponentOnTop>
      <ModalContentWrapper noBackground={noBackground}>
        {children}
      </ModalContentWrapper>
    </ModalOverlay>
  )
};

export default Modal;

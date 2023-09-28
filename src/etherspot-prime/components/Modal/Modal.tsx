import styled from 'styled-components';
import React from 'react';

const ModalOverlay = styled.div<{ noBackground?: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100% - 30px);
  height: calc(100% - 30px);
  padding: 15px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  z-index: 10;
`;

const ModalContentWrapper = styled.div<{ noBackground?: boolean }>`
  max-height: 100%;
  overflow-x: hidden;
  overflow-y: scroll;
  -ms-overflow-style: none;
  scrollbar-width: none;

  ${({ noBackground, theme, color }) =>
    !noBackground &&
    `max-height: calc(100% - 30px);
    border-radius: 15px;
    padding: 15px;
    background: ${color ?? theme.color.background.card};
    color: ${theme.color.text.card};
  `}

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Modal = ({
  children,
  noBackground,
  backgroundColor,
}: {
  children: React.ReactNode;
  noBackground?: boolean;
  backgroundColor?: string;
}) => {
  if (!children) return null;

  return (
    <ModalOverlay>
      <ModalContentWrapper color={backgroundColor} noBackground={noBackground}>
        {children}
      </ModalContentWrapper>
    </ModalOverlay>
  );
};

export default Modal;

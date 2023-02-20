import React from 'react';
import styled from 'styled-components';
import CloseButton from '../Button/CloseButton';

interface Props {
  errorMessage: string;
  onClose?: () => void;
}

const ErrorMessage: React.FC<Props> = ({ errorMessage, onClose }) => {
  return (
    <ErrorBanner>
      <Error>{errorMessage ?? errorMessage}</Error>
      <CloseButton onClick={onClose} top={0} right={0} />
    </ErrorBanner>
  );
};

const ErrorBanner = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 32px;
  background: ${({ theme }) => theme.color.background.topMenu};
  color: ${({ theme }) => theme.color.text.card};
  text-align: center;
  position: relative;
  border-radius: 12px;
`;

const Error = styled.div`
  font-size: 16px;
`;

export default ErrorMessage;

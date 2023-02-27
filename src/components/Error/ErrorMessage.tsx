import React from 'react';
import styled from 'styled-components';
import CloseButton from '../Button/CloseButton';

interface ErrorMessageProps {
  errorMessage: string;
  onClose?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ errorMessage, onClose }) => {
  return (
    <ErrorBanner>
      <Error>{errorMessage}</Error>
      <CloseButton onClick={onClose} top={0} right={0} />
    </ErrorBanner>
  );
};

const ErrorBanner = styled.div`
  position: absolute;
  top: 6%;
  left: 49%;
  transform: translate(-50%, -50%);
  padding: 30px;
  background: ${({ theme }) => theme.color.background.topMenu};
  color: ${({ theme }) => theme.color.text.card};
  text-align: center;
  border-radius: 12px;
  width: 100%;
  max-width: 350px;
`;

const Error = styled.div`
  font-size: 16px;
`;

export default ErrorMessage;

import styled from 'styled-components';

import { CloseButton } from '../Button';
import React from 'react';

const Wrapper = styled.div<{ marginBottom?: number }>`
  background: ${({ theme }) => theme.color.background.card};
  color: ${({ theme }) => theme.color.text.card};
  border-radius: 12px;
  padding: 16px 20px;
  ${({ marginBottom }) => marginBottom && `margin-bottom: ${marginBottom}px;`};
  position: relative;
  box-shadow: 0 2px 8px 0 rgba(26, 23, 38, 0.3);
  text-align: left;
  user-select: none;

  ${CloseButton} { display: none; }

  &:hover { ${CloseButton} { display: block; } }
`;

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: "PTRootUIWebBold", sans-serif;
`;

interface CardProps {
  showCloseButton?: boolean;
  marginBottom?: number;
  title?: string;
  onCloseButtonClick?: () => void;
  children: React.ReactNode;
}

const Card = ({
  children,
  showCloseButton,
  onCloseButtonClick,
  marginBottom,
  title,
}: CardProps) => (
  <Wrapper marginBottom={marginBottom}>
    {showCloseButton && <CloseButton onClick={onCloseButtonClick} />}
    {!!title && <Title>{title}</Title>}
    {children}
  </Wrapper>
);

export default Card;

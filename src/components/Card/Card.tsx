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
`;

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: "PTRootUIWebBold", sans-serif;
`;

const TopButtonsWrapper = styled.div`
  position: absolute;
  top: 5px;
  right: 12px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

interface CardProps {
  showCloseButton?: boolean;
  marginBottom?: number;
  title?: string;
  onCloseButtonClick?: () => void;
  children: React.ReactNode;
  additionalTopButtons?: React.ReactNode[];
}

const Card = ({
  children,
  showCloseButton,
  onCloseButtonClick,
  marginBottom,
  title,
  additionalTopButtons,
}: CardProps) => (
  <Wrapper marginBottom={marginBottom}>
    {!!title && <Title>{title}</Title>}
    {children}
    <TopButtonsWrapper>
      {!!additionalTopButtons?.length && additionalTopButtons.map((button) => button)}
      {showCloseButton && <CloseButton onClick={onCloseButtonClick} top={0} right={0} display="inline-block" />}
    </TopButtonsWrapper>
  </Wrapper>
);

export default Card;

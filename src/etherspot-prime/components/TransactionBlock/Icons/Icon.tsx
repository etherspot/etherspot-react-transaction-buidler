import React from 'react';
import styled from 'styled-components';

const TransactionBlockIconWrapper = styled.div<{
  size?: number;
  big?: boolean;
}>`
  display: inline-block;
  ${({ size }) => `width: ${size || 18}px; height: ${size || 18}px;`};
  ${({ big }) => big && `width: 24px; height: 24px;`}
`;

const TransactionBlockIcon = ({
  children,
  size,
  big,
}: {
  children: React.ReactNode;
  size?: number;
  big?: boolean;
}) => {
  return (
    <TransactionBlockIconWrapper size={size} big={big}>
      {children}
    </TransactionBlockIconWrapper>
  );
};

export default TransactionBlockIcon;

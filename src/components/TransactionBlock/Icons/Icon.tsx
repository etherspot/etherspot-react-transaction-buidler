import React from "react";
import styled from "styled-components";

const TransactionBlockIconWrapper = styled.div<{ big?: boolean }>`
  display: inline-block;
  width: 18px;
  height: 18px;
  ${({ big }) => big && `width: 24px; height: 24px;`}
`;

const TransactionBlockIcon = (
  {
    children,
    big
  }: {
    children: React.ReactNode,
    big?: boolean
  }
) => {
  return (
    <TransactionBlockIconWrapper big={big}>
      {children}
    </TransactionBlockIconWrapper>
  );
};

export default TransactionBlockIcon;

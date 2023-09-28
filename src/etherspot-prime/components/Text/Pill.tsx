import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div<{ valueColor?: string }>`
  background: ${({ theme }) => theme.color.background.pill};
  color: ${({ theme }) => theme.color.text.pill};
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 6px;

  span {
    margin-left: 4px;
    color: ${({ theme, valueColor }) => valueColor ?? theme.color.text.pillValue};
  }
`;

const Pill = ({
  label,
  value,
  valueColor,
}: {
  label: string,
  value: string,
  valueColor?: string,
}) => (
  <Wrapper valueColor={valueColor}>
    {label}
    <span>{value}</span>
  </Wrapper>
);

export default Pill;

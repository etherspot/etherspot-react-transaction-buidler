import styled from 'styled-components';

const SecondaryButton = styled.button<{
  disabled?: boolean;
  color?: string;
  marginTop?: number;
  fontSize?: number;
}>`
  font-family: "PTRootUIWebMedium", sans-serif;
  border: none;
  background: transparent;
  font-size: 16px;
  padding: 0;
  ${({ marginTop }) => marginTop && `margin-top: ${marginTop}px`};
  color: ${({ color }) => color || '#ffeee6'};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

export default SecondaryButton;

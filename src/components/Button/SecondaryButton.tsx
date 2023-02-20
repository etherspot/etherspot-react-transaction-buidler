import styled from 'styled-components';

const SecondaryButton = styled.button<{
  disabled?: boolean;
  color?: string;
  marginTop?: number;
  fontSize?: number;
  margin?: string;
  display?: string;
}>`
  font-family: "PTRootUIWebMedium", sans-serif;
  border: none;
  background: transparent;
  font-size: 16px;
  padding: 0;
  ${({ marginTop }) => marginTop && `margin-top: ${marginTop}px`};
  ${({ margin }) => margin && `margin: ${margin}`};
  ${({ display }) => display && `display:${display}`};
  color: ${({ color, theme }) => color || theme.color.text.buttonSecondary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

export default SecondaryButton;

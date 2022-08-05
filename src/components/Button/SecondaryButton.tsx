import styled from 'styled-components';

const SecondaryButton = styled.button<{
  disabled?: boolean;
  color?: string;
  marginTop?: number;
  noPadding?: boolean;
}>`
  border: none;
  background: transparent;
  font-size: 14px;
  text-decoration: underline;
  ${({ noPadding }) => !noPadding && `padding: 5px 25px;`};
  ${({ marginTop }) => marginTop && `margin-top: ${marginTop}px`};
  color: ${({ color }) => color || '#fff'};
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
`;

export default SecondaryButton;

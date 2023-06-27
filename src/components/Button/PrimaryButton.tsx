import styled from 'styled-components';

const PrimaryButton = styled.div<{
  disabled?: boolean;
  background?: string;
  marginTop?: number;
  marginBottom?: number;
  color?: string;
  display?: string;
  justifyContent?: string;
}>`
  background: ${({ background, theme }) => background || theme.color.background.button};
  padding: 23px;
  border-radius: 16px;
  ${({ marginTop }) => !!marginTop && `margin-top: ${marginTop}px;`}
  ${({ marginBottom }) => !!marginBottom && `margin-bottom: ${marginBottom}px;`}
  ${({ display }) => !!display && `display: ${display};`}
  ${({ justifyContent }) => !!justifyContent && `justify-content: ${justifyContent};`}
  font-size: 20px;
  color: ${({ color, theme }) => color ?? theme.color.text.button};
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.19);
  cursor: pointer;
  font-family: "PTRootUIWebMedium", sans-serif;

  ${({ disabled }) => disabled && `opacity: 1;`}

  &:hover {
    opacity: 0.7;
  }
`;


export default PrimaryButton;

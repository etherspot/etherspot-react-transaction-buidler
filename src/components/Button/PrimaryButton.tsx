import styled from 'styled-components';

const PrimaryButton = styled.div<{
  disabled?: boolean;
  background?: string;
  marginTop?: number;
  marginBottom?: number;
}>`
  background: ${({ background, theme }) => background || theme.color.background.button};
  padding: 23px;
  border-radius: 16px;
  ${({ marginTop }) => !!marginTop && `margin-top: ${marginTop}px;`}
  ${({ marginBottom }) => !!marginBottom && `margin-bottom: ${marginBottom}px;`}
  font-size: 20px;
  color: ${({ theme }) => theme.color.text.button};
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.19);
  cursor: pointer;
  font-family: "PTRootUIWebMedium", sans-serif;

  ${({ disabled }) => disabled && `opacity: 0.7;`}

  &:hover {
    opacity: 0.7;
  }
`;


export default PrimaryButton;

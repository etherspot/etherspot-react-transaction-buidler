import styled from 'styled-components';

const PrimaryButton = styled.button<{
  disabled?: boolean;
  background?: string;
  marginTop?: number;
  marginBottom?: number;
}>`
  border: none;
  background: ${({ background }) => background || '#ffe800'};
  display: inline-block;
  padding: 15px 25px;
  border-radius: 15px;
  ${({ marginTop }) => !!marginTop && `margin-top: ${marginTop}px;`}
  ${({ marginBottom }) => !!marginBottom && `margin-bottom: ${marginBottom}px;`}
  font-weight: 700;
  font-size: 16px;
  color: #000;
  box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
  cursor: pointer;
  
  ${({ disabled }) => disabled && `opacity: 0.7;`}

  &:hover {
    opacity: 0.7;
  }
`;


export default PrimaryButton;

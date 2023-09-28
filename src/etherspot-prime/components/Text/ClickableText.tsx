import styled from 'styled-components';

const ClickableText = styled.span<{ disabled?: boolean }>`
  display: inline-block;
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
  
  ${({ disabled }) => disabled && `opacity: 0.5;`}
`;

export default ClickableText;

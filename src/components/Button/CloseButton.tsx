import styled from 'styled-components';

const CloseButton = styled.span<{
  top?: number;
  right?: number;
}>`
  position: absolute;
  top: ${({ top }) => top ?? 5}px;
  right: ${({ right }) => right ?? 12}px;
  transform: rotate(45deg);
  cursor: pointer;
  padding: 5px;

  &:hover {
    opacity: 0.5;
  }
  
  &:after {
    content: "+";
    color: ${({ theme }) => theme.color.background.closeButton};
    font-weight: 300;
    font-size: 26px;
    line-height: 30px;
  }
`;

export default CloseButton;

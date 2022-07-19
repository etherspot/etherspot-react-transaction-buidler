import styled from 'styled-components';

const CloseButton = styled.span<{
  top?: number;
  right?: number;
}>`
  position: absolute;
  top: ${({ top }) => top ?? -3}px;
  right: ${({ right }) => right ?? 5}px;
  transform: rotate(45deg);
  cursor: pointer;
  padding: 5px;

  &:hover {
    opacity: 0.5;
  }
  
  &:after {
    content: "+";
    color: #f43b40;
    font-weight: 400;
    font-size: 30px;
    line-height: 30px;
  }
`;

export default CloseButton;

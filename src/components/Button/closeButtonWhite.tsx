import styled from 'styled-components';

const CloseButton = styled.span<{
  display?: string;
  top?: number;
  right?: number;
}>`
  transform: rotate(45deg);
  cursor: pointer;
  padding: 5px;
  float: right;
  top: -20px;
  position: relative;

  &:hover {
    opacity: 0.5;
  }
  
  &:after {
    content: "+";
    color: white;
    font-weight: 300;
    font-size: 26px;
    line-height: 30px;
  }
`;

export default CloseButton;

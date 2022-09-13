import styled from 'styled-components';

const Paragraph = styled.p<{
  color?: string;
  marginTop?: number;
  marginBottom?: number;
}>`
  margin: ${({ marginTop }) => marginTop ? marginTop : 0}px 0 ${({ marginBottom }) => marginBottom ? marginBottom : 15}px;
  padding: 0;
  ${({ color }) => !!color && `color: ${color};`}
`;

export default Paragraph;

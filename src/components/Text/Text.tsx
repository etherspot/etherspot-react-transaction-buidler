import styled from 'styled-components';

const Text = styled.span<{
  color?: string;
  size?: number;
  marginTop?: number;
  marginBottom?: number;
  regular?: boolean;
  medium?: boolean;
  bold?: boolean;
  block?: boolean;
}>`
  ${({ marginTop }) => !!marginTop && `margin-top: ${marginTop}px;`}
  ${({ marginBottom }) => !!marginBottom && `margin-bottom: ${marginBottom}px;`}
  ${({ color }) => !!color && `color: ${color};`}
  ${({ size }) => !!size && `font-size: ${size}px;`}
  ${({ regular }) => !!regular && `font-family: "PTRootUIWebRegular", sans-serif;`}
  ${({ medium }) => !!medium && `font-family: "PTRootUIWebMedium", sans-serif;`}
  ${({ bold }) => !!bold && `font-family: "PTRootUIWebBold", sans-serif;`}
  ${({ block }) => !!block && `display: block;`}
`;

export default Text;
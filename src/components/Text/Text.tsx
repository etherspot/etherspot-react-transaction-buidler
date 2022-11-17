import styled from 'styled-components';

const Text = styled.span<{
  color?: string;
  size?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  regular?: boolean;
  medium?: boolean;
  bold?: boolean;
  block?: boolean;
  inline?: boolean;
}>`
	${({ marginTop }) => !!marginTop && `margin-top: ${marginTop}px;`}
	${({ marginBottom }) => !!marginBottom && `margin-bottom: ${marginBottom}px;`}
  ${({ marginLeft }) => !!marginLeft && `margin-left: ${marginLeft}px;`}
  ${({ marginRight }) => !!marginRight && `margin-right: ${marginRight}px;`}
  ${({ color }) => !!color && `color: ${color};`}
  ${({ size }) => !!size && `font-size: ${size}px;`}
  ${({ regular }) => !!regular && `font-family: "PTRootUIWebRegular", sans-serif;`}
  ${({ medium }) => !!medium && `font-family: "PTRootUIWebMedium", sans-serif;`}
  ${({ bold }) => !!bold && `font-family: "PTRootUIWebBold", sans-serif;`}
  ${({ block }) => !!block && `display: block;`}
  ${({ inline }) => !!inline && `display: inline-block;`}
`;

export default Text;

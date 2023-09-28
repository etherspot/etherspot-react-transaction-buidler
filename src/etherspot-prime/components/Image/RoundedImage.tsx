import React, { useState } from 'react';
import styled from 'styled-components';

const Image = styled.img<{
  size?: number,
  noMarginRight?: boolean;
  marginRight?: number;
  marginTop?: number;
}>`
  height: ${({ size }) => size ?? 32}px;
  width: ${({ size }) => size ?? 32}px;
  border-radius: 50%;
  ${({ noMarginRight, marginRight }) => !noMarginRight && `margin-right: ${marginRight ?? 11}px`};
  ${({ marginTop }) => marginTop && `margin-top: ${marginTop}px`};
`;

const FallbackImage = styled.div<{
  size?: number;
  noMarginRight?: boolean;
  marginRight?: number;
  marginTop?: number;
}>`
  font-family: "PTRootUIWebBold", sans-serif;
  font-size: ${({ size }) => size ? size / 2 : 16}px;
  line-height: ${({ size }) => size ?? 32}px;
  height: ${({ size }) => size ?? 32}px;
  width: ${({ size }) => size ?? 32}px;
  border-radius: 50%;
  ${({ noMarginRight, marginRight }) => !noMarginRight && `margin-right: ${marginRight ?? 11}px`};
  background: ${({ theme }) => theme.color.background.roundedImageFallback};
  color: ${({ theme }) => theme.color.text.roundedImageFallback};
  text-align: center;
  text-transform: uppercase;
  ${({ marginTop }) => marginTop && `margin-top: ${marginTop}px`};
`;

const RoundedImage = ({
	title,
	url,
	size,
	noMarginRight,
  marginRight,
	style,
  marginTop,
}: {
	title: string;
	url: string | undefined;
	size?: number;
	noMarginRight?: boolean;
	style?: React.CSSProperties;
  marginTop?: number,
  marginRight?: number;
})=> {
  const [useFallback, setUseFallback] = useState(false);

	if (useFallback || !url) {
		return (
			<FallbackImage size={size} noMarginRight={noMarginRight} marginRight={marginRight}>
				{title[0]}
			</FallbackImage>
		);
	}

	return (
		<Image
			style={style}
			size={size}
			src={url}
			alt={title}
			noMarginRight={noMarginRight}
      marginRight={marginRight}
      marginTop={marginTop}
			onError={({ currentTarget }) => {
				currentTarget.onerror = null;
				setUseFallback(true);
			}}
		/>
	);
};

export default RoundedImage;

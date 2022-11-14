import React, { useState } from 'react';
import styled from 'styled-components';

const Image = styled.img<{ size?: number; noMarginRight?: boolean }>`
	height: ${({ size }) => size ?? 32}px;
	width: ${({ size }) => size ?? 32}px;
	border-radius: 50%;
	${({ noMarginRight }) => !noMarginRight && `margin-right: 11px`};
`;

const FallbackImage = styled.div<{ size?: number; noMarginRight?: boolean }>`
	font-family: 'PTRootUIWebBold', sans-serif;
	font-size: ${({ size }) => (size ? size / 2 : 16)}px;
	line-height: ${({ size }) => size ?? 32}px;
	height: ${({ size }) => size ?? 32}px;
	width: ${({ size }) => size ?? 32}px;
	border-radius: 50%;
	${({ noMarginRight }) => !noMarginRight && `margin-right: 11px`};
	background: ${({ theme }) => theme.color.background.roundedImageFallback};
	color: ${({ theme }) => theme.color.text.roundedImageFallback};
	text-align: center;
	text-transform: uppercase;
`;

const RoundedImage = ({
	title,
	url,
	size,
	noMarginRight,
	style,
}: {
	title: string;
	url: string | undefined;
	size?: number;
	noMarginRight?: boolean;
	style?: React.CSSProperties;
}) => {
	const [useFallback, setUseFallback] = useState(false);

	if (useFallback || !url) {
		return (
			<FallbackImage size={size} noMarginRight={noMarginRight}>
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
			onError={({ currentTarget }) => {
				currentTarget.onerror = null;
				setUseFallback(true);
			}}
		/>
	);
};

export default RoundedImage;

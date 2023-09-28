import React from 'react';
import styled from 'styled-components';

import RoundedImage from './RoundedImage';

const CombinedImagesWrapper = styled.div<{ size?: number }>`
  position: relative;
  height: ${({ size }) => size ?? 32}px;
  width: ${({ size }) => size ?? 32}px;
  margin-right: 11px;
  margin-top: 2px;
`;

const SmallImageWrapper = styled.div<{ size?: number; borderColor?: string }>`
  position: absolute;
  top: -2px;
  right: -2px;
  border: 2px solid ${({ theme, borderColor }) => (borderColor ? borderColor : theme.color.background.selectInput)};
  height: ${({ size }) => (size ? size * 0.44 : 14)}px;
  width: ${({ size }) => (size ? size * 0.44 : 14)}px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CombinedRoundedImages = ({
  title,
  smallImageTitle,
  url,
  smallImageUrl,
  size,
  borderColor,
}: {
  title: string;
  smallImageTitle: string;
  url?: string;
  smallImageUrl?: string;
  size?: number;
  borderColor?: string;
}) => (
  <CombinedImagesWrapper size={size}>
    <RoundedImage title={title} url={url} size={size} noMarginRight />
    <SmallImageWrapper size={size} borderColor={borderColor}>
      <RoundedImage title={smallImageTitle} url={smallImageUrl} size={size ? size * 0.44 : 14} noMarginRight />
    </SmallImageWrapper>
  </CombinedImagesWrapper>
);

export default CombinedRoundedImages;

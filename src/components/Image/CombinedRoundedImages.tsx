import React from 'react';
import styled from 'styled-components';
import { RoundedImage } from './index';

const CombinedImagesWrapper = styled.div<{ size?: number }>`
  position: relative;
  img:nth-child(2) {
    position: absolute;
    top: -2px;
    right: -2px;
    height: ${({ size }) => size ? size * 0.44 : 14}px;
    width: ${({ size }) => size ? size * 0.44 : 14}px;
    border: 2px solid #fff;
    border-radius: 50%;
  }
`;

const CombinedRoundedImages = ({
  title1,
  title2,
  url1,
  url2,
  size,
}: {
  title1: string,
  title2: string,
  url1: string | undefined,
  url2: string | undefined,
  size?: number,
})=> (
  <CombinedImagesWrapper size={size}>
    <RoundedImage title={title1} url={url1} size={size} />
    <RoundedImage title={title2} url={url2} />
  </CombinedImagesWrapper>
);

export default CombinedRoundedImages;

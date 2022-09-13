import React, {
  useState,
} from 'react';
import styled from 'styled-components';

const Image = styled.img<{ size?: number }>`
  height: ${({ size }) => size ?? 32}px;
  width: ${({ size }) => size ?? 32}px;
  border-radius: 50%;
  margin-right: 11px;
`;

const FallbackImage = styled.div`
  font-family: "PTRootUIWebBold", sans-serif;
  font-size: 16px;
  line-height: 32px;
  height: 32px;
  width: 32px;
  border-radius: 50%;
  margin-right: 8px;
  background: ${({ theme }) => theme.color.background.selectInputImagePlaceholder};
  color: ${({ theme }) => theme.color.text.selectInputImagePlaceholder};
  text-align: center;
  text-transform: uppercase;
`;

const RoundedImage = ({
  title,
  url,
  size,
}: {
  title: string,
  url: string | undefined,
  size?: number,
})=> {
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback || !url) {
    return <FallbackImage>{title[0]}</FallbackImage>;
  }

  return (
    <Image
      size={size}
      src={url}
      alt={title}
      onError={({ currentTarget }) => {
        currentTarget.onerror = null;
        setUseFallback(true);
      }}
    />
  );
};

export default RoundedImage;

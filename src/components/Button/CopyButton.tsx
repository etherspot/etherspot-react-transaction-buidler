import styled from 'styled-components';
import React, {
  useCallback,
  useState,
} from 'react';
import { FaClipboardCheck, FaRegClipboard } from 'react-icons/fa';
import { onCopy } from '../../utils/common';


const Wrapper = styled.span<{
  left?: number;
  top?: number;
}>`
  position: relative;
  ${({ left }) => !!left && `left: ${left}px;`}
  ${({ top }) => !!top && `top: ${top}px;`}
`;

const CopyButtonIcon = styled(FaRegClipboard)`
  cursor: pointer;

  &:hover, &:active {
    opacity: 0.5;
  }
`;

const CopiedButtonIcon = styled(FaClipboardCheck)`
  cursor: pointer;
`;

interface CopyButtonProps {
  valueToCopy: string;
  left?: number;
  top?: number;
}

const CopyButton = ({ valueToCopy, left, top }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const onSuccess = useCallback(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  }, []);

  return (
    <Wrapper left={left} top={top}>
      {!copied && <CopyButtonIcon onClick={() => onCopy(valueToCopy, onSuccess)} size={15} />}
      {copied && <CopiedButtonIcon onClick={() => setCopied(false)} size={15} />}
    </Wrapper>
  );
};

export default CopyButton;



import styled from 'styled-components';
import React, {
  useCallback,
  useState,
} from 'react';
import { FaClipboardCheck, FaRegClipboard } from 'react-icons/fa';


const Wrapper = styled.span<{ marginLeft?: number }>`
  ${({ marginLeft }) => !!marginLeft && `margin-left: ${marginLeft}px;`}
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
  marginLeft?: number;
}

const CopyButton = ({ valueToCopy, marginLeft }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(() => {
    setCopied(true);
    navigator.clipboard.writeText(valueToCopy);
    setTimeout(() => setCopied(false), 1000);
  }, []);

  return (
    <Wrapper marginLeft={marginLeft}>
      {!copied && <CopyButtonIcon onClick={onCopy} size={15} />}
      {copied && <CopiedButtonIcon onClick={() => setCopied(false)} size={15} />}
    </Wrapper>
  );
};

export default CopyButton;



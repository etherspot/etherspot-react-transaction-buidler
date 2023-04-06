import React, { Children } from 'react';
import styled, { useTheme } from 'styled-components';

// Icons
import { IoChevronBackCircleOutline } from 'react-icons/io5';

// Utils
import { Theme } from '../../utils/theme';

const MenuModalWrapper = ({
  children,
  title,
  onBackButtonClick,
}: {
  children: React.ReactNode;
  title: string;
  onBackButtonClick?: () => void;
}) => {
  const theme: Theme = useTheme();

  return (
    <ModalWrapper marginBottom={20} color={theme?.color?.background?.topMenu}>
      <ModalHeader>
        {onBackButtonClick && <BackButton color={theme?.color?.text?.settingsIcon} onClick={onBackButtonClick} />}
        <HeaderTitle>{title}</HeaderTitle>
      </ModalHeader>
      <HorizontalLine color={theme?.color?.background?.settingsModalBorder} />
      <ModalBody>{children}</ModalBody>
    </ModalWrapper>
  );
};

export default MenuModalWrapper;

const ModalWrapper = styled.div<{ marginBottom?: number; color?: string }>`
  background: ${({ theme, color }) => color ?? theme.color.background.card};
  color: ${({ theme }) => theme.color.text.card};
  border-radius: 12px;
  padding: 16px 20px;
  ${({ marginBottom }) => marginBottom && `margin-bottom: ${marginBottom}px;`};
  position: relative;
  box-shadow: 0 2px 8px 0 rgba(26, 23, 38, 0.3);
  text-align: left;
  user-select: none;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
`;

const HorizontalLine = styled.div`
  width: 100%;
  height: 1px;
  background: ${({ theme, color }) => color ?? theme.color.background.settingsModalBorder};
`;

const HeaderTitle = styled.span`
  margin-left: 8px;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: 'PTRootUIWebBold', sans-serif;
`;

const BackButton = styled(IoChevronBackCircleOutline)`
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
`;

const ModalBody = styled.div`
  padding: 8px 0px;
`;

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
    <ModalWrapper marginBottom={20}>
      <ModalHeader>
        {onBackButtonClick && (
          <BackButton color={theme?.color?.background?.settingMenuMain} onClick={onBackButtonClick} />
        )}
        <HeaderTitle>{title}</HeaderTitle>
      </ModalHeader>
      {children}
    </ModalWrapper>
  );
};

export default MenuModalWrapper;

const ModalWrapper = styled.div<{ marginBottom?: number; color?: string }>`
  background: ${({ theme }) => theme.color.background.settingsModal};
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
  padding-bottom: 14px;
  border-bottom: ${({ theme }) => theme.color.background.settingsModalBorder};
  border-width: thin;
  border-bottom-style: groove;
`;

const HeaderTitle = styled.span`
  margin-left: 8px;
  font-size: 16px;
`;

const BackButton = styled(IoChevronBackCircleOutline)`
  color: #fd9250;
  cursor: pointer;

  :hover {
    opacity: 0.5;
  }
`;

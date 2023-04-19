import React, { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';

// Components
import { BackButton, HeaderTitle, ModalHeader } from '../Menu/MenuModalWrapper';

// Hooks
import { useEtherspot } from '../../hooks';

// Icons
import { IoMdCheckmark } from 'react-icons/io';
import { CloseButton } from '../Button';

// Utils
import { THEME_TYPES, Theme, getTheme } from '../../utils/theme';

const ThemeModal = ({ onBackButtonClick }: { onBackButtonClick: () => void }) => {
  const [appliedTheme, setAppliedTheme] = useState<string>('');
  const theme: Theme = useTheme();
  const { changeTheme } = useEtherspot();
  const themeOptions = Object.keys(THEME_TYPES);

  useEffect(() => {
    const activeTheme = localStorage.getItem('current-theme');
    if (activeTheme) {
      setAppliedTheme(activeTheme);
      return;
    }
    setAppliedTheme(THEME_TYPES.DARK);
  }, []);

  const onThemeSelection = (themeValue: string) => {
    setAppliedTheme(themeValue);
    localStorage.setItem('current-theme', themeValue);
    changeTheme(getTheme(themeValue));
  };

  return (
    <SubMenuWrapper>
      <ModalHeader style={{ marginBottom: '8px' }}>
        {onBackButtonClick && (
          <BackButton color={theme?.color?.background?.settingMenuMain} onClick={onBackButtonClick} />
        )}
        <HeaderTitle>Theme</HeaderTitle>
        <CloseButtonWrapper onClick={onBackButtonClick} />
      </ModalHeader>
      {themeOptions.map((value, index) => (
        <ThemeTextWrapper key={index} onClick={() => onThemeSelection(value)}>
          <span>{THEME_TYPES[value]}</span>
          {appliedTheme == value && <IoMdCheckmark size={16} style={{ marginRight: '2px' }} />}
        </ThemeTextWrapper>
      ))}
    </SubMenuWrapper>
  );
};

export default ThemeModal;

const SubMenuWrapper = styled.div`
  width: 180px;
  z-index: 5;
  position: absolute;
  top: 42px;
  right: 15px;
  background: ${({ theme }) => theme.color.background.settingsModal};
  color: ${({ theme }) => theme.color.text.settingsMenuItem};
  border-radius: 5px;
  padding: 16px 20px;
  font-size: 16px;
  text-align: left;
  box-shadow: rgb(0 0 0 / 24%) 0px 3px 8px;
`;

const CloseButtonWrapper = styled(CloseButton)`
  position: absolute;
  top: 6px;
  right: 12px;
`;

const ThemeTextWrapper = styled.div`
  padding: 4px 0px;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text.settingsMenuItem};
  :hover {
    color: ${({ theme }) => theme.color.text.settingsMenuItemHover};
  }
`;

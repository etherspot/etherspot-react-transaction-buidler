import React, { useState } from 'react';
import styled, { useTheme } from 'styled-components';

// Components
import { Theme } from '../../utils/theme';
import History from '../History';
import Deployment from '../Deployment';
import UserProfile from '../User/UserProfile';
import MenuItemAnchor from '../Menu/MenuItemAnchor';
import MenuItem from '../Menu/MenuItem';
import EtherspotLogo from '../Image/EtherspotLogo';
import { CloseButton } from '../Button';
import ThemeModal from '../ThemeModal';
import SystemVersion from '../SystemVersion';

// Hooks
import { useTransactionBuilderModal } from '../../hooks';

// Icons
import { BsClockHistory } from 'react-icons/bs';
import { MdOutlineSettings, MdOutlineDashboardCustomize, MdOutlineInfo } from 'react-icons/md';
import { IoColorPaletteOutline, IoWalletOutline } from 'react-icons/io5';
import { TbLogout } from 'react-icons/tb';
import { HiOutlineUser } from 'react-icons/hi';

export interface SettingMenuProps {
  showLogout?: boolean;
  logout: Function;
}

const SettingMenu = ({ showLogout, logout }: SettingMenuProps) => {
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showSubMenu, setShowSubMenu] = useState<boolean>(false);

  const theme: Theme = useTheme();
  const { showModal, hideModal } = useTransactionBuilderModal();

  return (
    <>
      
    </>
  );
};

export default SettingMenu;

const MenuWrapper = styled.div`
  width: 180px;
  z-index: 5;
  position: absolute;
  top: 42px;
  right: 15px;
  background: ${({ theme }) => theme.color.background.settingsModal};
  color: ${({ theme }) => theme.color.text.settingsMenuItem};
  border-radius: 5px;
  padding: 8px 16px;
  font-size: 16px;
  text-align: left;
  box-shadow: rgb(0 0 0 / 24%) 0px 3px 8px;
`;

const MenuButton = styled(MdOutlineSettings)`
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
`;

const CloseButtonWrapper = styled(CloseButton)`
  position: absolute;
  top: 6px;
  right: 12px;
`;

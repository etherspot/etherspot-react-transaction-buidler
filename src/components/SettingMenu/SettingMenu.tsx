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
      <MenuButton
        data-testid="builder-setting-menu"
        color={theme?.color?.background?.topMenuButton}
        size={18}
        onClick={() => setShowMenu(!showMenu)}
      />
      {showMenu && (
        <MenuWrapper>
          <CloseButtonWrapper onClick={() => setShowMenu(false)} display="inline-block" />
          <MenuItemAnchor
            title="Dashboard"
            link="https://dashboard.etherspot.io"
            icon={<MdOutlineDashboardCustomize size={16} style={{ marginRight: 12 }} />}
          />
          <MenuItem
            icon={<HiOutlineUser size={16} style={{ marginRight: 12 }} />}
            title="Profile"
            onClick={() => {
              setShowMenu(false);
              showModal(
                <UserProfile
                  onBackButtonClick={() => {
                    hideModal();
                    setShowMenu(true);
                  }}
                />,
              );
            }}
          />
          <MenuItem
            icon={<BsClockHistory size={16} style={{ marginRight: 12 }} />}
            title="History"
            onClick={() => {
              setShowMenu(false);
              showModal(<History />);
            }}
          />
          <MenuItem
            icon={<IoWalletOutline size={16} style={{ marginRight: 12 }} />}
            title="Deployments"
            onClick={() => {
              setShowMenu(false);
              showModal(
                <Deployment
                  onBackButtonClick={() => {
                    hideModal();
                    setShowMenu(true);
                  }}
                />,
              );
            }}
          />
          <MenuItem
            icon={<IoColorPaletteOutline size={16} style={{ marginRight: 12 }} />}
            title="Theme"
            onClick={() => {
              setShowSubMenu(true);
              setShowMenu(false);
            }}
          />
          <MenuItem
            icon={<MdOutlineInfo size={16} style={{ marginRight: 12 }} />}
            title="System Info"
            onClick={() => {
              setShowMenu(false);
              showModal(
                <SystemVersion
                  onBackButtonClick={() => {
                    hideModal();
                    setShowMenu(true);
                  }}
                />,
              );
            }}
          />
          <MenuItemAnchor
            title="About Etherspot"
            link="https://etherspot.io/"
            icon={<EtherspotLogo width={16} height={16} style={{ marginRight: 12 }} />}
          />
          {showLogout && (
            <MenuItem
              icon={<TbLogout size={16} style={{ marginRight: 12 }} />}
              onClick={() => {
                logout();
              }}
              title={'Logout'}
            />
          )}
        </MenuWrapper>
      )}
      {showSubMenu && (
        <>
          <ThemeModal
            onBackButtonClick={() => {
              setShowMenu(true);
              setShowSubMenu(false);
            }}
            onSubMenuCloseClick={() => {
              setShowMenu(false);
              setShowSubMenu(false);
            }}
          />
        </>
      )}
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

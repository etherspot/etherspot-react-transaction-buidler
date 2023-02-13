import React, { useRef, useState } from 'react';
import { BsClockHistory } from 'react-icons/bs';
import { IoMdLogOut } from 'react-icons/io';
import { MdOutlineSettings, MdOutlineDashboardCustomize } from 'react-icons/md';
import styled, { useTheme } from 'styled-components';
import { useTransactionBuilderModal } from '../../hooks';
import useOnClickOutside from '../../hooks/useOnClickOutside';
import { Theme } from '../../utils/theme';
import History from '../History';
import MenuItemAnchor from '../Menu/MenuItemAnchor';
import MenuItem from '../Menu/MenuItem';
import EtherspotLogo from '../Image/EtherspotLogo';

const MenuWrapper = styled.div`
  z-index: 10;
  position: absolute;
  top: 40px;
  right: 15px;
  background: ${({ theme }) => theme.color.background.topMenu};
  color: ${({ theme }) => theme.color.text.topMenu};
  border-radius: 5px;
  padding: 12px 16px;
  font-size: 14px;
  text-align: left;
  box-shadow: rgb(0 0 0 / 24%) 0px 3px 8px;
`;

const MenuButton = styled(MdOutlineSettings)`
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
`;

export interface SettingMenuProps {
  showLogout?: boolean;
  logout: Function;
}

const SettingMenu = ({ showLogout, logout }: SettingMenuProps) => {
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const menuRef = useRef<null | HTMLDivElement>(null);
  const theme: Theme = useTheme();
  const { showModal } = useTransactionBuilderModal();

  const hideMenu = () => setShowMenu(false);
  useOnClickOutside(menuRef, hideMenu);

  return (
    <>
      <MenuButton
        data-testid="builder-setting-menu"
        color={theme?.color?.background?.topMenuButton}
        size={18}
        onClick={() => setShowMenu(!showMenu)}
      />
      {showMenu && (
        <MenuWrapper ref={menuRef}>
          <MenuItemAnchor
            title="Dashboard"
            link="https://dashboard.etherspot.io"
            icon={<MdOutlineDashboardCustomize size={16} style={{ marginRight: '12px' }} />}
          />
          <MenuItem
            icon={<BsClockHistory size={16} style={{ marginRight: '12px' }} />}
            title="History"
            onClick={() => {
              hideMenu();
              showModal(<History />);
            }}
          />
          <MenuItemAnchor
            title="About Etherspot"
            link="https://etherspot.io/"
            icon={<EtherspotLogo width={16} height={16} style={{ marginRight: '12px' }} />}
          />
          {showLogout && (
            <MenuItem
              icon={<IoMdLogOut size={16} style={{ marginRight: '12px' }} />}
              onClick={() => {
                logout();
              }}
              title={'Logout'}
            />
          )}
        </MenuWrapper>
      )}
    </>
  );
};

export default SettingMenu;

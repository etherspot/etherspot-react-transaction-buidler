import React, { useRef, useState } from 'react';
import { BsClockHistory } from 'react-icons/bs';
import { FaEthereum } from 'react-icons/fa';
import { HiOutlineDotsHorizontal } from 'react-icons/hi';
import { IoIosLogOut } from 'react-icons/io';
import { MdOutlineDashboardCustomize } from 'react-icons/md';
import styled, { useTheme } from 'styled-components';
import { useTransactionBuilderModal } from '../../hooks';
import useOutsideAlerter from '../../hooks/useOutsideClick';
import { Theme } from '../../utils/theme';
import History from '../History';

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

const MenuItem = styled.div`
  display: flex;
  justify-content: left;
  align-items: center;
  margin-bottom: 10px;
  margin-right: 12px;
  cursor: pointer;

  a,
  a:visited {
    color: ${({ theme }) => theme.color.text.topMenu};
    text-decoration: none;
  }

  a:hover {
    color: ${({ theme }) => theme.color.text.settingsIcon};
    text-decoration: none;
  }

  &:hover {
    color: ${({ theme }) => theme.color.text.settingsIcon};
    text-decoration: none;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const MenuButton = styled(HiOutlineDotsHorizontal)`
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

  const wrapperRef = useRef(null);
  const theme: Theme = useTheme();
  const { showModal } = useTransactionBuilderModal();

  const hideMenu = () => setShowMenu(false);
  useOutsideAlerter(wrapperRef, hideMenu);

  return (
    <>
      <MenuButton
        data-testid="builder-setting-menu"
        color={theme?.color?.background?.topMenuButton}
        size={22}
        onClick={() => setShowMenu(!showMenu)}
      />
      {showMenu && (
        <MenuWrapper ref={wrapperRef}>
          <MenuItem>
            <MdOutlineDashboardCustomize size={18} style={{ marginRight: '12px' }} />
            <a href="https://dashboard.etherspot.io" title="Dashboard" target="_blank">
              Dashboard
            </a>
          </MenuItem>
          <MenuItem
            onClick={() => {
              hideMenu();
              showModal(<History />);
            }}
          >
            <BsClockHistory size={18} style={{ marginRight: '12px' }} />
            History
          </MenuItem>
          <MenuItem>
            <FaEthereum size={18} style={{ marginRight: '12px' }} />
            <a href="https://etherspot.io/" title="About Etherspot" target="_blank">
              Etherspot
            </a>
          </MenuItem>
          {showLogout && (
            <MenuItem
              onClick={() => {
                logout();
              }}
            >
              <IoIosLogOut size={18} style={{ marginRight: '12px' }} />
              Logout
            </MenuItem>
          )}
        </MenuWrapper>
      )}
    </>
  );
};

export default SettingMenu;

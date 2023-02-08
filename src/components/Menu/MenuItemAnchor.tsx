import React, { ReactElement } from 'react';
import styled from 'styled-components';

interface MenuItemAnchorProps {
  link: string;
  title: string;
  icon?: ReactElement;
}

const MenuItem = styled.div`
  display: flex;
  justify-content: flex-start;
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
    #etherspot-logo {
      fill: ${({ theme }) => theme.color.text.settingsIcon};
      path {
        fill: ${({ theme }) => theme.color.text.settingsIcon};
      }
    }
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const MenuItemAnchor = ({ link, title, icon }: MenuItemAnchorProps) => (
  <MenuItem>
    {!!icon && icon}
    <a href={link} title={title} target="_blank">
      {title}
    </a>
  </MenuItem>
);

export default MenuItemAnchor;

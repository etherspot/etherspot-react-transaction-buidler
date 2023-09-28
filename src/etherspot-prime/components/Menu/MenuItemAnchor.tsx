import React, { ReactElement } from 'react';
import styled from 'styled-components';

interface MenuItemAnchorProps {
  link: string;
  title: string;
  icon?: ReactElement;
}

const MenuItemAnchorStyled = styled.a`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 8px 0px;
  cursor: pointer;
  text-decoration: none;
  color: ${({ theme }) => theme.color.text.settingsMenuItem};

  :visited {
    color: ${({ theme }) => theme.color.text.settingsMenuItem};
    text-decoration: none;
  }

  :hover {
    color: ${({ theme }) => theme.color.text.settingsMenuItemHover};
    text-decoration: none;
  }
`;

const MenuItemAnchor = ({ link, title, icon }: MenuItemAnchorProps) => (
  <MenuItemAnchorStyled href={link} title={title} target="_blank">
    {!!icon && icon}
    {title}
  </MenuItemAnchorStyled>
);

export default MenuItemAnchor;

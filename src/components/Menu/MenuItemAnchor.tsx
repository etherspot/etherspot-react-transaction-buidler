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
  margin-bottom: 10px;
  margin-right: 12px;
  cursor: pointer;
  text-decoration: none;

  :visited {
    color: ${({ theme }) => theme.color.text.topMenu};
    text-decoration: none;
  }

  :hover {
    color: ${({ theme }) => theme.color.text.settingsIcon};
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

import React, { ReactElement } from 'react';
import styled from 'styled-components';

interface MenuItemProps {
  title: string;
  icon: ReactElement;
  onClick: Function;
}

const MenuItemStyled = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 8px 0px;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text.settingsMenuItem};
  :hover {
    color: ${({ theme }) => theme.color.text.settingsMenuItemHover};
  }
`;

const MenuItem = ({ title, icon, onClick }: MenuItemProps) => (
  <MenuItemStyled onClick={(event) => onClick(event)}>
    {!!icon && icon}
    {title}
  </MenuItemStyled>
);

export default MenuItem;

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
  margin-bottom: 10px;
  margin-right: 12px;
  cursor: pointer;

  :hover {
    color: ${({ theme }) => theme.color.text.settingsIcon};
  }
`;

const MenuItem = ({ title, icon, onClick }: MenuItemProps) => (
  <MenuItemStyled onClick={(event) => onClick(event)}>
    {!!icon && icon}
    {title}
  </MenuItemStyled>
);

export default MenuItem;

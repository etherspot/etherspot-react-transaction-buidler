import React, { useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { startCase, lowerCase } from 'lodash';

// Components
import { BackButton, HeaderTitle, ModalHeader } from '../Menu/MenuModalWrapper';

// Icons
import { IoMdCheckmark } from 'react-icons/io';
import { CloseButton } from '../Button';

// Utils
import { Theme } from '../../utils/theme';
import { useEtherspot } from '../../hooks';
import { Bundlers } from '../../enums/wallet.enum';

const BundlerModal = ({
  onBackButtonClick,
  onSubMenuCloseClick,
}: {
  onBackButtonClick: () => void;
  onSubMenuCloseClick: () => void;
}) => {
  const theme: Theme = useTheme();
  const { setBundler, isBundlerSelected, setIsBundlerSelected } = useEtherspot();

  const onBundlerSelection = async (value: Bundlers) => {
    setIsBundlerSelected(!isBundlerSelected);

    if (isBundlerSelected) {
      setBundler(value);
    } else {
      setBundler(undefined);
    }
  };

  return (
    <SubMenuWrapper>
      <ModalHeader style={{ marginBottom: 8 }}>
        {onBackButtonClick && (
          <BackButton color={theme?.color?.background?.settingMenuMain} onClick={onBackButtonClick} />
        )}
        <HeaderTitle>Bundler</HeaderTitle>
        <CloseButtonWrapper onClick={onSubMenuCloseClick} />
      </ModalHeader>
      {Object.values(Bundlers).map((value, index) => (
        <BundlerTextWrapper key={index} onClick={() => onBundlerSelection(value as Bundlers)}>
          <span>{startCase(lowerCase(value))}</span>
          {isBundlerSelected && <IoMdCheckmark size={16} style={{ marginRight: 2 }} />}
        </BundlerTextWrapper>
      ))}
    </SubMenuWrapper>
  );
};

export default BundlerModal;

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

const BundlerTextWrapper = styled.div`
  padding: 4px 0px;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text.settingsMenuItem};
  :hover {
    color: ${({ theme }) => theme.color.text.settingsMenuItemHover};
  }
`;

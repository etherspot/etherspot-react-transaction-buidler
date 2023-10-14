import React from 'react';
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
import { Paymasters } from '../../enums/wallet.enum';

const PaymasterModal = ({
  onBackButtonClick,
  onSubMenuCloseClick,
}: {
  onBackButtonClick: () => void;
  onSubMenuCloseClick: () => void;
}) => {
  const theme: Theme = useTheme();
  const { paymaster, setPaymaster } = useEtherspot();

  const onPaymasterSelection = async (value: Paymasters) => {
    setPaymaster(value);
  };

  return (
    <SubMenuWrapper>
      <ModalHeader style={{ marginBottom: 8 }}>
        {onBackButtonClick && (
          <BackButton color={theme?.color?.background?.settingMenuMain} onClick={onBackButtonClick} />
        )}
        <HeaderTitle>Paymaster</HeaderTitle>
        <CloseButtonWrapper onClick={onSubMenuCloseClick} />
      </ModalHeader>
      {Object.values(Paymasters).map((value, index) => (
        <PaymasterTextWrapper key={index} onClick={() => onPaymasterSelection(value as Paymasters)}>
          <span>{startCase(lowerCase(value))}</span>
          {paymaster === value && <IoMdCheckmark size={16} style={{ marginRight: 2 }} />}
        </PaymasterTextWrapper>
      ))}
    </SubMenuWrapper>
  );
};

export default PaymasterModal;

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

const PaymasterTextWrapper = styled.div`
  padding: 4px 0px;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text.settingsMenuItem};
  :hover {
    color: ${({ theme }) => theme.color.text.settingsMenuItemHover};
  }
`;

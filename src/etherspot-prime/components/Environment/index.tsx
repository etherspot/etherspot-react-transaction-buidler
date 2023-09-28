import React from 'react';
import styled, { useTheme } from 'styled-components';
import { startCase, lowerCase } from 'lodash';
import { EnvNames as EtherspotEnvNames } from 'etherspot';

// Components
import { BackButton, HeaderTitle, ModalHeader } from '../Menu/MenuModalWrapper';

// Icons
import { IoMdCheckmark } from 'react-icons/io';
import { CloseButton } from '../Button';

// Utils
import { Theme } from '../../utils/theme';
import { useEtherspot } from '../../../hooks';
import { MAINNET_CHAIN_ID, TESTNET_CHAIN_ID, changeChainId } from '../../../utils/chain';

const EnvironmentModal = ({
  onBackButtonClick,
  onSubMenuCloseClick,
}: {
  onBackButtonClick: () => void;
  onSubMenuCloseClick: () => void;
}) => {
  const theme: Theme = useTheme();
  const { environment, setEnvironment, setChainId } = useEtherspot();

  const onEnvironmentSelection = async (value: EtherspotEnvNames) => {
    setEnvironment(value);
    changeChainId(value);
    setChainId(
      value === EtherspotEnvNames.MainNets ? MAINNET_CHAIN_ID.ETHEREUM_MAINNET : TESTNET_CHAIN_ID.ETHEREUM_MAINNET
    );
  };

  return (
    <SubMenuWrapper>
      <ModalHeader style={{ marginBottom: 8 }}>
        {onBackButtonClick && (
          <BackButton color={theme?.color?.background?.settingMenuMain} onClick={onBackButtonClick} />
        )}
        <HeaderTitle>Environment</HeaderTitle>
        <CloseButtonWrapper onClick={onSubMenuCloseClick} />
      </ModalHeader>
      {Object.values(EtherspotEnvNames)
        .slice(0, 2)
        .map((value, index) => (
          <EnvironmentTextWrapper key={index} onClick={() => onEnvironmentSelection(value as EtherspotEnvNames)}>
            <span>{startCase(lowerCase(value))}</span>
            {environment === value && <IoMdCheckmark size={16} style={{ marginRight: 2 }} />}
          </EnvironmentTextWrapper>
        ))}
    </SubMenuWrapper>
  );
};

export default EnvironmentModal;

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

const EnvironmentTextWrapper = styled.div`
  padding: 4px 0px;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text.settingsMenuItem};
  :hover {
    color: ${({ theme }) => theme.color.text.settingsMenuItemHover};
  }
`;

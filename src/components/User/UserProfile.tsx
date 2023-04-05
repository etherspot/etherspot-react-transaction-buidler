import React, { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';

// components
import Text from '../Text/Text';
import { WalletCopyIcon } from '../TransactionBlock/Icons';

// hooks
import { useEtherspot } from '../../hooks';

// icons
import { FcCheckmark } from 'react-icons/fc';

// utils
import { Theme } from '../../utils/theme';
import { copyToClipboard } from '../../utils/common';
import { CHAIN_ID } from '../../utils/chain';

// constants
import { OPENLOGIN_STORE, WAGMI_STORE } from '../../constants/storageConstants';
import { ENSNode } from 'etherspot';
import { IoChevronBackCircleOutline } from 'react-icons/io5';

const UserProfile = ({ onBackButtonClick }: { onBackButtonClick: () => void }) => {
  const { accountAddress, providerAddress, getEnsNode } = useEtherspot();

  const theme: Theme = useTheme();

  const [copiedAddress, setCopiedAddress] = useState<string>('');
  const [ensName, setEnsName] = useState<string | undefined>(undefined);

  let email;
  let isWeb3Login = false;

  try {
    const wagmiStoreString = localStorage.getItem(WAGMI_STORE);
    const wagmiStoreStore = wagmiStoreString && JSON.parse(wagmiStoreString);
    isWeb3Login = Boolean(wagmiStoreStore.state.data.account);

    const openLoginStoreString = localStorage.getItem(OPENLOGIN_STORE);
    const openLoginStore = openLoginStoreString && JSON.parse(openLoginStoreString);
    email = openLoginStore?.email ?? '';
  } catch (err) {
    console.error('Error accessing local storage:', err);
  }

  const onCopySuccess = async (address: string) => {
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(''), 10000);
  };

  useEffect(() => {
    const getAccount = async () => {
      try {
        const account: ENSNode = await getEnsNode(CHAIN_ID.ETHEREUM_MAINNET, accountAddress, false);
        setEnsName(account.name);
      } catch (err) {
        //
      }
    };
    getAccount();
  }, []);

  return (
    <ModalWrapper marginBottom={20} color={theme?.color?.background?.topMenu}>
      <ModalHeader>
        <BackButton color={theme?.color?.text?.settingsIcon} onClick={onBackButtonClick} />
        <HeaderText>Profile</HeaderText>
      </ModalHeader>
      <HorizontalLine />
      {!isWeb3Login && (
        <Wrapper>
          <Header>Email</Header>
          <Value>{email}</Value>
        </Wrapper>
      )}
      {isWeb3Login && (
        <Wrapper>
          <Header>Keybased Address</Header>
          <Value>
            {providerAddress ? (
              <AddressCopyButtonWrapper>
                <AddressWrapper>{providerAddress}</AddressWrapper>
                <Text
                  onClick={() => copyToClipboard(providerAddress, () => onCopySuccess(providerAddress))}
                  marginLeft={3}
                >
                  {copiedAddress == providerAddress ? (
                    <CheckmarkIcon color={theme.color?.text?.textInput} />
                  ) : (
                    WalletCopyIcon
                  )}
                </Text>
              </AddressCopyButtonWrapper>
            ) : (
              <p>No address</p>
            )}
          </Value>
        </Wrapper>
      )}
      <Wrapper>
        <Header>Smart Wallet Address</Header>
        <Value>
          {accountAddress ? (
            <AddressCopyButtonWrapper>
              <AddressWrapper>{accountAddress}</AddressWrapper>
              <Text onClick={() => copyToClipboard(accountAddress, () => onCopySuccess(accountAddress))} marginLeft={3}>
                {copiedAddress == accountAddress ? (
                  <CheckmarkIcon color={theme.color?.text?.textInput} />
                ) : (
                  WalletCopyIcon
                )}
              </Text>
            </AddressCopyButtonWrapper>
          ) : (
            <p>No address</p>
          )}
        </Value>
      </Wrapper>
      <Wrapper>
        <Header>ENS</Header>
        <Value>{ensName ?? 'Not found'}</Value>
      </Wrapper>
    </ModalWrapper>
  );
};

export default UserProfile;

const Wrapper = styled.div`
  display: block;
  margin-top: 20px;
  font-family: 'PTRootUIWebMedium', sans-serif;
`;

const Header = styled.div`
  display: block;
  color: ${({ theme }) => theme.color.text.outerLabel};
  font-size: 15px;
`;

const Value = styled.div`
  display: flex;
  margin-top: 5px;
  padding: 10px;
  border-radius: 10px;
  background: ${({ theme }) => theme.color.background.card};
  color: ${({ theme }) => theme.color.text.card};
  font-size: 14px;
`;

const CheckmarkIcon = styled(FcCheckmark)`
  margin-top: -3px;
`;

const BackButton = styled(IoChevronBackCircleOutline)`
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
`;

const HorizontalLine = styled.div`
  width: 100%;
  height: 1px;
  background: ${({ theme }) => theme.color.text.outerLabel};
`;

const AddressCopyButtonWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AddressWrapper = styled.div`
  overflow: hidden;
`;

const ModalWrapper = styled.div<{ marginBottom?: number; color?: string }>`
  background: ${({ theme, color }) => color ?? theme.color.background.card};
  color: ${({ theme }) => theme.color.text.card};
  border-radius: 12px;
  padding: 16px 20px;
  ${({ marginBottom }) => marginBottom && `margin-bottom: ${marginBottom}px;`};
  position: relative;
  box-shadow: 0 2px 8px 0 rgba(26, 23, 38, 0.3);
  text-align: left;
  user-select: none;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
`;

const HeaderText = styled.h3`
  margin-left: 8px;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: 'PTRootUIWebBold', sans-serif;
`;

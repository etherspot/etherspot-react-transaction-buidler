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
import MenuModalWrapper from '../Menu/MenuModalWrapper';

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
    <MenuModalWrapper title="Profile" onBackButtonClick={onBackButtonClick}>
      {!isWeb3Login && (
        <Wrapper>
          <FieldHeader>Email</FieldHeader>
          <Value>{email}</Value>
        </Wrapper>
      )}
      {isWeb3Login && (
        <Wrapper>
          <FieldHeader color={theme?.color?.text?.settingsModalSubHeader}>Keybased Address</FieldHeader>
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
        <FieldHeader color={theme?.color?.text?.settingsModalSubHeader}>Smart Wallet Address</FieldHeader>
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
        <FieldHeader color={theme?.color?.text?.settingsModalSubHeader}>ENS</FieldHeader>
        <Value>{ensName ?? 'Not found'}</Value>
      </Wrapper>
    </MenuModalWrapper>
  );
};

export default UserProfile;

const Wrapper = styled.div`
  margin: 8px 0px;
`;

const FieldHeader = styled.div`
  display: block;
  color: ${({ theme }) => theme.color.text.settingsModalSubHeader};
  font-size: 15px;
  margin: 4px 0px;
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

const AddressCopyButtonWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AddressWrapper = styled.div`
  overflow: hidden;
`;

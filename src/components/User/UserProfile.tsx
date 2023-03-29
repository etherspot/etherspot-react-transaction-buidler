import React, { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';

// components
import Text from '../Text/Text';
import { WalletCopyIcon } from '../TransactionBlock/Icons';
import Card from '../Card';

// hooks
import { useEtherspot } from '../../hooks';

// icons
import { FcCheckmark } from 'react-icons/fc';

// utils
import { Theme } from '../../utils/theme';
import { copyToClipboard, humanizeHexString } from '../../utils/common';
import { CHAIN_ID } from '../../utils/chain';

// constants
import { OPENLOGIN_STORE } from '../../constants/storageConstants';
import { ENSNode } from 'etherspot';

const UserProfile = () => {
  const { accountAddress, providerAddress, getEnsNode } = useEtherspot();

  const theme: Theme = useTheme();

  const [copiedAddress, setCopiedAddress] = useState<string>('');
  const [ensName, setEnsName] = useState<string | undefined>(undefined);

  let email;
  try {
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
    <Card title="Profile" marginBottom={20} color={theme?.color?.background?.topMenu}>
      <HorizontalLine />
      {email && (
        <Wrapper>
          <Header>Email</Header>
          <Value>{email}</Value>
        </Wrapper>
      )}
      <Wrapper>
        <Header>Smart wallet address</Header>
        <Value>
          {accountAddress ? (
            <AddressCopyButtonWrapper>
              <AddressWrapper>{humanizeHexString(accountAddress, 36, 4)}</AddressWrapper>
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
        <Header>Key based address</Header>
        <Value>
          {providerAddress ? (
            <AddressCopyButtonWrapper>
              <AddressWrapper>{humanizeHexString(providerAddress, 36, 4)}</AddressWrapper>
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
      <Wrapper>
        <Header>ENS</Header>
        <Value>{ensName ?? 'Not found'}</Value>
      </Wrapper>
    </Card>
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
`;

const CheckmarkIcon = styled(FcCheckmark)`
  margin-top: -3px;
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
`;

const AddressWrapper = styled.div`
  overflow: hidden;
`;

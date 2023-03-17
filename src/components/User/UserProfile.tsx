import React, { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';

// components
import Text from '../Text/Text';
import { WalletCopyIcon } from '../TransactionBlock/Icons';

// hooks
import { useEtherspot } from '../../hooks';

// icons
import { HiCheck } from 'react-icons/hi';

// utils
import { Theme } from '../../utils/theme';
import { ENSNode } from 'etherspot';
import Card from '../Card';

// constants
import { OPENLOGIN_STORE } from '../../constants/storageConstants';

const UserProfile = () => {
  const { accountAddress, getENSNode } = useEtherspot();

  const theme: Theme = useTheme();

  const [copiedAddress, setCopiedAddress] = useState(false);
  const [ensNode, setEnsNode] = useState<string | undefined>(undefined);

  const openLoginStoreString = localStorage.getItem(OPENLOGIN_STORE);
  const openLoginStore = openLoginStoreString && JSON.parse(openLoginStoreString);
  const email = openLoginStore?.email ?? '';

  const onCopy = async (valueToCopy: string) => {
    try {
      await navigator.clipboard.writeText(valueToCopy);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 10000);
    } catch (e) {
      alert('Unable to copy!');
    }
  };

  useEffect(() => {
    async function getAccount() {
      try {
        const account: ENSNode = await getENSNode(1, accountAddress, false);
        setEnsNode(account.name);
      } catch (err) {
        //
      }
    }
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
        <Header>Address</Header>
        <Value>
          {accountAddress ? (
            <>
              {accountAddress}
              <Text onClick={() => onCopy(accountAddress)} marginLeft={3}>
                {copiedAddress ? <CheckmarkIcon color={theme.color?.text?.textInput} /> : WalletCopyIcon}
              </Text>
            </>
          ) : (
            <p>No adderess</p>
          )}
        </Value>
      </Wrapper>
      <Wrapper>
        <Header>ENS</Header>
        <Value>{ensNode ? ensNode : 'Not found'}</Value>
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

const CheckmarkIcon = styled(HiCheck)`
  margin-top: -3px;
`;

const HorizontalLine = styled.div`
  width: 100%;
  height: 1px;
  background: ${({ theme }) => theme.color.text.outerLabel};
`;

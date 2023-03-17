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
    <>
      <Card title="Profile" marginBottom={20} color={theme?.color?.background?.topMenu}>
        {email && (
          <Wrapper>
            <Text>Email</Text>
            <Section>{email}</Section>
          </Wrapper>
        )}
        <Wrapper>
          <Text>Address</Text>
          <Section>
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
          </Section>
        </Wrapper>
        <Wrapper>
          <Text>ENS</Text>
          <Section>{ensNode ? ensNode : 'Not found'}</Section>
        </Wrapper>
      </Card>
    </>
  );
};

export default UserProfile;

const Wrapper = styled.div`
  display: block;
  margin-top: 20px;
`;

const Section = styled.div`
  display: flex;
  margin-top: 5px;
  padding: 15px;
  border-radius: 10px;
  font-weight: bold;
  background: ${({ theme }) => theme.color.background.card};
`;

const CheckmarkIcon = styled(HiCheck)`
  margin-top: -3px;
`;

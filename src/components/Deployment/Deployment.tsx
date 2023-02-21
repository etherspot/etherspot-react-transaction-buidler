import React, { useState, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';

//icons
import { IoMdCheckmark } from 'react-icons/io';
import { CgSandClock } from 'react-icons/cg';

//components
import Card from '../Card/Card';
import { RoundedImage } from '../Image';
import { useEtherspot } from '../../hooks';
import Modal from '../Modal/Modal';
import { Paragraph } from '../Text';
import { PrimaryButton, SecondaryButton } from '../Button';
import ErrorMessage from '../Error/ErrorMessage';

//utils
import { supportedChains } from '../../utils/chain';
import { deployAccount } from '../../utils/transaction';
import { Theme } from '../../utils/theme';

const Wrapper = styled.div`
  margin-top: 10px;
`;

const Section = styled.div`
  display: flex;
  background: ${({ theme }) => theme.color.background.topMenu};
  margin-top: 5px;
  padding: 15px;
  border-radius: 10px;
  font-weight: bold;
`;

const Header = styled.div`
  display: block;
`;

const Body = styled.div`
  display: block;
`;

const Label = styled.label`
  display: inline-block;
  margin-bottom: 14px;
  font-size: 14px;
`;

const AuthLabel = styled.div`
  background-color: ${({ theme }) => theme.color.background.button};
  border-radius: 10px;
  font-weight: bold;
  padding: 5px;
  position: absolute;
  right: 28px;
`;

const DeployButton = styled.button`
  background: ${({ theme }) => theme.color.background.deployButton};
  color: ${({ theme }) => theme.color.text.listItemQuickButtonPrimary};
  position: absolute;
  font-weight: bold;
  right: 28px;
  border: none;
  cursor: pointer;
  border-radius: 10px;
  height: 30px;
  width: 80px;
`;

interface Account {
  status: string;
  value?: any;
  title?: string;
  address?: string;
  createdAt?: Date;
  state?: string;
  store?: string;
  type?: string;
  updatedAt?: Date;
}

const Deployment = () => {
  const [deployedChains, setDeployedChains] = useState<Account[]>([]);
  const [undeployedChains, setUndeployedChains] = useState<Account[]>([]);
  const [confirmModal, setConfirmModal] = useState<boolean>(false);
  const [selectedChain, setSelectedChain] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { getSdkForChainId, accountAddress } = useEtherspot();
  const theme: Theme = useTheme();

  const fetchDeploymentData = async (chainId: number) => {
    const sdk = getSdkForChainId(chainId);
    if (accountAddress && sdk) {
      try {
        await sdk.computeContractAccount();
        let account = await sdk.getAccount();
        return account;
      } catch (err) {
        //
      }
    }
  };

  const getDeployementStatus = async () => {
    try {
      const result = await Promise.all(
        supportedChains.map(async ({ chainId, title, iconUrl }) => {
          const account = await fetchDeploymentData(chainId);
          if (!account) return;
          return { ...account, chainId, title, iconUrl };
        })
      );
      const accounts = result.filter((acc) => acc);
      return Promise.allSettled(accounts).catch(() => {
        return [];
      });
    } catch (err) {
      return [];
    }
  };

  const hideModal = () => {
    setConfirmModal(false);
  };

  const deploymentData = async () => {
    const data: Account[] | undefined = await getDeployementStatus();
    if (!data) return;
    const [unDeployed, deployed] = data.reduce(
      (acc: Account[][], curr: Account) => {
        if (curr?.value?.state === 'UnDeployed') {
          acc[0].push(curr);
        } else {
          acc[1].push(curr);
        }
        return acc;
      },
      [[], []]
    );
    setUndeployedChains(unDeployed);
    setDeployedChains(deployed);
  };

  const deploy = async () => {
    if (!selectedChain || !accountAddress) return;
    const sdk = getSdkForChainId(selectedChain);
    if (!sdk) return;
    try {
      await deployAccount(sdk);
    } catch (err) {
      setErrorMessage('Failed to proceed with selected actions!');
      hideModal();
    }
  };

  const handleClose = () => {
    setErrorMessage('');
  };

  useEffect(() => {
    deploymentData();
  }, []);

  return (
    <Card title="Deployments" marginBottom={20}>
      {errorMessage && <ErrorMessage errorMessage={errorMessage} onClose={handleClose} />}
      {!!confirmModal && (
        <Modal zIndex>
          <Paragraph>Deploy your wallet on Etherium to sign messages</Paragraph>
          <PrimaryButton
            background={theme?.color?.background?.selectInputScrollbar}
            color={theme?.color?.text?.listItemQuickButtonPrimary}
            display="flex"
            justifyContent="center"
            onClick={deploy}
          >
            Deploy
          </PrimaryButton>
          <br />
          <SecondaryButton margin="0 auto" display="flex" color={theme.color?.text?.card} onClick={hideModal}>
            Cancel
          </SecondaryButton>
        </Modal>
      )}
      <Wrapper>
        <Header>
          <IoMdCheckmark size={20} style={{ marginRight: '2px' }} />
          <Label>Deployed</Label>
        </Header>
        <Body>
          {deployedChains.map(({ value }) => {
            return (
              <Section>
                <RoundedImage url={value.iconUrl} title={value.title} size={24} />
                {value.title}
                <AuthLabel>Auth Chain</AuthLabel>
              </Section>
            );
          })}
        </Body>
      </Wrapper>
      <Wrapper>
        <Header>
          <CgSandClock size={20} style={{ marginRight: '2px' }} />
          <Label>Not Deployed</Label>
        </Header>
        <Body>
          {undeployedChains.map(({ value }) => {
            return (
              <Section>
                <RoundedImage url={value.iconUrl} title={value.title} size={24} />
                {value.title}
                <DeployButton
                  onClick={() => {
                    setConfirmModal(true);
                    setSelectedChain(value.chainId);
                  }}
                >
                  Deploy
                </DeployButton>
              </Section>
            );
          })}
        </Body>
      </Wrapper>
    </Card>
  );
};

export default Deployment;

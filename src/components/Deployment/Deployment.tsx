import React, { useState, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountStates } from 'etherspot';

// icons
import { IoMdCheckmark } from 'react-icons/io';
import { CgSandClock } from 'react-icons/cg';

// components
import Card from '../Card/Card';
import { RoundedImage } from '../Image';
import { useEtherspot } from '../../hooks';
import Modal from '../Modal/Modal';
import { Paragraph } from '../Text';
import { PrimaryButton, SecondaryButton } from '../Button';
import ErrorMessage from '../Error/ErrorMessage';

// utils
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

interface DeployChain {
  chainId: number;
  status?: string;
  title: string;
  iconUrl?: string;
  type?: string;
  state: AccountStates;
}

const Deployment = () => {
  const [deployedChains, setDeployedChains] = useState<DeployChain[]>([]);
  const [undeployedChains, setUndeployedChains] = useState<DeployChain[]>([]);
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
        return await sdk.getAccount();
      } catch (err) {
        //
      }
    }
  };

  const getDeploymentStatus = async () => {
    try {
      const result = [];
      for (const { chainId, title, iconUrl } of supportedChains) {
        const account = await fetchDeploymentData(chainId);
        if (account) {
          result.push({ ...account, chainId, title, iconUrl });
        }
      }
      return result;
    } catch (err) {
      return [];
    }
  };

  const hideModal = () => {
    setConfirmModal(false);
  };

  const deploymentData = async () => {
    const data: DeployChain[] = await getDeploymentStatus();
    if (!data) return;
    const [unDeployed, deployed] = data.reduce(
      (acc: DeployChain[][], curr: DeployChain) => {
        if (curr.state ===  AccountStates.UnDeployed) {
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
    if (!sdk) {
      setErrorMessage('Failed to proceed with selected actions!');
      return;
    }
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
        <Modal isComponentOnTop>
          <Paragraph>Deploy your wallet on Ethereum to sign messages</Paragraph>
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
          {deployedChains.map(({ iconUrl, title }) => {
            return (
              <Section>
                <RoundedImage url={iconUrl} title={title} size={24} />
                {title}
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
          {undeployedChains.map(({ chainId, iconUrl, title }) => {
            return (
              <Section>
                <RoundedImage url={iconUrl} title={title} size={24} />
                {title}
                <DeployButton
                  onClick={() => {
                    setConfirmModal(true);
                    setSelectedChain(chainId);
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

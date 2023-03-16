import React, { useState, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountStates,Account } from 'etherspot';

// icons
import { IoMdCheckmark } from 'react-icons/io';
import { CgSandClock } from 'react-icons/cg';

// components
import Card from '../Card/Card';
import { RoundedImage } from '../Image';
import { useEtherspot } from '../../hooks';
import Modal from '../Modal/Modal';
import { Paragraph } from '../Text';
import { PrimaryButton, CloseButton } from '../Button';

// utils
import { supportedChains } from '../../utils/chain';
import { deployAccount } from '../../utils/transaction';
import { Theme } from '../../utils/theme';
interface IAccountTypes {
  address: string;
  createdAt: Date;
  ensNode: null;
  state: string;
  store: string;
  type: string;
  updatedAt: Date;
}

interface IDeployChain {
  chainId: number;
  status?: string;
  title: string;
  iconUrl?: string;
  type?: string;
  state: AccountStates;
}

const Deployment = () => {
  const [deployedChains, setDeployedChains] = useState<IDeployChain[]>([]);
  const [undeployedChains, setUndeployedChains] = useState<IDeployChain[]>([]);
  const [confirmModal, setConfirmModal] = useState<boolean>(false);
  const [selectedChain, setSelectedChain] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { getSdkForChainId, accountAddress } = useEtherspot();
  const theme: Theme = useTheme();

  const fetchDeploymentData = async (chainId: number): Promise<Account | undefined> => {
    const sdk = getSdkForChainId(chainId);
    if (!accountAddress || !sdk) return;
    try {
      await sdk.computeContractAccount();
      return sdk.getAccount();
    } catch (err) {
      //
    }
  };

  const getDeploymentStatus = async (): Promise<IDeployChain[]> => {
    try {
      const result: IDeployChain[] = [];
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

  const getDeploymentData = async () => {
    const data: IDeployChain[] = await getDeploymentStatus();
    if (!data) return;
    const [undeployed, deployed] = data.reduce(
      (acc: IDeployChain[][], curr: IDeployChain) => {
        if (curr.state ===  AccountStates.UnDeployed) {
          acc[0].push(curr);
        } else {
          acc[1].push(curr);
        }
        return acc;
      },
      [[], []]
    );
    setUndeployedChains(undeployed);
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
      await getDeploymentData();
    } catch (err) {
      setErrorMessage('Failed to proceed with selected actions!');
      hideModal();
    }
  };

  const handleClose = () => {
    setErrorMessage('');
  };

  const hideModal = () => {
    setConfirmModal(false);
  };
  
  useEffect(() => {
    getDeploymentData();
  }, []);

  return (
    <Card title="Deployments" marginBottom={20} color={theme?.color?.background?.topMenu}>
      <HorizontalLine />
      {errorMessage && (
        <Modal>
          <CloseButton onClick={handleClose} top={18} right={20} />
          <AlertWrapper>{errorMessage}</AlertWrapper>
        </Modal>
      )}
      {!!confirmModal && (
        <Modal>
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
          <SecondaryButton color={theme.color?.text?.card} onClick={hideModal}>
            Cancel
          </SecondaryButton>
        </Modal>
      )}
      <Wrapper>
        <Header>
          <IoMdCheckmark size={16} style={{ marginRight: '2px' }} />
          <Label>Deployed</Label>
        </Header>
        <Body>
          {deployedChains.length == 0 && <Section>No Chains</Section>}
          {deployedChains.map(({ iconUrl, title }) => (
            <Section>
              <RoundedImage url={iconUrl} title={title} size={24} />
              {title}
            </Section>
          ))}
        </Body>
      </Wrapper>
      <Wrapper>
        <Header>
          <CgSandClock size={16} style={{ marginRight: '2px' }} />
          <Label>Not deployed</Label>
        </Header>
        <Body>
          {undeployedChains.length == 0 && <Section>No Chains</Section>}
          {undeployedChains.map(({ chainId, iconUrl, title }) => (
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
          ))}
        </Body>
      </Wrapper>
    </Card>
  );
};

export default Deployment;

const Wrapper = styled.div`
  margin-top: 10px;
`;

const Section = styled.div`
  display: flex;
  background: ${({ theme }) => theme.color.background.card};
  align-items: center;
  margin-top: 8px;
  padding: 10px;
  border-radius: 10px;
  font-family: 'PTRootUIWebMedium', sans-serif;
  box-shadow: 0 2px 8px 0 rgba(26, 23, 38, 0.3);
`;

const Header = styled.div`
  display: block;
  color: ${({ theme }) => theme.color.text.outerLabel};
  font-size: 15px;
`;

const Label = styled.label`
  display: inline-block;
  padding: 0;
`;

const HorizontalLine = styled.div`
  width: 100%;
  height: 0.1px;
  background: ${({ theme }) => theme.color.text.outerLabel};
`;

const Body = styled.div`
  display: block;
  overflow-y: scroll;
  background-color: ${({ theme }) => theme.color.background.listItem};
  max-height: 293px;
  scrollbar-width: thin;
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: none;
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.background.selectInputScrollbar};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: ${({ theme }) => theme.color.background.selectInputScrollbarHover};
  }

  ::-webkit-scrollbar-thumb:active {
    background-color: ${({ theme }) => theme.color.background.selectInputScrollbarActive};
  }
`;

const DeployButton = styled.button`
  background: ${({ theme }) => theme.color.background.deployButton};
  color: ${({ theme }) => theme.color.text.card};
  font-weight: bold;
  border: none;
  cursor: pointer;
  border-radius: 10px;
  height: 30px;
  width: 80px;
  margin-left: auto;
`;

const SecondaryButton = styled.button`
  margin: 0 auto;
  display: flex;
  color: ${({ theme }) => theme.color?.text?.card};
  background: ${({ theme }) => theme.color.background.switchInputInactiveTab};
  border: none;
  cursor: pointer;
`;

const AlertWrapper = styled.div`
  margin: 15px 0;
`;
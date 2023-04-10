import React, { useState, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountStates, Account } from 'etherspot';

// icons
import { IoMdCheckmark } from 'react-icons/io';
import { CgSandClock } from 'react-icons/cg';

// components
import { RoundedImage } from '../Image';
import { useEtherspot } from '../../hooks';
import Modal from '../Modal/Modal';
import { CloseButton } from '../Button';

// utils
import { supportedChains } from '../../utils/chain';
import { deployAccount } from '../../utils/transaction';
import { Theme } from '../../utils/theme';
import MenuModalWrapper from '../Menu/MenuModalWrapper';

interface IDeployChain {
  chainId: number;
  status?: string;
  title: string;
  iconUrl?: string;
  type?: string;
  state: AccountStates;
}

const Deployment = ({ onBackButtonClick }: { onBackButtonClick: () => void }) => {
  const [deployedChains, setDeployedChains] = useState<IDeployChain[]>([]);
  const [undeployedChains, setUndeployedChains] = useState<IDeployChain[]>([]);
  const [confirmModal, setConfirmModal] = useState<boolean>(false);
  const [selectedChain, setSelectedChain] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingChainsStatus, setIsLoadingChainsStatus] = useState(false);

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
    setIsLoadingChainsStatus(true);
    const data: IDeployChain[] = await getDeploymentStatus();
    if (!data) return;
    const [undeployed, deployed] = data.reduce(
      (acc: IDeployChain[][], curr: IDeployChain) => {
        if (curr.state === AccountStates.UnDeployed) {
          acc[0].push(curr);
        } else {
          acc[1].push(curr);
        }
        return acc;
      },
      [[], []],
    );
    setIsLoadingChainsStatus(false);
    setUndeployedChains(undeployed);
    setDeployedChains(deployed);
  };

  const deploy = async () => {
    if (!selectedChain || !accountAddress) return;

    const sdk = getSdkForChainId(selectedChain);
    if (!sdk) {
      setErrorMessage('Failed to deploy selected chains!');
      return;
    }
    try {
      await deployAccount(sdk);
      await getDeploymentData();
    } catch (err) {
      setErrorMessage('Failed to deploy selected chains!');
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

  let selectedDeploymentChain;
  if (!!confirmModal && selectedChain) {
    selectedDeploymentChain = undeployedChains.find(({ chainId }) => chainId === selectedChain);
  }

  return (
    <MenuModalWrapper title="Deployments" onBackButtonClick={onBackButtonClick}>
      {errorMessage && (
        <Modal backgroundColor={theme?.color?.background?.settingsModal}>
          <CloseButton onClick={handleClose} top={18} right={20} />
          <AlertWrapper>{errorMessage}</AlertWrapper>
        </Modal>
      )}
      {!!confirmModal && selectedDeploymentChain?.title && (
        <Modal backgroundColor={theme?.color?.background?.settingsModal}>
          <ConfirmMessageWrapper>
            Deploy your wallet on {selectedDeploymentChain?.title} to sign messages.
          </ConfirmMessageWrapper>
          <ConfirmDeployButton onClick={deploy}>Deploy</ConfirmDeployButton>
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
          {deployedChains.length == 0 && <Section>{isLoadingChainsStatus ? 'Loading...' : 'No Chains'}</Section>}
          {deployedChains.map(({ iconUrl, title }) => (
            <Section>
              <RoundedImage url={iconUrl} title={title} size={20} />
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
          {undeployedChains.length == 0 && <Section>{isLoadingChainsStatus ? 'Loading...' : 'No Chains'}</Section>}
          {undeployedChains.map(({ chainId, iconUrl, title }) => (
            <Section>
              <RoundedImage url={iconUrl} title={title} size={20} />
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
    </MenuModalWrapper>
  );
};

export default Deployment;

const Wrapper = styled.div`
  margin: 12px 0px;
`;

const ConfirmMessageWrapper = styled.p`
  padding: 16px 0px;
  text-align: center;
`;

const ConfirmDeployButton = styled.div`
  display: flex;
  justify-content: center;
  background: ${({ theme }) => theme.color.background.settingMenuMain};
  color: ${({ theme }) => theme.color.text.main};
  padding: 18px;
  border-radius: 16px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.19);

  &:hover {
    opacity: 0.7;
  }
`;

const Section = styled.div`
  display: flex;
  background: ${({ theme }) => theme.color.background.card};
  align-items: center;
  height: 28px;
  margin-top: 8px;
  padding: 10px;
  border-radius: 10px;
  font-family: 'PTRootUIWebMedium', sans-serif;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.color.text.settingsModalSubHeader};
  font-size: 15px;
  margin: 6px 0px;
`;

const Label = styled.label`
  display: inline-block;
  padding: 0;
`;

const Body = styled.div`
  background-color: ${({ theme }) => theme.color.background.listItem};
  padding-right: 14px;
  overflow-y: auto;
  max-height: 230px;
  scrollbar-width: thin;
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: none;
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.background.settingMenuMain};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    opacity: 0.7;
  }

  ::-webkit-scrollbar-thumb:active {
    opacity: 0.7;
  }
`;

const DeployButton = styled.button`
  background: ${({ theme }) => theme.color.background.settingMenuMain};
  color: ${({ theme }) => theme.color.text.main};
  border: none;
  cursor: pointer;
  border-radius: 10px;
  height: 28px;
  width: 90px;
  margin-left: auto;
  font-size: 14px;

  &:hover {
    opacity: 0.7;
  }
`;

const SecondaryButton = styled.button`
  margin: 0 auto;
  padding-bottom: 8px;
  font-size: 16px;
  display: flex;
  color: ${({ theme }) => theme.color?.text?.card};
  background: ${({ theme }) => theme.color.background.switchInputInactiveTab};
  border: none;
  cursor: pointer;
`;

const AlertWrapper = styled.div`
  margin: 15px 0;
`;

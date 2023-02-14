import React, { useState } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { SessionStorage, WalletProviderLike } from 'etherspot';
import { merge } from 'lodash';
import { Web3AuthCore } from '@web3auth/core';
import Web3 from 'web3';

import {
  TransactionBuilderContextProvider,
  EtherspotContextProvider,
  TransactionBuilderModalContextProvider,
  TransactionsDispatcherContextProvider,
} from '../providers';

import { darkTheme, defaultTheme, Theme } from '../utils/theme';
import { IDefaultTransactionBlock, ITransactionBlockType } from '../types/transactionBlock';
import SignIn from '../components/SignIn/SignIn';
import { WagmiConfig, createClient, configureChains, mainnet } from 'wagmi';
import { infuraProvider } from 'wagmi/providers/infura';
import { publicProvider } from 'wagmi/providers/public';
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';

interface EtherspotProps {
  defaultTransactionBlocks?: IDefaultTransactionBlock[];
  hiddenTransactionBlockTypes?: ITransactionBlockType[];
  provider?: WalletProviderLike;
  chainId?: number;
  themeOverride?: Theme;
  hideAddTransactionButton?: boolean;
  etherspotSessionStorage?: SessionStorage;
  onLogout?: () => void;
  showMenuLogout?: boolean;
  smartWalletOnly?: boolean;
}

const { chains, provider, webSocketProvider } = configureChains(
  [mainnet],
  [infuraProvider({ apiKey: process.env.REACT_APP_INFURA_ID ?? '' }), publicProvider()]
);

const client = createClient({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'Etherspot Buidler',
      },
    }),
    new WalletConnectConnector({
      chains,
      options: {
        qrcode: true,
      },
    }),
  ],
  provider,
  webSocketProvider,
});

const ComponentWrapper = styled.div`
  padding: 15px 20px 30px;
  background: ${({ theme }) => theme.color.background.main};
  color: ${({ theme }) => theme.color.text.main};
  border-radius: 12px;
  width: 445px;
  text-align: center;
  position: relative;
  min-height: 400px;
  font-family: 'PTRootUIWebRegular', sans-serif;
  box-sizing: content-box;

  @media (max-width: 500px) {
    width: calc(100% - 40px);
  }

  img,
  svg {
    vertical-align: middle;
  }

  * {
    box-sizing: content-box;
  }
`;

const Etherspot = ({
  defaultTransactionBlocks,
  provider,
  chainId,
  hiddenTransactionBlockTypes,
  themeOverride,
  hideAddTransactionButton,
  etherspotSessionStorage,
  showMenuLogout,
  smartWalletOnly,
  onLogout,
}: EtherspotProps) => {
  const [connectedProvider, setConnectedProvider] = useState<WalletProviderLike | null | undefined>(provider);
  const [web3AuthInstance, setWeb3AuthInstance] = useState<Web3AuthCore | null>(null);
  const [wagmiLogout, setWagmiLogout] = useState<Function | null>();

  const logoutFunction = async () => {
    if (wagmiLogout) wagmiLogout();
    if (!web3AuthInstance) return;

    try {
      await web3AuthInstance.logout({ cleanup: true });
      web3AuthInstance.clearCache();
    } catch (e) {
      //
    }
    setConnectedProvider(null);
  };

  return (
    <WagmiConfig client={client}>
      <ThemeProvider theme={merge({}, darkTheme, themeOverride)}>
        {!connectedProvider && (
          <SignIn
            onWeb3ProviderSet={async (web3Provider, isWagmi) => {
              if (!web3Provider) {
                setConnectedProvider(null);
                return;
              }

              const web3 = new Web3(web3Provider as any);
              // @ts-ignore
              setConnectedProvider(isWagmi ? web3.currentProvider.provider : web3.currentProvider);
            }}
            onWeb3AuthInstanceSet={setWeb3AuthInstance}
            setWagmiLogout={(func) => {
              setWagmiLogout(() => func);
            }}
          />
        )}
        {!!connectedProvider && (
          <EtherspotContextProvider
            provider={connectedProvider}
            chainId={chainId}
            etherspotSessionStorage={etherspotSessionStorage}
            onLogout={onLogout ?? logoutFunction}
            smartWalletOnly={smartWalletOnly}
          >
            <style>
              @import url('https://public.etherspot.io/buidler/fonts/PT-Root-UI_Regular.css'); @import
              url('https://public.etherspot.io/buidler/fonts/PT-Root-UI_Medium.css'); @import
              url('https://public.etherspot.io/buidler/fonts/PT-Root-UI_Bold.css');
            </style>
            <ComponentWrapper>
              <TransactionBuilderModalContextProvider>
                <TransactionsDispatcherContextProvider>
                  <TransactionBuilderContextProvider
                    defaultTransactionBlocks={defaultTransactionBlocks}
                    hiddenTransactionBlockTypes={hiddenTransactionBlockTypes}
                    hideAddTransactionButton={hideAddTransactionButton}
                    showMenuLogout={showMenuLogout}
                  />
                </TransactionsDispatcherContextProvider>
              </TransactionBuilderModalContextProvider>
            </ComponentWrapper>
          </EtherspotContextProvider>
        )}
      </ThemeProvider>
    </WagmiConfig>
  );
};

export default Etherspot;

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
  const [connectedProvider, setConnectedProvider] = useState(null);
  const [useDashboardTheme, setUseDashboardTheme] = useState(false);
  const [web3AuthInstance, setWeb3AuthInstance] = useState<Web3AuthCore | null>(null);
  const [wagmiLogout, setWagmiLogout] = useState<Function | null>();
  return (
    <ThemeProvider theme={merge({}, darkTheme, themeOverride)}>
      {!provider && (
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
      {provider && (
        <EtherspotContextProvider
          provider={provider}
          chainId={chainId}
          etherspotSessionStorage={etherspotSessionStorage}
          onLogout={onLogout}
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
  );
};

export default Etherspot;

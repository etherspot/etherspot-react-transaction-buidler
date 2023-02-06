import React from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { SessionStorage, WalletProviderLike } from 'etherspot';
import { merge } from 'lodash';

import {
  TransactionBuilderContextProvider,
  EtherspotContextProvider,
  TransactionBuilderModalContextProvider,
  TransactionsDispatcherContextProvider,
} from '../providers';

import { darkTheme, defaultTheme, Theme } from '../utils/theme';
import { IDefaultTransactionBlock, ITransactionBlockType } from '../types/transactionBlock';

interface EtherspotProps {
  defaultTransactionBlocks?: IDefaultTransactionBlock[];
  hiddenTransactionBlockTypes?: ITransactionBlockType[];
  provider: WalletProviderLike;
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
}: EtherspotProps) => (
  <ThemeProvider theme={merge({}, darkTheme, themeOverride)}>
    <EtherspotContextProvider
      provider={provider}
      chainId={chainId}
      etherspotSessionStorage={etherspotSessionStorage}
      onLogout={onLogout}
      smartWalletOnly={smartWalletOnly}
    >
      <style>
        @import url('https://public.etherspot.io/buidler/fonts/PT-Root-UI_Regular.css');
        @import url('https://public.etherspot.io/buidler/fonts/PT-Root-UI_Medium.css');
        @import url('https://public.etherspot.io/buidler/fonts/PT-Root-UI_Bold.css');
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
  </ThemeProvider>
);

export default Etherspot;

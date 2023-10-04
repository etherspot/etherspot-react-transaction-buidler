import React, { createContext, useEffect, useState } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { SessionStorage, WalletProviderLike } from 'etherspot';
import { merge } from 'lodash';

import {
  TransactionBuilderContextProvider,
  EtherspotContextProvider,
  TransactionBuilderModalContextProvider,
  TransactionsDispatcherContextProvider,
} from '../providers';

import { darkTheme, getTheme, Theme, ThemeType } from '../utils/theme';
import { IDefaultTransactionBlock, ITransactionBlockType } from '../types/transactionBlock';
import { EtherspotTransactionKit } from '@etherspot/transaction-kit';
import { isEtherspotPrime } from '../utils/common';
import {
  EtherspotPrimeContextProvider,
  TransactionPrimeBuilderContextProvider,
  TransactionPrimeBuilderModalContextProvider,
  TransactionsPrimeDispatcherContextProvider,
} from '../etherspot-prime/providers';

const ETHERSPOT = 'etherspot';

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

  componentWidth?: number;
  removeOuterContainer?: boolean;
  removeTransactionBlockContainer?: boolean;
  hideWalletBlock?: boolean;
  hideWalletBlockNavigation?: boolean;
  hideTopNavigation?: boolean;
  hideWalletToggle?: boolean;
  hideBuyButton?: boolean;
  hideStatus?: boolean;
  hideSettingsButton?: boolean;
  hideAddButton?: boolean;
  hideCloseTransactionBlockButton?: boolean;
  hideTransactionBlockTitle?: boolean;
  hideWalletSwitch?: boolean;
  hideActionPreviewHeader?: boolean;
  etherspotMode?: string;
}

const ComponentWrapper = styled.div.attrs(
  (props: { removeOuterContainer?: boolean; componentWidth?: number }) => props
)`
  ${({ removeOuterContainer, theme }) =>
    !removeOuterContainer &&
    `
  padding: 15px 20px 30px;
  background: ${theme.color.background.main};
  color: ${theme.color.text.main};
  border-radius: 12px;
  `};

  width: ${({ componentWidth }) => `${componentWidth ?? '445'}px`};

  text-align: center;
  position: relative;
  min-height: 400px;
  font-family: 'PTRootUIWebRegular', sans-serif;
  box-sizing: content-box;

  @media (max-width: 500px) {
    width: calc(100% - 60px);
    min-width: 350px;
  }

  img,
  svg {
    vertical-align: middle;
  }

  * {
    box-sizing: content-box;
  }
`;

interface EtherspotWrapperContextData {
  data: {
    etherspotMode?: string;
  };
}

export const EtherspotWrapperContext = createContext<EtherspotWrapperContextData | null>(null);

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
  componentWidth,
  removeOuterContainer = false,
  removeTransactionBlockContainer = false,
  hideWalletBlock = false,
  hideWalletBlockNavigation = false,
  hideTopNavigation = false,
  hideWalletToggle = false,
  hideBuyButton = false,
  hideStatus = false,
  hideSettingsButton = false,
  hideAddButton = false,
  hideCloseTransactionBlockButton = false,
  hideTransactionBlockTitle = false,
  hideWalletSwitch = false,
  hideActionPreviewHeader = false,
  onLogout,
  etherspotMode = ETHERSPOT,
}: EtherspotProps) => {
  const ContextProvider = isEtherspotPrime(etherspotMode) ? EtherspotPrimeContextProvider : EtherspotContextProvider;
  const BuilderModalContextProvider = isEtherspotPrime(etherspotMode)
    ? TransactionPrimeBuilderModalContextProvider
    : TransactionBuilderModalContextProvider;
  const BuilderTransactionsDispatcherContextProvider = isEtherspotPrime(etherspotMode)
    ? TransactionsPrimeDispatcherContextProvider
    : TransactionsDispatcherContextProvider;
  const BuilderTransactionsContextProvider = isEtherspotPrime(etherspotMode)
    ? TransactionPrimeBuilderContextProvider
    : TransactionBuilderContextProvider;
  const [activeTheme, setActiveTheme] = useState(getTheme(ThemeType.DARK));
  const sessionStorage = !isEtherspotPrime(etherspotMode) ? etherspotSessionStorage : undefined;

  useEffect(() => {
    const currentTheme = localStorage.getItem('current-theme');
    if (!currentTheme) {
      localStorage.setItem('current-theme', ThemeType.DARK);
      return;
    }
    setActiveTheme(getTheme(currentTheme as ThemeType));
  }, []);

  return (
    <ThemeProvider theme={merge({}, activeTheme, themeOverride)}>
      <EtherspotTransactionKit provider={provider} chainId={chainId}>
        <EtherspotWrapperContext.Provider value={{ data: { etherspotMode } }}>
          <ContextProvider
            provider={provider}
            chainId={chainId}
            etherspotSessionStorage={sessionStorage}
            onLogout={onLogout}
            smartWalletOnly={smartWalletOnly}
            changeTheme={setActiveTheme}
            etherspotMode={etherspotMode}
          >
            <style>
              @import url('https://public.etherspot.io/buidler/fonts/PT-Root-UI_Regular.css'); @import
              url('https://public.etherspot.io/buidler/fonts/PT-Root-UI_Medium.css'); @import
              url('https://public.etherspot.io/buidler/fonts/PT-Root-UI_Bold.css'); @import
              url('https://unpkg.com/tippy.js@6.3.7/dist/tippy.css'); @import
              url('https://unpkg.com/tippy.js@6.3.7/dist/border.css');
            </style>
            <ComponentWrapper removeOuterContainer={removeOuterContainer} componentWidth={componentWidth}>
              <BuilderModalContextProvider>
                <BuilderTransactionsDispatcherContextProvider>
                  <BuilderTransactionsContextProvider
                    defaultTransactionBlocks={defaultTransactionBlocks}
                    hiddenTransactionBlockTypes={hiddenTransactionBlockTypes}
                    removeTransactionBlockContainer={removeTransactionBlockContainer}
                    hideAddTransactionButton={hideAddTransactionButton}
                    showMenuLogout={showMenuLogout}
                    hideWalletBlock={hideWalletBlock}
                    hideWalletBlockNavigation={hideWalletBlockNavigation}
                    hideTopNavigation={hideTopNavigation}
                    hideWalletToggle={hideWalletToggle}
                    hideBuyButton={hideBuyButton}
                    hideStatus={hideStatus}
                    hideSettingsButton={hideSettingsButton}
                    hideAddButton={hideAddButton}
                    hideCloseTransactionBlockButton={hideCloseTransactionBlockButton}
                    hideTransactionBlockTitle={hideTransactionBlockTitle}
                    hideWalletSwitch={hideWalletSwitch}
                    hideActionPreviewHeader={hideActionPreviewHeader}
                  />
                </BuilderTransactionsDispatcherContextProvider>
              </BuilderModalContextProvider>
            </ComponentWrapper>
          </ContextProvider>
        </EtherspotWrapperContext.Provider>
      </EtherspotTransactionKit>
    </ThemeProvider>
  );
};

export default Etherspot;

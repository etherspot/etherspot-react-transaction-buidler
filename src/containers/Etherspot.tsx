import React from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { WalletProviderLike } from 'etherspot';
import { merge } from 'lodash';

import {
  TransactionBuilderContextProvider,
  EtherspotContextProvider,
  TransactionBuilderModalContextProvider,
  TransactionsDispatcherContextProvider,
} from '../providers';

import { AvailableTransactionBlock } from '../providers/TransactionBuilderContextProvider';
import { defaultTheme, Theme } from '../utils/theme';

interface EtherspotProps {
  defaultTransactionBlocks?: AvailableTransactionBlock[];
  hiddenTransactionBlockTypes?: string[];
  provider: WalletProviderLike;
  chainId?: number;
  themeOverride?: Theme;
}

const ComponentWrapper = styled.div`
  padding: 15px 20px 30px;
  background: ${({ theme }) => theme.color.background.main};
  color: ${({ theme }) => theme.color.text.main};
  border-radius: 12px;
  width: 445px;
  text-align: center;
  position: relative;
  min-height: 200px;
  font-family: "PTRootUIWebRegular", sans-serif;
`;

const Etherspot = ({
  defaultTransactionBlocks,
  provider,
  chainId,
  hiddenTransactionBlockTypes,
  themeOverride,
}: EtherspotProps) => {
  console.log(merge({}, defaultTheme, themeOverride));
  return (
    <ThemeProvider theme={merge({}, defaultTheme, themeOverride)}>
      <EtherspotContextProvider provider={provider} chainId={chainId}>
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
              />
            </TransactionsDispatcherContextProvider>
          </TransactionBuilderModalContextProvider>
        </ComponentWrapper>
      </EtherspotContextProvider>
    </ThemeProvider>
  );
}

export default Etherspot;

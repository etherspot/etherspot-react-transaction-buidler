import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { WalletProviderLike } from 'etherspot';

import {
  TransactionBuilderContextProvider,
  EtherspotContextProvider,
  TransactionBuilderModalContextProvider,
  TransactionsDispatcherContextProvider,
} from '../providers';

import { TransactionBlock } from '../providers/TransactionBuilderContextProvider';

interface EtherspotProps {
  defaultTransactionBlocks?: TransactionBlock[];
  provider: WalletProviderLike;
  chainId?: number;
}

const ComponentWrapper = styled.div`
  padding: 15px;
  background: linear-gradient(90deg, #f43b40, #f76e30);
  border-radius: 15px;
  width: 400px;
  text-align: center;
  position: relative;
  min-height: 200px;
`;

const ComponentStyle = createGlobalStyle`
  ${ComponentWrapper} {
    font-family: "Lato", sans-serif;
    font-weight: 400;
  }
`;

const Etherspot = ({ defaultTransactionBlocks, provider, chainId }: EtherspotProps) => (
  <EtherspotContextProvider provider={provider} chainId={chainId}>
    <ComponentStyle />
    <ComponentWrapper>
      <TransactionBuilderModalContextProvider>
        <TransactionsDispatcherContextProvider>
          <TransactionBuilderContextProvider defaultTransactionBlocks={defaultTransactionBlocks} />
        </TransactionsDispatcherContextProvider>
      </TransactionBuilderModalContextProvider>
    </ComponentWrapper>
  </EtherspotContextProvider>
);

export default Etherspot;

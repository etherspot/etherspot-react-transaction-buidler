import React from 'react';
import styled from 'styled-components';
import { WalletProviderLike } from 'etherspot';

import {
  TransactionBuilderContextProvider,
  EtherspotContextProvider,
  TransactionBuilderModalContextProvider,
  TransactionsDispatcherContextProvider,
} from '../providers';

import { AvailableTransactionBlock } from '../providers/TransactionBuilderContextProvider';

interface EtherspotProps {
  defaultTransactionBlocks?: AvailableTransactionBlock[];
  hiddenTransactionBlockTypes?: string[];
  provider: WalletProviderLike;
  chainId?: number;
}

const ComponentWrapper = styled.div`
  padding: 15px 20px 30px;
  background: linear-gradient(to right, #f43b40, #f8793f);
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
}: EtherspotProps) => (
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
);

export default Etherspot;

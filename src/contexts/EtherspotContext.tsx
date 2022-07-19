import React, { createContext } from 'react';
import { Sdk as EtherspotSdk } from 'etherspot/dist/sdk/sdk';

export interface EtherspotContextData {
  initialized: boolean;
  data: {
    account: string | null;
    connect: () => void;
    isConnecting: boolean;
    sdk: EtherspotSdk | null;
  }
}

const EtherspotContext = createContext<EtherspotContextData>({
  initialized: false,
  data: {
    account: null,
    connect: () => null,
    isConnecting: false,
    sdk: null,
  }
});

export default EtherspotContext;

import React from 'react';
import { Etherspot } from './containers';
import { EtherspotPrime } from './etherspot-prime/containers';

import { Theme } from './utils/theme';

import { IDefaultTransactionBlock, ITransactionBlockType } from './types/transactionBlock';
import { EtherspotTransactionKit } from '@etherspot/transaction-kit';
import { EtherspotPrimeProps } from './etherspot-prime/containers/Etherspot';
import { WalletProviderLike } from 'etherspot';

const ETHERSPOT = 'etherspot';
const ETHERSPOT_PRIME = 'etherspot-prime';

interface EtherspotContainerProps {
  defaultTransactionBlocks?: IDefaultTransactionBlock[];
  hiddenTransactionBlockTypes?: ITransactionBlockType[];
  chainId?: number;
  provider: WalletProviderLike;
  themeOverride?: Theme;
  hideAddTransactionButton?: boolean;
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

const EtherspotPrimeWithTransactionKit = (props: EtherspotPrimeProps) => {
  const { provider, chainId } = props;
  return (
    <EtherspotTransactionKit provider={provider} chainId={chainId}>
      <EtherspotPrime {...props} />
    </EtherspotTransactionKit>
  );
};

const EtherspotContainer = ({
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
  etherspotMode = ETHERSPOT,
  ...restProps
}: EtherspotContainerProps) => {
  const Component = etherspotMode === ETHERSPOT_PRIME ? EtherspotPrimeWithTransactionKit : Etherspot;

  return (
    <Component
      removeOuterContainer={removeOuterContainer}
      removeTransactionBlockContainer={removeTransactionBlockContainer}
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
      {...restProps}
    />
  );
};

export default EtherspotContainer;

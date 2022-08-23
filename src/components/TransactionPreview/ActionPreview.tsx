import React from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';

import { CrossChainActionPreview } from '../../utils/transaction';
import { TRANSACTION_BLOCK_TYPE } from '../../constants/transactionBuilderConstants';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';
import {
  formatAmountDisplay,
  humanizeHexString,
} from '../../utils/common';
import { DispatchedCrossChainActionTransaction } from '../../providers/TransactionsDispatcherContextProvider';
import { DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS } from '../../constants/transactionDispatcherConstants';
import { CopyButton } from '../Button';

const TransactionActionsWrapper = styled.div<{ noBottomBorder?: boolean }>`
  padding-bottom: 15px;
  margin-bottom: 15px;
  ${({ noBottomBorder }) => !noBottomBorder && 'border-bottom: 1px solid #000;'}
  text-align: left;
`;

const TransactionAction = styled.p`
  margin-bottom: 5px;
  font-size: 14px;
  word-break: break-all;
`;

interface TransactionPreviewInterface {
  data: CrossChainActionPreview;
  type: string;
  transactions?: DispatchedCrossChainActionTransaction[];
  noBottomBorder?: boolean;
}

const ActionPreview = ({
  data,
  type,
  transactions,
  noBottomBorder,
}: TransactionPreviewInterface) => {
  const allStatuses: string[] = transactions?.reduce((statuses: string[], transaction) => {
    if (statuses.includes(transaction.status)) return statuses;
    return statuses.concat(transaction.status);
  }, []) ?? [];

  let actionStatus = allStatuses?.length && DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.UNSENT;
  if (allStatuses.includes(DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.FAILED)) {
    actionStatus = DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.FAILED
  } else if (allStatuses.includes(DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING)) {
    actionStatus = DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.PENDING;
  } else if (allStatuses.includes(DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.CONFIRMED)) {
    actionStatus = DISPATCHED_CROSS_CHAIN_ACTION_TRANSACTION_STATUS.CONFIRMED;
  }

  if (type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE) {
    // @ts-ignore
    // TODO: fix type
    const { fromAsset, toAsset, fromChainId, toChainId } = data;

    const fromChainTitle = CHAIN_ID_TO_NETWORK_NAME[fromChainId].toUpperCase();
    const toChainTitle = CHAIN_ID_TO_NETWORK_NAME[toChainId].toUpperCase();

    const fromAmount = formatAmountDisplay(ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals));
    const toAmount = formatAmountDisplay(ethers.utils.formatUnits(toAsset.amount, toAsset.decimals));

    return (
      <TransactionActionsWrapper noBottomBorder={noBottomBorder}>
        <TransactionAction>
          To send:
          &nbsp;<strong>{fromAmount} ${fromAsset.symbol}</strong>
          &nbsp;on <strong>{fromChainTitle}</strong>
        </TransactionAction>
        <TransactionAction>
          To receive:
          &nbsp;<strong>{toAmount} ${toAsset.symbol}</strong>
          &nbsp;on <strong>{toChainTitle}</strong>
        </TransactionAction>
        {!!actionStatus && (
          <TransactionAction>
            Status:
            &nbsp;<strong>{actionStatus}</strong>
          </TransactionAction>
        )}
      </TransactionActionsWrapper>
    );
  }

  if (type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) {
    // @ts-ignore
    // TODO: fix type
    const { asset, chainId, receiverAddress } = data;

    const chainTitle = CHAIN_ID_TO_NETWORK_NAME[chainId].toUpperCase();

    const amount = formatAmountDisplay(ethers.utils.formatUnits(asset.amount, asset.decimals));

    return (
      <TransactionActionsWrapper noBottomBorder={noBottomBorder}>
        <TransactionAction>
          To send:
          &nbsp;<strong>{amount} ${asset.symbol}</strong>
          &nbsp;on <strong>{chainTitle}</strong>
        </TransactionAction>
        <TransactionAction>
          Receiver address:
          &nbsp;<strong>{humanizeHexString(receiverAddress)}<CopyButton valueToCopy={receiverAddress} left={5} top={1} /></strong>
        </TransactionAction>
        {!!actionStatus && (
          <TransactionAction>
            Status:
            &nbsp;<strong>{actionStatus}</strong>
          </TransactionAction>
        )}
      </TransactionActionsWrapper>
    );
  }

  if (type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP) {
    // @ts-ignore
    // TODO: fix type
    const { fromAsset, toAsset, chainId, providerName } = data;

    const chainTitle = CHAIN_ID_TO_NETWORK_NAME[chainId].toUpperCase();

    const fromAmount = formatAmountDisplay(ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals));
    const toAmount = formatAmountDisplay(ethers.utils.formatUnits(toAsset.amount, toAsset.decimals));

    return (
      <TransactionActionsWrapper noBottomBorder={noBottomBorder}>
        <TransactionAction>
          To send:
          &nbsp;<strong>{fromAmount} ${fromAsset.symbol}</strong>
        </TransactionAction>
        <TransactionAction>
          To receive:
          &nbsp;<strong>{toAmount} ${toAsset.symbol}</strong>
        </TransactionAction>
        <TransactionAction>
          Network:
          &nbsp;<strong>{chainTitle}</strong>
        </TransactionAction>
        <TransactionAction>
          Provider:
          &nbsp;<strong>{providerName}</strong>
        </TransactionAction>
        {!!actionStatus && (
          <TransactionAction>
            Status:
            &nbsp;<strong>{actionStatus}</strong>
          </TransactionAction>
        )}
      </TransactionActionsWrapper>
    );
  }

  return null;
};

export default ActionPreview;

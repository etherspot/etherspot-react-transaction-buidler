import React, {
} from 'react';
import styled from 'styled-components';

import { DraftTransactionPreview } from '../../utils/transaction';
import { TRANSACTION_BLOCK_TYPE } from '../../constants/transactionBuilderConstants';
import { CHAIN_ID_TO_NETWORK_NAME } from 'etherspot/dist/sdk/network/constants';
import { formatAmountDisplay } from '../../utils/common';
import { ethers } from 'ethers';

const TransactionActionsWrapper = styled.div`
  padding-bottom: 15px;
  margin-bottom: 15px;
  border-bottom: 1px solid #000;
`;

const TransactionAction = styled.p`
  margin-bottom: 5px;
  font-size: 14px;
`;

const TransactionPreview = ({ data, type }: { data: DraftTransactionPreview , type: string}) => {
  if (type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE_TRANSACTION) {
    const { fromAsset, toAsset, fromChainId, toChainId } = data;

    const fromChainTitle = CHAIN_ID_TO_NETWORK_NAME[fromChainId].toUpperCase();
    const toChainTitle = CHAIN_ID_TO_NETWORK_NAME[toChainId].toUpperCase();

    const fromAmount = formatAmountDisplay(ethers.utils.formatUnits(fromAsset.amount, fromAsset.decimals));
    const toAmount = formatAmountDisplay(ethers.utils.formatUnits(toAsset.amount, toAsset.decimals));

    return (
      <TransactionActionsWrapper>
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
      </TransactionActionsWrapper>
    );
  }

  return null;
};

export default TransactionPreview;

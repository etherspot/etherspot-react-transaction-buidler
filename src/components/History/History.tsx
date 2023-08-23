import React, { useEffect, useState } from 'react';

import { getItem, setItem } from '../../services/storage';
import { STORED_GROUPED_CROSS_CHAIN_ACTIONS } from '../../constants/storageConstants';
import ActionPreview from '../TransactionPreview/ActionPreview';
import { ICrossChainAction, ICrossChainActionTransaction } from '../../types/crossChainAction';

// Hooks
import { useEtherspot } from '../../hooks';

//utils
import { fetchTransactionsData } from '../../utils/transaction';
import { CHAIN_ID } from '../../utils/chain';

//constants
import { TRANSACTION_BLOCK_TYPE } from '../../constants/transactionBuilderConstants';
import { CROSS_CHAIN_ACTION_STATUS } from '../../constants/transactionDispatcherConstants';

import { uniqueId } from 'lodash';

const History = () => {
  const [storedGroupedCrossChainActions, setStoredGroupedCrossChainActions] = useState<{
    [id: string]: ICrossChainAction[];
  }>({});
  const { getSdkForChainId, accountAddress, sdk } = useEtherspot();

  const getLatest = () => {
    try {
      let storedGroupedCrossChainActionsUpdated;
      let storedGroupedCrossChainActionsRaw = getItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS);
      if (storedGroupedCrossChainActionsRaw) {
        storedGroupedCrossChainActionsUpdated = storedGroupedCrossChainActionsRaw
          ? JSON.parse(storedGroupedCrossChainActionsRaw)
          : {};
        setStoredGroupedCrossChainActions(storedGroupedCrossChainActionsUpdated);
      } else {
      }
    } catch (e) {
      //
    }
  };
  const getTransactionsData = async () => {
    const sdk = getSdkForChainId(CHAIN_ID.POLYGON);
    try {
      if (!sdk) return;

      let results = await fetchTransactionsData(sdk, accountAddress);

      if (results?.items?.length) {
        results?.items.map((item) => {
          const chainId = 137;
          const receiverAddress = item.to;
          const fromAddress = item.asset.from;
          const isFromEtherspotWallet = false;
          const assetUsdPrice = 1;
          const createTimestamp = +new Date();
          const crossChainActionId = uniqueId(`${createTimestamp}-`);
          const transactionId = uniqueId(`${createTimestamp}-`);

          let preview = {
            chainId,
            receiverAddress,
            fromAddress,
            isFromEtherspotWallet,
            asset: {
              address: item.asset.from,
              decimals: item.asset.decimal,
              symbol: item.asset.symbol,
              amount: '1',
              iconUrl: 'https://polygonscan.com/token/images/klimadao_32.png',
              usdPrice: assetUsdPrice,
            },
          };

          let transferTransaction: ICrossChainActionTransaction = {
            to: receiverAddress,
            value: '1',
            createTimestamp,
            status: CROSS_CHAIN_ACTION_STATUS.CONFIRMED,
          };

          let crossChainAction: ICrossChainAction[] = [
            {
              id: crossChainActionId,
              relatedTransactionBlockId: transactionId,
              chainId: chainId,
              type: TRANSACTION_BLOCK_TYPE.SEND_ASSET,
              preview,
              transactions: [transferTransaction],
              isEstimating: false,
              estimated: null,
              useWeb3Provider: !isFromEtherspotWallet,
            },
          ];

          storedGroupedCrossChainActions[crossChainActionId] = [...crossChainAction];

          const storedGroupedCrossChainActionsUpdated = storedGroupedCrossChainActions;

          setItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS, JSON.stringify(storedGroupedCrossChainActionsUpdated));
        });
      } else {
        return { errorMessage: 'No Transactions Found' };
      }
    } catch (e) {
      return { errorMessage: 'Failed to build Transactions' };
    }
  };

  useEffect(() => {
    getTransactionsData();
    getLatest();

    let intervalId = setInterval(getLatest, 3000);
    return () => {
      if (!intervalId) return;
      clearInterval(intervalId);
    };
  }, []);

  // newest to oldest
  const storedGroupedCrossChainActionsIds = Object.keys(storedGroupedCrossChainActions).sort().reverse();

  return (
    <>
      {!storedGroupedCrossChainActionsIds?.length && <p>No history.</p>}
      {storedGroupedCrossChainActionsIds.map((id) =>
        storedGroupedCrossChainActions[id]
          .sort()
          .reverse()
          .map((crossChainAction) => (
            <ActionPreview key={`action-preview-${id}-${crossChainAction.id}`} crossChainAction={crossChainAction} />
          ))
      )}
    </>
  );
};

export default History;

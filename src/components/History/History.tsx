import React, {
  useEffect,
  useState,
} from 'react';

import {
  getItem,
} from '../../services/storage';
import { STORED_GROUPED_CROSS_CHAIN_ACTIONS } from '../../constants/storageConstants';
import ActionPreview from '../TransactionPreview/ActionPreview';
import { CrossChainAction } from '../../utils/transaction';

const History = () => {
  const [storedGroupedCrossChainActions, setStoredGroupedCrossChainActions] = useState<{ [id: string]: CrossChainAction[] }>({})

  const getLatest = () => {
    try {
      const storedGroupedCrossChainActionsRaw = getItem(STORED_GROUPED_CROSS_CHAIN_ACTIONS);
      const storedGroupedCrossChainActionsUpdated = storedGroupedCrossChainActionsRaw
        ? JSON.parse(storedGroupedCrossChainActionsRaw)
        : {};
      setStoredGroupedCrossChainActions(storedGroupedCrossChainActionsUpdated);
    } catch (e) {
      //
    }
  };

  useEffect(() => {
    getLatest();
    let intervalId = setInterval(getLatest, 3000);
    return () => {
      if (!intervalId) return;
      clearInterval(intervalId);
    };
  }, []);

  // newest to oldest
  const storedGroupedCrossChainActionsIds = Object.keys(storedGroupedCrossChainActions)
    .sort()
    .reverse();

  return (
    <>
      {!storedGroupedCrossChainActionsIds?.length && (
        <p>No history.</p>
      )}
      {storedGroupedCrossChainActionsIds.map((id) => (
        storedGroupedCrossChainActions[id]
          .sort()
          .reverse()
          .map((crossChainAction) => (
            <ActionPreview
              key={`action-preview-${id}-${crossChainAction.id}`}
              crossChainAction={crossChainAction}
            />
          ))
      ))}
    </>
  )
};

export default History;

import React from 'react';
import { ErrorMessages } from '../../utils/validation';
import { TRANSACTION_BLOCK_TYPE } from '../../constants/transactionBuilderConstants';
import SendAssetTransactionBlock from './SendAssetTransactionBlock';
import AssetBridgeTransactionBlock from './AssetBridgeTransactionBlock';
import AssetSwapTransactionBlock from './AssetSwapTransactionBlock';
import KlimaStakingTransactionBlock from './KlimaStakingTransactionBlock';

const TransactionBlock = (props: {
  id: string;
  errorMessages?: ErrorMessages;
  type: string;
}) => {
  if (props.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) return <SendAssetTransactionBlock {...props} />;
  if (props.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE) return <AssetBridgeTransactionBlock {...props} />;
  if (props.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP) return <AssetSwapTransactionBlock {...props} />;
  if (props.type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE) return <KlimaStakingTransactionBlock {...props} />;
  return null;
};

export default TransactionBlock;

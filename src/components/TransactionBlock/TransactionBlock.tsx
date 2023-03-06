import React from 'react';

import { TRANSACTION_BLOCK_TYPE } from '../../constants/transactionBuilderConstants';
import SendAssetTransactionBlock from './SendAssetTransactionBlock';
import AssetBridgeTransactionBlock from './AssetBridgeTransactionBlock';
import AssetSwapTransactionBlock from './AssetSwapTransactionBlock';
import KlimaStakingTransactionBlock from './KlimaStakingTransactionBlock';
import PlrDaoStakingTransactionBlock from './PlrDaoStakingTransactionBlock';
import PlrStakingV2TransactionBlock from './PlrStakingV2TransactionBlock';
import { ITransactionBlock } from '../../types/transactionBlock';

const TransactionBlock = (props: ITransactionBlock) => {
  if (props.type === TRANSACTION_BLOCK_TYPE.SEND_ASSET) return <SendAssetTransactionBlock {...props} />;
  if (props.type === TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE) return <AssetBridgeTransactionBlock {...props} />;
  if (props.type === TRANSACTION_BLOCK_TYPE.ASSET_SWAP) return <AssetSwapTransactionBlock {...props} />;
  if (props.type === TRANSACTION_BLOCK_TYPE.KLIMA_STAKE) return <KlimaStakingTransactionBlock {...props} />;
  if (props.type === TRANSACTION_BLOCK_TYPE.PLR_DAO_STAKE) return <PlrDaoStakingTransactionBlock {...props} />;
  if (props.type === TRANSACTION_BLOCK_TYPE.PLR_STAKING_V2) return <PlrStakingV2TransactionBlock {...props} />;
  return null;
};

export default TransactionBlock;

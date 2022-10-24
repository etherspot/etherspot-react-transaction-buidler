import React, { useEffect } from "react";
import {
  Etherspot,
  TRANSACTION_BLOCK_TYPE,
} from "@etherspot/react-transaction-buidler";

interface SingleSwapProps {
  connectedProvider: any;
  chainId: number;
}

const SingleSwap = ({ connectedProvider, chainId }: SingleSwapProps) => {
  useEffect(() => {
    if (!connectedProvider) {
      window.location.href = "/";
    }
  }, []);
  return (
    <div>
      <Etherspot
        defaultTransactionBlocks={[{ type: TRANSACTION_BLOCK_TYPE.ASSET_SWAP }]}
        provider={connectedProvider}
        chainId={chainId}
      />
    </div>
  );
};

export default SingleSwap;

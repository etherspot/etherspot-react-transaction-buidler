import React, { useEffect } from "react";
import {
  Etherspot,
  TRANSACTION_BLOCK_TYPE,
} from "@etherspot/react-transaction-buidler";

interface CrossSwapProps {
  connectedProvider: any;
  chainId: number;
}

const CrossSwap = ({ connectedProvider, chainId }: CrossSwapProps) => {
  useEffect(() => {
    if (!connectedProvider) {
      window.location.href = "/";
    }
  }, []);
  return (
    <div>
      <Etherspot
        defaultTransactionBlocks={[
          { type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE },
        ]}
        provider={connectedProvider}
        chainId={chainId}
      />
    </div>
  );
};

export default CrossSwap;

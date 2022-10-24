import React, { useEffect } from "react";
import {
  Etherspot,
  TRANSACTION_BLOCK_TYPE,
} from "@etherspot/react-transaction-buidler";

interface SendProps {
  connectedProvider: any;
  chainId: number;
}

const Send = ({ connectedProvider, chainId }: SendProps) => {
  useEffect(() => {
    if (!connectedProvider) {
      window.location.href = "/";
    }
  }, []);
  return (
    <div>
      <Etherspot
        defaultTransactionBlocks={[{ type: TRANSACTION_BLOCK_TYPE.SEND_ASSET }]}
        provider={connectedProvider}
        chainId={chainId}
      />
    </div>
  );
};

export default Send;

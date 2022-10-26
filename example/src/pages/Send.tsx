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
  /**
   * This is the Send page
   *
   * @important  this page demontrates the send functionality implemented through the Builder Component
   *
   * @note The Etherspot component requires at least 3 parameters
   *
   * @param {array} defaultTransactionBlocks this parameter takes and array of object that requres type as must the type can be of -
   *
   * 1. @param {String} SEND_ASSET We're demonstrating the send functionality here
   * 2. @param {String} ASSET_SWAP
   * 3. @param {String} ASSET_BRIDGE
   *
   * @param {provider} provider - this parameter requires the connection provider
   *
   * @param {number} chainId - this parameter requires the chain ID
   *
   */
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

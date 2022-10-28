import React, { useEffect } from "react";
import {
  Etherspot,
  TRANSACTION_BLOCK_TYPE,
} from "@etherspot/react-transaction-buidler";

interface HiddenAddTransactionProps {
  connectedProvider: any;
  chainId: number;
}

const HiddenAddTransaction = ({
  connectedProvider,
  chainId,
}: HiddenAddTransactionProps) => {
  /**
   * This is the Signle chain Swap page With the hidden add transaction functionality
   *
   * @important  this page demontrates the single chain swap functionality implemented through the Builder Component
   *
   * @note The Etherspot component requires at least 3 parameters
   *
   * @param {array} defaultTransactionBlocks this parameter takes and array of object that requres type as must the type can be of -
   *
   * 1. @param {String} SEND_ASSET
   * 2. @param {String} ASSET_SWAP We're demonstrating the send functionality here
   * 3. @param {String} ASSET_BRIDGE
   *
   * @param {provider} provider - this parameter requires the connection provider
   *
   * @param {number} chainId - this parameter requires the chain ID
   * 
   * @param {boolean} hideAddTransactionButton - this parameter requires a boolean implying whether the add transaction button should be there or not
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
        defaultTransactionBlocks={[{ type: TRANSACTION_BLOCK_TYPE.ASSET_SWAP }]}
        provider={connectedProvider}
        chainId={chainId}
        hideAddTransactionButton={true}
      />
    </div>
  );
};

export default HiddenAddTransaction;

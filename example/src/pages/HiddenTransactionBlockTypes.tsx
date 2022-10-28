import React, { useEffect } from "react";
import {
  Etherspot,
  TRANSACTION_BLOCK_TYPE,
} from "@etherspot/react-transaction-buidler";

interface HiddenTransactionBlockTypesProps {
  connectedProvider: any;
  chainId: number;
}

const HiddenTransactionBlockTypes = ({
  connectedProvider,
  chainId,
}: HiddenTransactionBlockTypesProps) => {
  /**
   * This is the Signle chain Swap page With the hidden transaction block types
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
   * @param {Array<TRANSACTION_BLOCK_TYPE>} hiddenTransactionBlockTypes - this parameter requires a list of TRANSACTION_BLOCK_TYPE
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
        hiddenTransactionBlockTypes={[TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE]}
      />
    </div>
  );
};

export default HiddenTransactionBlockTypes;

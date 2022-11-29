import React, { useEffect } from "react";
import {
  Etherspot,
  TRANSACTION_BLOCK_TYPE,
} from "@etherspot/react-transaction-buidler";

interface KlimaStakeProps {
  connectedProvider: any;
  chainId: number;
}

const KlimaStake = ({ connectedProvider, chainId }: KlimaStakeProps) => {
  /**
   * This is the klima page
   *
   * @important  this page demontrates the cross chain swap functionality implemented through the Builder Component
   *
   * @note The Etherspot component requires at least 3 parameters
   *
   * @param {array} defaultTransactionBlocks this parameter takes and array of object that requres type as must the type can be of -
   *
   * 1. @param {String} SEND_ASSET
   * 2. @param {String} ASSET_SWAP
   * 3. @param {String} ASSET_BRIDGE 
   * 4. @param {String} KLIMA_STAKE We're demonstrating the send functionality here
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
        defaultTransactionBlocks={[
          { type: TRANSACTION_BLOCK_TYPE.KLIMA_STAKE },
        ]}
        provider={connectedProvider}
        chainId={chainId}
      />
    </div>
  );
};

export default KlimaStake;

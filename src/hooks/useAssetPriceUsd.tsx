import React, { useEffect, useMemo, useState } from 'react';

// services
import { getAssetPriceInUsd } from '../services/coingecko';

const useAssetPriceUsd = (
  chainId?: number,
  assetAddress?: string,
): number | null => {
  const [assetPriceUsd, setAssetPriceUsd] = useState<number | null>(null);

  useEffect(() => {
    let shouldUpdate = true;

    (async () => {
      setAssetPriceUsd(null);
      if (!assetAddress || !chainId) return;

      const priceUsd = await getAssetPriceInUsd(chainId, assetAddress);
      if (!shouldUpdate || !priceUsd) return;

      setAssetPriceUsd(priceUsd);
    })();

    return () => { shouldUpdate = false };
  }, [chainId, assetAddress]);

  return useMemo(() => assetPriceUsd, [assetPriceUsd]);
}

export default useAssetPriceUsd;

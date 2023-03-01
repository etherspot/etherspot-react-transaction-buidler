import React, { useEffect, useMemo, useState } from 'react';

// services
import { getAssetPriceInUsd } from '../services/coingecko';

// hooks
import useEtherspot from './useEtherspot';

const useAssetPriceUsd = (
  chainId?: number,
  assetAddress?: string,
): number | null => {
  const { sdk } = useEtherspot();
  const [assetPriceUsd, setAssetPriceUsd] = useState<number | null>(null);

  useEffect(() => {
    let shouldUpdate = true;

    (async () => {
      setAssetPriceUsd(null);
      if (!assetAddress || !chainId) return;

      const priceUsd = await getAssetPriceInUsd(chainId, assetAddress, sdk);
      if (!shouldUpdate || !priceUsd) return;

      setAssetPriceUsd(priceUsd);
    })();

    return () => { shouldUpdate = false };
  }, [chainId, assetAddress, sdk]);

  return useMemo(() => assetPriceUsd, [assetPriceUsd]);
}

export default useAssetPriceUsd;

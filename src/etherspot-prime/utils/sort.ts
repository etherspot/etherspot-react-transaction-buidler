import { IAssetWithBalance } from '../providers/EtherspotContextProvider';

export const sortAssetsByValue = (a: IAssetWithBalance, b: IAssetWithBalance) => {
  if (a.balanceWorthUsd && !b.balanceWorthUsd) return -1;
  else if (!a.balanceWorthUsd && b.balanceWorthUsd) return 1;
  else if (!a.balanceWorthUsd || !b.balanceWorthUsd) return 0;

  return b.balanceWorthUsd - a.balanceWorthUsd;
};

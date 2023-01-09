import { uniqueId } from 'lodash';
import {
  BigNumber,
  ethers,
} from 'ethers';
import { IAssetWithBalance } from '../providers/EtherspotContextProvider';

export const formatAssetAmountInput = (
  amount: string,
  decimals: number = 18,
): string => {
  const formattedAmount = amount
    .replace(/[^.\d]/g, '')
    .replace(/^(\d*\.?)|(\d*)\.?/g, "$1$2")
    .replace(/^\./, '0.');

  if (decimals === 0) return formattedAmount.split('.')[0];

  if (!formattedAmount.includes('.')) return formattedAmount;

  const [integer, fraction] = formattedAmount.split('.');

  if (!fraction) return `${integer}.`;

  const fixedFraction = fraction.slice(0, decimals);

  return `${integer}.${fixedFraction}`;
};

export const formatAmountDisplay = (amountRaw: string | number, leftSymbol?: string): string => {
  const amount = typeof amountRaw === 'number' ? `${amountRaw}` : amountRaw;

  // check string to avoid underflow
  if ((amount !== '0.01' && amount.startsWith('0.01')) || amount.startsWith('0.00')) {
    const [,fraction] = amount.split('.');
    let smallAmount = `~${leftSymbol ?? ''}0.`;

    [...fraction].every((digitString) => {
      if (digitString === '0') {
        smallAmount = `${smallAmount}0`;
        return true;
      }
      smallAmount = `${smallAmount}${digitString}`;
      return false;
    });

    return smallAmount;
  }

  return `${leftSymbol ?? ''}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(+amount)}`;
};

export const humanizeHexString = (
  hexString: string,
  startCharsCount: number = 5,
  endCharsCount: number = 4,
  separator: string = '...',
) => {
  const totalTruncatedSum = startCharsCount + endCharsCount + separator.length;

  const words = hexString.toString().split(' ');
  const firstWord = words[0];

  if (words.length === 1) {
    if (firstWord.length <= totalTruncatedSum) return firstWord;
    return `${firstWord.slice(0, startCharsCount)}${separator}${firstWord.slice(-endCharsCount)}`;
  }

  return hexString;
};


export const getTimeBasedUniqueId = (): string => uniqueId(`${+new Date()}-`);

export const formatMaxAmount = (maxAmountBN: BigNumber, decimals: number): string => ethers.utils.formatUnits(maxAmountBN, decimals);

export const sumAssetsBalanceWorth = (supportedAssets: IAssetWithBalance[]) => {
  return supportedAssets.reduce((sum, asset) => {
    if (asset.balanceWorthUsd) {
      return sum + asset.balanceWorthUsd;
    }
    return sum;
  }, 0);
};

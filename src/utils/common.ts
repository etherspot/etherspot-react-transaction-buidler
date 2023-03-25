import { uniqueId } from 'lodash';
import { BigNumber, ethers } from 'ethers';
import { IAssetWithBalance } from '../providers/EtherspotContextProvider';

export const formatAssetAmountInput = (amount: string, decimals: number = 18): string => {
  const formattedAmount = amount
    .replace(/[^.\d]/g, '')
    .replace(/^(\d*\.?)|(\d*)\.?/g, '$1$2')
    .replace(/^\./, '0.');

  if (decimals === 0) return formattedAmount.split('.')[0];

  if (!formattedAmount.includes('.')) return formattedAmount;

  const [integer, fraction] = formattedAmount.split('.');

  if (!fraction) return `${integer}.`;

  const fixedFraction = fraction.slice(0, decimals);

  return `${integer}.${fixedFraction}`;
};

export const formatAmountDisplay = (
  amountRaw: string | number,
  leftSymbol?: string,
  minimumFractionDigits?: number
): string => {
  const amount = typeof amountRaw === 'number' ? `${amountRaw}` : amountRaw;

  // check string to avoid underflow
  if ((amount !== '0.01' && amount.startsWith('0.01')) || amount.startsWith('0.00')) {
    const [, fraction] = amount.split('.');
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

  return `${leftSymbol ?? ''}${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits,
  }).format(+amount)}`;
};

export const humanizeHexString = (
  hexString: string,
  startCharsCount: number = 5,
  endCharsCount: number = 4,
  separator: string = '...'
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

export const formatMaxAmount = (maxAmountBN: BigNumber, decimals: number): string =>
  ethers.utils.formatUnits(maxAmountBN, decimals);

export const sumAssetsBalanceWorth = (supportedAssets: IAssetWithBalance[]) => {
  return supportedAssets.reduce((sum: number, asset: IAssetWithBalance) => {
    if (asset.balanceWorthUsd) {
      return sum + asset.balanceWorthUsd;
    }
    return sum;
  }, 0);
};

export const buildUrlOptions = (options: { [key: string]: string }): string => {
  let optionStr = '';
  Object.keys(options).map((key: string) => {
    let value = options[key];
    optionStr += `${!optionStr ? '?' : '&'}${key}=${encodeURIComponent(value)}`;
  });
  return optionStr;
};

export const getOfferItemIndexByBestOffer = (gasUsd: (number | undefined)[], recieveAmount: number[]) => {
  let index = 0;
  let minAmount = gasUsd[0] ? recieveAmount[0] - gasUsd[0] : 100000;

  for (let i = 1; i < gasUsd.length; i++) {
    let gasAmount = gasUsd[i];
    if (gasAmount) {
      index = recieveAmount[i] - gasAmount > minAmount ? i : index;
    }
  }
  return index;
};

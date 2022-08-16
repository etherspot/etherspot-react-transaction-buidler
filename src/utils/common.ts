import { uniqueId } from 'lodash';

export const formatAssetAmountInput = (
  amount: string,
  decimals: number = 18,
): string => {
  const formattedAmount = amount
    .replace(/[^.\d]/g, '')
    .replace(/^(\d*\.?)|(\d*)\.?/g, "$1$2")

  if (decimals === 0) return formattedAmount.split('.')[0];

  if (!formattedAmount.includes('.')) return formattedAmount;

  const [integer, fraction] = formattedAmount.split('.');

  if (!fraction) return `${integer}.`;

  const fixedFraction = fraction.slice(0, decimals);

  return `${integer}.${fixedFraction}`;
};

export const formatAmountDisplay = (amount: string): string => {
  // TODO: handle small amounts that have more than 2 digits after decimal
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(+amount);
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


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

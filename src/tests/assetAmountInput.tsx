import { formatAssetAmountInput } from '../utils/common';

describe('formatAmount', () => {
  it('should format transaction amount to replace leading dot with 0.', () => {
    expect(formatAssetAmountInput('.')).toBe('0.');
  });
  it('should format transaction amount to allow decimal numbers', () => {
    expect(formatAssetAmountInput('0.1')).toBe('0.1');
  });
  it('should format transaction amount to allow Non-negative integers', () => {
    expect(formatAssetAmountInput('1')).toBe('1');
  });
});

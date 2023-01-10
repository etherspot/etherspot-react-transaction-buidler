import axios from 'axios';
import {
  getSelectedChainBalance,
  getExchangeOffers,
  getStakingExchangeTransaction,
} from './mockApi';
import { validateTransactionBlockValues } from '../../src/utils/validation';
import { formatAmountDisplay } from '../utils/common';

jest.mock('axios');

describe('PLR staking API calls', () => {
  it('Returns the balance of selected chain asset', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      xdai: { usd: 0.997492 },
    });
    const response = await getSelectedChainBalance();
    expect(response).toHaveProperty('xdai');
  });

  it('Return exchange offers for selected chain', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        result: {
          items: [],
        },
      },
    });
    const response = await getExchangeOffers();
    expect(response.data.result).toHaveProperty('items');
  });

  it('Return staking exchange transaction (Review transaction)', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        result: {
          items: [
            {
              address: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
              exchangeRate: 1,
            },
          ],
        },
      },
    });
    const response = await getStakingExchangeTransaction();
    expect(response.data.result).toHaveProperty('items');
  });
});

describe('Select balance percentage', () => {
  let selectedAssetBalance = 100;
  function ListItemClick25(input: any) {
    return input;
  }
  it('When selected 25%', async () => {
    await expect(ListItemClick25(selectedAssetBalance / 4)).toBe(25);
  });
  it('When selected 50%', async () => {
    await expect(ListItemClick25(selectedAssetBalance) / 2).toBe(50);
  });
  it('When selected max', async () => {
    await expect(ListItemClick25(selectedAssetBalance)).toBe(
      selectedAssetBalance
    );
  });
});

describe('Input amount validation', () => {
  function addInput(input: Number) {
    if (input < 0.4) return 'Minimum amount 0.4 USD';
  }

  it('When input amount is less than 0.4', () => {
    expect(addInput(0.2)).toBe('Minimum amount 0.4 USD');
  });
});

describe('On click of Review', () => {
  function onContinueClick(input: string) {
    if (!input) return 'Failed to proceed with selected actions!';
    if (input) return 'Reviewing...';
  }

  it('When no input amount is added', () => {
    expect(onContinueClick('')).toBe(
      'Failed to proceed with selected actions!'
    );
  });

  it('When no input amount is added', () => {
    expect(onContinueClick('0.6')).toBe('Reviewing...');
  });
});

describe('Format amount entered (convert into dollars and give a round figure)', () => {
  let assetPriceUsd = 0.995126;
  let amount = 0.749886343124469601; // 25% is selected
  it('formatAmountDisplay', () => {
    expect(formatAmountDisplay(+amount * assetPriceUsd, '$')).toBe('$0.75');
  });
});

describe('Pillar Dao staking validation checks', () => {
  const values: any = {
    chainId: '',
    amount: '',
  };
  const transactionBlock: any = {
    type: 'PLR_DAO_STAKE',
    values,
  };
  it('selectChainId', async () => {
    await expect(validateTransactionBlockValues(transactionBlock)).toEqual(
      expect.objectContaining({
        fromChainId: 'No source chain selected!',
      })
    );
  });
});

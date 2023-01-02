import axios from 'axios';
import {
  getSelectedChainBalance,
  getExchangeOffers,
  getStakingExchangeTransaction,
} from './mockApi';

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

describe('Pillar Dao staking validation checks', () => {
  function selectChainId(id: string) {
    if (!id) return Promise.reject(new Error('No source chain selected!'));
  }
  function addAmount(amount: string) {
    if (!amount) return Promise.reject(new Error('Incorrect asset amount!'));
  }
  function selectFromAssetAddress(address: string) {
    if (!address)
      return Promise.reject(new Error('Invalid source asset selected!'));
  }
  function selectFromAssetSymbol(symbol: string) {
    if (!symbol)
      return Promise.reject(new Error('Invalid source asset selected!'));
  }
  function selectFromAssetDecimal(decimal: string) {
    if (!decimal)
      return Promise.reject(new Error('Invalid source asset selected!'));
  }
  function addReceiverAddress(address: string) {
    if (!address) return Promise.reject(new Error('Invalid receiver address!'));
  }
  function selectAccountType(type: string) {
    if (!type) return Promise.reject(new Error('No account type selected!'));
  }

  it('selectChainId', async () => {
    await expect(selectChainId('')).rejects.toThrow(
      'No source chain selected!'
    );
  });

  it('addAmount', async () => {
    await expect(addAmount('')).rejects.toThrow('Incorrect asset amount!');
  });

  it('selectFromAssetAddress', async () => {
    await expect(selectFromAssetAddress('')).rejects.toThrow(
      'Invalid source asset selected!'
    );
  });

  it('selectFromAssetSymbol', async () => {
    await expect(selectFromAssetSymbol('')).rejects.toThrow(
      'Invalid source asset selected!'
    );
  });

  it('selectFromAssetDecimal', async () => {
    await expect(selectFromAssetDecimal('')).rejects.toThrow(
      'Invalid source asset selected!'
    );
  });

  it('addReceiverAddress', async () => {
    await expect(addReceiverAddress('')).rejects.toThrow(
      'Invalid receiver address!'
    );
  });

  it('selectAccountType', async () => {
    await expect(selectAccountType('')).rejects.toThrow(
      'No account type selected!'
    );
  });
});

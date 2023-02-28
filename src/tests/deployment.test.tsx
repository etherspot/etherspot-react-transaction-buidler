import axios from 'axios';

const getAccount = async () => {
  return axios.get('https://etherspot.pillarproject.io/', {
    data: {
      account: '0xA8235A816d468C71b5C004a6515CEE89A8C5ccF0',
      chainId: 137,
    },
  });
};

const deployAccount = async () => {
  return axios.get('https://etherspot.pillarproject.io/', {
    data: {
      account: '0xA8235A816d468C71b5C004a6515CEE89A8C5ccF0',
      chainId: 137,
      data: ['0xda9fc1ae000000000000000000000000a8235a816d468c71b5c004a6515cee89a8c5ccf0'],
      feeToken: null,
      nonce: 71641256,
      to: ['0x7EB3A038F25B9F32f8e19A7F0De83D4916030eFa'],
    },
  });
};

jest.mock('axios');

describe('Get Deployment status', () => {
  it('Returns the deployment status of a chain', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        result: {
          state: 'Deployed',
        },
      },
    });
    const response = await getAccount();
    expect(response.data.result).toHaveProperty('state');
  });
});

describe('Deploy account', () => {
  it('Deploy selected account', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        data: [],
      },
    });
    const response = await deployAccount();
    expect(response.data).toHaveProperty('data');
  });
});

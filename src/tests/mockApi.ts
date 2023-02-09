import axios from 'axios';

export const getSelectedChainBalance = async () => {
  const response = await axios.get(
    'https://api.coingecko.com/api/v3/simple/price?ids=xdai&vs_currencies=usd',
    {
      data: {
        ids: 'xdai',
        vs_currencies: 'usd',
      },
    }
  );
  return response;
};

export const getExchangeOffers = async () => {
  const response = await axios.get('https://etherspot.pillarproject.io/', {
    data: {
      variables: {
        account: '0xA8235A816d468C71b5C004a6515CEE89A8C5ccF0',
        fromAmount: '0x06f05b59d3b20000',
        fromChainId: 137,
        fromTokenAddress: '0x0000000000000000000000000000000000000000',
        toTokenAddress: '0x4e78011Ce80ee02d2c3e649Fb657E45898257815',
      },
    },
  });
  return response;
};

export const getStakingExchangeTransaction = async () => {
  const response = await axios.get('https://etherspot.pillarproject.io/', {
    data: {
      variables: {
        chainId: 100,
      },
    },
  });
  return response;
};

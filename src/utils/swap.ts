interface ISwapServiceDetails {
  title: string;
  iconUrl: string;
}

export const swapServiceIdToDetails: { [id: string]: ISwapServiceDetails } = {
  'Lifi': { title: 'LiFi', iconUrl: 'https://li.fi/logo192.png' },
  'OneInch': { title: 'OneInch', iconUrl: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/oneinch.png' },
  'Uniswap': { title: 'Uniswap', iconUrl: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/uniswap.png' },
  'Sushiswap': { title: 'Sushiswap', iconUrl: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/sushi.png' },
  'Honeyswap': { title: 'Honeyswap', iconUrl: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/honey.png' },
  'Paraswap': { title: 'Paraswap', iconUrl: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/paraswap.png' },
  'Synthetix': { title: 'Synthetix', iconUrl: 'https://synthetix.io/logo-x.svg' },
};

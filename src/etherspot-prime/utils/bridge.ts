interface IBridgeServiceDetails {
  title: string;
  iconUrl: string;
}

export const bridgeServiceIdToDetails: { [id: string]: IBridgeServiceDetails } = {
  'lifi': { title: 'LiFi', iconUrl: 'https://li.fi/logo192.png' },
};

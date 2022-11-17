import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
import {
  AccountTypes,
} from 'etherspot';
import { ethers } from 'ethers';
import debounce from 'debounce-promise';

import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import {
  useEtherspot,
  useTransactionBuilder,
} from '../../hooks';
import {
  formatAmountDisplay,
  formatAssetAmountInput,
  formatMaxAmount,
} from '../../utils/common';
import {
  addressesEqual,
  isValidAmount,
  isValidEthereumAddress,
} from '../../utils/validation';
import AccountSwitchInput from '../AccountSwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import { Chain } from '../../utils/chain';
import {
  IAssetWithBalance,
} from '../../providers/EtherspotContextProvider';
import {
  CombinedRoundedImages,
  RoundedImage,
} from '../Image';
import { Pill } from '../Text';
import { Theme } from '../../utils/theme';
import Text from '../Text/Text';
import { bridgeServiceIdToDetails } from '../../utils/bridge';
import { Route } from '@lifi/sdk';
import Checkbox from '../Checkbox';
import { IAssetBridgeTransactionBlock } from '../../types/transactionBlock';
import { BiCheck } from 'react-icons/all';

export interface IAssetBridgeTransactionBlockValues {
  fromChain?: Chain;
  toChain?: Chain;
  fromAsset?: IAssetWithBalance;
  toAsset?: IAssetWithBalance;
  amount?: string;
  accountType?: string;
  route?: Route;
  receiverAddress?: string;
}

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: "PTRootUIWebBold", sans-serif;
`;

const OfferDetails = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  font-family: "PTRootUIWebMedium", sans-serif;
  width: 100%;
`;

const OfferDetailsRowsWrapper = styled.div`
  margin-top: 2px;
`;

const OfferChecked = styled.div`
  position: absolute;
  top: 4px;
  right: 0;
  background: ${({ theme }) => theme.color.background.statusIconSuccess};
  width: 14px;
  height: 14px;
  font-size: 4px;
  border-radius: 7px;
  color: #fff;
`;

const OfferDetailsRow = styled.div<{ marginBottom?: number }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  ${({ marginBottom }) => !!marginBottom && `margin-bottom: ${marginBottom}px;`}
`;

const WalletReceiveWrapper = styled.div`
  display: flex;
  flex-direction: row;
`;

const mapRouteToOption = (route: Route) => {
  const [fistStep] = route.steps;
  const serviceDetails = bridgeServiceIdToDetails[fistStep?.toolDetails?.key ?? 'lifi'];
  return {
    title: fistStep?.toolDetails?.name ?? serviceDetails?.title ?? 'LiFi',
    value: route.id,
    iconUrl: fistStep?.toolDetails?.logoURI ?? serviceDetails?.iconUrl,
  };
}

const defaultRoutes = [
  {
    "id": "0x8ca2fd9a12aa1fc88206d7390554c65c62b8cb6663c223542cd614438b14cf61",
    "fromChainId": 137,
    "fromAmountUSD": "0.23",
    "fromAmount": "200000000000000000",
    "fromToken": {
      "address": "0x0000000000000000000000000000000000000000",
      "chainId": 137,
      "symbol": "MATIC",
      "decimals": 18,
      "name": "MATIC",
      "priceUSD": "1.171523",
      "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
      "coinKey": "MATIC"
    },
    "fromAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
    "toChainId": 100,
    "toAmountUSD": "0.22",
    "toAmount": "217872976851437065",
    "toAmountMin": "211336787545893953",
    "toToken": {
      "address": "0x0000000000000000000000000000000000000000",
      "chainId": 100,
      "symbol": "xDai",
      "decimals": 18,
      "name": "xDai",
      "priceUSD": "0.9994",
      "logoURI": "https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png",
      "coinKey": "XDAI"
    },
    "toAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
    "gasCostUSD": "0.03",
    "containsSwitchChain": false,
    "steps": [
      {
        "id": "2a636e37-b14e-4bb0-8410-4bccf7dd0a05",
        "type": "lifi",
        "tool": "connext",
        "toolDetails": {
          "key": "connext",
          "name": "Connext",
          "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/connext.png"
        },
        "action": {
          "fromChainId": 137,
          "toChainId": 100,
          "fromToken": {
            "address": "0x0000000000000000000000000000000000000000",
            "chainId": 137,
            "symbol": "MATIC",
            "decimals": 18,
            "name": "MATIC",
            "priceUSD": "1.171523",
            "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
            "coinKey": "MATIC"
          },
          "toToken": {
            "address": "0x0000000000000000000000000000000000000000",
            "chainId": 100,
            "symbol": "xDai",
            "decimals": 18,
            "name": "xDai",
            "priceUSD": "0.9994",
            "logoURI": "https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png",
            "coinKey": "XDAI"
          },
          "fromAmount": "200000000000000000",
          "slippage": 0.03,
          "fromAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
          "toAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2"
        },
        "estimate": {
          "fromAmount": "200000000000000000",
          "toAmount": "217872976851437065",
          "toAmountMin": "211336787545893953",
          "approvalAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
          "executionDuration": 250,
          "feeCosts": [],
          "gasCosts": [
            {
              "type": "SEND",
              "price": "87438825461",
              "estimate": "369386",
              "limit": "461733",
              "amount": "32298677981736946",
              "amountUSD": "0.03",
              "token": {
                "address": "0x0000000000000000000000000000000000000000",
                "chainId": 137,
                "symbol": "MATIC",
                "decimals": 18,
                "name": "MATIC",
                "priceUSD": "1.171523",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                "coinKey": "MATIC"
              }
            }
          ],
          "data": {
            "fromToken": {
              "symbol": "MATIC",
              "name": "MATIC",
              "decimals": 18,
              "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
              "logoURI": "https://tokens.1inch.io/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png",
              "tags": [
                "native"
              ]
            },
            "toToken": {
              "symbol": "DAI",
              "name": "Dai Stablecoin",
              "decimals": 18,
              "address": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
              "logoURI": "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png",
              "tags": [
                "tokens",
                "PEG:USD"
              ]
            },
            "toTokenAmount": "234280238530703444",
            "fromTokenAmount": "200000000000000000",
            "protocols": [
              [
                [
                  {
                    "name": "POLYGON_SUSHISWAP",
                    "part": 100,
                    "fromTokenAddress": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                    "toTokenAddress": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063"
                  }
                ]
              ]
            ],
            "estimatedGas": 229386
          },
          "fromAmountUSD": "0.23",
          "toAmountUSD": "0.22"
        },
        "integrator": "lifi-sdk",
        "includedSteps": [
          {
            "id": "2a636e37-b14e-4bb0-8410-4bccf7dd0a05",
            "type": "swap",
            "tool": "1inch",
            "toolDetails": {
              "key": "1inch",
              "name": "1inch",
              "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/oneinch.png"
            },
            "action": {
              "fromChainId": 137,
              "toChainId": 137,
              "fromToken": {
                "address": "0x0000000000000000000000000000000000000000",
                "chainId": 137,
                "symbol": "MATIC",
                "decimals": 18,
                "name": "MATIC",
                "priceUSD": "1.171523",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                "coinKey": "MATIC"
              },
              "toToken": {
                "address": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
                "chainId": 137,
                "symbol": "DAI",
                "decimals": 18,
                "name": "(PoS) Dai Stablecoin",
                "priceUSD": "0.9994",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/0x8f3cf7ad23cd3cadbd9735aff958023239c6a063/549c4205dbb199f1b8b03af783f35e71.png",
                "coinKey": "XDAI"
              },
              "fromAmount": "200000000000000000",
              "slippage": 0.03,
              "fromAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
              "toAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f"
            },
            "estimate": {
              "fromAmount": "200000000000000000",
              "toAmount": "234280238530703444",
              "toAmountMin": "227251831374782341",
              "approvalAddress": "0x1111111254fb6c44bac0bed2854e76f90643097d",
              "executionDuration": 30,
              "feeCosts": [],
              "gasCosts": [
                {
                  "type": "SEND",
                  "price": "87438825461",
                  "estimate": "229386",
                  "limit": "286733",
                  "amount": "20057242417196946",
                  "amountUSD": "0.02",
                  "token": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "chainId": 137,
                    "symbol": "MATIC",
                    "decimals": 18,
                    "name": "MATIC",
                    "priceUSD": "1.171523",
                    "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                    "coinKey": "MATIC"
                  }
                }
              ],
              "data": {
                "fromToken": {
                  "symbol": "MATIC",
                  "name": "MATIC",
                  "decimals": 18,
                  "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                  "logoURI": "https://tokens.1inch.io/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png",
                  "tags": [
                    "native"
                  ]
                },
                "toToken": {
                  "symbol": "DAI",
                  "name": "Dai Stablecoin",
                  "decimals": 18,
                  "address": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
                  "logoURI": "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png",
                  "tags": [
                    "tokens",
                    "PEG:USD"
                  ]
                },
                "toTokenAmount": "234280238530703444",
                "fromTokenAmount": "200000000000000000",
                "protocols": [
                  [
                    [
                      {
                        "name": "POLYGON_SUSHISWAP",
                        "part": 100,
                        "fromTokenAddress": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                        "toTokenAddress": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063"
                      }
                    ]
                  ]
                ],
                "estimatedGas": 229386
              },
              "fromAmountUSD": "0.23",
              "toAmountUSD": "0.23"
            },
            "integrator": "lifi-sdk"
          },
          {
            "id": "0x487529ea541e3d7637f9114c6081c474ab2afb7e2bbb781ee1cb2219dec402bc",
            "type": "cross",
            "tool": "connext",
            "toolDetails": {
              "key": "connext",
              "name": "Connext",
              "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/connext.png"
            },
            "action": {
              "fromChainId": 137,
              "toChainId": 100,
              "fromToken": {
                "address": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
                "chainId": 137,
                "symbol": "DAI",
                "decimals": 18,
                "name": "(PoS) Dai Stablecoin",
                "priceUSD": "0.9994",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/0x8f3cf7ad23cd3cadbd9735aff958023239c6a063/549c4205dbb199f1b8b03af783f35e71.png",
                "coinKey": "XDAI"
              },
              "toToken": {
                "address": "0x0000000000000000000000000000000000000000",
                "chainId": 100,
                "symbol": "xDai",
                "decimals": 18,
                "name": "xDai",
                "priceUSD": "0.9994",
                "logoURI": "https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png",
                "coinKey": "XDAI"
              },
              "fromAmount": "227251831374782341",
              "slippage": 0.03,
              "fromAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
              "toAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f"
            },
            "estimate": {
              "fromAmount": "227251831374782341",
              "toAmount": "217872976851437065",
              "toAmountMin": "211336787545893953",
              "approvalAddress": "0x6090De2EC76eb1Dc3B5d632734415c93c44Fd113",
              "executionDuration": 220,
              "feeCosts": [
                {
                  "name": "Gas Fee",
                  "description": "Covers gas expense for sending funds to user on receiving chain.",
                  "percentage": "0.0678",
                  "token": {
                    "address": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
                    "decimals": 18,
                    "symbol": "DAI",
                    "chainId": 137,
                    "coinKey": "XDAI",
                    "name": "(PoS) Dai Stablecoin",
                    "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png"
                  },
                  "amount": "15405417911352996",
                  "amountUSD": "0.00"
                },
                {
                  "name": "Relay Fee",
                  "description": "Covers gas expense for claiming user funds on receiving chain.",
                  "percentage": "0.0017",
                  "token": {
                    "address": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
                    "decimals": 18,
                    "symbol": "DAI",
                    "chainId": 137,
                    "coinKey": "XDAI",
                    "name": "(PoS) Dai Stablecoin",
                    "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png"
                  },
                  "amount": "396000001848000",
                  "amountUSD": "0.00"
                },
                {
                  "name": "Router Fee",
                  "description": "Router service fee.",
                  "percentage": "0.0005",
                  "token": {
                    "address": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
                    "decimals": 18,
                    "symbol": "DAI",
                    "chainId": 137,
                    "coinKey": "XDAI",
                    "name": "(PoS) Dai Stablecoin",
                    "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png"
                  },
                  "amount": "113625915687392",
                  "amountUSD": "0.00"
                }
              ],
              "gasCosts": [
                {
                  "type": "SEND",
                  "price": "87438825461",
                  "estimate": "140000",
                  "limit": "175000",
                  "amount": "12241435564540000",
                  "amountUSD": "0.01",
                  "token": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "chainId": 137,
                    "symbol": "MATIC",
                    "decimals": 18,
                    "name": "MATIC",
                    "priceUSD": "1.171523",
                    "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                    "coinKey": "MATIC"
                  }
                }
              ],
              "data": {
                "bid": {
                  "user": "0x997f29174a766A1DA04cf77d135d59Dd12FB54d1",
                  "router": "0x826Ccd5eD8ca665555Fe45A4f045b61516b241C0",
                  "initiator": "0x997f29174a766A1DA04cf77d135d59Dd12FB54d1",
                  "sendingChainId": 137,
                  "sendingAssetId": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
                  "amount": "227251831374782341",
                  "receivingChainId": 100,
                  "receivingAssetId": "0x0000000000000000000000000000000000000000",
                  "amountReceived": "211732787547741953",
                  "receivingAddress": "0x997f29174a766A1DA04cf77d135d59Dd12FB54d1",
                  "transactionId": "0xf35a2c1af36c94c8578ec1d69bf0989b746168a909873a84187fd63c42e07a71",
                  "expiry": 1668017065,
                  "callDataHash": "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
                  "callTo": "0x0000000000000000000000000000000000000000",
                  "encryptedCallData": "0x",
                  "sendingChainTxManagerAddress": "0x6090De2EC76eb1Dc3B5d632734415c93c44Fd113",
                  "receivingChainTxManagerAddress": "0x115909BDcbaB21954bEb4ab65FC2aBEE9866fa93",
                  "bidExpiry": 1667758168
                },
                "bidSignature": null,
                "gasFeeInReceivingToken": "15405417911352996",
                "totalFee": "15915043828888388",
                "metaTxRelayerFee": "396000001848000",
                "routerFee": "113625915687392",
                "serverSign": true
              },
              "fromAmountUSD": "0.23",
              "toAmountUSD": "0.22"
            },
            "integrator": "lifi-sdk"
          }
        ]
      }
    ],
    "tags": [
      "RECOMMENDED",
      "CHEAPEST",
      "FASTEST",
      "SAFEST"
    ]
  },
  {
    "id": "0xbc4d3bbe5676bfc501cf31eedeea4cbbbadcc17f8fb95b82622a484628105ffd",
    "fromChainId": 137,
    "fromAmountUSD": "0.23",
    "fromAmount": "200000000000000000",
    "fromToken": {
      "address": "0x0000000000000000000000000000000000000000",
      "chainId": 137,
      "symbol": "MATIC",
      "decimals": 18,
      "name": "MATIC",
      "priceUSD": "1.171523",
      "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
      "coinKey": "MATIC"
    },
    "fromAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
    "toChainId": 100,
    "toAmountUSD": "0.22",
    "toAmount": "219475931737912056",
    "toAmountMin": "212891653785774694",
    "toToken": {
      "address": "0x0000000000000000000000000000000000000000",
      "chainId": 100,
      "symbol": "xDai",
      "decimals": 18,
      "name": "xDai",
      "priceUSD": "0.9994",
      "logoURI": "https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png",
      "coinKey": "XDAI"
    },
    "toAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
    "gasCostUSD": "0.03",
    "containsSwitchChain": false,
    "steps": [
      {
        "id": "9717ae55-d307-4146-ad44-106bc35cf025",
        "type": "lifi",
        "tool": "connext",
        "toolDetails": {
          "key": "connext",
          "name": "Connext",
          "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/connext.png"
        },
        "action": {
          "fromChainId": 137,
          "toChainId": 100,
          "fromToken": {
            "address": "0x0000000000000000000000000000000000000000",
            "chainId": 137,
            "symbol": "MATIC",
            "decimals": 18,
            "name": "MATIC",
            "priceUSD": "1.171523",
            "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
            "coinKey": "MATIC"
          },
          "toToken": {
            "address": "0x0000000000000000000000000000000000000000",
            "chainId": 100,
            "symbol": "xDai",
            "decimals": 18,
            "name": "xDai",
            "priceUSD": "0.9994",
            "logoURI": "https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png",
            "coinKey": "XDAI"
          },
          "fromAmount": "200000000000000000",
          "slippage": 0.03,
          "fromAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
          "toAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2"
        },
        "estimate": {
          "fromAmount": "200000000000000000",
          "toAmount": "219475931737912056",
          "toAmountMin": "212891653785774694",
          "approvalAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
          "executionDuration": 280,
          "feeCosts": [],
          "gasCosts": [
            {
              "type": "SEND",
              "price": "87438825461",
              "estimate": "380000",
              "limit": "475000",
              "amount": "33226753675180000",
              "amountUSD": "0.03",
              "token": {
                "address": "0x0000000000000000000000000000000000000000",
                "chainId": 137,
                "symbol": "MATIC",
                "decimals": 18,
                "name": "MATIC",
                "priceUSD": "1.171523",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                "coinKey": "MATIC"
              }
            }
          ],
          "data": {
            "chainId": 137,
            "price": "0.00072637702409673",
            "guaranteedPrice": "0.000704585713373825",
            "estimatedPriceImpact": "0",
            "to": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            "data": "0x415565b0000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f61900000000000000000000000000000000000000000000000002c68af0bb14000000000000000000000000000000000000000000000000000000008029d43b5d4d00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000004a0000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000002c68af0bb140000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000340000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f61900000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000025761756c74537761700000000000000000000000000000000000000000000000000000000000000002c68af0bb14000000000000000000000000000000000000000000000000000000008029d43b5d4d000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000003a1d87f206d12415f5b0a33e786967680aab4f6d000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f619000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000000869584cd00000000000000000000000010000000000000000000000000000000000000110000000000000000000000000000000000000000000000979a3ef3a66367f729",
            "value": "200000000000000000",
            "gas": "240000",
            "estimatedGas": "240000",
            "gasPrice": "113600000000",
            "protocolFee": "0",
            "minimumProtocolFee": "0",
            "buyTokenAddress": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
            "sellTokenAddress": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            "buyAmount": "145275404819346",
            "sellAmount": "200000000000000000",
            "sources": [
              {
                "name": "SushiSwap",
                "proportion": "0"
              },
              {
                "name": "QuickSwap",
                "proportion": "0"
              },
              {
                "name": "Dfyn",
                "proportion": "0"
              },
              {
                "name": "mStable",
                "proportion": "0"
              },
              {
                "name": "Curve",
                "proportion": "0"
              },
              {
                "name": "DODO_V2",
                "proportion": "0"
              },
              {
                "name": "DODO",
                "proportion": "0"
              },
              {
                "name": "Curve_V2",
                "proportion": "0"
              },
              {
                "name": "WaultSwap",
                "proportion": "1"
              },
              {
                "name": "ApeSwap",
                "proportion": "0"
              },
              {
                "name": "FirebirdOneSwap",
                "proportion": "0"
              },
              {
                "name": "Balancer_V2",
                "proportion": "0"
              },
              {
                "name": "KyberDMM",
                "proportion": "0"
              },
              {
                "name": "LiquidityProvider",
                "proportion": "0"
              },
              {
                "name": "MultiHop",
                "proportion": "0"
              },
              {
                "name": "IronSwap",
                "proportion": "0"
              },
              {
                "name": "Aave_V2",
                "proportion": "0"
              },
              {
                "name": "Uniswap_V3",
                "proportion": "0"
              },
              {
                "name": "Synapse",
                "proportion": "0"
              },
              {
                "name": "MeshSwap",
                "proportion": "0"
              },
              {
                "name": "WOOFi",
                "proportion": "0"
              }
            ],
            "orders": [
              {
                "type": 0,
                "source": "WaultSwap",
                "makerToken": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                "takerToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
                "makerAmount": "145275404819346",
                "takerAmount": "200000000000000000",
                "fillData": {
                  "tokenAddressPath": [
                    "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
                    "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
                  ],
                  "router": "0x3a1d87f206d12415f5b0a33e786967680aab4f6d"
                },
                "fill": {
                  "input": "200000000000000000",
                  "output": "145275404819346",
                  "adjustedOutput": "137866158887375",
                  "gas": 90000
                },
                "sourcePathId": "0x4afd6c9c2c569021af963030afc3e823c4046e1e2a332985b6ec74d753cf44dd"
              }
            ],
            "allowanceTarget": "0x0000000000000000000000000000000000000000",
            "decodedUniqueId": "979a3ef3a6-1667757865",
            "sellTokenToEthRate": "1",
            "buyTokenToEthRate": "0.000724691503518244",
            "expectedSlippage": null
          },
          "fromAmountUSD": "0.23",
          "toAmountUSD": "0.22"
        },
        "integrator": "lifi-sdk",
        "includedSteps": [
          {
            "id": "9717ae55-d307-4146-ad44-106bc35cf025",
            "type": "swap",
            "tool": "0x",
            "toolDetails": {
              "key": "0x",
              "name": "0x",
              "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/zerox.png"
            },
            "action": {
              "fromChainId": 137,
              "toChainId": 137,
              "fromToken": {
                "address": "0x0000000000000000000000000000000000000000",
                "chainId": 137,
                "symbol": "MATIC",
                "decimals": 18,
                "name": "MATIC",
                "priceUSD": "1.171523",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                "coinKey": "MATIC"
              },
              "toToken": {
                "address": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                "chainId": 137,
                "symbol": "WETH",
                "decimals": 18,
                "name": "Wrapped Ether",
                "priceUSD": "1616.04",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/0x7ceb23fd6bc0add59e62ac25578270cff1b9f619/61844453e63cf81301f845d7864236f6.png",
                "coinKey": "WETH"
              },
              "fromAmount": "200000000000000000",
              "slippage": 0.03,
              "fromAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
              "toAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f"
            },
            "estimate": {
              "fromAmount": "200000000000000000",
              "toAmount": "145275404819346",
              "toAmountMin": "145275404819346",
              "approvalAddress": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
              "executionDuration": 30,
              "feeCosts": [],
              "gasCosts": [
                {
                  "type": "SEND",
                  "price": "87438825461",
                  "estimate": "240000",
                  "limit": "300000",
                  "amount": "20985318110640000",
                  "amountUSD": "0.02",
                  "token": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "chainId": 137,
                    "symbol": "MATIC",
                    "decimals": 18,
                    "name": "MATIC",
                    "priceUSD": "1.171523",
                    "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                    "coinKey": "MATIC"
                  }
                }
              ],
              "data": {
                "chainId": 137,
                "price": "0.00072637702409673",
                "guaranteedPrice": "0.000704585713373825",
                "estimatedPriceImpact": "0",
                "to": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
                "data": "0x415565b0000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f61900000000000000000000000000000000000000000000000002c68af0bb14000000000000000000000000000000000000000000000000000000008029d43b5d4d00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000004a0000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000002c68af0bb140000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000340000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f61900000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000025761756c74537761700000000000000000000000000000000000000000000000000000000000000002c68af0bb14000000000000000000000000000000000000000000000000000000008029d43b5d4d000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000003a1d87f206d12415f5b0a33e786967680aab4f6d000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f619000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000000869584cd00000000000000000000000010000000000000000000000000000000000000110000000000000000000000000000000000000000000000979a3ef3a66367f729",
                "value": "200000000000000000",
                "gas": "240000",
                "estimatedGas": "240000",
                "gasPrice": "113600000000",
                "protocolFee": "0",
                "minimumProtocolFee": "0",
                "buyTokenAddress": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                "sellTokenAddress": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                "buyAmount": "145275404819346",
                "sellAmount": "200000000000000000",
                "sources": [
                  {
                    "name": "SushiSwap",
                    "proportion": "0"
                  },
                  {
                    "name": "QuickSwap",
                    "proportion": "0"
                  },
                  {
                    "name": "Dfyn",
                    "proportion": "0"
                  },
                  {
                    "name": "mStable",
                    "proportion": "0"
                  },
                  {
                    "name": "Curve",
                    "proportion": "0"
                  },
                  {
                    "name": "DODO_V2",
                    "proportion": "0"
                  },
                  {
                    "name": "DODO",
                    "proportion": "0"
                  },
                  {
                    "name": "Curve_V2",
                    "proportion": "0"
                  },
                  {
                    "name": "WaultSwap",
                    "proportion": "1"
                  },
                  {
                    "name": "ApeSwap",
                    "proportion": "0"
                  },
                  {
                    "name": "FirebirdOneSwap",
                    "proportion": "0"
                  },
                  {
                    "name": "Balancer_V2",
                    "proportion": "0"
                  },
                  {
                    "name": "KyberDMM",
                    "proportion": "0"
                  },
                  {
                    "name": "LiquidityProvider",
                    "proportion": "0"
                  },
                  {
                    "name": "MultiHop",
                    "proportion": "0"
                  },
                  {
                    "name": "IronSwap",
                    "proportion": "0"
                  },
                  {
                    "name": "Aave_V2",
                    "proportion": "0"
                  },
                  {
                    "name": "Uniswap_V3",
                    "proportion": "0"
                  },
                  {
                    "name": "Synapse",
                    "proportion": "0"
                  },
                  {
                    "name": "MeshSwap",
                    "proportion": "0"
                  },
                  {
                    "name": "WOOFi",
                    "proportion": "0"
                  }
                ],
                "orders": [
                  {
                    "type": 0,
                    "source": "WaultSwap",
                    "makerToken": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                    "takerToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
                    "makerAmount": "145275404819346",
                    "takerAmount": "200000000000000000",
                    "fillData": {
                      "tokenAddressPath": [
                        "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
                        "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
                      ],
                      "router": "0x3a1d87f206d12415f5b0a33e786967680aab4f6d"
                    },
                    "fill": {
                      "input": "200000000000000000",
                      "output": "145275404819346",
                      "adjustedOutput": "137866158887375",
                      "gas": 90000
                    },
                    "sourcePathId": "0x4afd6c9c2c569021af963030afc3e823c4046e1e2a332985b6ec74d753cf44dd"
                  }
                ],
                "allowanceTarget": "0x0000000000000000000000000000000000000000",
                "decodedUniqueId": "979a3ef3a6-1667757865",
                "sellTokenToEthRate": "1",
                "buyTokenToEthRate": "0.000724691503518244",
                "expectedSlippage": null
              },
              "fromAmountUSD": "0.23",
              "toAmountUSD": "0.23"
            },
            "integrator": "lifi-sdk"
          },
          {
            "id": "0x68b1432dc262cd84f824f55bc2cb4928e89734fe01e3892a1f2961ddece811eb",
            "type": "cross",
            "tool": "connext",
            "toolDetails": {
              "key": "connext",
              "name": "Connext",
              "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/connext.png"
            },
            "action": {
              "fromChainId": 137,
              "toChainId": 100,
              "fromToken": {
                "address": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                "chainId": 137,
                "symbol": "WETH",
                "decimals": 18,
                "name": "Wrapped Ether",
                "priceUSD": "1616.04",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/0x7ceb23fd6bc0add59e62ac25578270cff1b9f619/61844453e63cf81301f845d7864236f6.png",
                "coinKey": "WETH"
              },
              "toToken": {
                "address": "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1",
                "chainId": 100,
                "symbol": "WETH",
                "decimals": 18,
                "name": "Wrapped Ether on xDai",
                "priceUSD": "1617.12",
                "logoURI": "https://static.debank.com/image/xdai_token/logo_url/0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1/61844453e63cf81301f845d7864236f6.png",
                "coinKey": "WETH"
              },
              "fromAmount": "145275404819346",
              "slippage": 0.03,
              "fromAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
              "toAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f"
            },
            "estimate": {
              "fromAmount": "145275404819346",
              "toAmount": "135252469002586",
              "toAmountMin": "135252469002586",
              "approvalAddress": "0x6090De2EC76eb1Dc3B5d632734415c93c44Fd113",
              "executionDuration": 220,
              "feeCosts": [
                {
                  "name": "Gas Fee",
                  "description": "Covers gas expense for sending funds to user on receiving chain.",
                  "percentage": "0.0658",
                  "token": {
                    "address": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                    "decimals": 18,
                    "symbol": "ETH",
                    "chainId": 137,
                    "coinKey": "ETH",
                    "name": "ETH",
                    "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png"
                  },
                  "amount": "9564398404937",
                  "amountUSD": "0.00"
                },
                {
                  "name": "Relay Fee",
                  "description": "Covers gas expense for claiming user funds on receiving chain.",
                  "percentage": "0.0017",
                  "token": {
                    "address": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                    "decimals": 18,
                    "symbol": "ETH",
                    "chainId": 137,
                    "coinKey": "ETH",
                    "name": "ETH",
                    "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png"
                  },
                  "amount": "244580748921",
                  "amountUSD": "0.00"
                },
                {
                  "name": "Router Fee",
                  "description": "Router service fee.",
                  "percentage": "0.0005",
                  "token": {
                    "address": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                    "decimals": 18,
                    "symbol": "ETH",
                    "chainId": 137,
                    "coinKey": "ETH",
                    "name": "ETH",
                    "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png"
                  },
                  "amount": "72637702410",
                  "amountUSD": "0.00"
                }
              ],
              "gasCosts": [
                {
                  "type": "SEND",
                  "price": "87438825461",
                  "estimate": "140000",
                  "limit": "175000",
                  "amount": "12241435564540000",
                  "amountUSD": "0.01",
                  "token": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "chainId": 137,
                    "symbol": "MATIC",
                    "decimals": 18,
                    "name": "MATIC",
                    "priceUSD": "1.171523",
                    "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                    "coinKey": "MATIC"
                  }
                }
              ],
              "data": {
                "bid": {
                  "user": "0x997f29174a766A1DA04cf77d135d59Dd12FB54d1",
                  "router": "0x95829C9ACFeCaeC0EE594a377311b0937C4A2882",
                  "initiator": "0x997f29174a766A1DA04cf77d135d59Dd12FB54d1",
                  "sendingChainId": 137,
                  "sendingAssetId": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                  "amount": "145275404819346",
                  "receivingChainId": 100,
                  "receivingAssetId": "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1",
                  "amountReceived": "135638368711999",
                  "receivingAddress": "0x997f29174a766A1DA04cf77d135d59Dd12FB54d1",
                  "transactionId": "0xa12d3fe2fdcac507573df52a92924d449248f222a737863b9f0c9a0741860362",
                  "expiry": 1668017065,
                  "callDataHash": "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
                  "callTo": "0x0000000000000000000000000000000000000000",
                  "encryptedCallData": "0x",
                  "sendingChainTxManagerAddress": "0x6090De2EC76eb1Dc3B5d632734415c93c44Fd113",
                  "receivingChainTxManagerAddress": "0x115909BDcbaB21954bEb4ab65FC2aBEE9866fa93",
                  "bidExpiry": 1667758168
                },
                "bidSignature": null,
                "gasFeeInReceivingToken": "9564398404937",
                "totalFee": "9881616856268",
                "metaTxRelayerFee": "244580748921",
                "routerFee": "72637702410",
                "serverSign": true
              },
              "fromAmountUSD": "0.23",
              "toAmountUSD": "0.22"
            },
            "integrator": "lifi-sdk"
          },
          {
            "id": "d428c2ca-ffcd-46cd-b0b7-07aba263c581",
            "type": "swap",
            "tool": "1inch",
            "toolDetails": {
              "key": "1inch",
              "name": "1inch",
              "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/oneinch.png"
            },
            "action": {
              "fromChainId": 100,
              "toChainId": 100,
              "fromToken": {
                "address": "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1",
                "chainId": 100,
                "symbol": "WETH",
                "decimals": 18,
                "name": "Wrapped Ether on xDai",
                "priceUSD": "1617.12",
                "logoURI": "https://static.debank.com/image/xdai_token/logo_url/0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1/61844453e63cf81301f845d7864236f6.png",
                "coinKey": "WETH"
              },
              "toToken": {
                "address": "0x0000000000000000000000000000000000000000",
                "chainId": 100,
                "symbol": "xDai",
                "decimals": 18,
                "name": "xDai",
                "priceUSD": "0.9994",
                "logoURI": "https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png",
                "coinKey": "XDAI"
              },
              "fromAmount": "135252469002586",
              "slippage": 0.03,
              "fromAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
              "toAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f"
            },
            "estimate": {
              "fromAmount": "135252469002586",
              "toAmount": "219475931737912056",
              "toAmountMin": "212891653785774694",
              "approvalAddress": "0x1111111254fb6c44bac0bed2854e76f90643097d",
              "executionDuration": 30,
              "feeCosts": [],
              "data": {
                "fromToken": {
                  "name": "Wrapped Ether from Ethereum",
                  "address": "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1",
                  "symbol": "WETH",
                  "decimals": 18,
                  "logoURI": "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png",
                  "tags": [
                    "tokens",
                    "PEG:ETH"
                  ]
                },
                "toToken": {
                  "name": "xDAI",
                  "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                  "symbol": "xDAI",
                  "decimals": 18,
                  "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png",
                  "tags": [
                    "native"
                  ]
                },
                "toTokenAmount": "219705251843895643",
                "fromTokenAmount": "135393787963078",
                "protocols": [
                  [
                    [
                      {
                        "name": "GNOSIS_SUSHI",
                        "part": 100,
                        "fromTokenAddress": "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1",
                        "toTokenAddress": "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83"
                      }
                    ],
                    [
                      {
                        "name": "GNOSIS_SWAPR",
                        "part": 100,
                        "fromTokenAddress": "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
                        "toTokenAddress": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
                      }
                    ]
                  ]
                ],
                "estimatedGas": 470740
              },
              "fromAmountUSD": "0.22",
              "toAmountUSD": "0.22"
            },
            "integrator": "lifi-sdk"
          }
        ]
      }
    ],
    "tags": []
  },
  {
    "id": "0x9b539f4da1d382a49cba2dca991d564688f6a0eb1a4f785e4f805be83dd11d29",
    "fromChainId": 137,
    "fromAmountUSD": "0.23",
    "fromAmount": "200000000000000000",
    "fromToken": {
      "address": "0x0000000000000000000000000000000000000000",
      "chainId": 137,
      "symbol": "MATIC",
      "decimals": 18,
      "name": "MATIC",
      "priceUSD": "1.171523",
      "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
      "coinKey": "MATIC"
    },
    "fromAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
    "toChainId": 100,
    "toAmountUSD": "0.22",
    "toAmount": "217979642221994513",
    "toAmountMin": "211440252955334678",
    "toToken": {
      "address": "0x0000000000000000000000000000000000000000",
      "chainId": 100,
      "symbol": "xDai",
      "decimals": 18,
      "name": "xDai",
      "priceUSD": "0.9994",
      "logoURI": "https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png",
      "coinKey": "XDAI"
    },
    "toAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
    "gasCostUSD": "0.03",
    "containsSwitchChain": false,
    "steps": [
      {
        "id": "c0d50d8d-6060-4e1a-8f40-f756516e1e8e",
        "type": "lifi",
        "tool": "connext",
        "toolDetails": {
          "key": "connext",
          "name": "Connext",
          "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/connext.png"
        },
        "action": {
          "fromChainId": 137,
          "toChainId": 100,
          "fromToken": {
            "address": "0x0000000000000000000000000000000000000000",
            "chainId": 137,
            "symbol": "MATIC",
            "decimals": 18,
            "name": "MATIC",
            "priceUSD": "1.171523",
            "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
            "coinKey": "MATIC"
          },
          "toToken": {
            "address": "0x0000000000000000000000000000000000000000",
            "chainId": 100,
            "symbol": "xDai",
            "decimals": 18,
            "name": "xDai",
            "priceUSD": "0.9994",
            "logoURI": "https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png",
            "coinKey": "XDAI"
          },
          "fromAmount": "200000000000000000",
          "slippage": 0.03,
          "fromAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
          "toAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2"
        },
        "estimate": {
          "fromAmount": "200000000000000000",
          "toAmount": "217979642221994513",
          "toAmountMin": "211440252955334678",
          "approvalAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
          "executionDuration": 280,
          "feeCosts": [],
          "gasCosts": [
            {
              "type": "SEND",
              "price": "87438825461",
              "estimate": "380000",
              "limit": "475000",
              "amount": "33226753675180000",
              "amountUSD": "0.03",
              "token": {
                "address": "0x0000000000000000000000000000000000000000",
                "chainId": 137,
                "symbol": "MATIC",
                "decimals": 18,
                "name": "MATIC",
                "priceUSD": "1.171523",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                "coinKey": "MATIC"
              }
            }
          ],
          "data": {
            "chainId": 137,
            "price": "1.17305",
            "guaranteedPrice": "1.137855",
            "estimatedPriceImpact": "0",
            "to": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
            "data": "0x415565b0000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f00000000000000000000000000000000000000000000000002c68af0bb14000000000000000000000000000000000000000000000000000000000000000378f300000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000004a0000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000002c68af0bb140000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000340000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f00000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000025761756c74537761700000000000000000000000000000000000000000000000000000000000000002c68af0bb14000000000000000000000000000000000000000000000000000000000000000378f3000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000003a1d87f206d12415f5b0a33e786967680aab4f6d000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000000869584cd000000000000000000000000100000000000000000000000000000000000001100000000000000000000000000000000000000000000003e2c787aa36367f729",
            "value": "200000000000000000",
            "gas": "240000",
            "estimatedGas": "240000",
            "gasPrice": "106100000000",
            "protocolFee": "0",
            "minimumProtocolFee": "0",
            "buyTokenAddress": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
            "sellTokenAddress": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            "buyAmount": "234610",
            "sellAmount": "200000000000000000",
            "sources": [
              {
                "name": "SushiSwap",
                "proportion": "0"
              },
              {
                "name": "QuickSwap",
                "proportion": "0"
              },
              {
                "name": "Dfyn",
                "proportion": "0"
              },
              {
                "name": "mStable",
                "proportion": "0"
              },
              {
                "name": "Curve",
                "proportion": "0"
              },
              {
                "name": "DODO_V2",
                "proportion": "0"
              },
              {
                "name": "DODO",
                "proportion": "0"
              },
              {
                "name": "Curve_V2",
                "proportion": "0"
              },
              {
                "name": "WaultSwap",
                "proportion": "1"
              },
              {
                "name": "ApeSwap",
                "proportion": "0"
              },
              {
                "name": "FirebirdOneSwap",
                "proportion": "0"
              },
              {
                "name": "Balancer_V2",
                "proportion": "0"
              },
              {
                "name": "KyberDMM",
                "proportion": "0"
              },
              {
                "name": "LiquidityProvider",
                "proportion": "0"
              },
              {
                "name": "MultiHop",
                "proportion": "0"
              },
              {
                "name": "IronSwap",
                "proportion": "0"
              },
              {
                "name": "Aave_V2",
                "proportion": "0"
              },
              {
                "name": "Uniswap_V3",
                "proportion": "0"
              },
              {
                "name": "Synapse",
                "proportion": "0"
              },
              {
                "name": "MeshSwap",
                "proportion": "0"
              },
              {
                "name": "WOOFi",
                "proportion": "0"
              }
            ],
            "orders": [
              {
                "type": 0,
                "source": "WaultSwap",
                "makerToken": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
                "takerToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
                "makerAmount": "234610",
                "takerAmount": "200000000000000000",
                "fillData": {
                  "tokenAddressPath": [
                    "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
                    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
                  ],
                  "router": "0x3a1d87f206d12415f5b0a33e786967680aab4f6d"
                },
                "fill": {
                  "input": "200000000000000000",
                  "output": "234610",
                  "adjustedOutput": "223439",
                  "gas": 90000
                },
                "sourcePathId": "0xffd3876b013742cbc44886bc7ee79e5f8586c33d5fda688acc597e8821b27a81"
              }
            ],
            "allowanceTarget": "0x0000000000000000000000000000000000000000",
            "decodedUniqueId": "3e2c787aa3-1667757865",
            "sellTokenToEthRate": "1",
            "buyTokenToEthRate": "1.169832",
            "expectedSlippage": null
          },
          "fromAmountUSD": "0.23",
          "toAmountUSD": "0.22"
        },
        "integrator": "lifi-sdk",
        "includedSteps": [
          {
            "id": "c0d50d8d-6060-4e1a-8f40-f756516e1e8e",
            "type": "swap",
            "tool": "0x",
            "toolDetails": {
              "key": "0x",
              "name": "0x",
              "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/zerox.png"
            },
            "action": {
              "fromChainId": 137,
              "toChainId": 137,
              "fromToken": {
                "address": "0x0000000000000000000000000000000000000000",
                "chainId": 137,
                "symbol": "MATIC",
                "decimals": 18,
                "name": "MATIC",
                "priceUSD": "1.171523",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                "coinKey": "MATIC"
              },
              "toToken": {
                "address": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
                "chainId": 137,
                "symbol": "USDT",
                "decimals": 6,
                "name": "(PoS) Tether USD",
                "priceUSD": "1",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/0xc2132d05d31c914a87c6611c10748aeb04b58e8f/66eadee7b7bb16b75e02b570ab8d5c01.png",
                "coinKey": "USDT"
              },
              "fromAmount": "200000000000000000",
              "slippage": 0.03,
              "fromAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
              "toAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f"
            },
            "estimate": {
              "fromAmount": "200000000000000000",
              "toAmount": "234610",
              "toAmountMin": "234610",
              "approvalAddress": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
              "executionDuration": 30,
              "feeCosts": [],
              "gasCosts": [
                {
                  "type": "SEND",
                  "price": "87438825461",
                  "estimate": "240000",
                  "limit": "300000",
                  "amount": "20985318110640000",
                  "amountUSD": "0.02",
                  "token": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "chainId": 137,
                    "symbol": "MATIC",
                    "decimals": 18,
                    "name": "MATIC",
                    "priceUSD": "1.171523",
                    "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                    "coinKey": "MATIC"
                  }
                }
              ],
              "data": {
                "chainId": 137,
                "price": "1.17305",
                "guaranteedPrice": "1.137855",
                "estimatedPriceImpact": "0",
                "to": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
                "data": "0x415565b0000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f00000000000000000000000000000000000000000000000002c68af0bb14000000000000000000000000000000000000000000000000000000000000000378f300000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000004a0000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000002c68af0bb140000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000340000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f00000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000025761756c74537761700000000000000000000000000000000000000000000000000000000000000002c68af0bb14000000000000000000000000000000000000000000000000000000000000000378f3000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000003a1d87f206d12415f5b0a33e786967680aab4f6d000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000000869584cd000000000000000000000000100000000000000000000000000000000000001100000000000000000000000000000000000000000000003e2c787aa36367f729",
                "value": "200000000000000000",
                "gas": "240000",
                "estimatedGas": "240000",
                "gasPrice": "106100000000",
                "protocolFee": "0",
                "minimumProtocolFee": "0",
                "buyTokenAddress": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
                "sellTokenAddress": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                "buyAmount": "234610",
                "sellAmount": "200000000000000000",
                "sources": [
                  {
                    "name": "SushiSwap",
                    "proportion": "0"
                  },
                  {
                    "name": "QuickSwap",
                    "proportion": "0"
                  },
                  {
                    "name": "Dfyn",
                    "proportion": "0"
                  },
                  {
                    "name": "mStable",
                    "proportion": "0"
                  },
                  {
                    "name": "Curve",
                    "proportion": "0"
                  },
                  {
                    "name": "DODO_V2",
                    "proportion": "0"
                  },
                  {
                    "name": "DODO",
                    "proportion": "0"
                  },
                  {
                    "name": "Curve_V2",
                    "proportion": "0"
                  },
                  {
                    "name": "WaultSwap",
                    "proportion": "1"
                  },
                  {
                    "name": "ApeSwap",
                    "proportion": "0"
                  },
                  {
                    "name": "FirebirdOneSwap",
                    "proportion": "0"
                  },
                  {
                    "name": "Balancer_V2",
                    "proportion": "0"
                  },
                  {
                    "name": "KyberDMM",
                    "proportion": "0"
                  },
                  {
                    "name": "LiquidityProvider",
                    "proportion": "0"
                  },
                  {
                    "name": "MultiHop",
                    "proportion": "0"
                  },
                  {
                    "name": "IronSwap",
                    "proportion": "0"
                  },
                  {
                    "name": "Aave_V2",
                    "proportion": "0"
                  },
                  {
                    "name": "Uniswap_V3",
                    "proportion": "0"
                  },
                  {
                    "name": "Synapse",
                    "proportion": "0"
                  },
                  {
                    "name": "MeshSwap",
                    "proportion": "0"
                  },
                  {
                    "name": "WOOFi",
                    "proportion": "0"
                  }
                ],
                "orders": [
                  {
                    "type": 0,
                    "source": "WaultSwap",
                    "makerToken": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
                    "takerToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
                    "makerAmount": "234610",
                    "takerAmount": "200000000000000000",
                    "fillData": {
                      "tokenAddressPath": [
                        "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
                        "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
                      ],
                      "router": "0x3a1d87f206d12415f5b0a33e786967680aab4f6d"
                    },
                    "fill": {
                      "input": "200000000000000000",
                      "output": "234610",
                      "adjustedOutput": "223439",
                      "gas": 90000
                    },
                    "sourcePathId": "0xffd3876b013742cbc44886bc7ee79e5f8586c33d5fda688acc597e8821b27a81"
                  }
                ],
                "allowanceTarget": "0x0000000000000000000000000000000000000000",
                "decodedUniqueId": "3e2c787aa3-1667757865",
                "sellTokenToEthRate": "1",
                "buyTokenToEthRate": "1.169832",
                "expectedSlippage": null
              },
              "fromAmountUSD": "0.23",
              "toAmountUSD": "0.23"
            },
            "integrator": "lifi-sdk"
          },
          {
            "id": "0xd96353a2ce1c7acfd68d387421ab0b9d01cd464e71dc034a597b4ed6aa0417f6",
            "type": "cross",
            "tool": "connext",
            "toolDetails": {
              "key": "connext",
              "name": "Connext",
              "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/connext.png"
            },
            "action": {
              "fromChainId": 137,
              "toChainId": 100,
              "fromToken": {
                "address": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
                "chainId": 137,
                "symbol": "USDT",
                "decimals": 6,
                "name": "(PoS) Tether USD",
                "priceUSD": "1",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/0xc2132d05d31c914a87c6611c10748aeb04b58e8f/66eadee7b7bb16b75e02b570ab8d5c01.png",
                "coinKey": "USDT"
              },
              "toToken": {
                "address": "0x4ecaba5870353805a9f068101a40e0f32ed605c6",
                "chainId": 100,
                "symbol": "USDT",
                "decimals": 6,
                "name": "Tether USD on xDai",
                "priceUSD": "1",
                "logoURI": "https://static.debank.com/image/xdai_token/logo_url/0x4ecaba5870353805a9f068101a40e0f32ed605c6/66eadee7b7bb16b75e02b570ab8d5c01.png",
                "coinKey": "USDT"
              },
              "fromAmount": "234610",
              "slippage": 0.03,
              "fromAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
              "toAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f"
            },
            "estimate": {
              "fromAmount": "234610",
              "toAmount": "218085",
              "toAmountMin": "218085",
              "approvalAddress": "0x6090De2EC76eb1Dc3B5d632734415c93c44Fd113",
              "executionDuration": 220,
              "feeCosts": [
                {
                  "name": "Gas Fee",
                  "description": "Covers gas expense for sending funds to user on receiving chain.",
                  "percentage": "0.0657",
                  "token": {
                    "address": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
                    "decimals": 6,
                    "symbol": "USDT",
                    "chainId": 137,
                    "coinKey": "USDT",
                    "name": "USDT",
                    "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
                  },
                  "amount": "15407",
                  "amountUSD": "0.00"
                },
                {
                  "name": "Relay Fee",
                  "description": "Covers gas expense for claiming user funds on receiving chain.",
                  "percentage": "0.0017",
                  "token": {
                    "address": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
                    "decimals": 6,
                    "symbol": "USDT",
                    "chainId": 137,
                    "coinKey": "USDT",
                    "name": "USDT",
                    "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
                  },
                  "amount": "395",
                  "amountUSD": "0.00"
                },
                {
                  "name": "Router Fee",
                  "description": "Router service fee.",
                  "percentage": "0.0005",
                  "token": {
                    "address": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
                    "decimals": 6,
                    "symbol": "USDT",
                    "chainId": 137,
                    "coinKey": "USDT",
                    "name": "USDT",
                    "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
                  },
                  "amount": "118",
                  "amountUSD": "0.00"
                }
              ],
              "gasCosts": [
                {
                  "type": "SEND",
                  "price": "87438825461",
                  "estimate": "140000",
                  "limit": "175000",
                  "amount": "12241435564540000",
                  "amountUSD": "0.01",
                  "token": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "chainId": 137,
                    "symbol": "MATIC",
                    "decimals": 18,
                    "name": "MATIC",
                    "priceUSD": "1.171523",
                    "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                    "coinKey": "MATIC"
                  }
                }
              ],
              "data": {
                "bid": {
                  "user": "0x997f29174a766A1DA04cf77d135d59Dd12FB54d1",
                  "router": "0x6Db8506a7454c5A83b9E68dFC89FD7413CE97a5d",
                  "initiator": "0x997f29174a766A1DA04cf77d135d59Dd12FB54d1",
                  "sendingChainId": 137,
                  "sendingAssetId": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
                  "amount": "234610",
                  "receivingChainId": 100,
                  "receivingAssetId": "0x4ecaba5870353805a9f068101a40e0f32ed605c6",
                  "amountReceived": "219085",
                  "receivingAddress": "0x997f29174a766A1DA04cf77d135d59Dd12FB54d1",
                  "transactionId": "0xf184efb6fb3fea42e1f2d5efa6d199871f287a7aaf2c1a23b2c76fe5bff0ad2a",
                  "expiry": 1668017065,
                  "callDataHash": "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
                  "callTo": "0x0000000000000000000000000000000000000000",
                  "encryptedCallData": "0x",
                  "sendingChainTxManagerAddress": "0x6090De2EC76eb1Dc3B5d632734415c93c44Fd113",
                  "receivingChainTxManagerAddress": "0x115909BDcbaB21954bEb4ab65FC2aBEE9866fa93",
                  "bidExpiry": 1667758168
                },
                "bidSignature": null,
                "gasFeeInReceivingToken": "15407",
                "totalFee": "15920",
                "metaTxRelayerFee": "395",
                "routerFee": "118",
                "serverSign": true
              },
              "fromAmountUSD": "0.23",
              "toAmountUSD": "0.22"
            },
            "integrator": "lifi-sdk"
          },
          {
            "id": "59112343-666b-475e-8147-fc1daeeeba0a",
            "type": "swap",
            "tool": "1inch",
            "toolDetails": {
              "key": "1inch",
              "name": "1inch",
              "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/oneinch.png"
            },
            "action": {
              "fromChainId": 100,
              "toChainId": 100,
              "fromToken": {
                "address": "0x4ecaba5870353805a9f068101a40e0f32ed605c6",
                "chainId": 100,
                "symbol": "USDT",
                "decimals": 6,
                "name": "Tether USD on xDai",
                "priceUSD": "1",
                "logoURI": "https://static.debank.com/image/xdai_token/logo_url/0x4ecaba5870353805a9f068101a40e0f32ed605c6/66eadee7b7bb16b75e02b570ab8d5c01.png",
                "coinKey": "USDT"
              },
              "toToken": {
                "address": "0x0000000000000000000000000000000000000000",
                "chainId": 100,
                "symbol": "xDai",
                "decimals": 18,
                "name": "xDai",
                "priceUSD": "0.9994",
                "logoURI": "https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png",
                "coinKey": "XDAI"
              },
              "fromAmount": "218085",
              "slippage": 0.03,
              "fromAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
              "toAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f"
            },
            "estimate": {
              "fromAmount": "218085",
              "toAmount": "217979642221994513",
              "toAmountMin": "211440252955334678",
              "approvalAddress": "0x1111111254fb6c44bac0bed2854e76f90643097d",
              "executionDuration": 30,
              "feeCosts": [],
              "data": {
                "fromToken": {
                  "name": "Tether on xDai",
                  "address": "0x4ecaba5870353805a9f068101a40e0f32ed605c6",
                  "symbol": "USDT",
                  "decimals": 6,
                  "logoURI": "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png",
                  "tags": [
                    "tokens",
                    "PEG:USD"
                  ]
                },
                "toToken": {
                  "name": "xDAI",
                  "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                  "symbol": "xDAI",
                  "decimals": 18,
                  "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png",
                  "tags": [
                    "native"
                  ]
                },
                "toTokenAmount": "218584349943957540",
                "fromTokenAmount": "218690",
                "protocols": [
                  [
                    [
                      {
                        "name": "GNOSIS_CURVE",
                        "part": 100,
                        "fromTokenAddress": "0x4ecaba5870353805a9f068101a40e0f32ed605c6",
                        "toTokenAddress": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
                      }
                    ]
                  ]
                ],
                "estimatedGas": 320262
              },
              "fromAmountUSD": "0.22",
              "toAmountUSD": "0.22"
            },
            "integrator": "lifi-sdk"
          }
        ]
      }
    ],
    "tags": []
  },
  {
    "id": "0x53742ea5501cff95f07704784c28e0ba299701df02a52a27769450130e06a0af",
    "fromChainId": 137,
    "fromAmountUSD": "0.23",
    "fromAmount": "200000000000000000",
    "fromToken": {
      "address": "0x0000000000000000000000000000000000000000",
      "chainId": 137,
      "symbol": "MATIC",
      "decimals": 18,
      "name": "MATIC",
      "priceUSD": "1.171523",
      "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
      "coinKey": "MATIC"
    },
    "fromAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
    "toChainId": 100,
    "toAmountUSD": "0.21",
    "toAmount": "210506338458841171",
    "toAmountMin": "204191148305075935",
    "toToken": {
      "address": "0x0000000000000000000000000000000000000000",
      "chainId": 100,
      "symbol": "xDai",
      "decimals": 18,
      "name": "xDai",
      "priceUSD": "0.9994",
      "logoURI": "https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png",
      "coinKey": "XDAI"
    },
    "toAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
    "gasCostUSD": "0.03",
    "containsSwitchChain": false,
    "steps": [
      {
        "id": "a257663f-7deb-454e-9c23-282c9e3889b0",
        "type": "lifi",
        "tool": "connext",
        "toolDetails": {
          "key": "connext",
          "name": "Connext",
          "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/connext.png"
        },
        "action": {
          "fromChainId": 137,
          "toChainId": 100,
          "fromToken": {
            "address": "0x0000000000000000000000000000000000000000",
            "chainId": 137,
            "symbol": "MATIC",
            "decimals": 18,
            "name": "MATIC",
            "priceUSD": "1.171523",
            "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
            "coinKey": "MATIC"
          },
          "toToken": {
            "address": "0x0000000000000000000000000000000000000000",
            "chainId": 100,
            "symbol": "xDai",
            "decimals": 18,
            "name": "xDai",
            "priceUSD": "0.9994",
            "logoURI": "https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png",
            "coinKey": "XDAI"
          },
          "fromAmount": "200000000000000000",
          "slippage": 0.03,
          "fromAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
          "toAddress": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2"
        },
        "estimate": {
          "fromAmount": "200000000000000000",
          "toAmount": "210506338458841171",
          "toAmountMin": "204191148305075935",
          "approvalAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
          "executionDuration": 280,
          "gasCosts": [
            {
              "type": "SEND",
              "price": "87438825461",
              "estimate": "350294",
              "limit": "437868",
              "amount": "30629295926035534",
              "amountUSD": "0.03",
              "token": {
                "address": "0x0000000000000000000000000000000000000000",
                "chainId": 137,
                "symbol": "MATIC",
                "decimals": 18,
                "name": "MATIC",
                "priceUSD": "1.171523",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                "coinKey": "MATIC"
              }
            }
          ],
          "data": {
            "inToken": {
              "symbol": "MATIC",
              "name": "Matic Token",
              "address": "0x0000000000000000000000000000000000001010",
              "decimals": 18
            },
            "outToken": {
              "symbol": "USDC",
              "name": "USD Coin (PoS)",
              "address": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
              "decimals": 6
            },
            "inAmount": "200000000000000000",
            "outAmount": "233946",
            "estimatedGas": 210294,
            "minOutAmount": "226928",
            "from": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
            "to": "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
            "value": "200000000000000000",
            "gasPrice": "87438825461",
            "data": "0x90411a3200000000000000000000000010d443594cbe2ecc2574df8710ffc6a9a2f46c74000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000010100000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000010d443594cbe2ecc2574df8710ffc6a9a2f46c74000000000000000000000000e82dd53f88a5e188e3dc01038591fffc5255c9e200000000000000000000000000000000000000000000000002c68af0bb140000000000000000000000000000000000000000000000000000000000000003767000000000000000000000000000000000000000000000000000000000000391da0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000933a06c631ed8b5e4f3848c91a1cfc45e5c7eab300000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000044000000000000000000000000000000000000000000000000000000000000005600000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c68af0bb14000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000002449f8654220000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf127000000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000004400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000104e5b07cdb000000000000000000000000ae81fac689a1b4b1e06e7ef4a2ab4cd8ac0a087d0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000010d443594cbe2ecc2574df8710ffc6a9a2f46c7400000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000002b0d500b1d8e8ef31e21c99d1db9a6444d3adf12700000002791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000648a6a1e850000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000353c1f0bc78fbbc245b3c93ef77b1dcc5b77d2a027100000000000000000000000000000000000000000000000000000000391da00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001a49f8654220000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000004400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000064d1660f990000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000e82dd53f88a5e188e3dc01038591fffc5255c9e200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
          },
          "fromAmountUSD": "0.23",
          "toAmountUSD": "0.21"
        },
        "integrator": "lifi-sdk",
        "includedSteps": [
          {
            "id": "a257663f-7deb-454e-9c23-282c9e3889b0",
            "type": "swap",
            "tool": "openocean",
            "toolDetails": {
              "key": "openocean",
              "name": "OpenOcean",
              "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/openocean.png"
            },
            "action": {
              "fromChainId": 137,
              "toChainId": 137,
              "fromToken": {
                "address": "0x0000000000000000000000000000000000000000",
                "chainId": 137,
                "symbol": "MATIC",
                "decimals": 18,
                "name": "MATIC",
                "priceUSD": "1.171523",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                "coinKey": "MATIC"
              },
              "toToken": {
                "address": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
                "chainId": 137,
                "symbol": "USDC",
                "decimals": 6,
                "name": "USD Coin (PoS)",
                "priceUSD": "1",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/0x2791bca1f2de4661ed88a30c99a7a9449aa84174/fffcd27b9efff5a86ab942084c05924d.png",
                "coinKey": "USDC"
              },
              "fromAmount": "200000000000000000",
              "slippage": 0.03,
              "fromAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
              "toAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f"
            },
            "estimate": {
              "fromAmount": "200000000000000000",
              "toAmount": "233946",
              "toAmountMin": "226928",
              "approvalAddress": "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
              "executionDuration": 30,
              "gasCosts": [
                {
                  "type": "SEND",
                  "price": "87438825461",
                  "estimate": "210294",
                  "limit": "262868",
                  "amount": "18387860361495534",
                  "amountUSD": "0.02",
                  "token": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "chainId": 137,
                    "symbol": "MATIC",
                    "decimals": 18,
                    "name": "MATIC",
                    "priceUSD": "1.171523",
                    "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                    "coinKey": "MATIC"
                  }
                }
              ],
              "data": {
                "inToken": {
                  "symbol": "MATIC",
                  "name": "Matic Token",
                  "address": "0x0000000000000000000000000000000000001010",
                  "decimals": 18
                },
                "outToken": {
                  "symbol": "USDC",
                  "name": "USD Coin (PoS)",
                  "address": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
                  "decimals": 6
                },
                "inAmount": "200000000000000000",
                "outAmount": "233946",
                "estimatedGas": 210294,
                "minOutAmount": "226928",
                "from": "0xE82dd53F88a5e188E3DC01038591fFFc5255c9E2",
                "to": "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
                "value": "200000000000000000",
                "gasPrice": "87438825461",
                "data": "0x90411a3200000000000000000000000010d443594cbe2ecc2574df8710ffc6a9a2f46c74000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000010100000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000010d443594cbe2ecc2574df8710ffc6a9a2f46c74000000000000000000000000e82dd53f88a5e188e3dc01038591fffc5255c9e200000000000000000000000000000000000000000000000002c68af0bb140000000000000000000000000000000000000000000000000000000000000003767000000000000000000000000000000000000000000000000000000000000391da0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000933a06c631ed8b5e4f3848c91a1cfc45e5c7eab300000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000044000000000000000000000000000000000000000000000000000000000000005600000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c68af0bb14000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000002449f8654220000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf127000000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000004400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000104e5b07cdb000000000000000000000000ae81fac689a1b4b1e06e7ef4a2ab4cd8ac0a087d0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000010d443594cbe2ecc2574df8710ffc6a9a2f46c7400000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000002b0d500b1d8e8ef31e21c99d1db9a6444d3adf12700000002791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000648a6a1e850000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000353c1f0bc78fbbc245b3c93ef77b1dcc5b77d2a027100000000000000000000000000000000000000000000000000000000391da00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001a49f8654220000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000004400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000064d1660f990000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000e82dd53f88a5e188e3dc01038591fffc5255c9e200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
              },
              "fromAmountUSD": "0.23",
              "toAmountUSD": "0.23"
            },
            "integrator": "lifi-sdk"
          },
          {
            "id": "0x6eb74638a811c7b46bbf25ed9dd4128ca8c36d52f1f82b2cb45cdb397d8a191a",
            "type": "cross",
            "tool": "connext",
            "toolDetails": {
              "key": "connext",
              "name": "Connext",
              "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/connext.png"
            },
            "action": {
              "fromChainId": 137,
              "toChainId": 100,
              "fromToken": {
                "address": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
                "chainId": 137,
                "symbol": "USDC",
                "decimals": 6,
                "name": "USD Coin (PoS)",
                "priceUSD": "1",
                "logoURI": "https://static.debank.com/image/matic_token/logo_url/0x2791bca1f2de4661ed88a30c99a7a9449aa84174/fffcd27b9efff5a86ab942084c05924d.png",
                "coinKey": "USDC"
              },
              "toToken": {
                "address": "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
                "chainId": 100,
                "symbol": "USDC",
                "decimals": 6,
                "name": "USD//C on xDai",
                "priceUSD": "1",
                "logoURI": "https://static.debank.com/image/xdai_token/logo_url/0xddafbb505ad214d7b80b1f830fccc89b60fb7a83/fffcd27b9efff5a86ab942084c05924d.png",
                "coinKey": "USDC"
              },
              "fromAmount": "226928",
              "slippage": 0.03,
              "fromAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
              "toAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f"
            },
            "estimate": {
              "fromAmount": "226928",
              "toAmount": "210405",
              "toAmountMin": "210405",
              "approvalAddress": "0x6090De2EC76eb1Dc3B5d632734415c93c44Fd113",
              "executionDuration": 220,
              "feeCosts": [
                {
                  "name": "Gas Fee",
                  "description": "Covers gas expense for sending funds to user on receiving chain.",
                  "percentage": "0.0679",
                  "token": {
                    "address": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
                    "decimals": 6,
                    "symbol": "USDC",
                    "chainId": 137,
                    "coinKey": "USDC",
                    "name": "USDC",
                    "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png"
                  },
                  "amount": "15409",
                  "amountUSD": "0.00"
                },
                {
                  "name": "Relay Fee",
                  "description": "Covers gas expense for claiming user funds on receiving chain.",
                  "percentage": "0.0017",
                  "token": {
                    "address": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
                    "decimals": 6,
                    "symbol": "USDC",
                    "chainId": 137,
                    "coinKey": "USDC",
                    "name": "USDC",
                    "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png"
                  },
                  "amount": "395",
                  "amountUSD": "0.00"
                },
                {
                  "name": "Router Fee",
                  "description": "Router service fee.",
                  "percentage": "0.0005",
                  "token": {
                    "address": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
                    "decimals": 6,
                    "symbol": "USDC",
                    "chainId": 137,
                    "coinKey": "USDC",
                    "name": "USDC",
                    "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png"
                  },
                  "amount": "114",
                  "amountUSD": "0.00"
                }
              ],
              "gasCosts": [
                {
                  "type": "SEND",
                  "price": "87438825461",
                  "estimate": "140000",
                  "limit": "175000",
                  "amount": "12241435564540000",
                  "amountUSD": "0.01",
                  "token": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "chainId": 137,
                    "symbol": "MATIC",
                    "decimals": 18,
                    "name": "MATIC",
                    "priceUSD": "1.171523",
                    "logoURI": "https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png",
                    "coinKey": "MATIC"
                  }
                }
              ],
              "data": {
                "bid": {
                  "user": "0x997f29174a766A1DA04cf77d135d59Dd12FB54d1",
                  "router": "0x6Db8506a7454c5A83b9E68dFC89FD7413CE97a5d",
                  "initiator": "0x997f29174a766A1DA04cf77d135d59Dd12FB54d1",
                  "sendingChainId": 137,
                  "sendingAssetId": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
                  "amount": "226928",
                  "receivingChainId": 100,
                  "receivingAssetId": "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
                  "amountReceived": "211405",
                  "receivingAddress": "0x997f29174a766A1DA04cf77d135d59Dd12FB54d1",
                  "transactionId": "0xd5aec86156895309b2b3195249e31047a23f95e62c168c28151eb2c413e19f1f",
                  "expiry": 1668017065,
                  "callDataHash": "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
                  "callTo": "0x0000000000000000000000000000000000000000",
                  "encryptedCallData": "0x",
                  "sendingChainTxManagerAddress": "0x6090De2EC76eb1Dc3B5d632734415c93c44Fd113",
                  "receivingChainTxManagerAddress": "0x115909BDcbaB21954bEb4ab65FC2aBEE9866fa93",
                  "bidExpiry": 1667758168
                },
                "bidSignature": null,
                "gasFeeInReceivingToken": "15409",
                "totalFee": "15918",
                "metaTxRelayerFee": "395",
                "routerFee": "114",
                "serverSign": true
              },
              "fromAmountUSD": "0.23",
              "toAmountUSD": "0.22"
            },
            "integrator": "lifi-sdk"
          },
          {
            "id": "7935eb86-fc3f-4d65-a6d3-671ca7b62abc",
            "type": "swap",
            "tool": "1inch",
            "toolDetails": {
              "key": "1inch",
              "name": "1inch",
              "logoURI": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/oneinch.png"
            },
            "action": {
              "fromChainId": 100,
              "toChainId": 100,
              "fromToken": {
                "address": "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
                "chainId": 100,
                "symbol": "USDC",
                "decimals": 6,
                "name": "USD//C on xDai",
                "priceUSD": "1",
                "logoURI": "https://static.debank.com/image/xdai_token/logo_url/0xddafbb505ad214d7b80b1f830fccc89b60fb7a83/fffcd27b9efff5a86ab942084c05924d.png",
                "coinKey": "USDC"
              },
              "toToken": {
                "address": "0x0000000000000000000000000000000000000000",
                "chainId": 100,
                "symbol": "xDai",
                "decimals": 18,
                "name": "xDai",
                "priceUSD": "0.9994",
                "logoURI": "https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png",
                "coinKey": "XDAI"
              },
              "fromAmount": "210405",
              "slippage": 0.03,
              "fromAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f",
              "toAddress": "0x362fA9D0bCa5D19f743Db50738345ce2b40eC99f"
            },
            "estimate": {
              "fromAmount": "210405",
              "toAmount": "210506338458841171",
              "toAmountMin": "204191148305075935",
              "approvalAddress": "0x1111111254fb6c44bac0bed2854e76f90643097d",
              "executionDuration": 30,
              "feeCosts": [],
              "data": {
                "fromToken": {
                  "name": "USD//C on xDai",
                  "address": "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
                  "symbol": "USDC",
                  "decimals": 6,
                  "logoURI": "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
                  "eip2612": true,
                  "tags": [
                    "tokens"
                  ]
                },
                "toToken": {
                  "name": "xDAI",
                  "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                  "symbol": "xDAI",
                  "decimals": 18,
                  "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png",
                  "tags": [
                    "native"
                  ]
                },
                "toTokenAmount": "211111629848150355",
                "fromTokenAmount": "211010",
                "protocols": [
                  [
                    [
                      {
                        "name": "GNOSIS_SWAPR",
                        "part": 100,
                        "fromTokenAddress": "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
                        "toTokenAddress": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
                      }
                    ]
                  ]
                ],
                "estimatedGas": 252364
              },
              "fromAmountUSD": "0.21",
              "toAmountUSD": "0.21"
            },
            "integrator": "lifi-sdk"
          }
        ]
      }
    ],
    "tags": []
  }
];

const AssetBridgeTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  values,
}: IAssetBridgeTransactionBlock) => {
  const { sdk, providerAddress, accountAddress } = useEtherspot();

  const [amount, setAmount] = useState<string>(values?.amount ?? '');
  const [selectedFromAsset, setSelectedFromAsset] = useState<IAssetWithBalance | null>(values?.fromAsset ?? null);
  const [selectedToAsset, setSelectedToAsset] = useState<IAssetWithBalance | null>(values?.toAsset ?? null);
  const [selectedAccountType, setSelectedAccountType] = useState<string>(values?.accountType ?? AccountTypes.Contract);
  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(values?.fromChain ?? null);
  const [selectedToNetwork, setSelectedToNetwork] = useState<Chain | null>(values?.toChain ?? null);
  const [selectedRoute, setSelectedRoute] = useState<SelectOption | null>(null);
  // @ts-ignore
  const [availableRoutes, setAvailableRoutes] = useState<Route[] | null>(defaultRoutes);

  const defaultCustomReceiverAddress = values?.receiverAddress
    && !addressesEqual(providerAddress, values?.receiverAddress)
    && !addressesEqual(accountAddress, values?.receiverAddress)
    ? values.receiverAddress
    : null;
  const [customReceiverAddress, setCustomReceiverAddress] = useState<string | null>(defaultCustomReceiverAddress);
  const [useCustomAddress, setUseCustomAddress] = useState<boolean>(!!defaultCustomReceiverAddress);

  const defaultSelectedReceiveAccountType = (!values?.receiverAddress && values?.accountType === AccountTypes.Key)
    || (values?.receiverAddress && values?.accountType === AccountTypes.Contract && addressesEqual(providerAddress, values?.receiverAddress))
    ? AccountTypes.Key
    : AccountTypes.Contract;
  const [selectedReceiveAccountType, setSelectedReceiveAccountType] = useState<string>(defaultSelectedReceiveAccountType);

  const [isLoadingAvailableRoutes, setIsLoadingAvailableRoutes] = useState<boolean>(false);

  const {
    setTransactionBlockValues,
    resetTransactionBlockFieldValidationError,
    setTransactionBlockFieldValidationError,
  } = useTransactionBuilder();

  const theme: Theme = useTheme()

  useEffect(() => {
    if (selectedFromNetwork?.chainId === selectedToNetwork?.chainId) {
      setSelectedToNetwork(null);
      setSelectedToAsset(null);
    }
  }, [selectedFromNetwork, selectedToNetwork]);

  useEffect(() => {
    setSelectedRoute(null);
    resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'toAsset');
  }, [selectedToNetwork, selectedFromNetwork]);

  const receiverAddress = useMemo(() => {
    if (useCustomAddress) return customReceiverAddress;
    if (selectedReceiveAccountType === selectedAccountType) return null;
    return selectedReceiveAccountType === AccountTypes.Key
      ? providerAddress
      : accountAddress;
  }, [
    useCustomAddress,
    customReceiverAddress,
    providerAddress,
    selectedReceiveAccountType,
    selectedAccountType,
    accountAddress,
  ]);

  const updateAvailableRoutes = useCallback(debounce(async () => {
    setSelectedRoute(null);
    // setAvailableRoutes([]);

    if (!sdk
      || !selectedToAsset
      || !selectedFromAsset
      || !amount
      || !selectedFromNetwork?.chainId
      || !selectedToNetwork?.chainId
      || !isValidAmount(amount)) return;

    if (receiverAddress && !isValidEthereumAddress(receiverAddress)) {
      setTransactionBlockFieldValidationError(
        transactionBlockId,
        'receiverAddress',
        'Invalid receiver address',
      );
      return;
    }

    setIsLoadingAvailableRoutes(true);

    try {
      const { items: routes } = await sdk.getAdvanceRoutesLiFi({
        fromChainId: selectedFromNetwork.chainId,
        toChainId: selectedToNetwork.chainId,
        fromAmount: ethers.utils.parseUnits(amount, selectedFromAsset.decimals),
        fromTokenAddress: selectedFromAsset.address,
        toTokenAddress: selectedToAsset.address,
        toAddress: receiverAddress ?? undefined,
      });
      setAvailableRoutes(routes);
      if (routes.length === 1) setSelectedRoute(mapRouteToOption(routes[0]));
    } catch (e) {
      //
    }

    setIsLoadingAvailableRoutes(false);
  }, 200), [
    sdk,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedFromNetwork,
    selectedToNetwork,
    receiverAddress,
  ]);

  useEffect(() => { updateAvailableRoutes(); }, [updateAvailableRoutes]);

  const onAmountChange = useCallback((newAmount: string) => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    const decimals = selectedToAsset?.decimals ?? 18;
    const updatedAmount = formatAssetAmountInput(newAmount, decimals);
    setAmount(updatedAmount)
  }, [selectedFromAsset, selectedToAsset]);

  useEffect(() => {
    const route = availableRoutes?.find((availableRoute) => availableRoute.id === selectedRoute?.value);
    setTransactionBlockValues(transactionBlockId, {
      fromChain: selectedFromNetwork ?? undefined,
      toChain: selectedToNetwork ?? undefined,
      fromAsset: selectedFromAsset ?? undefined,
      toAsset: selectedToAsset ?? undefined,
      receiverAddress: receiverAddress ?? undefined,
      accountType: selectedAccountType,
      amount,
      route,
    });
  }, [
    selectedFromNetwork,
    selectedToNetwork,
    selectedFromAsset,
    selectedToAsset,
    amount,
    selectedRoute,
    receiverAddress,
    selectedAccountType,
  ]);

  const availableRoutesOptions = useMemo(
    () => availableRoutes?.map(mapRouteToOption),
    [availableRoutes],
  );

  const remainingSelectedFromAssetBalance = useMemo(() => {
    if (!selectedFromAsset?.balance || selectedFromAsset.balance.isZero()) return 0;

    if (!amount) return +ethers.utils.formatUnits(selectedFromAsset.balance, selectedFromAsset.decimals);

    const assetAmountBN = ethers.utils.parseUnits(amount, selectedFromAsset.decimals);
    return +ethers.utils.formatUnits(selectedFromAsset.balance.sub(assetAmountBN), selectedFromAsset.decimals);
  }, [amount, selectedFromAsset]);


  const renderOption = (option: SelectOption) => {
    const availableRoute = availableRoutes?.find((route) => route.id === option.value);
    const valueToReceive = availableRoute?.toAmountMin && formatAmountDisplay(ethers.utils.formatUnits(availableRoute.toAmountMin, availableRoute?.toToken?.decimals));
    const [firstStep] = availableRoute?.steps ?? [];
    {/* Etherspot SDK typing fails */}
    {/* @ts-ignore */}
    const [{ toolDetails: firstStepViaService }] = firstStep?.includedSteps ?? [];
    const twoDetailsRows = !!(availableRoute?.gasCostUSD || firstStep?.estimate?.executionDuration);
    return (
      <OfferDetails>
        <CombinedRoundedImages
          title={option.title}
          url={option.iconUrl}
          smallImageTitle={bridgeServiceIdToDetails['lifi'].title}
          smallImageUrl={bridgeServiceIdToDetails['lifi'].iconUrl}
          size={24}
        />
        <OfferDetailsRowsWrapper>
          <OfferDetailsRow marginBottom={twoDetailsRows ? 4 : undefined}>
            {!!valueToReceive && <Text size={14} medium>{valueToReceive} {availableRoute?.toToken?.symbol}</Text>}
            <Text size={14} marginLeft={6} color={theme?.color?.text?.innerLabel} inline medium>
              {option.title}
              {firstStepViaService?.name !== option.title && ` via ${firstStepViaService?.name}`}
            </Text>
          </OfferDetailsRow>
          {twoDetailsRows && (
            <OfferDetailsRow>
              {!!availableRoute?.gasCostUSD && (
                <>
                  <Text size={12} marginRight={4} color={theme.color?.text?.innerLabel} medium>Gas price</Text>
                  <Text size={14} marginRight={22} medium inline>{formatAmountDisplay(availableRoute.gasCostUSD, '$')}</Text>
                </>
              )}
              {!!firstStep?.estimate?.executionDuration && (
                <>
                  <Text size={12} marginRight={4} color={theme.color?.text?.innerLabel} medium>Time</Text>
                  <Text size={14} medium inline>{Math.ceil(+firstStep.estimate.executionDuration / 60)} min</Text>
                </>
              )}
            </OfferDetailsRow>
          )}
        </OfferDetailsRowsWrapper>
        {selectedRoute?.value && selectedRoute?.value === option.value && (
          <OfferChecked>
            <BiCheck size={14} />
          </OfferChecked>
        )}
      </OfferDetails>
    );
  };

  return (
    <>
      <Title>Asset bridge</Title>
      <AccountSwitchInput
        label="From wallet"
        selectedAccountType={selectedAccountType}
        onChange={(accountType) => {
          if (accountType !== selectedAccountType) {
            setSelectedFromNetwork(null);
            setSelectedFromAsset(null);
            setSelectedToNetwork(null);
            setSelectedToAsset(null);
            setAvailableRoutes(null);
            setSelectedRoute(null);
          }
          setSelectedAccountType(accountType);
        }}
        errorMessage={errorMessages?.accountType}
      />
      <NetworkAssetSelectInput
        label="From"
        onAssetSelect={(asset, amountBN) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAsset');
          setSelectedFromAsset(asset);
          setAmount(amountBN ? formatMaxAmount(amountBN, asset.decimals) : '');
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'fromChain');
          setSelectedFromNetwork(network);
        }}
        selectedNetwork={selectedFromNetwork}
        selectedAsset={selectedFromAsset}
        errorMessage={errorMessages?.fromChain || errorMessages?.fromAsset}
        walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
        showPositiveBalanceAssets
        showQuickInputButtons
      />
      <NetworkAssetSelectInput
        label="To"
        onAssetSelect={(asset) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'toAsset');
          setSelectedToAsset(asset);
        }}
        onNetworkSelect={(network) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'toChain');
          setSelectedToNetwork(network);
        }}
        selectedNetwork={selectedToNetwork}
        selectedAsset={selectedToAsset}
        errorMessage={errorMessages?.toChain || errorMessages?.toAsset}
        disabled={!selectedFromNetwork || !selectedFromAsset}
        hideChainIds={selectedFromNetwork ? [selectedFromNetwork.chainId] : undefined}
        walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
      />
      {selectedFromAsset && selectedFromNetwork && (
        <TextInput
          label="You swap"
          onValueChange={onAmountChange}
          value={amount}
          placeholder="0"
          inputBottomText={selectedFromAsset?.assetPriceUsd && amount ? `${formatAmountDisplay(+amount * selectedFromAsset.assetPriceUsd, '$')}` : undefined}
          inputLeftComponent={
            <CombinedRoundedImages
              url={selectedFromAsset.logoURI}
              smallImageUrl={selectedFromNetwork.iconUrl}
              title={selectedFromAsset.symbol}
              smallImageTitle={selectedFromNetwork.title}
            />
          }
          inputTopRightComponent={
            <Pill
              label="Remaining"
              value={`${formatAmountDisplay(remainingSelectedFromAssetBalance ?? 0)} ${selectedFromAsset.symbol}`}
              valueColor={(remainingSelectedFromAssetBalance ?? 0) < 0 ? theme.color?.text?.errorMessage : undefined}
            />
          }
          errorMessage={errorMessages?.amount}
        />
      )}
      <WalletReceiveWrapper>
        <AccountSwitchInput
          label="You will receive on"
          selectedAccountType={selectedReceiveAccountType}
          onChange={setSelectedReceiveAccountType}
          disabled={useCustomAddress}
          inlineLabel
        />
      </WalletReceiveWrapper>
      <Checkbox
        label="Use custom address"
        isChecked={useCustomAddress}
        onChange={(isChecked) => {
          resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
          setUseCustomAddress(isChecked);
          if (!isChecked) setCustomReceiverAddress(null);
        }}
        rightAlign
      />
      {useCustomAddress && (
        <TextInput
          value={customReceiverAddress ?? ''}
          onValueChange={(value) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
            setCustomReceiverAddress(value);
          }}
          errorMessage={errorMessages?.receiverAddress}
          placeholder="Insert address"
          noLabel
          showPasteButton
        />
      )}
      {/*{!!selectedToAsset && !!selectedFromAsset && !!amount && (remainingSelectedFromAssetBalance ?? 0) >= 0 && (*/}
        <SelectInput
          label={`Route`}
          options={availableRoutesOptions ?? []}
          isLoading={isLoadingAvailableRoutes}
          selectedOption={selectedRoute}
          onOptionSelect={(option) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'route');
            setSelectedRoute(option);
          }}
          placeholder="Select route"
          renderOptionListItemContent={renderOption}
          renderSelectedOptionContent={renderOption}
          errorMessage={errorMessages?.route}
          disabled={!availableRoutesOptions?.length || isLoadingAvailableRoutes}
          noOpen={!!selectedRoute && availableRoutesOptions?.length === 1}
          forceShow={!!availableRoutesOptions?.length && availableRoutesOptions?.length > 1}
        />
      {/*)}*/}
    </>
  );
};

export default AssetBridgeTransactionBlock;

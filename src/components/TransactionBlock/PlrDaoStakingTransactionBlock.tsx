import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { AccountTypes, ExchangeOffer, NftList } from 'etherspot';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { ethers } from 'ethers';
import debounce from 'debounce-promise';

// Types
import { IPlrDaoStakingMembershipBlock } from '../../types/transactionBlock';

import TextInput from '../TextInput';
import SelectInput, { SelectOption } from '../SelectInput/SelectInput';
import { useEtherspot, useTransactionBuilder } from '../../hooks';
import {
  formatAmountDisplay,
  formatMaxAmount,
} from '../../utils/common';
import {
  addressesEqual,
  isValidEthereumAddress,
  isValidAmount,
} from '../../utils/validation';
import AccountSwitchInput from '../AccountSwitchInput';
import NetworkAssetSelectInput from '../NetworkAssetSelectInput';
import {
  Chain,
  supportedChains,
  plrDaoAsset,
  plrDaoMemberNFT,
} from '../../utils/chain';
import { swapServiceIdToDetails } from '../../utils/swap';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { RoundedImage } from '../Image';
import { Theme } from '../../utils/theme';
import { DestinationWalletEnum } from '../../enums/wallet.enum';
import Text from '../Text/Text';
export interface IPlrDaoTransactionBlockValues {
  hasEnoughPLR: boolean;
  fromChainId?: number;
  fromAssetAddress?: string;
  fromAssetIconUrl?: string;
  fromAsset?: IAssetWithBalance;
  selectedAsset?: IAssetWithBalance | null;
  toAsset?: TokenListToken;
  fromAssetDecimals?: number;
  fromAssetSymbol?: string;
  amount?: string;
  accountType: AccountTypes;
  receiverAddress?: string;
  offer?: ExchangeOffer;
}

const Title = styled.h3`
  margin: 0 0 18px;
  padding: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.cardTitle};
  font-family: 'PTRootUIWebBold', sans-serif;
`;

const WalletReceiveWrapper = styled.div`
  display: flex;
  flex-direction: row;
`;

const OfferDetails = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  font-family: 'PTRootUIWebMedium', sans-serif;
`;

const Container = styled.div`
  align-items: center;
  font-family: 'PTRootUIWebMedium', sans-serif;
  background: #21002e;
  color: #fefefe;
  padding: 16px;
  margin: 5px;
  border-image: linear-gradient(#346ecd, #cd34a2) 30;
  border-width: 2px;
  border-style: solid;
`;

const Value = styled.div`
  font-family: 'PTRootUIWebMedium', sans-serif;
  color: #57c2d6;
  display: contents;
`;

const Total = styled.div`
  font-family: 'PTRootUIWebMedium', sans-serif;
  color: #ff0065;
  display: contents;
  font-weight: bold;
`;

const HorizontalLine = styled.div`
  margin: 9px 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, #23a9c9, #cd34a2);
`;

const Bold = styled.p`
  font-weight: bold;
`;

//TODO : change color of block if polygon has less than 10,000 plr on keybased / smart wallet
const Block = styled.div`
  font-size: 12px;
  padding: 2px;
  text-indent: 2px;
  display: flex;
  color: ${(props) => props.color === 'red' && '#ff0065'};
`;

const mapOfferToOption = (offer: ExchangeOffer) => {
  const serviceDetails = swapServiceIdToDetails[offer.provider];
  return {
    title: serviceDetails?.title ?? offer.provider,
    value: offer.provider,
    iconUrl: serviceDetails?.iconUrl,
  };
};

// TODO:UNCOMMENT
const MAX_PLR_TOKEN_LIMIT = 5;

const PlrDaoStakingTransactionBlock = ({
  id: transactionBlockId,
  errorMessages,
  values,
  multiCallData,
}: IPlrDaoStakingMembershipBlock) => {
  const {
    smartWalletOnly,
    providerAddress,
    accountAddress,
    sdk,
    getSupportedAssetsWithBalancesForChainId,
  } = useEtherspot();

  const [amount, setAmount] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<SelectOption | null>(
    values?.offer ? mapOfferToOption(values?.offer) : null
  );
  const [availableOffers, setAvailableOffers] = useState<
    ExchangeOffer[] | null
  >(values?.offer ? [values.offer] : null);
  const [isLoadingAvailableOffers, setIsLoadingAvailableOffers] =
    useState<boolean>(false);

  const [selectedFromAsset, setSelectedFromAsset] =
    useState<IAssetWithBalance | null>(values?.selectedAsset ?? null);

  const [selectedAccountType, setSelectedAccountType] = useState<string>(
    AccountTypes.Contract
  );

  const [selectedFromNetwork, setSelectedFromNetwork] = useState<Chain | null>(
    null
  );
  const [keyBasedTotal, setKeyBasedTotal] = useState<number>(0);
  const [smartWalletTotal, setSmartWalletTotal] = useState<number>(0);

  const [totalKeyBasedPLRTokens, setTotalKeyBasedPLRTokens] = useState<number>(0);
  const [totalSmartWalletPLRTokens, setTotalSmartWalletPLRTokens] = useState<number>(0);

  const [accounts, setAccounts] = useState<{}[]>([]);
  const [isNFTMember, setIsNFTMember] = useState<boolean>(false);

  const hasEnoughPLR = totalKeyBasedPLRTokens >= MAX_PLR_TOKEN_LIMIT || totalSmartWalletPLRTokens >= MAX_PLR_TOKEN_LIMIT;

  const fixed = multiCallData?.fixed ?? false;
  const defaultCustomReceiverAddress =
    values?.receiverAddress &&
    !addressesEqual(providerAddress, values?.receiverAddress) &&
    !addressesEqual(accountAddress, values?.receiverAddress)
      ? values.receiverAddress
      : null;
  const [customReceiverAddress, setCustomReceiverAddress] = useState<
    string | null
  >(defaultCustomReceiverAddress);
  const [useCustomAddress, setUseCustomAddress] = useState<boolean>(
    !!defaultCustomReceiverAddress
  );

  const defaultSelectedReceiveAccountType =
    (!values?.receiverAddress && values?.accountType === AccountTypes.Key) ||
    (values?.receiverAddress &&
      values?.accountType === AccountTypes.Contract &&
      addressesEqual(providerAddress, values?.receiverAddress))
      ? AccountTypes.Key
      : AccountTypes.Contract;
  
  const [selectedReceiveAccountType, setSelectedReceiveAccountType] =
    useState<string>(defaultSelectedReceiveAccountType);

  const {
    setTransactionBlockValues,
    resetTransactionBlockFieldValidationError,
    setTransactionBlockFieldValidationError,
  } = useTransactionBuilder();

  useEffect(() => {
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
    resetTransactionBlockFieldValidationError(
      transactionBlockId,
      'toAssetAddress'
    );
  }, [selectedFromNetwork]);

  const getWalletBalance = async (chainId: number, name: string) => {
    const accountBalancePromise = [];
    if (accountAddress && providerAddress) {
      accountBalancePromise.push(getSupportedAssetsWithBalancesForChainId(chainId, true, accountAddress));
      accountBalancePromise.push(getSupportedAssetsWithBalancesForChainId(chainId, true, providerAddress));
    }

    return await Promise.allSettled(accountBalancePromise)
      .then((response: any[]) => {
        const accountWalletBalance = response.map(accountBalance => accountBalance?.status == 'fulfilled' && accountBalance?.value);

        var smartWalletBalance = 0;
        var smartWalletUSD = 0;
        
        var keyBasedBalance = 0;
        var keyBasedUSD = 0;

        accountWalletBalance[0]?.forEach(({ symbol, decimals, balance, balanceWorthUsd}) => {
          if(symbol == "PLR") {
            smartWalletBalance += +ethers.utils.formatUnits(balance, decimals);
          } else {
            smartWalletUSD += balanceWorthUsd;
          }
        });
        accountWalletBalance[1]?.forEach(({ symbol, decimals, balance, balanceWorthUsd}) => {
          if(symbol == "PLR") {
            keyBasedBalance += +ethers.utils.formatUnits(balance, decimals);
          } else {
            keyBasedUSD += balanceWorthUsd;
          }
        });

        return {
          chainName: name,
          keyBasedWallet: keyBasedBalance,
          smartWallet: smartWalletBalance,
          keyBasedUSD: keyBasedUSD,
          smartWalletUSD: smartWalletUSD,
        };
      })
      .catch((error) => {
        return {
          chainName: name,
          keyBasedWallet: 0,
          smartWallet: 0,
          keyBasedUSD: 0,
          smartWalletUSD: 0,
        }
      });
  };

  const getBalanceForAllChains = async () => {
    // TODO:UNCOMMENT
    const chainPromise = [];
    chainPromise.push(getWalletBalance(supportedChains[1].chainId, supportedChains[1].title))
    // chainPromise.push(getWalletBalance(supportedChains[2].chainId, supportedChains[2].title))
    chainPromise.push(getWalletBalance(supportedChains[3].chainId, supportedChains[3].title))
    // chainPromise.push(getWalletBalance(supportedChains[3].chainId, supportedChains[3].title))
    // supportedChains.forEach(async (chain) => {
    //   chainPromise.push(getWalletBalance(chain.chainId, chain.title))
    // });
    return await Promise.allSettled(chainPromise).catch((e) => {
      return [];
    });
  }

  const fetchAllAccountBalances = async () => {
    var accountBalanceWithSupportedChains = await getBalanceForAllChains().then((data) => data.map((d) => d.value));
    accountBalanceWithSupportedChains = accountBalanceWithSupportedChains?.filter(
      (data:any) => data.keyBasedWallet > 0 || data.smartWallet,
    );
  
    const totalOfKeyBased = accountBalanceWithSupportedChains.reduce((accumulator, object) => {
      return accumulator + object.keyBasedUSD;
    }, 0);
    const totalOfSmartWallet = accountBalanceWithSupportedChains.reduce((accumulator, object) => {
      return accumulator + object.smartWalletUSD;
    }, 0);
  
    const totalKeyBasedPLRTokens = accountBalanceWithSupportedChains?.reduce((accumulator, object) => {
      return accumulator + object.keyBasedWallet;
    }, 0);

    const totalSmartWalletPLRTokens = accountBalanceWithSupportedChains?.reduce((accumulator, object) => {
      return accumulator + object.smartWallet;
    }, 0);

    setKeyBasedTotal(totalOfKeyBased);
    setSmartWalletTotal(totalOfSmartWallet);
    setTotalKeyBasedPLRTokens(totalKeyBasedPLRTokens);
    setTotalSmartWalletPLRTokens(totalSmartWalletPLRTokens);
    setAccounts(accountBalanceWithSupportedChains);
  };

  useEffect(() => {
    fetchAllAccountBalances();
  }, []);

  const updateAvailableOffers = useCallback<
    () => Promise<ExchangeOffer[] | undefined>
  >(
    debounce(async () => {
      // there is a race condition here
      if (multiCallData && fixed) {
        return;
      }
      setSelectedOffer(null);
      setAvailableOffers([]);

      if (
        !sdk ||
        !selectedFromAsset ||
        !amount ||
        !selectedFromNetwork?.chainId ||
        !isValidAmount(amount)
      )
        return;

      setIsLoadingAvailableOffers(true);

      try {
        // needed computed account address before calling getExchangeOffers
        if (!accountAddress) await sdk.computeContractAccount();
        const offers = await sdk.getExchangeOffers({
          fromChainId: selectedFromAsset.chainId,
          fromAmount: ethers.utils.parseUnits(
            amount,
            selectedFromAsset.decimals
          ),
          toTokenAddress: hasEnoughPLR ? plrDaoMemberNFT.address : plrDaoAsset.address,
          fromTokenAddress: selectedFromAsset.address,
        });
        return offers;
      } catch (e) {
        //
      }
    }, 200),
    [sdk, selectedFromAsset, amount, selectedFromNetwork, accountAddress, selectedAccountType]
  );

  useEffect(() => {
    accountAddress || providerAddress && sdk?.getNftList({
      account: accountAddress || providerAddress,
    }).then((output:NftList) => {
      if(output?.items?.length) {
        setIsNFTMember(true);
      }
    });
    
  }, [sdk, accountAddress, providerAddress]);

  useEffect(() => {
    // this will ensure that the old data won't replace the new one
    let active = true;
    updateAvailableOffers().then((offers) => {
      if (active && offers) {
        setAvailableOffers(offers);
        setIsLoadingAvailableOffers(false);
        if (!offers.length) return;
        const bestOffer: any = offers?.find((offer) => offer.provider == 'Lifi');
        const selectedOffer = bestOffer?.provider ? bestOffer : offers[0];
        setSelectedOffer(mapOfferToOption(selectedOffer));
      }
    });

    // hook's clean-up function
    return () => {
      active = false;
    };
  }, [updateAvailableOffers]);

  const availableOffersOptions = useMemo(
    () => availableOffers?.map(mapOfferToOption),
    [availableOffers]
  );

  const receiverAddress = useMemo(() => {
    if (useCustomAddress) return customReceiverAddress;
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

  useEffect(() => {
    const offer = availableOffers?.find(
      (availableOffer) => availableOffer.provider === selectedOffer?.value
    );
    resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
    if (receiverAddress && !isValidEthereumAddress(receiverAddress)) {
      setTransactionBlockFieldValidationError(
        transactionBlockId,
        'receiverAddress',
        'Invalid receiver address'
      );
      return;
    }
    resetTransactionBlockFieldValidationError(
      transactionBlockId,
      'receiverAddress'
    );
    setTransactionBlockValues(transactionBlockId, {
      hasEnoughPLR,
      fromChainId: selectedFromNetwork?.chainId ?? undefined,
      toAsset: hasEnoughPLR ? plrDaoMemberNFT : plrDaoAsset,
      fromAsset: selectedFromAsset ?? undefined,
      amount,
      offer,
      accountType: selectedAccountType,
      receiverAddress: receiverAddress ?? undefined,
    });
  }, [
    selectedFromNetwork,
    selectedFromAsset,
    amount,
    selectedOffer,
    availableOffers,
    selectedAccountType,
    receiverAddress,
  ]);

  const RenderOption = (option: SelectOption) => {
    const availableOffer = availableOffers?.find(
      (offer) => offer.provider === option.value
    );
    const valueToReceive =
      availableOffer &&
      formatAmountDisplay(
        ethers.utils.formatUnits(
          availableOffer.receiveAmount,
          plrDaoAsset.decimals
        )
      );
    return (
      <OfferDetails>
        <RoundedImage title={option.title} url={option.iconUrl} size={24} />
        <div>
          <Text size={12} marginBottom={2} medium block>
            {option.title}
          </Text>
          {!!valueToReceive && (
            <Text size={16} medium>
              {valueToReceive} {plrDaoAsset.symbol}
            </Text>
          )}
        </div>
      </OfferDetails>
    );
  };

  return !isNFTMember ? (
    <>
      <Title>Stake into Pillar DAO</Title>
      <Container>
        <Text style={{ fontSize: '16px' }}>
          To become DAO member, you need to stake <Value>10,000 PLR</Value> tokens on Polygon.
        </Text>
        <HorizontalLine></HorizontalLine>
        {
          <Text style={{ fontSize: '14px' }}>
            You have{' '}
            {hasEnoughPLR ? (
              <Value>{`${formatAmountDisplay(totalKeyBasedPLRTokens + totalSmartWalletPLRTokens)}`} PLR</Value>
            ) : (
              <Total>{`${formatAmountDisplay(totalKeyBasedPLRTokens + totalSmartWalletPLRTokens)}`} PLR</Total>
            )}
            {' tokens '}
            {accounts.length > 0
              ? `on ${accounts.length == 1 ? `${accounts[0].chainName} chain` : `${accounts.length} chains `} on ${
                  totalKeyBasedPLRTokens > 0 && totalSmartWalletPLRTokens > 0
                    ? '2 wallets'
                    : totalKeyBasedPLRTokens > 0
                    ? 'Key Based'
                    : 'Smart Wallet'
                }`
              : ''}
          </Text>
        }
        {'\n'}
        {(totalKeyBasedPLRTokens >= MAX_PLR_TOKEN_LIMIT || totalSmartWalletPLRTokens >= MAX_PLR_TOKEN_LIMIT
          ? []
          : accounts
        ).map(({ chainName, keyBasedWallet, smartWallet }) => (
          <Text style={{ fontSize: '12px' }}>
            {<Block></Block>}
            {keyBasedWallet > 0 && (
              <Block color={chainName === 'Polygon' && keyBasedWallet < MAX_PLR_TOKEN_LIMIT ? 'red' : ''}>
                {`\u25CF`}
                <Bold>{formatAmountDisplay(keyBasedWallet)} PLR</Bold> on <Bold>{chainName}</Bold> on{' '}
                <Bold> Keybased Wallet</Bold>
              </Block>
            )}
            {smartWallet > 0 && (
              <Block color={chainName === 'Polygon' && smartWallet < MAX_PLR_TOKEN_LIMIT ? 'red' : ''}>
                {`\u25CF`}
                <Bold>{formatAmountDisplay(smartWallet)} PLR</Bold> on <Bold>{chainName}</Bold> on{' '}
                <Bold> Smart Wallet</Bold>
              </Block>
            )}
          </Text>
        ))}
      </Container>
      <>
        <AccountSwitchInput
          smartWalletTotal={`$ ${formatAmountDisplay(smartWalletTotal)}`}
          keyBasedWalletTotal={`$ ${formatAmountDisplay(keyBasedTotal)}`}
          label="From wallet"
          selectedAccountType={selectedAccountType}
          onChange={(accountType) => {
            setSelectedAccountType(accountType);
            setAvailableOffers(null);
            setSelectedOffer(null);
          }}
          hideKeyBased={smartWalletOnly}
          errorMessage={errorMessages?.accountType}
        />
        <NetworkAssetSelectInput
          label="From"
          onAssetSelect={(asset, amountBN) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'amount');
            resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetAddress');
            resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetSymbol');
            resetTransactionBlockFieldValidationError(transactionBlockId, 'fromAssetDecimals');
            setSelectedFromAsset(asset);
            setAmount(amountBN ? formatMaxAmount(amountBN, asset.decimals) : '');
          }}
          onNetworkSelect={(network) => {
            resetTransactionBlockFieldValidationError(transactionBlockId, 'fromChainId');
            setSelectedFromNetwork(network);
          }}
          selectedNetwork={selectedFromNetwork}
          selectedAsset={selectedFromAsset}
          errorMessage={
            errorMessages?.fromChainId ||
            errorMessages?.fromAssetSymbol ||
            errorMessages?.fromAssetAddress ||
            errorMessages?.fromAssetDecimals
          }
          walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
          showPositiveBalanceAssets
          showQuickInputButtons
        />
        <NetworkAssetSelectInput
          label="To"
          selectedNetwork={supportedChains[1]}
          selectedAsset={hasEnoughPLR ? plrDaoMemberNFT : plrDaoAsset}
          disabled={true}
          walletAddress={selectedAccountType === AccountTypes.Contract ? accountAddress : providerAddress}
        />
        <WalletReceiveWrapper>
          <AccountSwitchInput
            label="You will receive on"
            selectedAccountType={selectedReceiveAccountType}
            onChange={(value) => {
              setSelectedReceiveAccountType(value);
              if (value == DestinationWalletEnum.Custom) {
                setUseCustomAddress(true);
                return;
              }
              resetTransactionBlockFieldValidationError(transactionBlockId, 'receiverAddress');
              setUseCustomAddress(false);
              setCustomReceiverAddress(null);
            }}
            hideKeyBased={smartWalletOnly}
            showCustom
          />
        </WalletReceiveWrapper>
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
        {!!selectedFromAsset && !!amount && (
          <SelectInput
            label={`Offer`}
            options={availableOffersOptions ?? []}
            isLoading={isLoadingAvailableOffers}
            disabled={true}
            selectedOption={selectedOffer}
            onOptionSelect={(option) => {
              resetTransactionBlockFieldValidationError(transactionBlockId, 'offer');
              setSelectedOffer(option);
            }}
            renderOptionListItemContent={RenderOption}
            renderSelectedOptionContent={RenderOption}
            placeholder="Select offer"
            errorMessage={errorMessages?.offer}
          />
        )}
      </>
    </>
  ) : (
    <>
      <Title>Pillar DAO Membership</Title>
      <Container>
        <Text style={{ fontSize: '16px' }}>
          Thank You!. You are already a Pillar DAO member.
        </Text>
      </Container>
    </>
  );
};

export default PlrDaoStakingTransactionBlock;

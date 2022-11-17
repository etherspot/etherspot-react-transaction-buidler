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
import {
  Chain,
  supportedChains,
} from '../../utils/chain';
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
  padding-top: 2px;
`;

const OfferChecked = styled.div`
  position: absolute;
  top: 4px;
  right: 5px;
  background: ${({ theme }) => theme.color.background.statusIconSuccess};
  width: 14px;
  height: 14px;
  font-size: 4px;
  border-radius: 7px;
  color: #fff;
`;

const OfferDetailsRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 4px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const OfferDetailsActionsWrapper = styled.div`
  margin-top: 7px;
`;

const OfferDetailsActionRow = styled(OfferDetailsRow)`
  align-items: flex-start;
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
  const [availableRoutes, setAvailableRoutes] = useState<Route[] | null>([]);

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
    setAvailableRoutes([]);

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
    const isSelectedRouteOption = selectedRoute?.value && selectedRoute?.value === option.value;

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
          <OfferDetailsRow>
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
          {/* Etherspot SDK typing fails */}
          {/* @ts-ignore */}
          {isSelectedRouteOption && !!firstStep?.includedSteps?.length && (
            <OfferDetailsActionsWrapper>
              {/* Etherspot SDK typing fails */}
              {/* @ts-ignore */}
              {firstStep?.includedSteps.map((includedStep) => {
                const {
                  action: includedStepAction,
                  toolDetails: includedToolDetails,
                } = includedStep;

                const sourceChain = supportedChains.find((supportedChain) => supportedChain.chainId === includedStepAction.fromChainId);
                const destinationChain = supportedChains.find((supportedChain) => supportedChain.chainId === includedStepAction.toChainId);

                if (!sourceChain || !destinationChain) return null;

                if (includedStep.type === 'swap') {
                  const fromAssetAmount = ethers.utils.formatUnits(includedStep.estimate.fromAmount, includedStepAction.fromToken.decimals);
                  const toAssetAmount = ethers.utils.formatUnits(includedStep.estimate.toAmount, includedStepAction.toToken.decimals);
                  return (
                    <OfferDetailsActionRow id={includedStep.id}>
                      <RoundedImage
                        title={includedToolDetails.title}
                        url={includedToolDetails.logoURI}
                        size={10}
                        marginTop={2}
                      />
                      <Text size={12}>
                        Swap on {sourceChain.title} via {includedToolDetails.name}<br/>
                        {formatAmountDisplay(fromAssetAmount)} {includedStepAction.fromToken.symbol} → {formatAmountDisplay(toAssetAmount)} {includedStepAction.toToken.symbol}
                      </Text>
                    </OfferDetailsActionRow>
                  )
                }

                if (includedStep.type === 'cross') {
                  return (
                    <OfferDetailsActionRow id={includedStep.id}>
                      <RoundedImage
                        title={includedToolDetails.title}
                        url={includedToolDetails.logoURI}
                        size={10}
                        marginTop={2}
                      />
                      <Text size={12}>
                        Bridge from {sourceChain.title} to {destinationChain.title} via {includedToolDetails.name}
                      </Text>
                    </OfferDetailsActionRow>
                  );
                }
              })}
            </OfferDetailsActionsWrapper>
          )}
        </OfferDetailsRowsWrapper>
        {isSelectedRouteOption && (
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
      {!!selectedToAsset && !!selectedFromAsset && !!amount && (remainingSelectedFromAssetBalance ?? 0) >= 0 && (
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
      )}
    </>
  );
};

export default AssetBridgeTransactionBlock;

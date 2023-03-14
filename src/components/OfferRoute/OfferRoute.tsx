import React, { useEffect, useState } from 'react';
import { AccountTypes, ExchangeOffer, TokenListToken } from 'etherspot';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';

import { useEtherspot } from '../../hooks';

import { addressesEqual } from '../../utils/validation';
import { formatAmountDisplay } from '../../utils/common';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { Chain } from '../../utils/chain';

import { SelectOption } from '../SelectInput/SelectInput';
import { RoundedImage } from '../Image';
import { Text } from '../Text';
import { Theme } from '../../utils/theme';

type RouteOptionProps = {
  option: SelectOption;
  availableOffers: ExchangeOffer[] | null;
  targetAssetPriceUsd: number | null;
  selectedFromAsset: IAssetWithBalance | null;
  selectedAccountType: string;
  selectedToAsset?: TokenListToken | null;
  selectedNetwork?: Chain | null;
  availableToAssets?: TokenListToken[] | null;
};

export const OfferRoute = (props: RouteOptionProps) => {
  const {
    option,
    availableOffers,
    availableToAssets,
    selectedToAsset,
    targetAssetPriceUsd,
    selectedNetwork,
    selectedFromAsset,
    selectedAccountType,
  } = props;
  const [gasPrice, setGasPrice] = useState('-');
  const [isEstimating, setIsEstimating] = useState(true);
  const { getSdkForChainId } = useEtherspot();
  const theme: Theme = useTheme();

  const getGasSwapUsdValue = async (offer: ExchangeOffer) => {
    const sdkByChain = getSdkForChainId(selectedNetwork?.chainId ?? 1);
    setIsEstimating(true);

    if (sdkByChain && selectedFromAsset && selectedAccountType === AccountTypes.Contract) {
      await sdkByChain.computeContractAccount();

      await sdkByChain.clearGatewayBatch();

      for (let i = 0; i < offer.transactions.length; i++) {
        await sdkByChain.batchExecuteAccountTransaction(offer.transactions[i]);
      }

      const feeTokens = await sdkByChain.getGatewaySupportedTokens();

      try {
        const estimation = await sdkByChain.estimateGatewayBatch({ feeToken: feeTokens[0].address }); // pay gas using USDC
        setIsEstimating(false);
        return `${ethers.utils.formatUnits(estimation.estimation.feeAmount)}`;
      } catch (error) {
        //
      }
    }

    setIsEstimating(false);
    return '-';
  };

  const availableOffer = availableOffers?.find((offer) => offer.provider === option.value);
  const toAsset = availableToAssets
    ? availableToAssets?.find((availableAsset) => addressesEqual(availableAsset.address, selectedToAsset?.address))
    : null;

  const valueToReceiveRaw = availableOffer
    ? ethers.utils.formatUnits(availableOffer.receiveAmount, toAsset?.decimals)
    : undefined;

  const valueToReceive = valueToReceiveRaw && formatAmountDisplay(valueToReceiveRaw);

  useEffect(() => {
    if (availableOffer) {
      getGasSwapUsdValue(availableOffer).then((res) => setGasPrice(formatAmountDisplay(res, '$')));
    }
  }, [availableOffer]);

  return (
    <OfferDetails>
      <RoundedImage title={option.title} url={option.iconUrl} size={24} />
      <div>
        <OfferTopRow>
          <Text size={12} marginBottom={4} marginRight={16} medium block>
            {option.title}
          </Text>
          <Text size={12} marginBottom={4} medium block>
            {selectedAccountType === AccountTypes.Contract && (
              <>
                <Text color={theme.color?.text?.innerLabel}>Gas price: </Text>
                {isEstimating ? 'Estamiting...' : gasPrice}
              </>
            )}
          </Text>
        </OfferTopRow>
        {!!valueToReceive && (
          <Text size={16} medium>
            {valueToReceive} {toAsset?.symbol}
            {targetAssetPriceUsd && ` · ${formatAmountDisplay(+valueToReceiveRaw * targetAssetPriceUsd, '$')}`}
          </Text>
        )}
      </div>
    </OfferDetails>
  );
};

const OfferDetails = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  font-family: 'PTRootUIWebMedium', sans-serif;
`;

const OfferTopRow = styled.div`
  display: flex;
  justify-content: space-between;
`;

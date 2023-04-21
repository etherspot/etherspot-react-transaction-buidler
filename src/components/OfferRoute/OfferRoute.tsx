import React, { useEffect, useState } from 'react';
import { AccountTypes, ExchangeOffer, TokenListToken } from 'etherspot';
import styled, { useTheme } from 'styled-components';
import { ethers } from 'ethers';
import { BiCheck } from 'react-icons/bi';

// hooks
import { useEtherspot } from '../../hooks';

// utils
import { addressesEqual } from '../../utils/validation';
import { formatAmountDisplay } from '../../utils/common';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { Chain } from '../../utils/chain';

// local
import { SelectOption } from '../SelectInput/SelectInput';
import { RoundedImage } from '../Image';
import { Text } from '../Text';
import { Theme } from '../../utils/theme';

type OfferRouteProps = {
  option: SelectOption;
  availableOffers: ExchangeOffer[] | null;
  targetAssetPriceUsd: number | null;
  selectedFromAsset: IAssetWithBalance | null;
  selectedAccountType: string;
  exchnageRate?: number;
  selectedToAsset?: TokenListToken | null;
  selectedNetwork?: Chain | null;
  availableToAssets?: TokenListToken[] | null;
  isChecked?: boolean;
};

export const OfferRoute = (props: OfferRouteProps) => {
  const {
    option,
    availableOffers,
    availableToAssets,
    selectedToAsset,
    targetAssetPriceUsd,
    selectedNetwork,
    selectedFromAsset,
    selectedAccountType,
    exchnageRate = 0,
    isChecked = false,
  } = props;
  const [gasPrice, setGasPrice] = useState<string | undefined>();
  const [isEstimating, setIsEstimating] = useState(false);
  const { getSdkForChainId } = useEtherspot();
  const theme: Theme = useTheme();

  const getGasSwapUsdValue = async (offer: ExchangeOffer) => {
    const sdkByChain = getSdkForChainId(selectedNetwork?.chainId ?? 1);
    setIsEstimating(true);

    if (sdkByChain && selectedFromAsset && selectedAccountType === AccountTypes.Contract) {
      await sdkByChain.computeContractAccount();

      sdkByChain.clearGatewayBatch();

      await Promise.all(
        offer.transactions.map((transaction) => sdkByChain.batchExecuteAccountTransaction(transaction))
      );

      try {
        const estimation = await sdkByChain.estimateGatewayBatch();
        setIsEstimating(false);
        return Number(ethers.utils.formatUnits(estimation.estimation.feeAmount)) * exchnageRate;
      } catch (error) {
        //
      }
    }

    setIsEstimating(false);
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
      getGasSwapUsdValue(availableOffer).then((res) => res && setGasPrice(formatAmountDisplay(res, '$', 2)));
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
                {isEstimating ? 'Estimating...' : gasPrice ? gasPrice : '-'}
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
      {isChecked && (
        <OfferChecked>
          <BiCheck size={14} />
        </OfferChecked>
      )}
    </OfferDetails>
  );
};

const OfferDetails = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  font-family: 'PTRootUIWebMedium', sans-serif;
  width: 100%;
`;

const OfferTopRow = styled.div`
  display: flex;
  justify-content: space-between;
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

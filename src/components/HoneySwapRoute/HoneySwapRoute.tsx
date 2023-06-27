import React from 'react';
import { Route } from '@lifi/sdk';
import { ethers } from 'ethers';
import { BiCheck } from 'react-icons/all';

import { formatAmountDisplay } from '../../utils/common';
import { CombinedRoundedImages, RoundedImage } from '../Image';
import { bridgeServiceIdToDetails } from '../../utils/bridge';
import Text from '../Text/Text';
import { supportedChains } from '../../utils/chain';
import styled, { useTheme } from 'styled-components';
import { Theme } from '../../utils/theme';
import { ExchangeOffer } from 'etherspot';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { GNOSIS_USDC_CONTRACT_ADDRESS } from '../../constants/assetConstants';

interface HoneySwapRouteProps {
  route?: Route;
  isChecked?: boolean;
  showActions?: boolean;
  tokenAmount?: string | null;
  cost?: string;
  offer1?: ExchangeOffer | null;
  offer2?: ExchangeOffer | null;
  token1?: IAssetWithBalance | null;
  token2?: IAssetWithBalance | null;
}

const OfferDetails = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  font-family: 'PTRootUIWebMedium', sans-serif;
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

const OffersBlock = styled.div`
  display: flex;
  justify-content: start;
  align-items: center;
  gap: 3px;
`;

const OffersBlockWrapper = styled(OffersBlock)`
  display: flex;
  justify-content: start;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
`;

const HoneySwapRoute = ({
  route,
  isChecked,
  showActions,
  cost,
  offer1,
  offer2,
  token1,
  token2,
  tokenAmount,
}: HoneySwapRouteProps) => {
  const theme: Theme = useTheme();

  if (!route) return null;

  const valueToReceive =
    route.toAmountMin && formatAmountDisplay(ethers.utils.formatUnits(route.toAmountMin, route.toToken.decimals));
  const [firstStep] = route.steps ?? [];
  {
    /* Etherspot SDK typing fails */
  }
  // @ts-ignore
  const [{ toolDetails: firstStepViaService }] = firstStep?.includedSteps ?? [];
  const twoDetailsRows = !!(route?.gasCostUSD || firstStep?.estimate?.executionDuration);

  const getFormattedAmountByTokenAndOffer = (
    token?: IAssetWithBalance | null,
    offer?: ExchangeOffer | null,
    tokenAmount?: string | null
  ) => {
    if (token && token.address !== GNOSIS_USDC_CONTRACT_ADDRESS && !!offer) {
      return formatAmountDisplay(
        Number(ethers.utils.formatUnits(offer.receiveAmount.toString(), token.decimals)).toFixed(4)
      );
    } else if (token && token.address === GNOSIS_USDC_CONTRACT_ADDRESS && !offer && !!tokenAmount) {
      console.log('tokenAmount', tokenAmount);
      return formatAmountDisplay(Number(tokenAmount).toFixed(4));
    }

    return '';
  };

  return (
    <div>
      <OffersBlockWrapper>
        <OffersBlock>
          <RoundedImage title={token1?.name ?? 'First'} url={token1?.logoURI} size={16} noMarginRight />
          {token1 && getFormattedAmountByTokenAndOffer(token1, offer1, tokenAmount)}
          &nbsp;
          {token1 && token1.name}
        </OffersBlock>
        +
        <OffersBlock>
          <RoundedImage title={token2?.name ?? 'First'} url={token2?.logoURI} size={16} noMarginRight />
          {token2 && getFormattedAmountByTokenAndOffer(token2, offer2, tokenAmount)}
          &nbsp;
          {token2 && token2.name}
        </OffersBlock>
      </OffersBlockWrapper>

      {route && (
        <OfferDetails>
          <CombinedRoundedImages
            title={firstStep.toolDetails.name}
            url={firstStep.toolDetails.logoURI}
            smallImageTitle={bridgeServiceIdToDetails['lifi'].title}
            smallImageUrl={bridgeServiceIdToDetails['lifi'].iconUrl}
            size={24}
          />
          <OfferDetailsRowsWrapper>
            <OfferDetailsRow>
              {!!valueToReceive && (
                <Text size={14} medium>
                  {valueToReceive} {route?.toToken?.symbol} · {formatAmountDisplay(route.toAmountUSD, '$', 2)}
                </Text>
              )}
              <Text size={14} marginLeft={6} color={theme?.color?.text?.innerLabel} inline medium>
                {firstStep.toolDetails.name}
                {firstStepViaService?.name !== firstStep.toolDetails.name && ` via ${firstStepViaService?.name}`}
              </Text>
            </OfferDetailsRow>
            {twoDetailsRows && (
              <OfferDetailsRow>
                {!!route?.gasCostUSD && (
                  <>
                    <Text size={12} marginRight={4} color={theme.color?.text?.innerLabel} medium>
                      Gas price
                    </Text>
                    <Text size={14} marginRight={22} medium inline>
                      {cost}
                    </Text>
                  </>
                )}
                {!!firstStep?.estimate?.executionDuration && (
                  <>
                    <Text size={12} marginRight={4} color={theme.color?.text?.innerLabel} medium>
                      Time
                    </Text>
                    <Text size={14} medium inline>
                      {Math.ceil(+firstStep.estimate.executionDuration / 60)} min
                    </Text>
                  </>
                )}
              </OfferDetailsRow>
            )}
            {/* Etherspot SDK typing fails */}
            {/* @ts-ignore */}
            {(isChecked || showActions) && !!firstStep?.includedSteps?.length && (
              <OfferDetailsActionsWrapper>
                {/* Etherspot SDK typing fails */}
                {/* @ts-ignore */}
                {firstStep?.includedSteps.map((includedStep) => {
                  const { action: includedStepAction, toolDetails: includedToolDetails } = includedStep;

                  const sourceChain = supportedChains.find(
                    (supportedChain) => supportedChain.chainId === includedStepAction.fromChainId
                  );
                  const destinationChain = supportedChains.find(
                    (supportedChain) => supportedChain.chainId === includedStepAction.toChainId
                  );

                  if (!sourceChain || !destinationChain) return null;

                  if (includedStep.type === 'swap') {
                    const fromAssetAmount = ethers.utils.formatUnits(
                      includedStep.estimate.fromAmount,
                      includedStepAction.fromToken.decimals
                    );
                    const toAssetAmount = ethers.utils.formatUnits(
                      includedStep.estimate.toAmount,
                      includedStepAction.toToken.decimals
                    );
                    return (
                      <OfferDetailsActionRow id={includedStep.id}>
                        <RoundedImage
                          title={includedToolDetails.title}
                          url={includedToolDetails.logoURI}
                          size={10}
                          marginTop={2}
                        />
                        <Text size={12}>
                          Swap on {sourceChain.title} via {includedToolDetails.name}
                          <br />
                          {formatAmountDisplay(fromAssetAmount)} {includedStepAction.fromToken.symbol} →{' '}
                          {formatAmountDisplay(toAssetAmount)} {includedStepAction.toToken.symbol}
                        </Text>
                      </OfferDetailsActionRow>
                    );
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
          {isChecked && (
            <OfferChecked>
              <BiCheck size={14} />
            </OfferChecked>
          )}
        </OfferDetails>
      )}
    </div>
  );
};

export default HoneySwapRoute;

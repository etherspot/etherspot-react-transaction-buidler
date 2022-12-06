import React, {
  useEffect,
  useState,
} from 'react';
import styled from 'styled-components';
import { IoRadioButtonOnOutline, IoRadioButtonOffOutline } from 'react-icons/io5';

import {
  useEtherspot,
  useTransactionBuilder,
} from '../../hooks';
import { ICrossChainAction } from '../../types/crossChainAction';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { addressesEqual } from 'etherspot';
import { formatAmountDisplay } from '../../utils/common';
import { ethers } from 'ethers';
import { RoundedImage } from '../Image';
import { isZeroAddress } from '../../utils/validation';
import { Text } from '../Text';

interface GasTokenSelectProps {
  crossChainAction: ICrossChainAction;
  senderAddress?: string;
}

const Wrapper = styled.div`
  position: relative;
  background: ${({ theme }) => theme.color.background.selectInput};
  color: ${({ theme }) => theme.color.text.selectInput};
  border-radius: 8px;
  padding: 8px 10px 13px;
  margin-bottom: 14px;
`;

const GasOption = styled.div`
  font-family: "PTRootUIWebMedium", sans-serif;
  font-size: 14px;
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
  color: ${({ theme }) => theme.color.text.selectInputOption};
  margin-bottom: 4px;
  padding: 3px 6px;
  border-radius: 6px;
  cursor: pointer;
 
  &:hover {
    background: ${({ theme }) => theme.color.background.selectInputExpandedHover};
  }
`;

const GasOptionSelectIcon = styled.div`
  flex: 1;
  text-align: right;
`;

const GasTokenSelect = ({
  crossChainAction,
  senderAddress,
}: GasTokenSelectProps) => {
  const [showOptions, setShowOptions] = useState(false);
  const [gasTokens, setGasTokens] = useState<IAssetWithBalance[]>([]);
  const { setTransactionBlockValues, setCrossChainActionGasTokenAddress } = useTransactionBuilder();
  const {
    getSdkForChainId,
    getSupportedAssetsWithBalancesForChainId,
  } = useEtherspot();

  const isDisabled = crossChainAction?.isEstimating;

  useEffect(() => {
    const getGasTokens = async () => {
      const sdk = getSdkForChainId(crossChainAction.chainId);
      if (!sdk) return;

      let tokens: IAssetWithBalance[] = [];

      try {
        const gatewaySupportedItems = await sdk.getGatewaySupportedTokens();
        const supportedAssetsWithBalances = await getSupportedAssetsWithBalancesForChainId(
          crossChainAction.chainId,
          true,
          senderAddress,
        );

        tokens = supportedAssetsWithBalances.filter((
          supportedAsset,
        ) => gatewaySupportedItems.some((
          gatewaySupportedItem,
        ) => isZeroAddress(supportedAsset.address)
          || addressesEqual(gatewaySupportedItem.address, supportedAsset.address)));
      } catch (e) {
        //
      }

      setGasTokens(tokens);
    }

    getGasTokens();
  }, [getSdkForChainId, getSupportedAssetsWithBalancesForChainId, crossChainAction]);

  // do not display if not available
  if (crossChainAction.useWeb3Provider || !gasTokens?.length) return null;

  const selectedGasToken = gasTokens.find((gasToken) => crossChainAction.gasTokenAddress
    ? addressesEqual(gasToken.address, crossChainAction.gasTokenAddress)
    : isZeroAddress(gasToken.address);

  return (
    <Wrapper>
      {selectedGasToken && (
        <div>
          <Text size={16} medium>Paying fees with</Text>
          <RoundedImage title={gasToken.symbol} url={gasToken.logoURI} size={16} marginRight={4}/>
        </div>
      )}
      {gasTokens.map((gasToken, index) => {
        const isSelected = crossChainAction.gasTokenAddress
          ? addressesEqual(gasToken.address, crossChainAction.gasTokenAddress)
          : isZeroAddress(gasToken.address);

        return (
          <GasOption onClick={() => setCrossChainActionGasTokenAddress(crossChainAction.id, gasToken.address)}>
            <RoundedImage title={gasToken.symbol} url={gasToken.logoURI} size={16} marginRight={4}/>
            {formatAmountDisplay(ethers.utils.formatUnits(gasToken.balance, gasToken.decimals))} {gasToken.symbol}
            {gasToken.balanceWorthUsd && `・ ${formatAmountDisplay(gasToken.balanceWorthUsd, '$')}`}
            <GasOptionSelectIcon>
              {isSelected && <IoRadioButtonOnOutline size={17} />}
              {!isSelected && <IoRadioButtonOffOutline size={16} />}
            </GasOptionSelectIcon>
          </GasOption>
        )
      })}
    </Wrapper>
  );
}

export default GasTokenSelect;

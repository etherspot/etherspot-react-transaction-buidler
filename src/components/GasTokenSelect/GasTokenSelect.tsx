import React, {
  useEffect,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
import { IoRadioButtonOnOutline } from 'react-icons/io5';
import {
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowUp,
} from 'react-icons/md';
import { ethers } from 'ethers';

import {
  useEtherspot,
  useTransactionBuilder,
} from '../../hooks';
import { ICrossChainAction } from '../../types/crossChainAction';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { formatAmountDisplay } from '../../utils/common';
import { RoundedImage } from '../Image';
import { isZeroAddress, addressesEqual } from '../../utils/validation';
import { Text } from '../Text';
import { Theme } from '../../utils/theme';

interface GasTokenSelectProps {
  crossChainAction: ICrossChainAction;
  senderAddress?: string;
}

const Wrapper = styled.div<{ disabled?: boolean }>`
  position: relative;
  background: ${({ theme }) => theme.color.background.selectInput};
  color: ${({ theme }) => theme.color.text.selectInput};
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 14px;
  ${({ disabled }) => disabled && `opacity: 1;`}
`;

const SelectedGasOption = styled.div`
  font-family: "PTRootUIWebMedium", sans-serif;
  font-size: 14px;
  color: ${({ theme }) => theme.color.text.selectInputOption};
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 3px 6px;
  cursor: pointer;
`;

const GasOption = styled.div`
  font-family: "PTRootUIWebMedium", sans-serif;
  font-size: 14px;
  display: flex;
  flex-direction: row;
  align-items: center;
  color: ${({ theme }) => theme.color.text.selectInputOption};
  margin-bottom: 4px;
  padding: 3px 6px;
  border-radius: 6px;
  cursor: pointer;
 
  &:hover {
    background: ${({ theme }) => theme.color.background.selectInputExpandedHover};
  }
`;

const SelectInputRadioOff = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 8px;
  background: ${({ theme }) => theme.color?.background?.selectInputRadioOff};
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
  const [gasAssets, setGasAssets] = useState<IAssetWithBalance[]>([]);
  const { setCrossChainActionGasToken } = useTransactionBuilder();
  const { getGasAssetsForChainId } = useEtherspot();
  const theme: Theme = useTheme();

  const isDisabled = crossChainAction?.isEstimating;

  useEffect(() => {
    const getGasAssets = async () => {
      let supportedGasAssets: IAssetWithBalance[] = [];

      try {
        supportedGasAssets = await getGasAssetsForChainId(crossChainAction.chainId, senderAddress);
      } catch (e) {
        //
      }

      setGasAssets(supportedGasAssets);
    }

    getGasAssets();
  }, [getGasAssetsForChainId, senderAddress]);

  // do not display if not available
  if (crossChainAction.useWeb3Provider || !gasAssets?.length) return null;

  const selectedGasToken = gasAssets.find((gasToken) => crossChainAction.gasTokenAddress
    ? addressesEqual(gasToken.address, crossChainAction.gasTokenAddress)
    : isZeroAddress(gasToken.address)
  );

  return (null);
}

export default GasTokenSelect;

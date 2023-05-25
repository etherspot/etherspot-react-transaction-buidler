import React from 'react';
import styled, { useTheme } from 'styled-components';
import { CombinedRoundedImages } from '../Image';
import { Theme } from '../../utils/theme';
import { IAssetWithBalance } from '../../providers/EtherspotContextProvider';
import { Chain } from '../../utils/chain';

interface NetworkAssetInfoProps {
  label: string;
  assetDetails: IAssetWithBalance;
  networkDetails: Chain;
}

const NetworkAssetInfoCard = ({ label, assetDetails, networkDetails }: NetworkAssetInfoProps) => {
  const theme: Theme = useTheme();

  return (
    <Wrapper>
      <Label>{label}</Label>
      <NetworkInfoWrapper>
        <CombinedRoundedImages
          url={assetDetails.logoURI}
          smallImageUrl={networkDetails.iconUrl}
          title={assetDetails.symbol}
          smallImageTitle={networkDetails.title}
          borderColor={theme?.color?.background?.selectInput}
        />
        <NetworkDetails>
          <span>{assetDetails.symbol}</span>
          <NetworkName>On {networkDetails.title}</NetworkName>
        </NetworkDetails>
      </NetworkInfoWrapper>
    </Wrapper>
  );
};

export default NetworkAssetInfoCard;

const Wrapper = styled.div`
  position: relative;
  margin-bottom: 18px;
  background: ${({ theme }) => theme.color.background.selectInput};
  color: ${({ theme }) => theme.color.text.selectInput};
  border-radius: 8px;
  padding: 8px 14px 14px;
  cursor: pointer;
  &:hover {
    background-color: ${({ theme }) => theme.color.background.dropdownHoverColor};
  }
`;

const NetworkInfo = styled.div`
  color: ${({ theme }) => theme.color.text.selectInputOption};
  font-size: 16px;
  font-family: 'PTRootUIWebMedium', sans-serif;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  cursor: pointer;
`;

const NetworkInfoWrapper = styled(NetworkInfo)`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
`;

const NetworkDetails = styled.div`
  font-size: 14px;
`;

const NetworkName = styled.div`
  margin-top: 5px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.text.selectInputOptionSecondary};
  font-family: 'PTRootUIWebRegular', sans-serif;
`;

const Label = styled.label`
  display: inline-block;
  color: ${({ theme }) => theme.color.text.innerLabel};
  margin-bottom: 14px;
  font-size: 14px;
`;

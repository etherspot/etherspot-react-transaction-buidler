import React from 'react';
import styled from 'styled-components';

// Components
import MenuModalWrapper from '../Menu/MenuModalWrapper';

// Constants
// Rollup will replace this value during build
const etherspotBuilderVersion = '__ETHERSPOT_BUILDER_VERSION__';
const etherspotSDKVersion = '__ETHERSPOT_SDK_VERSION__';

const SystemVersion = ({ onBackButtonClick }: { onBackButtonClick: () => void }) => (
  <MenuModalWrapper title="System Info" onBackButtonClick={onBackButtonClick}>
    <Wrapper>
      <FieldHeader>BUIDLer version</FieldHeader>
      <Value>{etherspotBuilderVersion}</Value>
    </Wrapper>
    <Wrapper>
      <FieldHeader>Etherspot SDK version </FieldHeader>
      <Value>{etherspotSDKVersion.replace('^', '')}</Value>
    </Wrapper>
  </MenuModalWrapper>
);

export default SystemVersion;

const Wrapper = styled.div`
  margin: 12px 0px;
`;

const FieldHeader = styled.div`
  display: block;
  color: ${({ theme }) => theme.color.text.settingsModalSubHeader};
  font-size: 15px;
  margin: 4px 0px;
`;

const Value = styled.div`
  display: flex;
  margin-top: 5px;
  padding: 10px;
  border-radius: 10px;
  background: ${({ theme }) => theme.color.background.card};
  color: ${({ theme }) => theme.color.text.card};
  font-size: 15px;
  font-family: 'PTRootUIWebMedium', sans-serif;
`;

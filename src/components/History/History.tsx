import React, { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { uniqueId } from 'lodash';
import { ethers } from 'ethers';

import HistoryPreview from '../TransactionPreview/HistoryPreview';
import { ICrossChainAction } from '../../types/crossChainAction';

// Hooks
import { useEtherspot } from '../../hooks';
import { getAssetPriceInUsd } from '../../services/coingecko';

// utils
import { Theme } from '../../utils/theme';
import ContentLoader from 'react-content-loader';
import MenuModalWrapper from '../Menu/MenuModalWrapper';

// constants
import { TRANSACTION_BLOCK_TYPE } from '../../constants/transactionBuilderConstants';
import { CROSS_CHAIN_ACTION_STATUS } from '../../constants/transactionDispatcherConstants';

const History = ({ onBackButtonClick }: { onBackButtonClick: () => void }) => {
  const [storedGroupedCrossChainActions, setStoredGroupedCrossChainActions] = useState<{
    [id: string]: ICrossChainAction[];
  }>({});
  const [storedTransactionsDetails, setStoredTransactionsDetails] = useState<{
    [id: string]: ICrossChainAction[];
  }>({});
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { getAllTransactions, getSupportedAssetsForChainId, accountAddress, sdk } = useEtherspot();
  const theme: Theme = useTheme();

  //pull all Transaction data and set in array to display on UI
  const pullAllNewTx = async (accountAddress: string | null) => {
    setIsLoadingTransactions(true);
    const transactions = await getAllTransactions('0x89a3d6AF00a3627DA25E2e8FFCCb97FE74D52631');
    if (!transactions) {
      setErrorMessage('Failed to get transactions!');
      return;
    }
    let crossChainAction: ICrossChainAction[] = [];
    transactions &&
      Object.entries(transactions).forEach(async ([chain_id, value]) => {
        let UsdPrice = await getAssetPriceInUsd(chain_id, ethers.constants.AddressZero, sdk);

        if (!UsdPrice) UsdPrice = 0;
        const assets = await getSupportedAssetsForChainId(chain_id);

        value.map((item) => {
          if (!item?.asset) return;
          const assetNetwork =
            item.asset && assets ? assets.find((supportedAsset) => supportedAsset.symbol == item.asset.symbol) : null;
          const chainId = chain_id;
          const crossChainActionId = uniqueId(`${item.timestamp}-`);
          const receiverAddress = item.asset ? item.asset.to : item.to;
          const fromAddress = item.asset ? item.asset.from : item.from;
          const isFromEtherspotWallet = false;
          const transactionUrl = item.blockExplorerUrl;

          let estimated = {
            usdPrice: UsdPrice,
            gasCost: item.gasPrice,
            feeAmount: item.asset && item.asset != null && item.asset.value ? item.asset.value : null,
          };
          let preview = {
            chainId,
            receiverAddress,
            fromAddress,
            isFromEtherspotWallet,
            transactionUrl,
            asset: {
              address: item.asset ? item.asset.from : item.from,
              decimals: item.asset ? item.asset.decimal : 2,
              symbol: item.asset ? item.asset.symbol : '',
              amount: '100000000000000000',
              iconUrl: assetNetwork != null ? assetNetwork?.logoURI : '',
              usdPrice: UsdPrice,
              gasCost: item.gasPrice,
              gasUsed: item.gasUsed,
              feeAmount: item.asset && item.asset != null && item.asset.value ? item.asset.value : null,
              createTimestamp: item.timestamp,
            },
          };

          let transferTransaction: ICrossChainActionTransaction = {
            to: receiverAddress,
            value: item.value,
            createTimestamp: item.timestamp,
            status: CROSS_CHAIN_ACTION_STATUS.CONFIRMED,
          };

          crossChainAction = [
            {
              id: crossChainActionId,
              relatedTransactionBlockId: uniqueId(`${item.timestamp}-`),
              chainId: chainId,
              estimated,
              preview,
              transactions: [transferTransaction],
              type: TRANSACTION_BLOCK_TYPE.SEND_ASSET,
              isEstimating: false,
              useWeb3Provider: !isFromEtherspotWallet,
              direction: item.direction,
            },
          ];

          storedTransactionsDetails[crossChainActionId] = [...crossChainAction];

          //const storedGroupedCrossChainActionsUpdated = storedTransactionsDetails;

          setStoredGroupedCrossChainActions(storedTransactionsDetails);
        });
      });
    setIsLoadingTransactions(false);

    return { ...storedGroupedCrossChainActions };
  };

  useEffect(() => {
    pullAllNewTx(accountAddress);
  }, [storedGroupedCrossChainActions]);

  // newest to oldest
  const storedGroupedCrossChainActionsIds = Object.keys(storedGroupedCrossChainActions).sort().reverse();

  return (
    <>
      <MenuModalWrapper title="Transaction History" onBackButtonClick={onBackButtonClick}>
        <Wrapper>
          <Header>
            <Label>Completed</Label>
          </Header>
          <Body>
            {errorMessage && <Section>Failed to load transaction.Try again!</Section>}
            {!storedGroupedCrossChainActionsIds?.length && (
              <Section>
                {isLoadingTransactions && (
                  <ContentLoader
                    viewBox="0 0 380 70"
                    foregroundColor={theme.color?.background?.loadingAnimationForeground}
                    backgroundColor={theme.color?.background?.loadingAnimationBackground}
                  >
                    {/* Only SVG shapes */}
                    <circle cx="25" cy="35" r="20" />
                    <rect x="80" y="17" rx="4" ry="4" width="300" height="13" />
                    <rect x="80" y="40" rx="3" ry="3" width="250" height="10" />
                  </ContentLoader>
                )}
              </Section>
            )}
            {storedGroupedCrossChainActionsIds.map((id) =>
              storedGroupedCrossChainActions[id]
                .sort()
                .reverse()
                .map((crossChainAction) => (
                  <HistoryPreview
                    key={`action-preview-${id}-${crossChainAction.id}`}
                    crossChainAction={crossChainAction}
                  />
                ))
            )}
          </Body>
        </Wrapper>
      </MenuModalWrapper>
    </>
  );
};

export default History;

const Body = styled.div`
  background-color: ${({ theme }) => theme.color.background.listItem};
  padding-right: 14px;
  overflow-y: auto;
  max-height: 300px;
  scrollbar-width: thin;
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: none;
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.background.scrollbar};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    opacity: 0.7;
  }

  ::-webkit-scrollbar-thumb:active {
    opacity: 0.7;
  }
`;

const Section = styled.div`
  display: flex;
  background: ${({ theme }) => theme.color.background.card};
  align-items: center;
  height: 28px;
  margin-top: 20px;
  padding: 12px;
  border-radius: 10px;
  font-family: 'PTRootUIWebMedium', sans-serif;
`;

const Wrapper = styled.div`
  margin: 12px 0px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.color.text.settingsModalSubHeader};
  font-size: 15px;
  margin: 6px 0px;
`;

const Label = styled.label`
  display: inline-block;
  padding: 0;
`;

const rightWrapper = styled.button`
  background: ${({ theme }) => theme.color.background.settingMenuMain};
  color: ${({ theme }) => theme.color.text.main};
  border: none;
  cursor: pointer;
  border-radius: 10px;
  height: 28px;
  width: 90px;
  margin-left: auto;
  font-size: 14px;
`;

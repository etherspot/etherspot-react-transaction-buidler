import React, { useCallback } from 'react';
import styled from 'styled-components';

import { SelectOption } from '../SelectInput/SelectInput';

import { DestinationWalletEnum } from '../../enums/wallet.enum';

import { useEtherspot } from '../../hooks';

const Label = styled.div`
  display: inline-block;
  color: ${({ theme }) => theme.color.text.outerLabel};
  margin-bottom: 11px;
  font-size: 14px;
`;

const Wrapper = styled.div<{ inline?: boolean; disabled: boolean }>`
  margin-bottom: 18px;
  width: 100%;

  ${({ inline }) =>
    inline &&
    `
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    
    ${Label} {
      margin-bottom: 0;
      margin-right: 8px;
    }
  `}

  ${({ disabled }) =>
    disabled &&
    `
    opacity: 0.3;
  `}
`;

const InputWrapper = styled.div`
  padding: 2px;
  border-radius: 8px;
  background: ${({ theme }) => theme.color.background.switchInput};
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  flex: 1;
`;

const SwitchOption = styled.div<{ isActive: boolean; disabled: boolean; percentageWidth: number }>`
  font-family: 'PTRootUIWebMedium', sans-serif;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.switchInputInactiveTab};
  background: ${({ theme }) => theme.color.background.switchInputInactiveTab};
  width: ${({ percentageWidth }) => percentageWidth}%;
  text-align: center;
  min-height: 34px;
  line-height: 34px;

  ${({ isActive, disabled }) =>
    !isActive &&
    !disabled &&
    `
    cursor: pointer;
  `}

  ${({ isActive, theme }) =>
    isActive &&
    `
    border-radius: 6px;
    box-shadow: 0.5px 0 2px 0 rgba(107, 107, 107, 0.44);
    color: ${theme.color.text.switchInputActiveTab};
    background: ${theme.color.background.switchInputActiveTab};
  `}
`;

const ErrorMessage = styled.small`
  color: ${({ theme }) => theme.color.text.errorMessage};
  margin-top: 5px;
  font-size: 12px;
`;

interface TextInputProps {
  options: SelectOption[];
  selectedOption: SelectOption;
  label?: string;
  errorMessage?: string;
  onChange?: (value: SelectOption) => void;
  inlineLabel?: boolean;
  disabled?: boolean;
  showTotals?: boolean;
}

const SwitchInput = ({
  options,
  selectedOption,
  label,
  errorMessage,
  onChange,
  inlineLabel = false,
  disabled = false,
  showTotals = false,
}: TextInputProps) => {
  const { smartWalletBalanceByChain, keybasedWalletBalanceByChain } = useEtherspot();

  const showTotalByWalletType = useCallback(
    (walletType: DestinationWalletEnum) => {
      const sum: number = 0;
      if (smartWalletBalanceByChain?.length && keybasedWalletBalanceByChain?.length) {
        switch (walletType) {
          case DestinationWalletEnum.Contract:
            return ` · $${smartWalletBalanceByChain
              .reduce((acc, curr) => {
                return acc + curr.total;
              }, sum)
              .toFixed(0)}`;
          case DestinationWalletEnum.Key:
            return ` · $${keybasedWalletBalanceByChain
              .reduce((acc, curr) => {
                return acc + curr.total;
              }, sum)
              .toFixed(0)}`;
          default:
            return '';
        }
      }
      return '';
    },
    [smartWalletBalanceByChain, keybasedWalletBalanceByChain]
  );

  return (
    <Wrapper inline={inlineLabel} disabled={disabled}>
      {!!label && <Label>{label}</Label>}
      <InputWrapper>
        {options.map((option) => (
          <SwitchOption
            disabled={disabled}
            isActive={option.value === selectedOption.value}
            onClick={() => !disabled && onChange && onChange(option)}
            percentageWidth={100 / options.length}
          >
            {option.title} {showTotals && showTotalByWalletType(option.value)}
          </SwitchOption>
        ))}
      </InputWrapper>
      {!!errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
    </Wrapper>
  );
};

export default SwitchInput;

import React from 'react';
import styled from 'styled-components';

import { SelectOption } from '../SelectInput/SelectInput';

const Wrapper = styled.div`
  margin-bottom: 18px;
`;

const InputWrapper = styled.div`
  padding: 2px;
  border-radius: 8px;
  background: ${({ theme }) => theme.color.background.switchInput};
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const SwitchOption = styled.div<{ isActive: boolean; }>`
  font-family: "PTRootUIWebMedium", sans-serif;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.switchInputInactiveTab};
  background: ${({ theme }) => theme.color.background.switchInputInactiveTab};
  width: 50%;
  text-align: center;
  min-height: 34px;
  line-height: 34px;

  ${({ isActive }) => !isActive && `
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  `}

  ${({ isActive, theme }) => isActive && `
    border-radius: 6px;
    box-shadow: 0.5px 0 2px 0 rgba(107, 107, 107, 0.44);
    color: ${theme.color.text.switchInputActiveTab};
    background: ${theme.color.background.switchInputActiveTab};
  `}
`;

const Label = styled.label`
  display: inline-block;
  color: ${({ theme }) => theme.color.text.label};
  margin-bottom: 11px;
  font-size: 14px;
`;

const ErrorMessage = styled.small`
  color: ${({ theme }) => theme.color.text.errorMessage};
  margin-top: 5px;
  font-size: 12px;
`;

interface TextInputProps {
  option1: SelectOption;
  option2: SelectOption;
  selectedOption: SelectOption;
  label?: string;
  errorMessage?: string;
  onChange?: (value: SelectOption) => void;
}

const SwitchInput = ({
  option1,
  option2,
  selectedOption,
  label,
  errorMessage,
  onChange,
}: TextInputProps) => {
  return (
    <Wrapper>
      {!!label && <Label>{label}</Label>}
      <InputWrapper>
        <SwitchOption isActive={option1.value === selectedOption.value} onClick={() => onChange && onChange(option1)}>{option1.title}</SwitchOption>
        <SwitchOption isActive={option2.value === selectedOption.value} onClick={() => onChange && onChange(option2)}>{option2.title}</SwitchOption>
      </InputWrapper>
      {!!errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
    </Wrapper>
  );
}

export default SwitchInput;

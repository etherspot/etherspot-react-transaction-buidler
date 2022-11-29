import React from 'react';
import Switch3Input from '../Switch3Input';
import { AccountTypes } from 'etherspot';
import { SelectOption } from '../SelectInput/SelectInput';

interface AccountSwitchInputProps {
  label?: string;
  errorMessage?: string;
  selectedAccountType: string;
  onChange?: (value: string) => void;
  inlineLabel?: boolean;
  disabled?: boolean;
}

const AccountSwitchInput = ({
  label,
  errorMessage,
  selectedAccountType,
  onChange,
  inlineLabel = false,
  disabled = false,
}: AccountSwitchInputProps) => {
  const walletOptions = [
    { title: 'Key based', value: AccountTypes.Key },
    { title: 'Smart wallet', value: AccountTypes.Contract },
    { title: 'Custom Address', value: 'Custom'},
  ];

  const selectedOption = walletOptions.find((option) => option.value === selectedAccountType) as SelectOption;

  return (
    <Switch3Input
      label={label ?? 'Account'}
      option1={walletOptions[0]}
      option2={walletOptions[1]}
      option3={walletOptions[2]}
      selectedOption={selectedOption}
      onChange={(option) => {
        if (option.value === 1) alert('Unsupported yet!');
        if (onChange) onChange(option.value);
      }}
      errorMessage={errorMessage}
      inlineLabel={inlineLabel}
      disabled={disabled}
    />
  );
}

export default AccountSwitchInput;

import React from 'react';
import SwitchInput from '../SwitchInput';
import { AccountTypes } from 'etherspot';
import { SelectOption } from '../SelectInput/SelectInput';

interface AccountSwitchInputProps {
  label?: string;
  errorMessage?: string;
  selectedAccountType: string;
  onChange?: (value: string) => void;
}

const AccountSwitchInput = ({
  label,
  errorMessage,
  selectedAccountType,
  onChange,
}: AccountSwitchInputProps) => {
  const walletOptions = [
    { title: 'Key based', value: AccountTypes.Key },
    { title: 'Etherspot', value: AccountTypes.Contract },
  ];

  const selectedOption = walletOptions.find((option) => option.value === selectedAccountType) as SelectOption;

  return (
    <SwitchInput
      label={label ?? 'Account'}
      option1={walletOptions[0]}
      option2={walletOptions[1]}
      selectedOption={selectedOption}
      onChange={(option) => {
        if (option.value === 1) alert('Unsupported yet!');
        if (onChange) onChange(option.value);
      }}
      errorMessage={errorMessage}
    />
  );
}

export default AccountSwitchInput;

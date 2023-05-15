import React from 'react';
import SwitchInput from '../SwitchInput';
import { SelectOption } from '../SelectInput/SelectInput';
import { DestinationWalletEnum } from '../../enums/wallet.enum';

interface AccountSwitchInputProps {
  label?: string;
  errorMessage?: string;
  selectedAccountType: string;
  onChange?: (value: string) => void;
  inlineLabel?: boolean;
  disabled?: boolean;
  showCustom?: boolean;
  hideKeyBased?: boolean;
  showTotals?: boolean;
  showHelperText?: boolean;
}

const AccountSwitchInput = ({
  label,
  errorMessage,
  selectedAccountType,
  onChange,
  inlineLabel = false,
  disabled = false,
  showCustom = false,
  hideKeyBased = false,
  showTotals = false,
  showHelperText = false,
}: AccountSwitchInputProps) => {
  let walletOptions = [
    {
      title: 'Smart Wallet',
      value: DestinationWalletEnum.Contract,
      helperTooltip: `This is your Smart Wallet balance and doesn't reflect your wallet balance (on Metamask)`,
    },
  ];

  if (!hideKeyBased) {
    walletOptions = [
      {
        title: 'Wallet',
        value: DestinationWalletEnum.Key,
        helperTooltip: 'This is your Wallet balance (from Metamask)',
      },
      ...walletOptions,
    ];
  }

  if (showCustom) {
    walletOptions = [...walletOptions, { title: 'Custom', value: DestinationWalletEnum.Custom }];
  }

  const selectedOption = walletOptions.find((option) => option.value === selectedAccountType) as SelectOption;

  return (
    <SwitchInput
      label={label ?? 'Account'}
      options={walletOptions}
      selectedOption={selectedOption}
      onChange={(option) => {
        if (onChange) onChange(option.value);
      }}
      errorMessage={errorMessage}
      inlineLabel={inlineLabel}
      disabled={disabled}
      showTotals={showTotals}
      showHelperText={showHelperText}
    />
  );
}

export default AccountSwitchInput;

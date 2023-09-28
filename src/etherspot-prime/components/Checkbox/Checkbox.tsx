import React, {
  useEffect,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
import { uniqueId } from 'lodash';
import Switch from 'react-ios-switch';
import { Theme } from '../../utils/theme';

const Wrapper = styled.div`
  margin-bottom: 15px;
`;

const InputWrapper = styled.div<{ rightAlign?: boolean }>`
  display: flex;
  flex-direction: ${({ rightAlign }) => rightAlign ? 'row-reverse' : 'row'};
  align-items: center;
`;

const Label = styled.label<{ rightAlign?: boolean }>`
  display: inline-block;
  color: ${({ theme }) => theme.color.text.outerLabel};
  margin-${({ rightAlign }) => rightAlign ? 'right' : 'left'}: 10px;
  font-size: 16px;
`;

const ErrorMessage = styled.small`
  color: ${({ theme }) => theme.color.text.errorMessage};
  margin-top: 5px;
  font-size: 12px;
`;

interface CheckboxInputProps {
  isChecked?: boolean;
  label?: string;
  errorMessage?: string;
  onChange?: (value: boolean) => void;
  rightAlign?: boolean;
}

const Checkbox = ({
  isChecked: defaultIsChecked,
  label,
  errorMessage,
  onChange,
  rightAlign = false,
}: CheckboxInputProps) => {
  const theme: Theme = useTheme();

  const [inputId] = useState(uniqueId('etherspot-checkbox-'));
  const [isChecked, setIsChecked] = useState<boolean>(!!defaultIsChecked);

  useEffect(() => {
    if (onChange) onChange(isChecked)
  }, [isChecked]);

  return (
    <Wrapper>
      <InputWrapper rightAlign={rightAlign}>
        <Switch
          checked={isChecked}
          onChange={() => setIsChecked((current) => !current)}
          offColor={theme?.color?.background?.checkboxInputInactive}
          pendingOffColor={theme?.color?.background?.checkboxInputInactive}
          onColor={theme?.color?.background?.checkboxInputActive}
          pendingOnColor={theme?.color?.background?.checkboxInputActive}
        />
        {!!label && <Label htmlFor={inputId} rightAlign={rightAlign}>{label}</Label>}
      </InputWrapper>
      {!!errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
    </Wrapper>
  );
}

export default Checkbox;

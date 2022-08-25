import React, {
  useEffect,
  useState,
} from 'react';
import styled from 'styled-components';
import { uniqueId } from 'lodash';

const Wrapper = styled.div`
  margin-bottom: 15px;
`;

const InputWrapper = styled.div<{ hasSelect?: boolean }>`
  
`;

const Label = styled.label`
  display: inline-block;
  color: #000;
  margin-left: 5px;
  font-size: 14px;
`;

const StyledCheckbox = styled.input.attrs({ type: 'checkbox' })``;

const ErrorMessage = styled.small`
  color: #ff0000;
  margin-top: 5px;
  font-size: 12px;
`;

interface TextInputProps {
  isChecked?: boolean;
  label?: string;
  errorMessage?: string;
  onChange?: (value: boolean) => void;
}

const Checkbox = ({
  isChecked: defaultIsChecked,
  label,
  errorMessage,
  onChange,
}: TextInputProps) => {
  const [inputId] = useState(uniqueId('etherspot-checkbox-'));
  const [isChecked, setIsChecked] = useState<boolean>(!!defaultIsChecked);

  useEffect(() => {
    if (onChange) onChange(isChecked)
  }, [isChecked]);

  return (
    <Wrapper>
      <InputWrapper>
        <StyledCheckbox id={inputId} checked={isChecked} onChange={() => setIsChecked((current) => !current)} />
        {!!label && <Label htmlFor={inputId}>{label}</Label>}
      </InputWrapper>
      {!!errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
    </Wrapper>
  );
}

export default Checkbox;

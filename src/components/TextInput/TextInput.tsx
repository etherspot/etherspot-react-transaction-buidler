import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';
import styled from 'styled-components';
import { uniqueId } from 'lodash';
import BeatLoader from 'react-spinners/BeatLoader'
import { SelectOption } from '../SelectInput/SelectInput';
import { useTransactionBuilderModal } from '../../hooks';

const Wrapper = styled.div`
  margin-bottom: 15px;
`;

const InputWrapper = styled.div<{ hasSelect?: boolean }>`
  position: relative;
  overflow: hidden;
  height: 42px;
  padding: ${({ hasSelect }) => hasSelect ? '0 0 0 10px' : '0 10px'};
  border: 1px solid #000;
  border-radius: 5px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
`;

const Label = styled.label`
  display: inline-block;
  color: #000;
  margin-bottom: 5px;
  font-size: 14px;
`;

const Input = styled.input<TextInputProps>`
  border: none;
  background: #fff;
  color: #000;
  height: 32px;
  font-size: 14px;
  line-height: 20px;
  flex: 1;
  padding: 5px 0;

  &:focus {
    outline: none;
  }

  ${({ disabled }) => disabled && `
    opacity: 0.6;
  `}
`;

const SelectedOption = styled.span<{ placeholderText?: boolean }>`
  font-size: ${({ placeholderText }) => placeholderText ? 9 : 12}px;
  ${({ placeholderText }) => !placeholderText && `text-decoration: underline;`}
`;

const SelectWrapper = styled.div<{ disabled?: boolean }>`
  height: 100%;
  border-left: 1px solid #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #dedede;
  cursor: pointer;
  padding: 0 5px;
  min-width: 40px;

  ${({ disabled }) => !disabled && `
    &:hover {
      opacity: 0.6;
    }
  `}
`;

const ErrorMessage = styled.small`
  color: #ff0000;
  margin-top: 5px;
  font-size: 12px;
`;

interface TextInputProps {
  value?: string;
  label?: string;
  errorMessage?: string;
  isLoading?: boolean;
  selectOptions?: SelectOption[];
  selectedOption?: SelectOption | null;
  selectedOptionDisplayValue?: string;
  onOptionSelect?: (option: SelectOption) => void;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const TextInput = ({
  label,
  errorMessage,
  value,
  selectOptions,
  selectedOption,
  selectedOptionDisplayValue,
  onOptionSelect,
  onValueChange,
  isLoading = false,
  disabled = false,
}: TextInputProps) => {
  const [inputId] = useState(uniqueId('etherspot-text-input-'));

  const hasSelect = !!selectOptions;

  const { showSelectModal, hideSelectModal } = useTransactionBuilderModal();

  const onSelectClick = useCallback(() => {
    if (isLoading || !hasSelect || disabled) return;

    if (!onOptionSelect) {
      showSelectModal(selectOptions, () => hideSelectModal());
      return;
    }

    showSelectModal(selectOptions, onOptionSelect)
  }, [isLoading, selectOptions, disabled]);


  const selectedOptionTitle = useMemo(() => {
    if (!selectOptions?.length) return 'NO OPTIONS';
    return selectedOption?.title
      ? selectedOptionDisplayValue ?? selectedOption?.title
      : null;
  }, [
    selectedOption,
    selectOptions,
    isLoading,
  ]);

  return (
    <Wrapper>
      {!!label && <Label htmlFor={inputId}>{label}</Label>}
      <InputWrapper hasSelect={hasSelect}>
        <Input
          id={inputId}
          value={value ?? ''}
          disabled={disabled}
          onChange={(event) => onValueChange && onValueChange(event?.target?.value ?? '')}
        />
        {hasSelect && (
          <SelectWrapper onClick={onSelectClick} disabled={isLoading || !selectOptions?.length || disabled}>
            {!isLoading && !!selectedOptionTitle && <SelectedOption>{selectedOptionTitle}</SelectedOption>}
            {!isLoading && !selectedOptionTitle && <SelectedOption placeholderText>SELECT</SelectedOption>}
            {isLoading && <BeatLoader size={6} />}
          </SelectWrapper>
        )}
      </InputWrapper>
      {!!errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
    </Wrapper>
  );
}

export default TextInput;

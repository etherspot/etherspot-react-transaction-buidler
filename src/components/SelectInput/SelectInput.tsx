import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';
import styled from 'styled-components';
import { AiFillCaretDown } from 'react-icons/ai';
import { uniqueId } from 'lodash';
import BeatLoader from 'react-spinners/BeatLoader'

import { useTransactionBuilderModal } from '../../hooks';

const Wrapper = styled.div`
  margin-bottom: 15px;
`

const InputWrapper = styled.div`
  position: relative;
  overflow: hidden;
  height: 32px;
  padding: 5px 60px 5px 10px;
  border: 1px solid #000;
  border-radius: 5px;
  font-size: 14px;
  line-height: 32px;
`;

const SelectButton = styled(AiFillCaretDown)`
`;

const SelectWrapper = styled.div<{ disabled?: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 50px;
  border-left: 1px solid #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #dedede;
  cursor: pointer;

  ${({ disabled }) => !disabled && `
    &:hover {
      opacity: 0.6;
    }
  `}
`;

const Label = styled.label`
  display: inline-block;
  color: #000;
  margin-bottom: 5px;
  font-size: 14px;
`;

const ErrorMessage = styled.small`
  color: #ff0000;
  margin-top: 5px;
  font-size: 12px;
`;

export interface SelectOption {
  title: string;
  value: any;
}

interface SelectInputProps {
  label?: string;
  errorMessage?: string;
  isLoading?: boolean;
  options: SelectOption[];
  selectedOption?: SelectOption | null;
  onOptionSelect?: (option: SelectOption) => void;
  disabled?: boolean;
}

const SelectInput = ({
  label,
  errorMessage,
  isLoading = false,
  options,
  selectedOption,
  onOptionSelect,
  disabled = false,
}: SelectInputProps) => {
  const [inputId] = useState(uniqueId('etherspot-select-input-'));

  const { showSelectModal, hideSelectModal } = useTransactionBuilderModal();

  const onSelectClick = useCallback(() => {
    if (isLoading || disabled) return;

    if (!onOptionSelect) {
      showSelectModal(options, () => hideSelectModal());
      return;
    }

    showSelectModal(options, onOptionSelect)
  }, [isLoading, options, disabled]);

  const selectedOptionTitle = useMemo(() => {
    if (isLoading && !selectedOption?.title) return 'Loading options...';
    if (!isLoading && !options?.length) return 'No options';
    return selectedOption?.title ?? 'None';
  }, [
    selectedOption,
    options,
    isLoading,
  ]);

  return (
    <Wrapper>
      {!!label && <Label htmlFor={inputId}>{label}</Label>}
      <InputWrapper onClick={onSelectClick}>
        {selectedOptionTitle}
        <SelectWrapper disabled={!!isLoading || disabled}>
          {!isLoading && <SelectButton size={15} />}
          {isLoading && <BeatLoader size={6} />}
        </SelectWrapper>
      </InputWrapper>
      {!!errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
    </Wrapper>
  );
}

export default SelectInput;

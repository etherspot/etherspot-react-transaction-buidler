import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
import { AiOutlineSearch } from 'react-icons/ai';
import { MdOutlineKeyboardArrowDown, MdOutlineKeyboardArrowUp } from 'react-icons/md';
import { uniqueId } from 'lodash';

import { containsText } from '../../utils/validation';
import { Theme } from '../../utils/theme';

const Wrapper = styled.div<{ disabled: boolean, expanded?: boolean }>`
  position: relative;
  margin-bottom: 18px;
    background: ${({ theme, expanded }) => expanded ? theme.color.background.selectInputExpanded : theme.color.background.selectInput};
  color: ${({ theme }) => theme.color.text.selectInput};
  border-radius: 8px;
  padding: 8px 14px 14px;
  ${({ disabled }) => disabled && `opacity: 0.3;`}
`;

const SelectWrapper = styled.div<{ disabled: boolean }>`
  position: absolute;
  top: 10px;
  right: 8px;
  width: 50px;
  text-align: right;

  ${({ disabled }) => !disabled && `
    cursor: pointer;
  
    &:hover {
      opacity: 0.5;
    }
  `}
`;

const Label = styled.label<{ outside?: boolean }>`
  display: inline-block;
  color: ${({ theme, outside }) => outside ? theme.color.text.outerLabel : theme.color.text.innerLabel};
  margin-bottom: ${({ outside }) => outside ? 11 : 14}px;
  font-size: 14px;
`;

const ErrorMessage = styled.small`
  color: ${({ theme }) => theme.color.text.errorMessage};
  margin-top: 5px;
  font-size: 12px;
`;

const SearchInputWrapper = styled.label`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  border-bottom: 1px solid #ffd2bb;
  margin-bottom: 17px;
  padding: 0 0 5px;
`;

const SearchInput = styled.input`
  font-size: 16px;
  width: calc(100% - 18px);
  height: 20px;
  background: none;
  border: none;
  margin: 0;
  padding: 0 8px;
  font-family: "PTRootUIWebMedium", sans-serif;
  color: ${({ theme }) => theme.color.text.searchInput};

  &::placeholder {
    color: ${({ theme }) => theme.color.text.searchInputSecondary};
  }

  &:focus {
    outline: none;
  }
`;

const OptionList = styled.div`
  position: relative;
`;

const SelectedOption = styled.div<{ disabled: boolean }>`
  color: ${({ theme }) => theme.color.text.selectInputOption};
  font-size: 16px;
  font-family: "PTRootUIWebMedium", sans-serif;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;

  ${({ disabled }) => !disabled && `
    cursor: pointer;
  
    &:hover {
      opacity: 0.5;
    }
  `}
`;

const OptionListItem = styled(SelectedOption)`
  text-align: left;
  margin-bottom: 15px;
  cursor: pointer;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    text-decoration: underline;
  }
`;


const OptionImage = styled.img`
  height: 24px;
  border-radius: 50%;
  margin-right: 8px;
`;

export interface SelectOption {
  title: string;
  value: any;
  iconUrl?: string;
}

interface SelectInputProps {
  label?: string;
  errorMessage?: string;
  isLoading?: boolean;
  options: SelectOption[];
  selectedOption?: SelectOption | null;
  onOptionSelect?: (option: SelectOption) => void;
  disabled?: boolean;
  noSearch?: boolean;
  placeholder?: string;
  displayLabelOutside?: boolean
}

const SelectInput = ({
  label,
  errorMessage,
  isLoading = false,
  options,
  selectedOption,
  onOptionSelect,
  disabled = false,
  noSearch = false,
  placeholder = 'None',
  displayLabelOutside = false,
}: SelectInputProps) => {
  const [inputId] = useState(uniqueId('etherspot-select-input-'));
  const [searchInputId] = useState(uniqueId('etherspot-select-search-input-'));
  const [showSelectModal, setShowSelectModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const theme: Theme = useTheme();

  const onSelectClick = useCallback(() => {
    if (isLoading || disabled) return;
    setShowSelectModal(!showSelectModal);
  }, [isLoading, disabled, showSelectModal]);

  const hideSelectModal = () => setShowSelectModal(false);

  const selectedOptionTitle = useMemo(() => {
    if (isLoading && !selectedOption?.title) return 'Loading options...';
    if (!isLoading && !options?.length) return 'No options';
    return selectedOption?.title ?? placeholder;
  }, [
    selectedOption,
    options,
    isLoading,
    placeholder,
  ]);

  const filteredSelectOptions: SelectOption[] = useMemo(
    () => options.filter((selectOption) => containsText(selectOption?.title, searchQuery) || containsText(selectOption?.value , searchQuery)),
    [options, searchQuery],
  )

  return (
    <>
      {!!displayLabelOutside && !!label && <Label htmlFor={inputId} outside>{label}</Label>}
      <Wrapper disabled={disabled} expanded={showSelectModal}>
        {!displayLabelOutside && !!label && <Label htmlFor={inputId}>{label}</Label>}
        {!isLoading && (
          <SelectWrapper onClick={onSelectClick} disabled={disabled}>
            {!showSelectModal && <MdOutlineKeyboardArrowDown size={21} color={theme.color?.background?.selectInputToggleButton} />}
            {showSelectModal && <MdOutlineKeyboardArrowUp size={21} color={theme.color?.background?.selectInputToggleButton} />}
          </SelectWrapper>
        )}
        {!showSelectModal && (
          <SelectedOption onClick={onSelectClick} disabled={disabled}>
            {!!selectedOption?.iconUrl && <OptionImage src={selectedOption.iconUrl} alt={selectedOption.title} />}
            {selectedOptionTitle}
          </SelectedOption>
        )}
        {showSelectModal && (
          <OptionList>
            {!noSearch && options?.length > 5 && (
              <SearchInputWrapper htmlFor={searchInputId}>
                <AiOutlineSearch size={18} color={theme?.color?.text?.searchInput} />
                <SearchInput id={searchInputId} onChange={(e: any) => setSearchQuery(e?.target?.value)} placeholder="Search" />
              </SearchInputWrapper>
            )}
            {!filteredSelectOptions?.length && <small>No results.</small>}
            {filteredSelectOptions.map((option, index) => (
              <OptionListItem
                disabled={disabled}
                key={`${option.value}-${index}`}
                onClick={() => {
                  if (onOptionSelect) onOptionSelect(option);
                  hideSelectModal();
                }}
              >
                {!!option.iconUrl && <OptionImage src={option.iconUrl} alt={option.title} />}
                {option.title}
              </OptionListItem>
            ))}
          </OptionList>
        )}
        {!!errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
      </Wrapper>
    </>
  );
}

export default SelectInput;

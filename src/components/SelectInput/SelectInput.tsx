import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components';
import { AiOutlineSearch } from 'react-icons/ai';
import { MdOutlineKeyboardArrowDown, MdOutlineKeyboardArrowUp } from 'react-icons/md';
import { uniqueId } from 'lodash';

import { containsText } from '../../utils/validation';
import { Theme } from '../../utils/theme';
import { RoundedImage } from '../Image';
import ContentLoader from "react-content-loader";

const Wrapper = styled.div<{ disabled: boolean; expanded?: boolean; isOffer?: boolean }>`
  position: relative;
  margin-bottom: 18px;
  background: ${({ theme, expanded, isOffer }) =>
    expanded || isOffer ? theme.color.background.selectInputExpanded : theme.color.background.selectInput};
  color: ${({ theme }) => theme.color.text.selectInput};
  border-radius: 8px;
  padding: 8px 14px 14px;
  cursor: pointer;
  ${({ disabled }) => disabled && `opacity: 0.3;`}
`;

const SelectButtonWrapper = styled.div<{ disabled?: boolean }>`
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
  border-bottom: 1px solid ${({ theme }) => theme.color.background.selectInputBorder};;
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

const SelectedOption = styled.div<{ disabled?: boolean; noHover?: boolean; }>`
  color: ${({ theme }) => theme.color.text.selectInputOption};
  font-size: 16px;
  font-family: "PTRootUIWebMedium", sans-serif;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;

  ${({ disabled }) => !disabled && `
    cursor: pointer;
  `}

  ${({ noHover }) => noHover && `
    cursor: inherit;
  
    &:hover {
      opacity: 1;
    }
  `}
`;

const OptionsScroll = styled.div`
  max-height: 210px;
  overflow-x: hidden;
  overflow-y: scroll;

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: none;
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.background.selectInputScrollbar};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: ${({ theme }) => theme.color.background.selectInputScrollbarHover};
  }

  ::-webkit-scrollbar-thumb:active {
    background-color: ${({ theme }) => theme.color.background.selectInputScrollbarActive};
  }
`;

const OptionListItem = styled(SelectedOption)`
  text-align: left;
  cursor: pointer;
  padding: 7.5px 3px;
  border-radius: 6px;
  &:hover {
    ${({ theme }) => `background-color: ${theme.color.background.selectInputExpandedHover};`}
  }
  &:last-child {
    margin-bottom: 0;
  }
`;

export interface SelectOption {
  title: string;
  value: any;
  iconUrl?: string;
  extension?: string;
  helperTooltip?: string;
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
  renderSelectedOptionContent?: (option: SelectOption) => React.ReactNode;
  renderOptionListItemContent?: (option: SelectOption) => React.ReactNode;
  forceShow?: boolean
  noOpen?: boolean
  isOffer?: boolean
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
  renderOptionListItemContent,
  renderSelectedOptionContent,
  forceShow = false,
  noOpen = false,
  isOffer = false,
}: SelectInputProps) => {
  const [inputId] = useState(uniqueId('etherspot-select-input-'));
  const [searchInputId] = useState(uniqueId('etherspot-select-search-input-'));
  const [showSelectModal, setShowSelectModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const theme: Theme = useTheme();

  const onSelectClick = useCallback(() => {
    if (isLoading || disabled || noOpen) return;
    setShowSelectModal(!showSelectModal);
  }, [isLoading, disabled, showSelectModal]);

  const hideSelectModal = () => setShowSelectModal(false);
  +
    useEffect(() => {
      setShowSelectModal(forceShow);
    }, [forceShow])

  const selectedOptionTitle = useMemo(() => {
    if (isLoading && !selectedOption?.title)
      return (
        <ContentLoader
          viewBox="0 0 380 60"
          foregroundColor={theme.color?.background?.loadingAnimationForeground}
          backgroundColor={theme.color?.background?.loadingAnimationBackground}
        >
          <circle cx="25" cy="25" r="25" />
          <rect x="60" y="10" rx="4" ry="4" width="310" height="13" />
          <rect x="60" y="30" rx="4" ry="4" width="310" height="13" />
        </ContentLoader>
      );
    if (!isLoading && !options?.length) return 'No options';
    return selectedOption?.title ?? placeholder;
  }, [
    selectedOption,
    options,
    isLoading,
    placeholder,
  ]);

  const filteredSelectOptions: SelectOption[] = useMemo(
    () => options.filter((selectOption) => containsText(selectOption?.title, searchQuery) || containsText(selectOption?.value, searchQuery)),
    [options, searchQuery],
  );

  return (
    <>
      {!!displayLabelOutside && !!label && <Label htmlFor={inputId} outside>{label}</Label>}
      <Wrapper isOffer={isOffer} disabled={disabled} expanded={showSelectModal} onClick={onSelectClick}>
        {!displayLabelOutside && !!label && <Label htmlFor={inputId}>{label}</Label>}
        {!isLoading && options?.length > 1 && (
          <SelectButtonWrapper onClick={onSelectClick} disabled={disabled}>
            {!showSelectModal && <MdOutlineKeyboardArrowDown size={21} color={theme.color?.background?.selectInputToggleButton} />}
            {showSelectModal && <MdOutlineKeyboardArrowUp size={21} color={theme.color?.background?.selectInputToggleButton} />}
          </SelectButtonWrapper>
        )}
        {!showSelectModal && (
          <SelectedOption onClick={(e) => {
            e.stopPropagation()
            onSelectClick()
          }}
            disabled={disabled} noHover={noOpen}>
            {!!renderSelectedOptionContent && selectedOption && renderSelectedOptionContent(selectedOption)}
            {(!renderSelectedOptionContent || !selectedOption) && (
              <>
                {!!selectedOption?.iconUrl && <RoundedImage url={selectedOption.iconUrl} title={selectedOption.title} size={24} />}
                {selectedOptionTitle}
              </>
            )}
          </SelectedOption>
        )}
        {showSelectModal && (
          <OptionList>
            {!noSearch && options?.length > 5 && (
              <SearchInputWrapper htmlFor={searchInputId}>
                <AiOutlineSearch size={18} color={theme?.color?.text?.searchInput} />
                <SearchInput
                  id={searchInputId}
                  onChange={(e: any) => setSearchQuery(e?.target?.value)}
                  placeholder="Search"
                  onClick={(e: any) => {
                    e.stopPropagation()
                  }}
                  onFocus={(e: any) => {
                    e.stopPropagation()
                  }}
                />
              </SearchInputWrapper>
            )}
            {!filteredSelectOptions?.length && <small>No results.</small>}
            {!!filteredSelectOptions?.length && (
              <OptionsScroll>
                {filteredSelectOptions.map((option, index) => (
                  <OptionListItem
                    disabled={disabled}
                    key={`${option.value}-${index}`}
                    noHover={noOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOptionSelect) onOptionSelect(option);
                      hideSelectModal();
                    }}
                  >
                    {!!renderOptionListItemContent && renderOptionListItemContent(option)}
                    {!renderOptionListItemContent && (
                      <>
                        {!!option.iconUrl && <RoundedImage url={option.iconUrl} title={option.title} size={24} />}
                        {option.title}
                      </>
                    )}
                  </OptionListItem>
                ))}
              </OptionsScroll>
            )}
          </OptionList>
        )}
        {!!errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
      </Wrapper>
    </>
  );
}

export default SelectInput;

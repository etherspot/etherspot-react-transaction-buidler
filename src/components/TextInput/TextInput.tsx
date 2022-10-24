import React, {
  ReactNode,
  useState,
} from 'react';
import styled from 'styled-components';
import { uniqueId } from 'lodash';

const Wrapper = styled.div<{ disabled: boolean }>`
  position: relative;
  margin-bottom: 18px;
  background: ${({ theme }) => theme.color.background.textInput};
  color: ${({ theme }) => theme.color.text.textInput};
  border-radius: 8px;
  padding: 8px 14px 14px;
  ${({ disabled }) => disabled && `opacity: 0.3;`}
`;

const InputWrapper = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
`;

const InputWrapperRight = styled.div`
  flex: 1;
  position: relative;
`;

const Label = styled.label<{ outside?: boolean }>`
  display: inline-block;
  color: ${({ theme, outside }) => outside ? theme.color.text.outerLabel : theme.color.text.innerLabel};
  margin-bottom: ${({ outside }) => outside ? 11 : 14}px;
  font-size: 14px;
`;

const Input = styled.input<{ smallerInput?: boolean, hasPasteIcon?: boolean }>`
  width: 100%;
  font-family: "PTRootUIWebMedium", sans-serif;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.color.text.textInput};
  font-size: ${({ smallerInput }) => smallerInput ? 14 : 20}px;
  padding: 0;
  padding-right: ${({ hasPasteIcon }) => hasPasteIcon ? 40 : 0}px;
  box-sizing: border-box !important;

  &::placeholder {
    color: ${({ theme }) => theme.color.text.textInputSecondary};
  }

  &:focus {
    outline: none;
  }

  ${({ disabled }) => disabled && `
    opacity: 0.6;
  `}
`;

const InputBottomText = styled.div`
  font-family: "PTRootUIWebMedium", sans-serif;
  font-size: 14px;
  color: ${({ theme }) => theme.color.text.textInputSecondary};
  margin-top: 4px;
`;

const ErrorMessage = styled.small`
  color: ${({ theme }) => theme.color.text.errorMessage};
  margin-top: 5px;
  font-size: 12px;
`;

const InputTopRight = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
`;

const InputPasteIcon = styled.div`
  color: ${({ theme }) => theme.color.text.pasteIcon};
  position: absolute;
  top: 50%;
  right: 0%;
  transform: translateY(-50%);
  cursor: pointer;
`;

interface TextInputProps {
  value?: string;
  label?: string;
  errorMessage?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputBottomText?: string;
  inputLeftComponent?: ReactNode;
  inputTopRightComponent?: ReactNode;
  displayLabelOutside?: boolean
  smallerInput?: boolean
  noLabel?: boolean
  showPasteButton?: boolean
}

const TextInput = ({
  label,
  errorMessage,
  value,
  onValueChange,
  disabled = false,
  placeholder,
  inputBottomText,
  inputLeftComponent,
  inputTopRightComponent,
  displayLabelOutside = false,
  smallerInput = false,
  noLabel = false,
  showPasteButton = false,
}: TextInputProps) => {
  const [inputId] = useState(uniqueId('etherspot-text-input-'));
  const handlePaste = async () => {
    try {
      let res = await navigator.clipboard.readText()
      if (res.length > 0 && onValueChange) {
        onValueChange(res);
      }
    } catch (error) {
      console.log(error)
    }
  };

  return (
    <>
      {!noLabel && displayLabelOutside && !!label && <Label htmlFor={inputId} outside>{label}</Label>}
      <Wrapper disabled={disabled}>
        {!noLabel && !displayLabelOutside && !!label && <Label htmlFor={inputId}>{label}</Label>}
        <InputWrapper>
          {inputLeftComponent}
          <InputWrapperRight>
            <Input
              id={inputId}
              value={value ?? ''}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(event) => onValueChange && onValueChange(event?.target?.value ?? '')}
              smallerInput={smallerInput}
              hasPasteIcon={showPasteButton}
            />
            {showPasteButton && <InputPasteIcon onClick={handlePaste}>Paste</InputPasteIcon> }
            {!!inputBottomText && <InputBottomText>{inputBottomText}</InputBottomText>}
          </InputWrapperRight>
        </InputWrapper>
        {!!errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
        {inputTopRightComponent && <InputTopRight>{inputTopRightComponent}</InputTopRight>}
      </Wrapper>
    </>
  );
}

export default TextInput;

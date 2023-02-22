export interface Theme {
  color?: {
    background?: {
      main?: string;
      topMenu?: string;
      topMenuButton?: string;
      card?: string;
      selectInput?: string;
      selectInputExpanded?: string;
      selectInputScrollbar?: string;
      selectInputScrollbarHover?: string;
      selectInputScrollbarActive?: string;
      selectInputImagePlaceholder?: string;
      selectInputToggleButton?: string;
      textInput?: string;
      switchInput?: string;
      switchInputActiveTab?: string;
      switchInputInactiveTab?: string;
      button?: string;
      closeButton?: string;
      pill?: string;
      roundedImageFallback?: string;
      listItemQuickButtonSecondary?: string;
      listItemQuickButtonPrimary?: string;
      statusIconSuccess?: string;
      statusIconFailed?: string;
      statusIconPending?: string;
      checkboxInputActive?: string;
      checkboxInputInactive?: string;
      dropdownHoverColor?: string;
      selectInputExpandedHover?: string;
      toDropdownColor?: string;
      secondary?: string;
      selectInputRadioOn?: string;
      selectInputRadioOff?: string;
      walletButton?: string;
      walletChainDropdown?: string;
      walletChainButtonActive?: string;
      tokenBalanceContainer?: string;
      horizontalLine?: string;
      blockParagraphBorder?: string;
    };
    text?: {
      main?: string;
      topBar?: string;
      topMenu?: string;
      card?: string;
      cardDisabled?: string;
      cardTitle?: string;
      innerLabel?: string;
      outerLabel?: string;
      selectInput?: string;
      selectInputOption?: string;
      selectInputOptionSecondary?: string;
      selectInputImagePlaceholder?: string;
      textInput?: string;
      textInputSecondary?: string;
      switchInputActiveTab?: string;
      switchInputInactiveTab?: string;
      button?: string;
      buttonSecondary?: string;
      errorMessage?: string;
      searchInput?: string;
      searchInputSecondary?: string;
      pill?: string;
      pillValue?: string;
      roundedImageFallback?: string;
      listItemQuickButtonSecondary?: string;
      listItemQuickButtonPrimary?: string;
      transactionStatusLink?: string;
      pasteIcon?: string;
      walletDropdownIcon?: string;
      tokenBalance?: string;
      tokenValue?: string;
      tokenTotal?: string;
      reviewLabel?: string;
      settingsIcon?: string;
      blockParagraphHighlight?: string;
    };
  };
}

export const defaultTheme: Theme = {
  color: {
    background: {
      main: 'linear-gradient(to right, #f43b40, #f8793f)',
      card: '#fff7f2',
      tokenBalanceContainer: '#21002e',
      horizontalLine: 'linear-gradient(90deg, #23a9c9, #cd34a2)',
      topMenu: '#fff',
      topMenuButton: '#fff',
      selectInput: '#fff',
      selectInputExpanded: '#fff',
      selectInputScrollbar: '#ff7733',
      selectInputScrollbarHover: 'rgba(255, 119, 51, 0.8)',
      selectInputScrollbarActive: 'rgba(255, 119, 51, 0.5)',
      selectInputImagePlaceholder: '#ffe6d9',
      selectInputToggleButton: '#0a1427',
      textInput: '#ffe6d9',
      switchInput: '#ffd2bb',
      switchInputActiveTab: '#fff',
      switchInputInactiveTab: 'transparent',
      button: '#fff',
      closeButton: '#0a1427',
      pill: '#fff7f2',
      roundedImageFallback: '#ffe6d9',
      listItemQuickButtonSecondary: '#443d66',
      listItemQuickButtonPrimary: '#ff884d',
      statusIconSuccess: '#1ba23d',
      statusIconPending: '#ff6b35',
      statusIconFailed: '#ff0000',
      checkboxInputActive: '#ff884d',
      checkboxInputInactive: '#7f7a99',
      dropdownHoverColor: '#F8EFEA',
      selectInputExpandedHover: '#F8EFEA',
      toDropdownColor: '#F8EFEA',
      secondary: '#9889e4',
      selectInputRadioOn: '#ff7733',
      selectInputRadioOff: '#F8EFEA',
      walletButton: 'linear-gradient(to bottom, #fd9250, #ff5548)',
      walletChainDropdown: '#fff',
      walletChainButtonActive: '#ffeee6',
      blockParagraphBorder: 'linear-gradient(#346ecd, #cd34a2)',
    },
    text: {
      main: '#fff',
      topBar: '#fff',
      topMenu: '#191726',
      cardTitle: '#191726',
      card: '#000',
      cardDisabled: '#ddd',
      tokenBalance: '#fefefe',
      tokenValue: '#57c2d6',
      tokenTotal: '#ff0065',
      innerLabel: '#6e6b6a',
      outerLabel: '#6e6b6a',
      reviewLabel: '#5fc9e0',
      selectInput: '#000',
      selectInputOption: '#191726',
      selectInputOptionSecondary: '#191726',
      selectInputImagePlaceholder: '#6e6b6a',
      textInput: '#000',
      textInputSecondary: '#6e6b6a',
      switchInputActiveTab: '#191726',
      switchInputInactiveTab: '#6e6b6a',
      button: '#191726',
      buttonSecondary: '#ffeee6',
      errorMessage: '#ff0000',
      searchInput: '#ff7733',
      searchInputSecondary: '#ff7733',
      pill: '#6e6b6a',
      pillValue: '#191726',
      roundedImageFallback: '#6e6b6a',
      listItemQuickButtonSecondary: '#fff',
      listItemQuickButtonPrimary: '#fff',
      transactionStatusLink: '#ff7733',
      pasteIcon: '#ff884d',
      settingsIcon: '#ee6723',
      walletDropdownIcon: '#221f33',
      blockParagraphHighlight: '#e333e8',
    },
  },
};

export const darkTheme: Theme = {
  ...defaultTheme,
  color: {
    background: {
      main: '#221f33',
      topMenu: '#443d66',
      topMenuButton: '#ff884d',
      card: '#2b2640',
      button: '#ff884d',
      closeButton: '#ff884d',
      selectInputToggleButton: '#ff884d',
      selectInput: '#443d66',
      selectInputExpanded: '#1a1726',
      selectInputImagePlaceholder: '#443d66',
      textInput: '#1a1726',
      switchInput: '#1a1726',
      switchInputActiveTab: '#443d66',
      switchInputInactiveTab: 'transparent',
      pill: '#2b2640',
      checkboxInputInactive: '#665c99',
      dropdownHoverColor: '#443d66',
      selectInputExpandedHover: '#443d66',
      walletButton: 'linear-gradient(to bottom, #6154a3, #292246)',
      walletChainDropdown: '#1a1726',
      walletChainButtonActive: '#443d66',
      blockParagraphBorder: 'linear-gradient(#346ecd, #cd34a2)',
    },
    text: {
      selectInput: '#ffeee6',
      selectInputOption: '#ffeee6',
      selectInputOptionSecondary: '#ffeee6',
      searchInput: '#998ae6',
      searchInputSecondary: '#998ae6',
      outerLabel: '#998ae6',
      innerLabel: '#998ae6',
      topMenu: '#998ae6',
      main: '#ffeee6',
      topBar: '#998ae6',
      buttonSecondary: '#998ae6',
      card: '#ffeee6',
      cardTitle: '#ffeee6',
      button: '#fff',
      errorMessage: '#ff4d6a',
      textInput: '#ffeee6',
      textInputSecondary: '#ffeee6',
      switchInputActiveTab: '#ffeee6',
      switchInputInactiveTab: '#bbb8cc',
      selectInputImagePlaceholder: '#ffeee6',
      cardDisabled: '#605e5e',
      pill: '#bbb8cc',
      pillValue: '#ffeee6',
      walletDropdownIcon: '#ff884d',
      blockParagraphHighlight: '#e333e8',
    },
  },
};

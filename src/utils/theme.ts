export interface Theme {
  color?: {
    background?: {
      main?: string;
      topMenu?: string;
      topMenuWallet?: string;
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
      deployButton?: string;
      blockParagraphBorder?: string;
      settingMenuMain?: string;
      settingsModalBorder?: string;
      settingsModal?: string;
      loadingAnimationBackground?: string;
      loadingAnimationForeground?: string;
    };
    text?: {
      main?: string;
      topBar?: string;
      topMenu?: string;
      topMenuWallet?: string;
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
      searchIcon?: string;
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
      blockParagraphHighlightSecondary?: string;
      selectAllButton?: string;
      settingsModalSubHeader?: string;
      settingsMenuItem?: string;
      settingsMenuItemHover?: string;
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
      topMenuWallet: 'rgba(255, 247, 242, 0.24)',
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
      deployButton: '#ff884d',
      blockParagraphBorder: 'linear-gradient(#346ecd, #cd34a2)',
      settingMenuMain: 'linear-gradient(rgb(253, 146, 80), rgb(255, 85, 72))',
      settingsModalBorder: '#d9d9d940',
      settingsModal: '#fff',
      loadingAnimationBackground: '#FCEADF',
      loadingAnimationForeground: '#FBF7F5',
    },
    text: {
      main: '#fff',
      topBar: '#fff',
      topMenu: '#191726',
      topMenuWallet: '#fff',
      cardTitle: '#191726',
      card: '#000',
      cardDisabled: '#ddd',
      tokenBalance: '#000',
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
      searchIcon: '#ff7733',
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
      blockParagraphHighlightSecondary: '#77e7f6',
      selectAllButton: '#221f33',
      settingsModalSubHeader: '#6e6b6a',
      settingsMenuItem: '#191726',
      settingsMenuItemHover: '#ee6723',
    },
  },
};

export const darkTheme: Theme = {
  ...defaultTheme,
  color: {
    background: {
      main: 'linear-gradient(169deg, #3e3869 5%, #241938 98%)',
      horizontalLine: 'linear-gradient(90deg, #23a9c9, #cd34a2)',
      topMenu: 'rgb(68, 61, 102)',
      topMenuWallet: 'rgba(111, 76, 172, 0.54)',
      topMenuButton: '#ffffff',
      card: '#262240',
      button: 'linear-gradient(to bottom, #fdb754, #f18214)',
      closeButton: '#ffffff',
      selectInputToggleButton: '#998ae6',
      selectInput: '#474078',
      selectInputExpanded: '#130c1d',
      statusIconPending: '#ff6b35',
      statusIconFailed: '#ff0000',
      statusIconSuccess: '#1ba23d',
      selectInputImagePlaceholder: '#4f367a',
      selectInputScrollbar: '#494076',
      selectInputScrollbarHover: '#2d2457',
      selectInputScrollbarActive: '#2d2457',
      textInput: '#1a1726',
      switchInput: '#1a1726',
      switchInputActiveTab:
        'linear-gradient(to bottom, #734fb3, #422d66), linear-gradient(to bottom, #3d265c, #222130)',
      switchInputInactiveTab: 'transparent',
      pill: '#2b2640',
      checkboxInputInactive: '#665c99',
      dropdownHoverColor: '#443d66',
      selectInputExpandedHover: '#262240',
      walletButton: 'linear-gradient(to bottom, #6154a3, #292246)',
      walletChainDropdown: '#1a1726',
      walletChainButtonActive: '#443d66',
      blockParagraphBorder: 'linear-gradient(#346ecd, #cd34a2)',
      listItemQuickButtonPrimary: '#eb860b',
      listItemQuickButtonSecondary: '#4f367a',
      deployButton: '#ff884d',
      settingMenuMain: 'linear-gradient(to bottom,#fdb754,#f18214)',
      settingsModalBorder: '#b6b1d2',
      settingsModal: '#474078',
      loadingAnimationBackground: '#ededed33',
      loadingAnimationForeground: '#6C6C6F',
    },
    text: {
      selectInput: '#ffeee6',
      selectInputOption: '#ffeee6',
      selectInputOptionSecondary: '#ffeee6',
      searchInput: '#9466e6',
      searchIcon: '#9466e6',
      searchInputSecondary: '#998ae6',
      outerLabel: '#998ae6',
      innerLabel: '#998ae6',
      topMenu: '#998ae6',
      topMenuWallet: '#cab3f5',
      main: '#ffeee6',
      topBar: '#998ae6',
      buttonSecondary: '#fbae49',
      card: '#ffeee6',
      cardTitle: '#ffeee6',
      button: '#fff',
      errorMessage: '#ff4d6a',
      textInput: '#ffeee6',
      tokenTotal: '#ff0065',
      tokenValue: '#57c2d6',
      textInputSecondary: '#9466e6',
      switchInputActiveTab: '#ffeee6',
      transactionStatusLink: '#ff7733',
      switchInputInactiveTab: '#9466e6',
      selectInputImagePlaceholder: '#ffeee6',
      cardDisabled: '#605e5e',
      tokenBalance: '#fefefe',
      pill: '#bbb8cc',
      pillValue: '#ffeee6',
      walletDropdownIcon: '#ff884d',
      blockParagraphHighlight: '#e333e8',
      blockParagraphHighlightSecondary: '#77e7f6',
      settingsIcon: '#ee6723',
      selectAllButton: '#ff884d',
      settingsModalSubHeader: '#b6b1d2',
      settingsMenuItem: '#fff',
      settingsMenuItemHover: '#f4973a',
    },
  },
};

export const synthTheme: Theme = {
  ...defaultTheme,
  color: {
    background: {
      main: 'linear-gradient(#4d036a,#0c0c0c)',
      horizontalLine: 'linear-gradient(90deg, #23a9c9, #cd34a2)',
      topMenu: 'rgb(68, 61, 102)',
      topMenuWallet: 'rgba(111, 76, 172, 0.54)',
      topMenuButton: '#ffffff',
      card: '#320145',
      button: '#890df8',
      closeButton: '#77e7f6',
      selectInputToggleButton: '#998ae6',
      selectInput: '#610384',
      selectInputExpanded: '#130c1d',
      statusIconPending: '#ff6b35',
      statusIconFailed: '#ff0000',
      statusIconSuccess: '#1ba23d',
      selectInputImagePlaceholder: '#53056f',
      selectInputScrollbar: '#77e7f6',
      selectInputScrollbarHover: '#77e7f6bd',
      selectInputScrollbarActive: '#77e7f6bd',
      textInput: '#1a1726',
      switchInput: '#53056f',
      switchInputActiveTab: '#77e7f6',
      switchInputInactiveTab: '#53056f',
      pill: '#2b2640',
      checkboxInputInactive: '#665c99',
      dropdownHoverColor: '#45005f',
      selectInputExpandedHover: '#380241',
      walletButton: 'linear-gradient(to bottom, #6154a3, #292246)',
      walletChainDropdown: '#1a1726',
      walletChainButtonActive: '#443d66',
      blockParagraphBorder: 'linear-gradient(to bottom,#2e8d96,#610384)',
      listItemQuickButtonPrimary: '#eb860b',
      listItemQuickButtonSecondary: '#53056f',
      deployButton: '#ff884d',
      settingMenuMain: 'linear-gradient(to bottom,#fdb754,#f18214)',
      settingsModalBorder: '#b6b1d2',
      settingsModal: '#610384',
      loadingAnimationBackground: '#ededed33',
      loadingAnimationForeground: '#6C6C6F',
    },
    text: {
      selectInput: '#fff',
      selectInputOption: '#ffeee6',
      selectInputOptionSecondary: '#ffeee6',
      searchInput: '#77e7f6',
      searchIcon: '#77e7f6',
      searchInputSecondary: '#77e7f6',
      outerLabel: '#77e7f6',
      innerLabel: '#77e7f6',
      topMenu: '#998ae6',
      topMenuWallet: '#cab3f5',
      main: '#000',
      topBar: '#998ae6',
      buttonSecondary: '#77e7f6',
      card: '#ffeee6',
      cardTitle: '#ffeee6',
      button: '#fff',
      errorMessage: '#ff4d6a',
      textInput: '#ffeee6',
      tokenTotal: '#ff0065',
      tokenValue: '#57c2d6',
      textInputSecondary: '#77e7f6',
      switchInputActiveTab: '#000',
      transactionStatusLink: '#77e7f6',
      switchInputInactiveTab: '#77e7f6',
      selectInputImagePlaceholder: '#ffeee6',
      cardDisabled: '#605e5e',
      tokenBalance: '#fefefe',
      pill: '#bbb8cc',
      pillValue: '#ffeee6',
      walletDropdownIcon: '#ff884d',
      blockParagraphHighlight: '#e333e8',
      blockParagraphHighlightSecondary: '#77e7f6',
      settingsIcon: '#ee6723',
      selectAllButton: '#ff884d',
      settingsModalSubHeader: '#b6b1d2',
      settingsMenuItem: '#77e7f6',
      settingsMenuItemHover: '#77e7f6bd',
    },
  },
};

export enum ThemeType {
  DARK = 'DARK',
  LIGHT = 'LIGHT',
  SYNTH = 'SYNTH',
}

export const getTheme = (themeType: ThemeType) => {
  switch (themeType) {
    case ThemeType.DARK:
      return darkTheme;
    case ThemeType.SYNTH:
      return synthTheme;
    default:
      return defaultTheme;
  }
};

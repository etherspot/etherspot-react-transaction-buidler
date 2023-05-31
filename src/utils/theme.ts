export interface Theme {
  color?: {
    background?: {
      main?: string;
      topMenu?: string;
      topMenuWallet?: string;
      topMenuButton?: string;
      card?: string;
      cardBorder?: string;
      selectInput?: string;
      selectInputExpanded?: string;
      selectInputScrollbar?: string;
      selectInputScrollbarHover?: string;
      selectInputScrollbarActive?: string;
      selectInputImagePlaceholder?: string;
      selectInputToggleButton?: string;
      selectInputBorder?: string;
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
      scrollbar?: string;
      walletAssetCopyIcon?: string;
      tooltip?: string;
      tooltipBorder?: string;
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
      tooltip?: string;
    };
  };
}

export const defaultTheme: Theme = {
  color: {
    background: {
      main: 'linear-gradient(to right, #f43b40, #f8793f)',
      card: '#fff7f2',
      tokenBalanceContainer: '#21002e',
      horizontalLine: 'linear-gradient(245deg, #e332e8, #75eef6)',
      topMenu: '#fff',
      topMenuWallet: '#fff',
      topMenuButton: '#fff',
      selectInput: '#fff',
      selectInputExpanded: '#fff',
      selectInputScrollbar: '#ff7733',
      selectInputScrollbarHover: 'rgba(255, 119, 51, 0.8)',
      selectInputScrollbarActive: 'rgba(255, 119, 51, 0.5)',
      selectInputImagePlaceholder: '#ffe6d9',
      selectInputToggleButton: '#0a1427',
      selectInputBorder: '#ff7733',
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
      scrollbar: '#ff7733',
      walletAssetCopyIcon: '#ff7733',
      tooltip: '#393f4a',
      tooltipBorder: '#393f4a',
    },
    text: {
      main: '#fff',
      topBar: '#fff',
      topMenu: '#191726',
      topMenuWallet: '#ff7733',
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
      tooltip: '#fff',
    },
  },
};

export const darkTheme: Theme = {
  ...defaultTheme,
  color: {
    background: {
      main: 'linear-gradient(169deg, #3e3869 5%, #241938 98%)',
      horizontalLine: 'linear-gradient(245deg, #e332e8, #75eef6)',
      topMenu: 'rgb(68, 61, 102)',
      topMenuWallet: 'rgba(111, 76, 172, 0.54)',
      topMenuButton: '#ffffff',
      card: '#262240',
      cardBorder: '#3d3767',
      button: 'linear-gradient(to bottom, #fdb754, #f18214)',
      closeButton: '#fff',
      selectInputToggleButton: '#998ae6',
      selectInputBorder: '#3d366d',
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
      walletChainButtonActive: '#474078',
      blockParagraphBorder: 'linear-gradient(#346ecd, #cd34a2)',
      listItemQuickButtonPrimary: '#eb860b',
      listItemQuickButtonSecondary: '#4f367a',
      deployButton: '#ff884d',
      settingMenuMain: 'linear-gradient(to bottom,#fdb754,#f18214)',
      settingsModalBorder: '#b6b1d2',
      settingsModal: '#474078',
      loadingAnimationBackground: '#ededed33',
      loadingAnimationForeground: '#6C6C6F',
      scrollbar: '#fbae49',
      walletAssetCopyIcon: '#ff9c1b',
      tooltip: '#2f274d',
      tooltipBorder: '#b5afaf',
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
      walletDropdownIcon: '#fbae49',
      blockParagraphHighlight: '#e333e8',
      blockParagraphHighlightSecondary: '#77e7f6',
      settingsIcon: '#ee6723',
      selectAllButton: '#fbae49',
      settingsModalSubHeader: '#b6b1d2',
      settingsMenuItem: '#fff',
      settingsMenuItemHover: '#f4973a',
      tooltip: '#fff',
    },
  },
};

export const synthTheme: Theme = {
  ...defaultTheme,
  color: {
    background: {
      main: 'linear-gradient(29deg, #110019 1%, #560180 101%)',
      horizontalLine: 'linear-gradient(245deg, #e332e8, #75eef6)',
      topMenu: 'rgb(68, 61, 102)',
      topMenuWallet: 'rgba(152, 2, 225, 0.48)',
      topMenuButton: '#ffffff',
      card: '#2f0047',
      cardBorder: 'linear-gradient(to bottom,#ad4ec5,#63e7f5)',
      button: '#890df8',
      closeButton: '#78e8f6',
      selectInputToggleButton: '#78e8f6',
      selectInputBorder: '#00b1c7',
      selectInput: '#5c0088',
      selectInputExpanded: '#130c1d',
      statusIconPending: '#ff6b35',
      statusIconFailed: '#ff0000',
      statusIconSuccess: '#1ba23d',
      selectInputImagePlaceholder: '#4e0372',
      selectInputScrollbar: '#78e8f6',
      selectInputScrollbarHover: '#78e8f6bd',
      selectInputScrollbarActive: '#78e8f6bd',
      textInput: '#1a1726',
      switchInput: '#4e0372',
      switchInputActiveTab: '#78e8f6',
      switchInputInactiveTab: '#4e0372',
      pill: '#4E0372',
      checkboxInputInactive: '#665c99',
      dropdownHoverColor: '#45005f',
      selectInputExpandedHover: '#3b0058',
      walletButton: 'linear-gradient(to bottom, #9356c2, #312254)',
      walletChainDropdown: '#1a1726',
      walletChainButtonActive: '#3b0058',
      blockParagraphBorder: 'linear-gradient(to bottom, #e332e8 99%, #75eef6)',
      listItemQuickButtonPrimary: '#78e8f6',
      listItemQuickButtonSecondary: '#4e0372',
      deployButton: '#ff884d',
      settingMenuMain: 'linear-gradient(to bottom,#fdb754,#f18214)',
      settingsModalBorder: '#b6b1d2',
      loadingAnimationBackground: '#48016B',
      loadingAnimationForeground: '#5C0088',
      settingsModal: '#5c0088',
      scrollbar: '#78e8f6',
      walletAssetCopyIcon: '#fff',
      tooltip: 'rgba(70, 0, 104)',
      tooltipBorder: '#78e8f6',
    },
    text: {
      selectInput: '#fff',
      selectInputOption: '#fff',
      selectInputOptionSecondary: '#fff',
      searchInput: '#78e8f6',
      searchIcon: '#78e8f6',
      searchInputSecondary: '#78e8f6',
      outerLabel: '#78e8f6',
      innerLabel: '#78e8f6',
      topMenu: '#78e8f6',
      topMenuWallet: '#cab3f5',
      main: '#000',
      topBar: '#998ae6',
      buttonSecondary: '#78e8f6',
      card: '#ffeee6',
      cardTitle: '#ffeee6',
      button: '#fff',
      errorMessage: '#ff4d6a',
      textInput: '#ffeee6',
      tokenTotal: '#ff0065',
      tokenValue: '#57c2d6',
      textInputSecondary: '#78e8f6',
      switchInputActiveTab: '#000',
      listItemQuickButtonPrimary: '#000',
      transactionStatusLink: '#78e8f6',
      switchInputInactiveTab: '#78e8f6',
      selectInputImagePlaceholder: '#ffeee6',
      cardDisabled: '#605e5e',
      tokenBalance: '#fefefe',
      pill: '#78e8f6',
      pillValue: '#fff',
      walletDropdownIcon: '#77e7f6',
      blockParagraphHighlight: '#e333e8',
      blockParagraphHighlightSecondary: '#78e8f6',
      settingsIcon: '#ee6723',
      selectAllButton: '#78e8f6',
      settingsModalSubHeader: '#b6b1d2',
      settingsMenuItem: '#78e8f6',
      settingsMenuItemHover: '#78e8f6bd',
      tooltip: '#fff',
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

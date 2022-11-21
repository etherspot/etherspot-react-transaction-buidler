export interface Theme {
	color?: {
		background?: {
			main?: string;
			secondary?: string;
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
			toDropdownColor?: string;
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
		};
	};
}

export const defaultTheme: Theme = {
	color: {
		background: {
			main: 'linear-gradient(to right, #f43b40, #f8793f)',
			secondary: '#9889e4',
			card: '#fff7f2',
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
			toDropdownColor: '#F8EFEA',
		},
		text: {
			main: '#fff',
			topBar: '#fff',
			topMenu: '#191726',
			cardTitle: '#191726',
			card: '#000',
			cardDisabled: '#ddd',
			innerLabel: '#6e6b6a',
			outerLabel: '#6e6b6a',
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
		},
	},
};

import { fireEvent, render } from '@testing-library/react';
import SettingMenu from '../components/SettingMenu/SettingMenu';
import { TransactionBuilderModalContext } from '../contexts';
import React from 'react';
import { defaultTheme } from '../utils/theme';
import { ThemeProvider } from 'styled-components';

jest.mock('react-icons/all', () => {
  return jest.mock;
});

jest.mock('../components/History/index.ts', () => {
  return jest.mock;
});

describe('builder setting menu', () => {
  test('should render builder setting menu', async () => {
    const defaultValue = {
      data: {
        showConfirmModal: jest.fn,
        showAlertModal: jest.fn,
        showModal: jest.fn,
        hideModal: jest.fn,
      },
    };
    const menuContext = render(
      <TransactionBuilderModalContext.Provider value={defaultValue}>
        <ThemeProvider theme={{ ...defaultTheme }}>
          <SettingMenu logout={() => {}} showLogout={true} />
        </ThemeProvider>
      </TransactionBuilderModalContext.Provider>,
    );

    fireEvent.click(await menuContext.findByTestId('builder-setting-menu'));
    expect(menuContext.getByText('Dashboard')).toHaveAttribute('href', 'https://dashboard.etherspot.io');
    expect(menuContext.getByText('History')).toBeInTheDocument();
    expect(menuContext.getByText('Etherspot')).toHaveAttribute('href', 'https://etherspot.io/');
    expect(menuContext.getByText('Logout')).toBeInTheDocument();
  });
});

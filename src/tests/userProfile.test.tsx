import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import UserProfile from '../components/User/UserProfile';

describe('User Profile component', () => {
  const mockProps = {
    email: 'test@test.com',
    smartWalletAddress: '0x1234567890123456789012345678901234567890',
    keyBasedAddress: '0x3117e94DE054a002FC552aeF579c982Bd693f609',
    ensNode: 'ensNode.eth',
  };

  // Mock useEtherspot hook
  jest.mock('../../hooks', () => ({
    useEtherspot: jest.fn(() => ({
      accountAddress: mockProps.smartWalletAddress,
      providerAddress: mockProps.keyBasedAddress,
      getEnsNode: jest.fn(() => Promise.resolve({ name: mockProps.ensNode })),
    })),
  }));

  // Mock localStorage
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify({ email: mockProps.email })),
      },
    });
  });

  beforeEach(() => {
    render(<UserProfile />);
  });

  it('should render user email', () => {
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText(mockProps.email)).toBeInTheDocument();
  });

  it('should render smart wallet address and copy button', () => {
    expect(screen.getByText('Smart wallet address')).toBeInTheDocument();
    expect(screen.getByText(mockProps.smartWalletAddress)).toBeInTheDocument();
  });

  it('should render key based address and copy button', () => {
    expect(screen.getByText('Key based address')).toBeInTheDocument();
    expect(screen.getByText(mockProps.keyBasedAddress)).toBeInTheDocument();
  });

  it('should copy key based address to clipboard when copy button is clicked', async () => {
    const copyButton = screen.getByLabelText('Copy address to clipboard');
    fireEvent.click(copyButton);
    expect(await navigator.clipboard.readText()).toEqual(mockProps.keyBasedAddress);
  });

  it('should copy smart wallet address to clipboard when copy button is clicked', async () => {
    const copyButton = screen.getByLabelText('Copy address to clipboard');
    fireEvent.click(copyButton);
    expect(await navigator.clipboard.readText()).toEqual(mockProps.smartWalletAddress);
  });

  it('should render ENS node name', async () => {
    expect(screen.getByText('ENS')).toBeInTheDocument();
    expect(await screen.findByText(mockProps.ensNode)).toBeInTheDocument();
  });
});

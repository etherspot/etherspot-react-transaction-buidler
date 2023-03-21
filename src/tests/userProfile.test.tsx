import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import UserProfile from '../components/User/UserProfile';

describe('User Profile component', () => {
  const mockProps = {
    email: 'test@test.com',
    address: '0x1234567890123456789012345678901234567890',
    ensNode: 'ensNode.eth',
  };

  // Mock useEtherspot hook
  jest.mock('../../hooks', () => ({
    useEtherspot: jest.fn(() => ({
      accountAddress: mockProps.address,
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

  it('should render user address and copy button', () => {
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText(mockProps.address)).toBeInTheDocument();
  });

  it('should copy user address to clipboard when copy button is clicked', async () => {
    const copyButton = screen.getByLabelText('Copy address to clipboard');
    fireEvent.click(copyButton);
    expect(await navigator.clipboard.readText()).toEqual(mockProps.address);
  });

  it('should render ENS node name', async () => {
    expect(screen.getByText('ENS')).toBeInTheDocument();
    expect(await screen.findByText(mockProps.ensNode)).toBeInTheDocument();
  });
});

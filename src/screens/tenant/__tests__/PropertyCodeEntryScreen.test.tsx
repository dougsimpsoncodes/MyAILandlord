import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ userId: 'user_123', getToken: jest.fn(async () => 'jwt') }),
  useUser: () => ({ user: { fullName: 'T', username: 't', imageUrl: '' } }),
}));

const validatePropertyCode = jest.fn(async () => ({ success: true, property_name: 'P', property_address: 'Addr' }));
const linkTenantToProperty = jest.fn(async () => ({ success: true }));
const getUserProfile = jest.fn(async () => ({ id: 'tenant-uuid', role: 'tenant' }));
const createUserProfile = jest.fn();

jest.mock('../../../services/api/client', () => ({
  useApiClient: () => ({
    validatePropertyCode,
    linkTenantToProperty,
    getUserProfile,
    createUserProfile,
  }),
}));

import PropertyCodeEntryScreen from '../PropertyCodeEntryScreen';

describe('PropertyCodeEntryScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates property code and links tenant on Continue', async () => {
    const { getByText, getByPlaceholderText } = render(<PropertyCodeEntryScreen />);
    const input = getByPlaceholderText('ABC123');
    fireEvent.changeText(input, 'abc123');

    const btn = getByText('Continue');
    fireEvent.press(btn);

    await waitFor(() => {
      expect(validatePropertyCode).toHaveBeenCalledWith('ABC123');
      expect(linkTenantToProperty).toHaveBeenCalledWith('ABC123');
    });
  });
});


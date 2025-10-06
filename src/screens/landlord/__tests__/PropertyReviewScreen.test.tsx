import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({
    params: {
      draftId: 'draft-1',
      propertyData: {
        name: 'Test House',
        type: 'house',
        address: { line1: '1 Test St', city: 'Town', state: 'CA', zipCode: '90000' },
        bedrooms: 3,
        bathrooms: 2,
        photos: [],
      },
      areas: [
        { id: 'area-1', name: 'Kitchen', type: 'kitchen', assets: [], photos: [] },
      ],
    },
  }),
}));

// Mock Clerk
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: jest.fn(async () => 'jwt') }),
}));

// Mock property draft hook
jest.mock('../../../hooks/usePropertyDraft', () => ({
  usePropertyDraft: () => ({
    draftState: { id: 'draft-1', currentStep: 4 },
    isLoading: false,
    isSaving: false,
    lastSaved: null,
    error: null,
    updateCurrentStep: jest.fn(),
    saveDraft: jest.fn(),
    deleteDraft: jest.fn(),
    clearError: jest.fn(),
  }),
}));

// Mock API client and hook
const createProperty = jest.fn(async () => ({ id: 'prop-1' }));
const createPropertyAreas = jest.fn(async () => true);
jest.mock('../../../services/api/client', () => ({
  useApiClient: () => ({
    createProperty,
    createPropertyAreas,
  }),
}));

import PropertyReviewScreen from '../PropertyReviewScreen';

describe('PropertyReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits property via useApiClient on button press', async () => {
    const { getByText } = render(<PropertyReviewScreen />);

    const btn = getByText('Add Property');
    fireEvent.press(btn);

    await waitFor(() => {
      expect(createProperty).toHaveBeenCalledWith({
        name: 'Test House',
        address_jsonb: {
          line1: '1 Test St',
          city: 'Town',
          state: 'CA',
          zipCode: '90000',
        },
        property_type: 'house',
        unit: '',
        bedrooms: 3,
        bathrooms: 2,
      });
      expect(createPropertyAreas).toHaveBeenCalled();
    });
  });
});


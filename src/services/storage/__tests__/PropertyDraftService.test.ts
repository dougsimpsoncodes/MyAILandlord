import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropertyDraftService } from '../PropertyDraftService';
import { PropertySetupState, PropertyAddress, PropertyData } from '../../../types/property';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('PropertyDraftService', () => {
  const mockUserId = 'user_123';
  const mockDraftId = 'draft_456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDraftState', () => {
    it('should create a new draft state with default values', () => {
      const propertyData = {
        name: 'Test Property',
        address: { line1: '123 Test St', city: 'Test City', state: 'TS', zipCode: '12345' },
        type: 'apartment' as const,
      };

      const draftState = PropertyDraftService.createDraftState(propertyData);

      expect(draftState.id).toBeDefined();
      expect(draftState.status).toBe('draft');
      expect(draftState.currentStep).toBe(0);
      expect(draftState.propertyData.name).toBe('Test Property');
      expect(draftState.propertyData.address).toBe('123 Test St');
      expect(draftState.propertyData.type).toBe('apartment');
      expect(draftState.areas).toEqual([]);
      expect(draftState.assets).toEqual([]);
    });

    it('should calculate completion percentage based on property data', () => {
      const completePropertyData = {
        name: 'Test Property',
        address: { line1: '123 Test St', city: 'Test City', state: 'TS', zipCode: '12345' },
        type: 'apartment' as const,
        unit: '4B',
        bedrooms: 2,
        bathrooms: 1,
        photos: [],
      };

      const draftState = PropertyDraftService.createDraftState(completePropertyData);
      expect(draftState.completionPercentage).toBeGreaterThan(0);
    });
  });

  describe('saveDraft', () => {
    it('should save draft to AsyncStorage with user-specific key', async () => {
      const mockDraft: PropertySetupState = {
        id: mockDraftId,
        status: 'draft',
        currentStep: 1,
        lastModified: new Date(),
        completionPercentage: 25,
        propertyData: {
          name: 'Test Property',
          address: { line1: '123 Test St', city: 'Test City', state: 'TS', zipCode: '12345' },
          type: 'apartment',
          unit: '',
          bedrooms: 1,
          bathrooms: 1,
          photos: [],
        },
        areas: [],
        assets: [],
      };

      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      await PropertyDraftService.saveDraft(mockUserId, mockDraft);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        `@MyAILandlord:propertyDraft:${mockUserId}:${mockDraftId}`,
        expect.any(String)
      );

      // Verify the saved data includes metadata
      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData.userId).toBe(mockUserId);
      expect(savedData.version).toBeDefined();
    });

    it('should throw error if userId is not provided', async () => {
      const mockDraft = PropertyDraftService.createDraftState({});

      await expect(
        PropertyDraftService.saveDraft('', mockDraft)
      ).rejects.toThrow('User ID is required to save draft');
    });
  });

  describe('loadDraft', () => {
    it('should load draft from AsyncStorage', async () => {
      const mockDraftData = {
        id: mockDraftId,
        userId: mockUserId,
        version: '1.0',
        status: 'draft',
        currentStep: 1,
        lastModified: new Date().toISOString(),
        completionPercentage: 25,
        propertyData: {
          name: 'Test Property',
          address: { line1: '123 Test St', city: 'Test City', state: 'TS', zipCode: '12345' },
          type: 'apartment',
          unit: '',
          bedrooms: 1,
          bathrooms: 1,
          photos: [],
        },
        areas: [],
        assets: [],
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockDraftData));

      const result = await PropertyDraftService.loadDraft(mockUserId, mockDraftId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockDraftId);
      expect(result?.propertyData.name).toBe('Test Property');
    });

    it('should return null if draft does not exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await PropertyDraftService.loadDraft(mockUserId, mockDraftId);

      expect(result).toBeNull();
    });

    it('should return null if user ID mismatch for security', async () => {
      const mockDraftData = {
        id: mockDraftId,
        userId: 'different_user',
        version: '1.0',
        status: 'draft',
        currentStep: 1,
        lastModified: new Date().toISOString(),
        completionPercentage: 25,
        propertyData: {
          name: 'Test Property',
          address: { line1: '123 Test St', city: 'Test City', state: 'TS', zipCode: '12345' },
          type: 'apartment',
          unit: '',
          bedrooms: 1,
          bathrooms: 1,
          photos: [],
        },
        areas: [],
        assets: [],
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockDraftData));

      const result = await PropertyDraftService.loadDraft(mockUserId, mockDraftId);

      expect(result).toBeNull();
    });
  });

  describe('deleteDraft', () => {
    it('should delete draft and update drafts list', async () => {
      const draftsList = [mockDraftId, 'other_draft'];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(draftsList));
      mockAsyncStorage.removeItem.mockResolvedValue();
      mockAsyncStorage.setItem.mockResolvedValue();

      await PropertyDraftService.deleteDraft(mockUserId, mockDraftId);

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        `@MyAILandlord:propertyDraft:${mockUserId}:${mockDraftId}`
      );

      // Verify drafts list is updated
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        `@MyAILandlord:propertyDrafts:${mockUserId}`,
        JSON.stringify(['other_draft'])
      );
    });
  });

  describe('getUserDrafts', () => {
    it('should return empty array if no drafts exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await PropertyDraftService.getUserDrafts(mockUserId);

      expect(result).toEqual([]);
    });

    it('should return empty array if user ID is not provided', async () => {
      const result = await PropertyDraftService.getUserDrafts('');

      expect(result).toEqual([]);
    });
  });
});
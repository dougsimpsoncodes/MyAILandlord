import AsyncStorage from '@react-native-async-storage/async-storage';
import log from '../../lib/log';
import { PropertySetupState, PropertyData, PropertyArea, PropertyAsset } from '../../types/property';

/**
 * Service for managing property draft persistence with user-specific storage
 * Provides auto-save functionality and draft lifecycle management
 */
export class PropertyDraftService {
  private static readonly STORAGE_PREFIX = '@MyAILandlord:propertyDraft';
  private static readonly DRAFTS_LIST_KEY = '@MyAILandlord:propertyDrafts';
  private static readonly MAX_DRAFTS_PER_USER = 10;
  private static readonly STORAGE_VERSION = '1.0';

  /**
   * Generate user-specific storage key
   */
  private static getUserStorageKey(userId: string, draftId: string): string {
    return `${this.STORAGE_PREFIX}:${userId}:${draftId}`;
  }

  /**
   * Generate user-specific drafts list key
   */
  private static getUserDraftsListKey(userId: string): string {
    return `${this.DRAFTS_LIST_KEY}:${userId}`;
  }

  /**
   * Save a property draft to AsyncStorage
   */
  static async saveDraft(
    userId: string,
    draftState: PropertySetupState
  ): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to save draft');
    }

    try {
      const storageKey = this.getUserStorageKey(userId, draftState.id);
      
      // Add metadata for storage management
      const draftWithMetadata = {
        ...draftState,
        version: this.STORAGE_VERSION,
        lastModified: new Date(),
        userId, // Security: ensure draft is tied to user
      };

      // Save the draft
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(draftWithMetadata));
      } catch (storageError: any) {
        // Handle storage quota exceeded
        if (storageError.name === 'QuotaExceededError' || storageError.message?.includes('quota')) {
          log.warn('Storage quota exceeded, cleaning up old drafts...');
          
          // Try to free up space by cleaning old drafts
          await this.cleanupOldDrafts(userId, true); // Force cleanup
          
          // Try again with simplified data (remove photos from storage)
          const simplifiedDraft = {
            ...draftWithMetadata,
            propertyData: {
              ...draftWithMetadata.propertyData,
              photos: [], // Remove photos to save space
            },
            areas: draftWithMetadata.areas?.map(area => ({
              ...area,
              photos: [], // Remove area photos to save space
            })),
          };
          
          try {
            await AsyncStorage.setItem(storageKey, JSON.stringify(simplifiedDraft));
            log.warn('Saved simplified draft without photos due to storage constraints');
          } catch (retryError) {
            log.error('Failed to save even simplified draft', { error: String(retryError) });
            throw new Error('Storage full - please clear browser data and try again');
          }
        } else {
          throw storageError;
        }
      }

      // Update drafts list
      await this.updateDraftsList(userId, draftState.id);

      // Cleanup old drafts if needed
      await this.cleanupOldDrafts(userId);

    } catch (error) {
      log.error('Failed to save property draft', { error: String(error) });
      throw new Error('Failed to save property draft');
    }
  }

  /**
   * Load a specific property draft
   */
  static async loadDraft(
    userId: string,
    draftId: string
  ): Promise<PropertySetupState | null> {
    if (!userId || !draftId) {
      return null;
    }

    try {
      const storageKey = this.getUserStorageKey(userId, draftId);
      const draftJson = await AsyncStorage.getItem(storageKey);
      
      if (!draftJson) {
        return null;
      }

      const draft = JSON.parse(draftJson);

      // Security check: ensure draft belongs to the requesting user
      if (draft.userId !== userId) {
        log.warn('Draft access denied: user mismatch');
        return null;
      }

      // Handle version migration if needed
      if (draft.version !== this.STORAGE_VERSION) {
        const migratedDraft = await this.migrateDraft(draft);
        if (migratedDraft) {
          await this.saveDraft(userId, migratedDraft);
          return migratedDraft;
        }
      }

      // Convert date strings back to Date objects
      return {
        ...draft,
        lastModified: new Date(draft.lastModified),
      };

    } catch (error) {
      log.error('Failed to load property draft', { error: String(error) });
      return null;
    }
  }

  /**
   * Get all drafts for a user
   */
  static async getUserDrafts(userId: string): Promise<PropertySetupState[]> {
    if (!userId) {
      return [];
    }

    try {
      const draftsListKey = this.getUserDraftsListKey(userId);
      const draftsListJson = await AsyncStorage.getItem(draftsListKey);
      
      if (!draftsListJson) {
        return [];
      }

      const draftIds: string[] = JSON.parse(draftsListJson);
      const drafts: PropertySetupState[] = [];

      // Load each draft
      for (const draftId of draftIds) {
        const draft = await this.loadDraft(userId, draftId);
        if (draft) {
          drafts.push(draft);
        }
      }

      // Sort by last modified (newest first)
      return drafts.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );

    } catch (error) {
      log.error('Failed to load user drafts', { error: String(error) });
      return [];
    }
  }

  /**
   * Delete a specific draft
   */
  static async deleteDraft(userId: string, draftId: string): Promise<void> {
    if (!userId || !draftId) {
      return;
    }

    try {
      const storageKey = this.getUserStorageKey(userId, draftId);
      
      // Remove the draft
      await AsyncStorage.removeItem(storageKey);

      // Update drafts list
      const draftsListKey = this.getUserDraftsListKey(userId);
      const draftsListJson = await AsyncStorage.getItem(draftsListKey);
      
      if (draftsListJson) {
        const draftIds: string[] = JSON.parse(draftsListJson);
        const updatedIds = draftIds.filter(id => id !== draftId);
        await AsyncStorage.setItem(draftsListKey, JSON.stringify(updatedIds));
      }

    } catch (error) {
      log.error('Failed to delete property draft', { error: String(error) });
      throw new Error('Failed to delete property draft');
    }
  }

  /**
   * Clear all drafts for a user
   */
  static async clearAllUserDrafts(userId: string): Promise<void> {
    if (!userId) {
      return;
    }

    try {
      const drafts = await this.getUserDrafts(userId);
      
      // Delete each draft
      for (const draft of drafts) {
        await this.deleteDraft(userId, draft.id);
      }

      // Clear the drafts list
      const draftsListKey = this.getUserDraftsListKey(userId);
      await AsyncStorage.removeItem(draftsListKey);

    } catch (error) {
      log.error('Failed to clear all user drafts', { error: String(error) });
      throw new Error('Failed to clear all user drafts');
    }
  }

  /**
   * Create a new draft state from property data
   */
  static createDraftState(
    propertyData: Partial<PropertyData>,
    areas: PropertyArea[] = [],
    assets: PropertyAsset[] = [],
    currentStep: number = 0
  ): PropertySetupState {
    const now = new Date();
    const draftId = `draft_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate completion percentage
    let completionPercentage = 0;
    const totalSteps = 5; // Total steps in property setup flow

    if (currentStep > 0) {
      completionPercentage = Math.round((currentStep / totalSteps) * 100);
    }

    // Add basic completion logic
    if (propertyData.name && propertyData.address && propertyData.type) {
      completionPercentage = Math.max(completionPercentage, 20);
    }
    if (areas.length > 0) {
      completionPercentage = Math.max(completionPercentage, 40);
    }
    if (assets.length > 0) {
      completionPercentage = Math.max(completionPercentage, 60);
    }

    return {
      id: draftId,
      status: completionPercentage >= 100 ? 'completed' : currentStep > 0 ? 'in_progress' : 'draft',
      currentStep,
      lastModified: now,
      completionPercentage,
      propertyData: {
        name: '',
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US'
        },
        type: '',
        unit: '',
        bedrooms: 1,
        bathrooms: 1,
        photos: [],
        ...propertyData,
      },
      areas,
      assets,
    };
  }

  /**
   * Clear all drafts for a user (emergency storage cleanup)
   */
  static async clearAllUserDrafts(userId: string): Promise<void> {
    try {
      log.info('Clearing all drafts for user due to storage issues...');
      const drafts = await this.getUserDrafts(userId);
      
      // Delete all drafts
      for (const draft of drafts) {
        await this.deleteDraft(userId, draft.id);
      }
      
      // Clear the drafts list
      const draftsListKey = this.getUserDraftsListKey(userId);
      await AsyncStorage.removeItem(draftsListKey);
      
      log.info(`Cleared ${drafts.length} drafts for user`);
    } catch (error) {
      log.error('Failed to clear user drafts', { error: String(error) });
    }
  }

  /**
   * Calculate storage usage for a user
   */
  static async getStorageUsage(userId: string): Promise<{
    draftCount: number;
    estimatedSizeKB: number;
  }> {
    try {
      const drafts = await this.getUserDrafts(userId);
      let totalSize = 0;

      for (const draft of drafts) {
        const storageKey = this.getUserStorageKey(userId, draft.id);
        const draftJson = await AsyncStorage.getItem(storageKey);
        if (draftJson) {
          totalSize += new Blob([draftJson]).size;
        }
      }

      return {
        draftCount: drafts.length,
        estimatedSizeKB: Math.round(totalSize / 1024),
      };

    } catch (error) {
      log.error('Failed to calculate storage usage', { error: String(error) });
      return { draftCount: 0, estimatedSizeKB: 0 };
    }
  }

  /**
   * Update the list of draft IDs for a user
   */
  private static async updateDraftsList(userId: string, draftId: string): Promise<void> {
    const draftsListKey = this.getUserDraftsListKey(userId);
    
    try {
      const draftsListJson = await AsyncStorage.getItem(draftsListKey);
      let draftIds: string[] = draftsListJson ? JSON.parse(draftsListJson) : [];

      // Add the new draft ID if it's not already in the list
      if (!draftIds.includes(draftId)) {
        draftIds.unshift(draftId); // Add to beginning for newest-first ordering
      }

      await AsyncStorage.setItem(draftsListKey, JSON.stringify(draftIds));
    } catch (error) {
      log.error('Failed to update drafts list', { error: String(error) });
    }
  }

  /**
   * Clean up old drafts if user has too many
   */
  private static async cleanupOldDrafts(userId: string, forceCleanup: boolean = false): Promise<void> {
    try {
      const drafts = await this.getUserDrafts(userId);
      
      let draftsToDelete: any[] = [];
      
      if (forceCleanup) {
        // If forced cleanup due to storage issues, delete more aggressively
        const sortedDrafts = drafts.sort((a, b) => 
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        );
        // Keep only the most recent draft
        draftsToDelete = sortedDrafts.slice(1);
        log.info(`Force cleanup: removing ${draftsToDelete.length} old drafts`);
      } else if (drafts.length > this.MAX_DRAFTS_PER_USER) {
        // Normal cleanup - sort by last modified and keep only the newest ones
        const sortedDrafts = drafts.sort((a, b) => 
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        );

        // Delete the oldest drafts
        draftsToDelete = sortedDrafts.slice(this.MAX_DRAFTS_PER_USER);
      }

      // Delete identified drafts
      for (const draft of draftsToDelete) {
        await this.deleteDraft(userId, draft.id);
      }
      
      if (draftsToDelete.length > 0) {
        log.info(`Cleaned up ${draftsToDelete.length} old drafts`);
      }
    } catch (error) {
      log.error('Failed to cleanup old drafts', { error: String(error) });
    }
  }

  /**
   * Migrate draft to current version (placeholder for future versions)
   */
  private static async migrateDraft(draft: unknown): Promise<PropertySetupState | null> {
    if (!draft || typeof draft !== 'object') {
      return null;
    }

    // Type guard for draft object
    const draftObj = draft as Record<string, unknown>;

    try {
      // For now, just ensure all required fields are present
      return {
        id: (draftObj.id as string) || `migrated_${Date.now()}`,
        status: (draftObj.status as PropertySetupState['status']) || 'draft',
        currentStep: (draftObj.currentStep as number) || 0,
        lastModified: draftObj.lastModified ? new Date(draftObj.lastModified as string) : new Date(),
        completionPercentage: (draftObj.completionPercentage as number) || 0,
        propertyData: {
          name: '',
          address: {
            line1: '',
            line2: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'US'
          },
          type: '',
          unit: '',
          bedrooms: 1,
          bathrooms: 1,
          photos: [],
          ...(draftObj.propertyData as Partial<PropertyData>),
        },
        areas: (draftObj.areas as PropertyArea[]) || [],
        assets: (draftObj.assets as PropertyAsset[]) || [],
      };
    } catch (error) {
      log.error('Failed to migrate draft', { error: String(error) });
      return null;
    }
  }
}

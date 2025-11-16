import { useState, useEffect, useCallback } from 'react';
import log from '../lib/log';
import { PropertySetupState } from '../types/property';
import { PropertyDraftService } from '../services/storage/PropertyDraftService';
import { useAppAuth } from '../context/SupabaseAuthContext';

interface UsePropertyDraftsReturn {
  drafts: PropertySetupState[];
  isLoading: boolean;
  error: string | null;
  refreshDrafts: () => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;
  clearAllDrafts: () => Promise<void>;
  getStorageUsage: () => Promise<{ draftCount: number; estimatedSizeKB: number }>;
}

/**
 * Custom hook for managing the list of property drafts for the current user
 */
export function usePropertyDrafts(): UsePropertyDraftsReturn {
  const { user } = useAppAuth();
  const [drafts, setDrafts] = useState<PropertySetupState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all drafts for the current user
   */
  const refreshDrafts = useCallback(async (): Promise<void> => {
    if (!user?.id) {
      setDrafts([]);
      setError('User not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const userDrafts = await PropertyDraftService.getUserDrafts(user.id);
      setDrafts(userDrafts);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load drafts';
      setError(errorMessage);
      log.error('Failed to load drafts', { error: String(err) });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Delete a specific draft
   */
  const deleteDraft = useCallback(async (draftId: string): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      await PropertyDraftService.deleteDraft(user.id, draftId);
      
      // Remove from local state
      setDrafts(prev => prev.filter(draft => draft.id !== draftId));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete draft';
      setError(errorMessage);
      throw err;
    }
  }, [user?.id]);

  /**
   * Clear all drafts for the current user
   */
  const clearAllDrafts = useCallback(async (): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      await PropertyDraftService.clearAllUserDrafts(user.id);
      setDrafts([]);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear all drafts';
      setError(errorMessage);
      throw err;
    }
  }, [user?.id]);

  /**
   * Get storage usage information
   */
  const getStorageUsage = useCallback(async (): Promise<{ draftCount: number; estimatedSizeKB: number }> => {
    if (!user?.id) {
      return { draftCount: 0, estimatedSizeKB: 0 };
    }

    try {
      return await PropertyDraftService.getStorageUsage(user.id);
    } catch (err) {
      log.error('Failed to get storage usage', { error: String(err) });
      return { draftCount: 0, estimatedSizeKB: 0 };
    }
  }, [user?.id]);

  // Load drafts when user changes or component mounts
  useEffect(() => {
    if (user?.id) {
      refreshDrafts();
    } else {
      setDrafts([]);
      setError(null);
    }
  }, [user?.id, refreshDrafts]);

  return {
    drafts,
    isLoading,
    error,
    refreshDrafts,
    deleteDraft,
    clearAllDrafts,
    getStorageUsage,
  };
}

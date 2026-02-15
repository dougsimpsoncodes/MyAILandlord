import { useState, useEffect, useCallback, useRef } from 'react';
import log from '../lib/log';
import { PropertySetupState, PropertyData, PropertyArea, InventoryItem } from '../types/property';
import { PropertyDraftService } from '../services/storage/PropertyDraftService';
import { useUnifiedAuth } from '../context/UnifiedAuthContext';

interface UsePropertyDraftOptions {
  autoSaveDelay?: number; // Delay in milliseconds before auto-save triggers
  enableAutoSave?: boolean;
  draftId?: string; // Existing draft ID to load
}

interface UsePropertyDraftReturn {
  // Current draft state
  draftState: PropertySetupState | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;

  // Actions
  saveDraft: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<boolean>;
  deleteDraft: () => Promise<void>;
  updatePropertyData: (data: Partial<PropertyData>) => void;
  updateAreas: (areas: PropertyArea[]) => void;
  updateAssets: (assets: InventoryItem[]) => void;
  updateCurrentStep: (step: number) => void;
  clearError: () => void;
  
  // Draft management
  createNewDraft: (initialData?: Partial<PropertyData>) => PropertySetupState;
  resetDraft: () => void;
}

/**
 * Custom hook for managing property draft persistence with auto-save functionality
 */
export function usePropertyDraft(options: UsePropertyDraftOptions = {}): UsePropertyDraftReturn {
  const {
    autoSaveDelay = 2000, // 2 seconds default delay
    enableAutoSave = true,
    draftId,
  } = options;

  const { user } = useUnifiedAuth();
  const [draftState, setDraftState] = useState<PropertySetupState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draftStateRef = useRef<PropertySetupState | null>(null);

  // Refs for auto-save debouncing
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingChanges = useRef(false);

  /**
   * Clear any existing auto-save timeout
   */
  const clearAutoSaveTimeout = useCallback(() => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = null;
    }
  }, []);

  /**
   * Trigger auto-save after delay
   */
  const scheduleAutoSave = useCallback(() => {
    const currentDraft = draftStateRef.current;
    if (!enableAutoSave || !user?.id || !currentDraft) {
      return;
    }

    clearAutoSaveTimeout();
    pendingChanges.current = true;

    autoSaveTimeout.current = setTimeout(async () => {
      const draftToSave = draftStateRef.current;
      if (pendingChanges.current && draftToSave) {
        try {
          setIsSaving(true);
          await PropertyDraftService.saveDraft(user.id, draftToSave);
          setLastSaved(new Date());
          pendingChanges.current = false;
          setError(null);
        } catch (err) {
          log.error('Auto-save failed', { error: String(err) });
          setError('Failed to auto-save draft');
        } finally {
          setIsSaving(false);
        }
      }
    }, autoSaveDelay);
  }, [enableAutoSave, user?.id, autoSaveDelay, clearAutoSaveTimeout]);

  /**
   * Manually save the current draft
   */
  const saveDraft = useCallback(async (): Promise<void> => {
    const draftToSave = draftStateRef.current;

    if (!user?.id || !draftToSave) {
      throw new Error('No user or draft state to save');
    }

    try {
      setIsSaving(true);
      setError(null);

      await PropertyDraftService.saveDraft(user.id, draftToSave);
      setLastSaved(new Date());
      pendingChanges.current = false;
      clearAutoSaveTimeout();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save draft';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, clearAutoSaveTimeout]);

  /**
   * Load an existing draft
   */
  const loadDraft = useCallback(async (targetDraftId: string): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const draft = await PropertyDraftService.loadDraft(user.id, targetDraftId);
      
      if (draft) {
        draftStateRef.current = draft;
        setDraftState(draft);
        setLastSaved(draft.lastModified);
        pendingChanges.current = false;
        return true;
      } else {
        setError('Draft not found or could not be loaded');
        return false;
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load draft';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Delete the current draft
   */
  const deleteDraft = useCallback(async (): Promise<void> => {
    const currentDraft = draftStateRef.current;

    if (!user?.id || !currentDraft) {
      throw new Error('No user or draft to delete');
    }

    try {
      setError(null);
      await PropertyDraftService.deleteDraft(user.id, currentDraft.id);
      draftStateRef.current = null;
      setDraftState(null);
      setLastSaved(null);
      pendingChanges.current = false;
      clearAutoSaveTimeout();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete draft';
      setError(errorMessage);
      throw err;
    }
  }, [user?.id, clearAutoSaveTimeout]);

  /**
   * Update property data and trigger auto-save
   */
  const updatePropertyData = useCallback((data: Partial<PropertyData>) => {
    const currentDraft = draftStateRef.current;
    if (!currentDraft) return;

    const updated = {
      ...currentDraft,
      propertyData: { ...currentDraft.propertyData, ...data },
      lastModified: new Date(),
    };

    draftStateRef.current = updated;
    setDraftState(updated);
  }, []);

  /**
   * Update areas and trigger auto-save
   */
  const updateAreas = useCallback((areas: PropertyArea[]) => {
    const currentDraft = draftStateRef.current;
    if (!currentDraft) return;

    const updated = {
      ...currentDraft,
      areas,
      lastModified: new Date(),
    };

    draftStateRef.current = updated;
    setDraftState(updated);
  }, []);

  /**
   * Update assets and trigger auto-save
   */
  const updateAssets = useCallback((assets: InventoryItem[]) => {
    const currentDraft = draftStateRef.current;
    if (!currentDraft) return;

    const updated = {
      ...currentDraft,
      assets,
      lastModified: new Date(),
    };

    draftStateRef.current = updated;
    setDraftState(updated);
  }, []);

  /**
   * Update current step and trigger auto-save
   */
  const updateCurrentStep = useCallback((step: number) => {
    const currentDraft = draftStateRef.current;
    if (!currentDraft) return;

    // Recalculate completion percentage
    const totalSteps = 5;
    const completionPercentage = Math.round((step / totalSteps) * 100);

    const updated = {
      ...currentDraft,
      currentStep: step,
      completionPercentage,
      status: (completionPercentage >= 100 ? 'completed' : step > 0 ? 'in_progress' : 'draft') as PropertySetupState['status'],
      lastModified: new Date(),
    };

    draftStateRef.current = updated;
    setDraftState(updated);
  }, []);

  /**
   * Create a new draft and return it (so caller can immediately use draft.id for navigation)
   */
  const createNewDraft = useCallback((initialData?: Partial<PropertyData>): PropertySetupState => {
    const newDraft = PropertyDraftService.createDraftState(
      initialData || {},
      [],
      [],
      0
    );

    draftStateRef.current = newDraft;
    setDraftState(newDraft);
    setLastSaved(null);
    pendingChanges.current = true;
    setError(null);

    return newDraft; // Return the draft so caller can use newDraft.id immediately
  }, []);

  /**
   * Reset the current draft state
   */
  const resetDraft = useCallback(() => {
    draftStateRef.current = null;
    setDraftState(null);
    setLastSaved(null);
    setError(null);
    pendingChanges.current = false;
    clearAutoSaveTimeout();
  }, [clearAutoSaveTimeout]);

  /**
   * Clear any errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Keep ref synchronized for any state changes that come from loads or external updates.
  useEffect(() => {
    draftStateRef.current = draftState;
  }, [draftState]);

  // Auto-save effect when draft state changes
  useEffect(() => {
    if (draftState && enableAutoSave) {
      scheduleAutoSave();
    }
  }, [draftState, enableAutoSave, scheduleAutoSave]);

  // Load initial draft if draftId is provided
  useEffect(() => {
    if (draftId && user?.id && !draftState) {
      loadDraft(draftId);
    }
  }, [draftId, user?.id, draftState, loadDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoSaveTimeout();
    };
  }, [clearAutoSaveTimeout]);

  return {
    // State
    draftState,
    isLoading,
    isSaving,
    lastSaved,
    error,

    // Actions
    saveDraft,
    loadDraft,
    deleteDraft,
    updatePropertyData,
    updateAreas,
    updateAssets,
    updateCurrentStep,
    clearError,

    // Draft management
    createNewDraft,
    resetDraft,
  };
}

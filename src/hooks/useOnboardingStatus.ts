import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUnifiedAuth } from '../context/UnifiedAuthContext';
import { supabase } from '../services/supabase/client';
import { log } from '../lib/log';

const ONBOARDING_IN_PROGRESS_KEY = '@onboarding_in_progress';

interface OnboardingStatus {
  needsOnboarding: boolean;
  isLoading: boolean;
  userFirstName: string | null;
  userRole: 'landlord' | 'tenant' | null;
  error: string | null;
  /** Call this to force a re-check of onboarding status (e.g., after creating a property) */
  refreshStatus: () => Promise<void>;
}

/**
 * Hook to check if an authenticated user needs to complete onboarding.
 *
 * Uses the `onboarding_completed` flag in the profiles table (set by atomic RPCs).
 * This is the single source of truth for onboarding status.
 *
 * For landlords: onboarding_completed is set to TRUE by signup_and_onboard_landlord() RPC
 * For tenants: onboarding_completed is set to TRUE by signup_and_accept_invite() RPC
 */
/**
 * Mark that user has started the onboarding flow.
 * This prevents navigation stack resets during onboarding.
 */
export async function markOnboardingStarted() {
  await AsyncStorage.setItem(ONBOARDING_IN_PROGRESS_KEY, 'true');
  log.debug('✅ Onboarding marked as started');
}

/**
 * Clear the onboarding in-progress flag.
 * Call this when onboarding is complete OR cancelled.
 */
export async function clearOnboardingInProgress() {
  await AsyncStorage.removeItem(ONBOARDING_IN_PROGRESS_KEY);
  log.debug('✅ Onboarding in-progress flag cleared');
}

export function useOnboardingStatus(): OnboardingStatus {
  const { user, isSignedIn, isLoading: authLoading } = useUnifiedAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(true); // Start as true to prevent flash
  const [isLoading, setIsLoading] = useState(true);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'landlord' | 'tenant' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkOnboardingStatus = useCallback(async () => {
    // Set loading true at the start to prevent premature navigation
    setIsLoading(true);

    // Not signed in - no onboarding check needed
    if (!isSignedIn || !user) {
      setNeedsOnboarding(false);
      setIsLoading(false);
      return;
    }

    try {
      // Get the user's profile to check onboarding_completed flag
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, role, onboarding_completed')
        .eq('id', user.id)
        .single();

      if (profileError) {
        log.error('useOnboardingStatus: Error fetching profile:', profileError);
        setError(profileError.message);
        setIsLoading(false);
        return;
      }

      // No role set - needs full onboarding
      if (!profile?.role) {
        log.debug('useOnboardingStatus: User has no role, needs full onboarding');
        setNeedsOnboarding(true);
        setUserFirstName(profile?.name?.split(' ')[0] || null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      // Extract first name from profile
      const firstName = profile.name?.split(' ')[0] || null;
      setUserFirstName(firstName);
      setUserRole(profile.role);

      // Check if onboarding is currently in progress
      // If so, keep needsOnboarding true
      const onboardingInProgress = await AsyncStorage.getItem(ONBOARDING_IN_PROGRESS_KEY);
      if (onboardingInProgress === 'true') {
        log.debug('useOnboardingStatus: Onboarding in progress, keeping needsOnboarding true');
        setNeedsOnboarding(true);
        setIsLoading(false);
        return;
      }

      // Use onboarding_completed flag as single source of truth
      const completed = profile.onboarding_completed ?? false;
      log.debug('useOnboardingStatus: onboarding_completed =', completed, 'needsOnboarding:', !completed);
      setNeedsOnboarding(!completed);
    } catch (err) {
      log.error('useOnboardingStatus: Unexpected error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user, isSignedIn]);

  useEffect(() => {
    if (!authLoading) {
      checkOnboardingStatus();
    }
  }, [authLoading, checkOnboardingStatus]);

  // Refresh function that can be called externally to force re-check
  const refreshStatus = useCallback(async () => {
    setIsLoading(true);
    await checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  return {
    needsOnboarding,
    isLoading: authLoading || isLoading,
    userFirstName,
    userRole,
    error,
    refreshStatus,
  };
}

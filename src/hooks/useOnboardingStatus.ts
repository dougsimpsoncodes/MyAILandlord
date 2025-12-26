import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppAuth } from '../context/SupabaseAuthContext';
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
 * For landlords: onboarding is complete when they have at least one property
 * For tenants: onboarding is complete when they have at least one property link
 *
 * This is used to route existing users who created accounts but never
 * completed the property setup flow.
 */
/**
 * Mark that user has started the onboarding flow.
 * This prevents navigation stack resets during onboarding.
 */
export async function markOnboardingStarted() {
  await AsyncStorage.setItem(ONBOARDING_IN_PROGRESS_KEY, 'true');
  log.info('✅ Onboarding marked as started');
}

/**
 * Clear the onboarding in-progress flag.
 * Call this when onboarding is complete OR cancelled.
 */
export async function clearOnboardingInProgress() {
  await AsyncStorage.removeItem(ONBOARDING_IN_PROGRESS_KEY);
  log.info('✅ Onboarding in-progress flag cleared');
}

export function useOnboardingStatus(): OnboardingStatus {
  const { user, isSignedIn, isLoading: authLoading } = useAppAuth();
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
      // First, get the user's profile to check their role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, role')
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
        log.info('useOnboardingStatus: User has no role, needs full onboarding');
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
      // If so, keep needsOnboarding true but skip property count check
      const onboardingInProgress = await AsyncStorage.getItem(ONBOARDING_IN_PROGRESS_KEY);
      if (onboardingInProgress === 'true') {
        log.info('useOnboardingStatus: Onboarding in progress, keeping needsOnboarding true');
        setNeedsOnboarding(true);
        setIsLoading(false);
        return;
      }

      if (profile.role === 'landlord') {
        // Check if landlord has any properties
        const { count, error: propError } = await supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('landlord_id', user.id);

        if (propError) {
          log.error('useOnboardingStatus: Error checking properties:', propError);
          setError(propError.message);
          setIsLoading(false);
          return;
        }

        const hasProperties = (count ?? 0) > 0;
        log.info('useOnboardingStatus: Landlord property count:', count, 'needsOnboarding:', !hasProperties);
        setNeedsOnboarding(!hasProperties);
      } else if (profile.role === 'tenant') {
        // Check if tenant has any property links
        const { count, error: linkError } = await supabase
          .from('tenant_property_links')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', user.id)
          .eq('is_active', true);

        if (linkError) {
          log.error('useOnboardingStatus: Error checking property links:', linkError);
          setError(linkError.message);
          setIsLoading(false);
          return;
        }

        const hasPropertyLinks = (count ?? 0) > 0;
        log.info('useOnboardingStatus: Tenant property link count:', count, 'needsOnboarding:', !hasPropertyLinks);
        setNeedsOnboarding(!hasPropertyLinks);
      } else {
        // Unknown role - treat as needs onboarding
        setNeedsOnboarding(true);
      }
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

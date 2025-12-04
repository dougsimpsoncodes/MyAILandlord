import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { log } from '../lib/log';
import { useAppAuth } from './SupabaseAuthContext';
import { supabase } from '../lib/supabaseClient';

interface OnboardingContextType {
  onboardingCompleted: boolean;
  isLoading: boolean;
  pendingNavigation: string | null;
  completeOnboarding: (navigateTo?: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  clearPendingNavigation: () => void;
}

export const OnboardingContext = createContext<OnboardingContextType>({
  onboardingCompleted: false,
  isLoading: true,
  pendingNavigation: null,
  completeOnboarding: async () => {},
  resetOnboarding: async () => {},
  clearPendingNavigation: () => {},
});

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1';
  const { user, isSignedIn, isLoading: authLoading } = useAppAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  useEffect(() => {
    // Skip onboarding check in auth-disabled mode
    if (authDisabled) {
      setOnboardingCompleted(true);
      setIsLoading(false);
      return;
    }

    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // If user is not signed in, not loading and onboarding not applicable
    if (!isSignedIn || !user) {
      setIsLoading(false);
      return;
    }

    // Check onboarding status from database
    checkOnboardingStatus();
  }, [authDisabled, authLoading, isSignedIn, user]);

  const checkOnboardingStatus = async () => {
    try {
      log.info('📋 Checking onboarding status...');

      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user?.id)
        .single();

      if (error) {
        // If profile doesn't exist yet, onboarding is not complete
        if (error.code === 'PGRST116') {
          log.info('📋 No profile found, onboarding needed');
          setOnboardingCompleted(false);
        } else {
          log.error('📋 Error checking onboarding status:', { error: error.message });
          // Default to not completed on error so user can retry
          setOnboardingCompleted(false);
        }
      } else {
        log.info('📋 Onboarding status:', { completed: data?.onboarding_completed });
        setOnboardingCompleted(data?.onboarding_completed ?? false);
      }
    } catch (error) {
      log.error('📋 Exception checking onboarding:', { error: String(error) });
      setOnboardingCompleted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async (navigateTo?: string) => {
    try {
      log.info('📋 Completing onboarding...', { navigateTo });

      if (!user?.id) {
        log.warn('📋 Cannot complete onboarding: no user');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) {
        log.error('📋 Error completing onboarding:', { error: error.message });
        throw error;
      }

      // Set pending navigation before completing onboarding
      if (navigateTo) {
        setPendingNavigation(navigateTo);
      }

      setOnboardingCompleted(true);
      log.info('📋 Onboarding completed successfully');
    } catch (error) {
      log.error('📋 Exception completing onboarding:', { error: String(error) });
      throw error;
    }
  };

  const clearPendingNavigation = () => {
    setPendingNavigation(null);
  };

  const resetOnboarding = async () => {
    try {
      log.info('📋 Resetting onboarding...');

      if (!user?.id) {
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: false })
        .eq('id', user.id);

      if (error) {
        log.error('📋 Error resetting onboarding:', { error: error.message });
        throw error;
      }

      setOnboardingCompleted(false);
    } catch (error) {
      log.error('📋 Exception resetting onboarding:', { error: String(error) });
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        onboardingCompleted,
        isLoading,
        pendingNavigation,
        completeOnboarding,
        resetOnboarding,
        clearPendingNavigation,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = React.useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

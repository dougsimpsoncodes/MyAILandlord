import React, { createContext, useContext, ReactNode } from 'react';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';

interface OnboardingContextValue {
  needsOnboarding: boolean;
  isLoading: boolean;
  userFirstName: string | null;
  userRole: 'landlord' | 'tenant' | null;
  error: string | null;
  /** Call this to force a re-check of onboarding status (e.g., after creating a property) */
  refreshStatus: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const onboardingStatus = useOnboardingStatus();

  return (
    <OnboardingContext.Provider value={onboardingStatus}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextValue => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

import React, { useContext, useEffect, useState, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import AuthStack from './navigation/AuthStack';
import MainStack from './navigation/MainStack';
import OnboardingStack from './navigation/OnboardingStack';
import { useAppAuth } from './context/SupabaseAuthContext';
import { RoleContext } from './context/RoleContext';
import { OnboardingContext } from './context/OnboardingContext';
import { useProfileSync } from './hooks/useProfileSync';
import { LoadingScreen } from './components/LoadingSpinner';
import { log } from './lib/log';

const AppNavigator = () => {
  const { user, isSignedIn, isLoading } = useAppAuth();
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1';
  const { userRole, isLoading: roleLoading } = useContext(RoleContext);
  const { onboardingCompleted, isLoading: onboardingLoading, pendingNavigation, clearPendingNavigation } = useContext(OnboardingContext);
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const hasHandledPendingNav = useRef(false);

  // Debug logging (centralized)
  log.info('🧭 AppNavigator state:', { isSignedIn, userRole, isLoading, roleLoading, onboardingCompleted, hasUser: !!user });

  // Sync user with Supabase profile
  useProfileSync();

  // Determine computed values first (before hooks that depend on them)
  const isInviteLink = !!(initialUrl && initialUrl.includes('/invite'));
  const needsOnboarding = isSignedIn && !!user && !onboardingCompleted && !authDisabled;
  const shouldShowMainStack = authDisabled || (isSignedIn && !!user && !!userRole && onboardingCompleted);

  // Get initial URL for deep link handling
  useEffect(() => {
    const getInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL();
        log.info('🔗 Initial URL detected:', url);
        setInitialUrl(url);
      } catch (error) {
        log.warn('🔗 Could not get initial URL:', error);
      } finally {
        setIsReady(true);
      }
    };

    getInitialURL();
  }, []);

  // Handle pending navigation from onboarding (must be before early return)
  useEffect(() => {
    if (pendingNavigation && shouldShowMainStack && !hasHandledPendingNav.current) {
      hasHandledPendingNav.current = true;
      log.info('🧭 Handling pending navigation:', pendingNavigation);
      // Wait for navigation to be ready
      setTimeout(() => {
        if (navigationRef.current?.isReady()) {
          navigationRef.current.navigate(pendingNavigation as never);
          clearPendingNavigation();
        }
      }, 200);
    }
  }, [pendingNavigation, shouldShowMainStack, clearPendingNavigation]);

  // Show loading while checking auth, onboarding, and initial URL
  if (isLoading || roleLoading || onboardingLoading || !isReady) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  log.info('🧭 Navigation decision:', {
    shouldShowMainStack,
    needsOnboarding,
    isInviteLink,
    isSignedIn,
    hasRole: !!userRole,
    onboardingCompleted,
    pendingNavigation,
    initialUrl
  });

  // Configure deep linking
  const linking = {
    prefixes: [
      'myailandlord://',
      'https://myailandlord.app',
      'https://www.myailandlord.app',
      'http://localhost:8081',
    ],
    async getInitialURL() {
      // Handle deep link URL manually
      const url = await Linking.getInitialURL();
      log.info('🔗 getInitialURL called:', url);
      return url;
    },
    subscribe(listener: (url: string) => void) {
      const subscription = Linking.addEventListener('url', ({ url }) => {
        log.info('🔗 URL event received:', url);
        listener(url);
      });
      return () => subscription?.remove();
    },
    config: {
      screens: {
        // Screens accessible to both authenticated and unauthenticated users
        PropertyInviteAccept: {
          path: 'invite',
          parse: {
            property: (property: string) => property,
          }
        },
        // Auth screens
        Welcome: 'welcome',
        Login: 'login',
        SignUp: 'signup',
        // Main app screens
        Home: 'home',
        PropertyCodeEntry: 'link',
        PropertyManagement: 'properties',
        PropertyDetails: {
          path: 'PropertyDetails',
          parse: {
            propertyId: (propertyId: string) => propertyId,
          }
        },
        AddProperty: {
          path: 'AddProperty',
          parse: {
            draftId: (draftId: string) => draftId || undefined,
          }
        },
        PropertyPhotos: {
          path: 'PropertyPhotos',
          parse: {
            draftId: (draftId: string) => draftId || undefined,
          }
        },
        InviteTenant: 'invite-tenant',
        ReportIssue: 'report-issue',
        ReviewIssue: 'review-issue',
      }
    }
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      {shouldShowMainStack && userRole ? (
        <MainStack userRole={userRole} />
      ) : needsOnboarding ? (
        <OnboardingStack />
      ) : (
        <AuthStack initialInvite={isInviteLink} />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;

import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import AuthStack from './navigation/AuthStack';
import MainStack from './navigation/MainStack';
import { useAppAuth } from './context/ClerkAuthContext';
import { RoleContext } from './context/RoleContext';
import { useProfileSync } from './hooks/useProfileSync';
import { LoadingScreen } from './components/LoadingSpinner';
import { log } from './lib/log';

const AppNavigator = () => {
  const { user, isSignedIn, isLoading } = useAppAuth();
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1';
  const { userRole, isLoading: roleLoading } = useContext(RoleContext);
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Debug logging (centralized)
  log.info('🧭 AppNavigator state:', { isSignedIn, userRole, isLoading, roleLoading, hasUser: !!user });
  
  // Sync Clerk user with Supabase profile
  useProfileSync();

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

  // Show loading while checking both auth and initial URL
  if (isLoading || roleLoading || !isReady) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Determine if we should force AuthStack for deep link invite
  const isInviteLink = initialUrl && initialUrl.includes('/invite');
  // Show MainStack if user is fully authenticated, even if they came from invite
  const shouldShowMainStack = authDisabled ? true : (isSignedIn && user && userRole);
  
  log.info('🧭 Navigation decision:', { 
    shouldShowMainStack, 
    isInviteLink, 
    isSignedIn, 
    hasRole: !!userRole,
    initialUrl 
  });

  // Configure deep linking
  const linking = {
    prefixes: [
      'myailandlord://',
      'https://myailandlord.app',
      'https://www.myailandlord.app'
    ],
    async getInitialURL() {
      // Handle deep link URL manually
      const url = await Linking.getInitialURL();
      console.log('🔗 getInitialURL called:', url);
      return url;
    },
    subscribe(listener: (url: string) => void) {
      const subscription = Linking.addEventListener('url', ({ url }) => {
        console.log('🔗 URL event received:', url);
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
        InviteTenant: 'invite-tenant',
        ReportIssue: 'report-issue',
        ReviewIssue: 'review-issue',
      }
    }
  };

  return (
    <NavigationContainer linking={linking}>
      {shouldShowMainStack ? (
        <MainStack userRole={userRole} />
      ) : (
        <AuthStack initialInvite={isInviteLink} />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;

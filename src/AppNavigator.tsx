import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import AuthStack from './navigation/AuthStack';
import MainStack from './navigation/MainStack';
import { useAppAuth } from './context/SupabaseAuthContext';
import { RoleContext } from './context/RoleContext';
import { useProfileSync } from './hooks/useProfileSync';
import { LoadingScreen } from './components/LoadingSpinner';
import { log } from './lib/log';
import { PendingInviteService } from './services/storage/PendingInviteService';

const AppNavigator = () => {
  const { user, isSignedIn, isLoading } = useAppAuth();
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1';
  const { userRole, isLoading: roleLoading } = useContext(RoleContext);
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pendingInvitePropertyId, setPendingInvitePropertyId] = useState<string | null>(null);

  // Debug logging (centralized)
  log.info('🧭 AppNavigator state:', { isSignedIn, userRole, isLoading, roleLoading, hasUser: !!user });

  // Sync user with Supabase profile
  useProfileSync();

  // Check for pending invite when user becomes authenticated
  useEffect(() => {
    const checkPendingInvite = async () => {
      if (isSignedIn && user && userRole) {
        const pendingPropertyId = await PendingInviteService.getPendingInvite();
        if (pendingPropertyId) {
          log.info('📥 Found pending invite after auth, redirecting to property:', pendingPropertyId);
          setPendingInvitePropertyId(pendingPropertyId);
          // Clear it so we don't redirect again
          await PendingInviteService.clearPendingInvite();
        }
      }
    };
    checkPendingInvite();
  }, [isSignedIn, user, userRole]);

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
      'https://www.myailandlord.app',
      'http://localhost:8081',
      'http://localhost:8082',
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
        AuthCallback: 'auth/callback',
        // Main app screens
        Home: 'home',
        PropertyCodeEntry: 'link',
        PropertyManagement: 'properties',
        InviteTenant: 'invite-tenant',
        ReportIssue: 'report-issue',
        ReviewIssue: 'review-issue',
        // Property creation flow with draft persistence
        AddProperty: 'add-property',
        PropertyAreas: {
          path: 'property-areas',
          parse: {
            draftId: (draftId: string) => draftId,
          }
        },
        PropertyAssets: {
          path: 'property-assets',
          parse: {
            draftId: (draftId: string) => draftId,
          }
        },
        PropertyReview: {
          path: 'property-review',
          parse: {
            draftId: (draftId: string) => draftId,
          }
        },
      }
    }
  };

  return (
    <NavigationContainer linking={linking}>
      {shouldShowMainStack ? (
        <MainStack userRole={userRole as 'tenant' | 'landlord'} pendingInvitePropertyId={pendingInvitePropertyId} />
      ) : (
        <AuthStack initialInvite={!!isInviteLink} />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;

import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, View } from 'react-native';
import * as Linking from 'expo-linking';
import AuthStack from './navigation/AuthStack';
import MainStack from './navigation/MainStack';
import { useAppAuth } from './context/SupabaseAuthContext';
import { RoleContext } from './context/RoleContext';
import { useOnboarding } from './context/OnboardingContext';
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
  const [onboardingFlowActive, setOnboardingFlowActive] = useState(false);

  // Check if authenticated user needs to complete onboarding
  const {
    needsOnboarding,
    isLoading: onboardingLoading,
    userFirstName,
    userRole: onboardingRole,
  } = useOnboarding();

  // Debug logging (centralized)
  log.info('🧭 AppNavigator state:', {
    isSignedIn,
    userRole,
    isLoading,
    roleLoading,
    hasUser: !!user,
    needsOnboarding,
    onboardingLoading,
    userFirstName,
    onboardingRole,
  });

  // Sync user with Supabase profile
  useProfileSync();

  // Check for pending invite when user becomes authenticated
  useEffect(() => {
    const checkPendingInvite = async () => {
      // Check for pending invite even without role (for new signups)
      if (isSignedIn && user) {
        const pendingInvite = await PendingInviteService.getPendingInvite();
        if (pendingInvite) {
          if (pendingInvite.type === 'token') {
            log.info('📥 Found pending token invite after auth:', pendingInvite.value);
            // For tokens, we redirect to PropertyInviteAccept with token parameter
            // The MainStack/AuthStack linking config will handle routing
            setPendingInvitePropertyId(`token:${pendingInvite.value}`);
          } else {
            log.info('📥 Found pending legacy invite after auth:', pendingInvite.value);
            setPendingInvitePropertyId(pendingInvite.value);
          }
          // Don't clear yet - let PropertyInviteAcceptScreen handle it after acceptance
        }
      }
    };
    checkPendingInvite();
  }, [isSignedIn, user]);

  // Get initial URL for deep link handling (ONE-TIME ONLY)
  useEffect(() => {
    const getInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL();
        log.info('🔗 Initial URL detected (one-time):', url);

        // If it's an invite URL and user is NOT authenticated, save pending invite immediately
        if (url && url.includes('/invite') && !isSignedIn) {
          const parsedUrl = Linking.parse(url);
          const token = (parsedUrl.queryParams?.t || parsedUrl.queryParams?.token) as string | undefined;

          if (token) {
            log.info('🎟️ Invite URL detected, saving pending invite immediately:', token.substring(0, 4) + '...');
            await PendingInviteService.savePendingInvite(token, 'token');
            // Don't set initialUrl - let it go to OnboardingWelcome naturally
            setInitialUrl(null);
          } else {
            setInitialUrl(url);
          }
        } else {
          setInitialUrl(url);
        }

        // Clear it after capture to prevent replay
        setTimeout(() => {
          if (url) {
            log.info('🔗 Clearing initial URL to prevent replay');
            setInitialUrl(null);
          }
        }, 1000);
      } catch (error) {
        log.warn('🔗 Could not get initial URL:', error);
      } finally {
        setIsReady(true);
      }
    };

    getInitialURL();
  }, [isSignedIn]);

  // Activate onboarding flow freeze when user enters onboarding
  useEffect(() => {
    if (isSignedIn && needsOnboarding && userRole === 'landlord' && !onboardingFlowActive) {
      log.info('🚀 Activating onboarding flow freeze');
      setOnboardingFlowActive(true);
    }
    // Clear freeze when onboarding is complete
    if (!needsOnboarding && onboardingFlowActive) {
      log.info('✅ Onboarding complete - clearing freeze');
      setOnboardingFlowActive(false);
    }
  }, [isSignedIn, needsOnboarding, userRole, onboardingFlowActive]);

  // Show loading while checking auth, role, onboarding status, and initial URL
  if (isLoading || roleLoading || onboardingLoading || !isReady) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Determine if we should force AuthStack for deep link invite
  const isInviteLink = initialUrl && initialUrl.includes('/invite');

  // Show MainStack for all authenticated users with a role OR with a pending invite
  // MainStack will handle onboarding routing internally via LandlordNavigator
  const isFullyAuthenticated = isSignedIn && user && userRole;
  const hasPendingInvite = isSignedIn && user && pendingInvitePropertyId;
  const shouldShowMainStack = authDisabled ? true : (isFullyAuthenticated || hasPendingInvite);

  // Use frozen onboarding state during active flow to prevent re-checks
  const effectiveNeedsOnboarding = onboardingFlowActive ? true : needsOnboarding;

  log.info('🧭 Navigation decision:', {
    shouldShowMainStack,
    isInviteLink,
    isSignedIn,
    hasRole: !!userRole,
    needsOnboarding,
    effectiveNeedsOnboarding,
    onboardingFlowActive,
    initialUrl,
  });

  // Configure deep linking
  const devPrefix = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : Linking.createURL('/');

  const linking = {
    prefixes: [
      devPrefix,
      'myailandlord://',
      'https://myailandlord.app',
      'https://www.myailandlord.app',
    ],
    async getInitialURL() {
      // Handle deep link URL manually
      const url = await Linking.getInitialURL();
      return url;
    },
    subscribe(listener: (url: string) => void) {
      const subscription = Linking.addEventListener('url', ({ url }) => {
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
            t: (t: string) => t,                       // NEW short form token parameter
            token: (token: string) => token,           // Legacy token parameter
            property: (property: string) => property,  // Legacy propertyId flow (deprecated)
          }
        },
        // Auth screens
        Welcome: 'welcome',
        Login: 'login',
        SignUp: 'signup',
        AuthCallback: 'auth/callback',
        // Tenant Tab Navigator with nested stacks
        TenantHome: {
          screens: {
            TenantHomeMain: 'home',
            ReportIssue: 'report-issue',
            ReviewIssue: 'review-issue',
            SubmissionSuccess: 'submission-success',
            FollowUp: 'follow-up',
            PropertyCodeEntry: 'link',
            PropertyWelcome: 'property-welcome',
            PropertyInfo: 'property-info',
            CommunicationHub: 'communication',
          }
        },
        TenantRequests: {
          screens: {
            TenantRequestsMain: 'requests',
            FollowUp: 'request-details',
          }
        },
        TenantMessages: {
          screens: {
            TenantMessagesMain: 'messages',
          }
        },
        TenantProfile: {
          screens: {
            TenantProfileMain: 'profile',
            EditProfile: 'edit-profile',
            Security: 'security',
            Notifications: 'notifications',
            HelpCenter: 'help',
            ContactSupport: 'support',
          }
        },
        // Landlord Tab Navigator with nested stacks
        LandlordHome: {
          screens: {
            LandlordHomeMain: 'landlord-home',
            Dashboard: 'dashboard',
            CaseDetail: 'case',
            PropertyDetails: 'property-details',
            PropertyManagement: 'properties',
            AddProperty: 'add-property',
            PropertyAreas: 'property-areas',
            PropertyAssets: 'property-assets',
            PropertyReview: 'property-review',
            AddAsset: 'add-asset',
            InviteTenant: 'invite-tenant',
          }
        },
        LandlordRequests: {
          screens: {
            LandlordRequestsMain: 'landlord-requests',
            CaseDetail: 'landlord-case',
          }
        },
        LandlordProperties: {
          screens: {
            PropertyManagementMain: 'landlord-properties',
            PropertyDetails: 'landlord-property-details',
            AddProperty: 'landlord-add-property',
            PropertyBasics: 'property-basics',
            PropertyPhotos: 'property-photos',
            RoomSelection: 'room-selection',
            RoomPhotography: 'room-photography',
            AssetScanning: 'asset-scanning',
            AssetDetails: 'asset-details',
            AssetPhotos: 'asset-photos',
            ReviewSubmit: 'review-submit',
            PropertyAreas: 'landlord-property-areas',
            PropertyAssets: 'landlord-property-assets',
            PropertyReview: 'landlord-property-review',
            AddAsset: 'landlord-add-asset',
            InviteTenant: 'landlord-invite-tenant',
          }
        },
        LandlordMessages: {
          screens: {
            LandlordMessagesMain: 'landlord-messages',
          }
        },
        LandlordProfile: {
          screens: {
            LandlordProfileMain: 'landlord-profile',
            EditProfile: 'landlord-edit-profile',
            Security: 'landlord-security',
            Notifications: 'landlord-notifications',
            HelpCenter: 'landlord-help',
            ContactSupport: 'landlord-support',
          }
        },
      }
    }
  };

  return (
    <>
      <View testID="app-ready" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
      <NavigationContainer linking={linking}>
        {shouldShowMainStack ? (
        <MainStack
          userRole={(userRole || (hasPendingInvite ? 'tenant' : 'landlord')) as 'tenant' | 'landlord'}
          pendingInvitePropertyId={pendingInvitePropertyId}
          needsOnboarding={effectiveNeedsOnboarding}
          userFirstName={userFirstName}
        />
      ) : (
        <AuthStack
          initialInvite={!!isInviteLink}
          continuation={isFullyAuthenticated && effectiveNeedsOnboarding ? {
            firstName: userFirstName || 'there',
            role: onboardingRole,
          } : undefined}
        />
      )}
      </NavigationContainer>
    </>
  );
};

export default AppNavigator;

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useProfileSync } from './hooks/useProfileSync';
import { PendingInviteService } from './services/storage/PendingInviteService';
import { log } from './lib/log';
import RootNavigator from './navigation/RootNavigator';

/**
 * AppNavigator - Simplified root component
 *
 * Refactored to use BootstrapScreen for routing decisions instead of
 * conditional navigator rendering. This eliminates screen flashing during
 * state transitions.
 *
 * All routing logic now lives in:
 * - src/navigation/RootNavigator.tsx (BootstrapScreen)
 * - Individual screens use navigation.reset() for explicit navigation
 */
const AppNavigator = () => {
  // Sync user with Supabase profile
  useProfileSync();

  const [isReady, setIsReady] = useState(false);

  // Capture initial deep link and save as pending invite
  useEffect(() => {
    const handleInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL();
        log.info('🔗 Initial URL detected:', url);

        if (url && url.includes('/invite')) {
          const parsedUrl = Linking.parse(url);
          const token = (parsedUrl.queryParams?.t || parsedUrl.queryParams?.token) as string | undefined;

          if (token) {
            const tokenHash = token.substring(0, 4) + '...' + token.substring(token.length - 4);
            log.info('🎟️ Deep link: Invite URL detected, saving pending invite', { tokenHash });
            await PendingInviteService.savePendingInvite(token, 'token');
          }
        }
      } catch (error) {
        log.warn('🔗 Could not get initial URL:', error);
      } finally {
        setIsReady(true);
      }
    };

    handleInitialURL();
  }, []);

  // Wait until initial URL is processed before rendering NavigationContainer
  if (!isReady) {
    return null; // Brief loading, BootstrapScreen will show spinner
  }

  // Configure deep linking
  const devPrefix = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : Linking.createURL('/');

  const linking = {
    prefixes: [
      devPrefix,
      'myailandlord://',
      'exp+myailandlord://', // Expo development scheme
      'https://myailandlord.app',
      'https://www.myailandlord.app',
    ],
    async getInitialURL() {
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
        // Bootstrap decides which stack to show
        Bootstrap: '',

        // Auth stack screens
        Auth: {
          screens: {
            Welcome: 'welcome',
            Login: 'login',
            SignUp: 'signup',
            AuthCallback: 'auth/callback',
          }
        },

        // Invite acceptance (accessible to both auth states)
        PropertyInviteAccept: {
          path: 'invite',
          parse: {
            t: (t: string) => t,           // Short form token parameter
            token: (token: string) => token, // Legacy token parameter
            property: (property: string) => property, // Legacy propertyId flow
          }
        },

        // Main app stack
        Main: {
          screens: {
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
        },
      }
    }
  };

  return (
    <>
      <View testID="app-ready" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
};

export default AppNavigator;

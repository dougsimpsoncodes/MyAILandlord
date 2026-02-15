import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';

// Navigation ref for programmatic navigation
const navigationRef = createNavigationContainerRef();
import { Platform, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useProfileSync } from './hooks/useProfileSync';
import { PendingInviteService } from './services/storage/PendingInviteService';
import { log } from './lib/log';
import RootNavigator from './navigation/RootNavigator';

type InviteParams = {
  token: string;
  propertyId?: string;
};

const extractInviteFromUrl = (url?: string | null): InviteParams | null => {
  if (!url || !url.includes('/invite')) {
    return null;
  }

  const parsed = Linking.parse(url);
  const tokenParam = parsed.queryParams?.t || parsed.queryParams?.token;
  const propertyParam = parsed.queryParams?.property || parsed.queryParams?.propertyId;

  const token = typeof tokenParam === 'string' ? tokenParam : undefined;
  const propertyId = typeof propertyParam === 'string' ? propertyParam : undefined;

  if (!token) {
    return null;
  }

  return { token, propertyId };
};

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

  const linkingRefactor = process.env.EXPO_PUBLIC_LINKING_REFACTOR === '1';

  // If refactor is OFF, fall back to legacy initial URL gating to avoid surprises.
  const [isReady, setIsReady] = useState(linkingRefactor ? true : false);

  useEffect(() => {
    if (linkingRefactor) return;
    const handleInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL();
        log.info('🔗 Initial URL detected:', url);
        const inviteParams = extractInviteFromUrl(url);
        if (inviteParams) {
          const tokenHash = inviteParams.token.substring(0, 4) + '...' + inviteParams.token.substring(inviteParams.token.length - 4);
          log.info('🎟️ Saving pending invite token', {
            tokenHash,
            hasPropertyId: !!inviteParams.propertyId,
          });
          await PendingInviteService.savePendingInvite(inviteParams.token, 'token', {
            propertyId: inviteParams.propertyId,
          });
        }
      } catch (error) {
        log.warn('🔗 Could not get initial URL:', error);
      } finally {
        setIsReady(true);
      }
    };
    handleInitialURL();
  }, [linkingRefactor]);

  if (!isReady) {
    return null;
  }

  // Option B-lite: Let React Navigation control deep-link timing when enabled.

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
      if (linkingRefactor) {
        const inviteParams = extractInviteFromUrl(url);
        if (inviteParams) {
          const tokenHash = inviteParams.token.substring(0, 4) + '...' + inviteParams.token.substring(inviteParams.token.length - 4);
          log.info('🎟️ Saving pending invite from initialURL', {
            tokenHash,
            hasPropertyId: !!inviteParams.propertyId,
          });
          await PendingInviteService.savePendingInvite(inviteParams.token, 'token', {
            propertyId: inviteParams.propertyId,
          });
        }
      }
      return url;
    },
    subscribe(listener: (url: string) => void) {
      const subscription = Linking.addEventListener('url', async ({ url }) => {
        if (linkingRefactor) {
          try {
            const inviteParams = extractInviteFromUrl(url);
            if (inviteParams) {
              const tokenHash = inviteParams.token.substring(0, 4) + '...' + inviteParams.token.substring(inviteParams.token.length - 4);
              log.info('🎟️ Saving pending invite from subscribe', {
                tokenHash,
                hasPropertyId: !!inviteParams.propertyId,
              });
              await PendingInviteService.savePendingInvite(inviteParams.token, 'token', {
                propertyId: inviteParams.propertyId,
              });
            }
          } catch (e) {
            log.warn('🔗 Failed parsing subscribe URL', e);
          } finally {
            listener(url);
          }
        } else {
          listener(url);
        }
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
            propertyId: (propertyId: string) => propertyId, // Explicit propertyId parameter
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

            // Onboarding flow screens (direct children of LandlordRootStack)
            // These use 'onboarding-' prefixed paths to distinguish from
            // the same screen names inside tab navigators.
            LandlordPropertyIntro: 'onboarding-property-intro',
            PropertyBasics: 'onboarding-basics',
            PropertyAttributes: 'onboarding-attributes',
            PropertyAreas: 'onboarding-areas',
            PropertyAssets: 'onboarding-assets',
            PropertyReview: 'onboarding-review',
            AddAsset: 'onboarding-add-asset',
            LandlordTenantInvite: 'onboarding-tenant-invite',
            LandlordOnboardingSuccess: 'onboarding-success',
          }
        },
      }
    }
  };

  return (
    <>
      <View testID="app-ready" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
      <NavigationContainer linking={linking} ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
};

export default AppNavigator;

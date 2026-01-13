import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useUnifiedAuth } from '../context/UnifiedAuthContext';
import { PendingInviteService } from '../services/storage/PendingInviteService';
import { log } from '../lib/log';
import AuthStack from './AuthStack';
import PropertyInviteAcceptScreen from '../screens/tenant/PropertyInviteAcceptScreen';

// Import navigators directly (bypassing MainStack component)
import MainStack from './MainStack';

export type RootStackParamList = {
  Bootstrap: undefined;
  Auth: undefined;
  PropertyInviteAccept: undefined;
  Main: { userRole: 'tenant' | 'landlord'; needsOnboarding?: boolean; userFirstName?: string | null };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * BootstrapScreen - Decides the initial destination based on auth state
 *
 * Decision logic:
 * 1. Not signed in → Auth
 * 2. Signed in + pending invite → PropertyInviteAccept
 * 3. Signed in + role → Main (with role prop)
 *
 * Uses navigation.reset() to make a single, decisive navigation without flashing.
 */
function BootstrapScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, isSignedIn, isLoading } = useUnifiedAuth();
  const decidedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [devBusy, setDevBusy] = useState(false);

  // Derived ready flag (Codex recommendation)
  const isBootstrapReady = !isLoading;

  useEffect(() => {
    // CRITICAL: Handle sign out immediately - don't wait for other state
    if (!isSignedIn && decidedRef.current) {
      log.debug('🧭 [Bootstrap] User signed out - navigating to Auth');
      decidedRef.current = false;
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
      decidedRef.current = true; // Prevent re-navigation during Auth loading
      return;
    }

    // CRITICAL: Handle sign IN - reset decidedRef so we can navigate to Main
    if (isSignedIn && user && decidedRef.current) {
      log.debug('🧭 [Bootstrap] User signed in - allowing re-navigation');
      decidedRef.current = false;
      // Fall through to decide() below
    }

    // Only decide once (per auth state change)
    if (decidedRef.current) return;

    // Timeout fallback: if Bootstrap idles for 10 seconds, force to Auth
    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        if (!decidedRef.current) {
          log.warn('🧭 [Bootstrap] Timeout reached - forcing navigation to Auth');
          decidedRef.current = true;
          navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          });
        }
      }, 10000); // 10 second timeout
    }

    const decide = async () => {
      // Wait until all required state is loaded
      if (!isBootstrapReady) {
        log.debug('🧭 [Bootstrap] Waiting for state to load', {
          isLoading,
        });
        return;
      }

      // Clear timeout once we're ready to decide
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      log.debug('🧭 [Bootstrap] Making routing decision', {
        isSignedIn,
        hasUser: !!user,
        userRole: user?.role,
        onboardingCompleted: user?.onboarding_completed,
      });

      // Decision 1: Unauthenticated → Auth
      if (!isSignedIn || !user) {
        log.debug('🧭 [Bootstrap] → Auth (not signed in)');
        decidedRef.current = true;
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
        return;
      }

      // Decision 2: Check for pending invite
      try {
        const pendingInvite = await PendingInviteService.getPendingInvite();
        if (pendingInvite?.type === 'token') {
          const tokenHash = pendingInvite.value.substring(0, 4) + '...' + pendingInvite.value.substring(pendingInvite.value.length - 4);
          log.debug('🧭 [Bootstrap] → PropertyInviteAccept (pending invite detected)', { tokenHash });
          decidedRef.current = true;
          navigation.reset({
            index: 0,
            routes: [{ name: 'PropertyInviteAccept' }],
          });
          return;
        }
      } catch (error) {
        log.error('🧭 [Bootstrap] Error checking pending invite', error as Error);
      }

      // Decision 3: Authenticated with role → Main
      if (user?.role) {
        log.debug(`🧭 [Bootstrap] → Main (${user.role})`);
        decidedRef.current = true;
        navigation.reset({
          index: 0,
          routes: [{
            name: 'Main',
            params: {
              userRole: user.role,
              needsOnboarding: !user.onboarding_completed,
              userFirstName: user.name?.split(' ')[0] || null,
            },
          }],
        });
        return;
      }

      // Decision 4: Authenticated but no role yet (edge case - wait)
      log.debug('🧭 [Bootstrap] Waiting for role assignment...');
    };

    decide();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isSignedIn, user, isBootstrapReady, navigation]);

  // Full-screen loading overlay while deciding
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3498DB" />
      {__DEV__ && (
        <View style={styles.devPanel}>
          <Text style={styles.devTitle}>Dev Tools</Text>
          <View style={styles.devRow}>
            <TouchableOpacity
              accessibilityLabel="Paste invite from clipboard"
              onPress={async () => {
                if (devBusy) return;
                try {
                  setDevBusy(true);
                  const Clipboard = await import('expo-clipboard');
                  const Linking = await import('expo-linking');
                  const text = await Clipboard.getStringAsync();
                  if (!text) {
                    log.warn('📋 Clipboard empty');
                    setDevBusy(false);
                    return;
                  }
                  let token: string | undefined;
                  try {
                    const parsed = Linking.parse(text);
                    const qp: any = parsed.queryParams || {};
                    token = (qp.t || qp.token) as string | undefined;
                  } catch {
                    // not a url, fall back to raw
                  }
                  if (!token) {
                    token = text.trim();
                  }
                  if (!token) {
                    log.warn('🎟️ No token found in clipboard');
                    setDevBusy(false);
                    return;
                  }
                  const tokenHash = token.substring(0, 4) + '...' + token.substring(token.length - 4);
                  log.info('🧪 [Dev] Saving pending invite from clipboard', { tokenHash });
                  await PendingInviteService.savePendingInvite(token, 'token');
                  decidedRef.current = true;
                  navigation.reset({ index: 0, routes: [{ name: 'PropertyInviteAccept' }] });
                } catch (e) {
                  log.error('🧪 [Dev] Failed to paste + route to invite', e as Error);
                } finally {
                  setDevBusy(false);
                }
              }}
              style={[styles.devButton, devBusy && { opacity: 0.6 }]}
            >
              <Text style={styles.devButtonText}>{devBusy ? 'Working…' : 'Paste Invite'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Clear pending invite"
              onPress={async () => {
                if (devBusy) return;
                try {
                  setDevBusy(true);
                  await PendingInviteService.clearPendingInvite();
                  log.info('🧪 [Dev] Cleared pending invite');
                } finally {
                  setDevBusy(false);
                }
              }}
              style={styles.devSecondary}
            >
              <Text style={styles.devSecondaryText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * RootNavigator - Static navigation tree that never swaps
 *
 * All routing decisions happen via navigation.reset() from:
 * - BootstrapScreen (initial decision)
 * - PropertyInviteAcceptScreen (post-acceptance)
 * - Other screens as needed
 */
export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Bootstrap"
    >
      <Stack.Screen
        name="Bootstrap"
        component={BootstrapScreen}
      />
      <Stack.Screen
        name="Auth"
        component={AuthStack}
      />
      <Stack.Screen
        name="PropertyInviteAccept"
        component={PropertyInviteAcceptScreen}
      />
      <Stack.Screen
        name="Main"
        component={MainStack}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  devPanel: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F2F7FF',
    borderWidth: 1,
    borderColor: '#D6E4FF',
  },
  devTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B3A57',
    marginBottom: 8,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devButton: {
    backgroundColor: '#2D6CDF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  devButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  devSecondary: {
    backgroundColor: '#EEF3FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D6E4FF',
    marginLeft: 8,
  },
  devSecondaryText: {
    color: '#6B7A90',
    fontSize: 12,
    fontWeight: '600',
  },
});

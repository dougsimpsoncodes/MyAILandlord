import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, InteractionManager } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import log from '../../lib/log';
import ScreenContainer from '../../components/shared/ScreenContainer';
import CustomButton from '../../components/shared/CustomButton';
import { supabase } from '../../services/supabase/client';
import { PendingInviteService } from '../../services/storage/PendingInviteService';

interface RouteParams {
  t?: string; // Token parameter (NEW format)
  token?: string; // Legacy token parameter
}

interface PropertyData {
  id: string;
  name: string;
  address: string;
  unit?: string;
  landlordName?: string;
}

const PropertyInviteAcceptScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, refreshUser } = useUnifiedAuth();

  const [token, setToken] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Idempotent guard: prevent duplicate accepts
  const acceptAttemptedRef = useRef(false);
  const acceptInProgressRef = useRef(false);

  // Log only on actual mount (not every render)
  useEffect(() => {
    log.info('[PropertyInviteAccept] Screen mounted', {
      hasUser: !!user,
      routeParams: route.params,
    });
  }, []);

  // Extract token from route params OR pending invite storage
  useEffect(() => {
    const loadToken = async () => {
      // Priority 1: Route params (handle undefined params gracefully)
      const params = (route.params || {}) as RouteParams;
      const extractedToken = params.t || params.token;

      if (extractedToken) {
        log.info('[PropertyInviteAccept] Token extracted from route params:', { token_preview: extractedToken.substring(0, 4) + '...' });
        setToken(extractedToken);
        return;
      }

      // Priority 2: Pending invite storage (fallback)
      const pendingInvite = await PendingInviteService.getPendingInvite();
      if (pendingInvite && pendingInvite.type === 'token') {
        log.info('[PropertyInviteAccept] Token loaded from pending invite storage:', { token_preview: pendingInvite.value.substring(0, 4) + '...' });
        setToken(pendingInvite.value);
        return;
      }

      log.error('[PropertyInviteAccept] No token found in route params or pending storage');
      setError('Invalid invite link. Missing invitation token.');
    };

    loadToken();
  }, [route.params]);

  // Validate token when it's available
  useEffect(() => {
    if (token) {
      validateInvite();
    }
  }, [token]);

  // Auto-accept invite when user is authenticated and property is validated
  useEffect(() => {
    const autoAcceptInvite = async () => {
      // Idempotent guard: only auto-accept once
      if (acceptAttemptedRef.current || acceptInProgressRef.current) {
        log.info('[PropertyInviteAccept] Auto-accept skipped (already attempted or in progress)');
        return;
      }

      // Only auto-accept if:
      // 1. User is authenticated
      // 2. Property data is loaded (validation succeeded)
      // 3. Not currently accepting
      // 4. We have a token (from any source)
      if (user && property && !isAccepting && token) {
        log.info('[PropertyInviteAccept] Auto-accepting invite for authenticated user', {
          tokenHash: token?.substring(0, 4) + '...' + token?.substring(token.length - 4),
        });
        acceptAttemptedRef.current = true;
        await handleAccept();
      }
    };

    autoAcceptInvite();
  }, [user, property, token]);

  const validateInvite = async () => {
    if (!token) return;

    setIsValidating(true);
    setError(null);

    try {
      log.info('[PropertyInviteAccept] Validating invite token');

      // Call validate_invite RPC function (public, no auth required)
      const { data, error: rpcError } = await supabase.rpc('validate_invite', {
        p_token: token
      });

      if (rpcError) {
        log.error('[PropertyInviteAccept] RPC error:', rpcError);
        throw new Error('Failed to validate invite. Please try again.');
      }

      // RPC returns TABLE, so data is an array
      if (!data || !Array.isArray(data) || data.length === 0) {
        log.error('[PropertyInviteAccept] No data returned from validate_invite');
        throw new Error('Invalid invite token');
      }

      const result = data[0];

      if (!result.valid) {
        log.error('[PropertyInviteAccept] Token invalid');
        // CRITICAL: Clear pending invite to prevent redirect loops
        // Bootstrap checks for pending invites and would redirect here again
        await PendingInviteService.clearPendingInvite();
        throw new Error('This invite link is invalid or has expired.');
      }

      log.info('[PropertyInviteAccept] Token valid, property:', result.property_name);

      // Set property data
      setProperty({
        id: result.property_id,
        name: result.property_name,
        address: result.property_address,
        unit: result.property_unit,
        landlordName: result.landlord_name
      });

    } catch (error) {
      log.error('[PropertyInviteAccept] Validation error', { error: String(error) });
      // Clear pending invite to prevent redirect loops on validation failure
      await PendingInviteService.clearPendingInvite();
      setError(error instanceof Error ? error.message : 'Failed to validate invite. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleAccept = async () => {
    // Idempotent guard: prevent concurrent accepts
    if (acceptInProgressRef.current) {
      log.warn('[PropertyInviteAccept] Accept already in progress, ignoring duplicate call');
      return;
    }

    if (!token) {
      setError('Missing invite token');
      return;
    }

    if (!user) {
      // Save pending invite before redirecting to signup
      log.info('[PropertyInviteAccept] User not authenticated, saving pending invite and redirecting to tenant onboarding');
      await PendingInviteService.savePendingInvite(token, 'token', {
        propertyId: property?.id,
        propertyName: property?.name,
      });
      // Navigate to Auth stack, then to OnboardingName screen
      // Pass fromInvite flag to skip role selection (they're obviously tenants)
      (navigation as unknown as { navigate: (routeName: string, params?: object) => void }).navigate('Auth', {
        screen: 'OnboardingName',
        params: { fromInvite: true }
      });
      return;
    }

    // Set in-progress flag BEFORE async work
    acceptInProgressRef.current = true;
    setIsAccepting(true);
    setError(null);

    try {
      log.info('[PropertyInviteAccept] Starting accept flow', {
        userId: user.id,
        hasProfile: !!user,
        userRole: user?.role,
      });

      // With UnifiedAuth, profile is created automatically on auth
      // Just ensure we have fresh user data before accepting
      if (!user?.id) {
        log.warn('[PropertyInviteAccept] No user ID found, refreshing user data');
        await refreshUser();
      }

      // Check if this is first-time onboarding (use atomic RPC)
      const isNewUser = !user?.onboarding_completed;

      if (isNewUser) {
        // NEW USER: Use atomic signup_and_accept_invite RPC
        log.info('[PropertyInviteAccept] New user detected - using atomic RPC', {
          tokenHash: token.substring(0, 4) + '...' + token.substring(token.length - 4),
        });

        const { data, error: atomicError } = await supabase.rpc('signup_and_accept_invite', {
          p_token: token,
          p_name: user?.name || null,
        });

        if (atomicError) {
          log.error('[PropertyInviteAccept] Atomic RPC error:', atomicError);
          throw new Error('Failed to accept invite. Please try again.');
        }

        // RPC returns TABLE, so data is an array
        if (!data || !Array.isArray(data) || data.length === 0) {
          log.error('[PropertyInviteAccept] No data returned from atomic RPC');
          throw new Error('Failed to accept invite');
        }

        const result = data[0];

        if (!result.success) {
          log.error('[PropertyInviteAccept] Atomic RPC failed:', { error: result.error_message });
          throw new Error(result.error_message || 'Failed to accept invite');
        }

        log.info('[PropertyInviteAccept] Atomic invite acceptance successful!', {
          property_name: result.property_name,
        });

        // Refresh user to get updated onboarding_completed flag and role
        await refreshUser();
      } else {
        // EXISTING USER: Use regular accept_invite RPC
        log.info('[PropertyInviteAccept] Existing user - using regular accept_invite RPC', {
          tokenHash: token.substring(0, 4) + '...' + token.substring(token.length - 4),
        });

        const { data, error: acceptError } = await supabase.rpc('accept_invite', {
          p_token: token
        });

        if (acceptError) {
          log.error('[PropertyInviteAccept] Accept RPC error:', acceptError);
          throw new Error('Failed to accept invite. Please try again.');
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
          log.error('[PropertyInviteAccept] No data returned from accept_invite');
          throw new Error('Failed to accept invite');
        }

        const result = data[0];

        if (!result.success) {
          log.error('[PropertyInviteAccept] Accept failed:', { status: result.out_status, error: result.out_error });
          throw new Error(result.out_error || 'Failed to accept invite');
        }

        log.info('[PropertyInviteAccept] Invite accepted successfully!', {
          status: result.out_status,
          property_name: result.out_property_name
        });
      }

      // CRITICAL: Clear pending invite BEFORE navigation to prevent race conditions.
      // Other components (useProfileSync, Bootstrap) check for pending invites on mount
      // and would redirect back here with a stale token that's already been consumed.
      log.info('[PropertyInviteAccept] Clearing pending invite BEFORE navigation');
      await PendingInviteService.clearPendingInvite();

      // Navigate IMMEDIATELY to tenant home (zero-flash navigation pattern)
      // IMPORTANT: navigation.reset() replaces the entire navigation state.
      // This means NO back stack - user cannot go "back" to signup/auth screens.
      // On Android, hardware back from TenantHome will exit the app (expected behavior).
      log.info('[PropertyInviteAccept] Navigating directly to tenant home (zero-flash)');
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{
            name: 'Main' as never,
            params: {
              userRole: 'tenant',
              needsOnboarding: !user?.onboarding_completed,
              userFirstName: user?.name?.split(' ')[0] || null,
            } as never
          }]
        })
      );

      // Refresh user for existing users after navigation (deferred to avoid blocking)
      if (!isNewUser) {
        InteractionManager.runAfterInteractions(async () => {
          await refreshUser();
        });
      }

    } catch (error) {
      log.error('[PropertyInviteAccept] Accept error', { error: String(error) });
      setError(error instanceof Error ? error.message : 'Failed to accept invite. Please try again.');

      // Keep user on this screen so they can see error and retry
      log.info('[PropertyInviteAccept] Keeping state on failure to allow retry');

      // Reset in-progress flag to allow manual retry
      acceptInProgressRef.current = false;
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    // User explicitly declined - clear pending invite
    log.info('[PropertyInviteAccept] User declined invite, clearing pending invite');
    PendingInviteService.clearPendingInvite();
    // Reset to Bootstrap which will route based on auth state
    // (Auth screen if not signed in, Main if signed in with role)
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Bootstrap' as never }],
      })
    );
  };

  // Loading state
  if (isValidating) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading invite details...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer} testID="invite-invalid">
          <Ionicons name="alert-circle" size={64} color="#E74C3C" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          {token && (
            <CustomButton
              title="Try Again"
              onPress={validateInvite}
              variant="primary"
              style={styles.retryButton}
            />
          )}

          <CustomButton
            title="Back to Home"
            onPress={handleDecline}
            variant="outline"
            style={styles.backButton}
          />
        </View>
      </ScreenContainer>
    );
  }

  // Success - show property details
  if (property) {
    return (
      <ScreenContainer>
        <View style={styles.container} testID="invite-property-preview">
          <Ionicons name="home" size={80} color="#007AFF" />

          <Text style={styles.title}>{property.name}</Text>

          <View style={styles.propertyDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="location" size={20} color="#666" />
              <Text style={styles.detailText}>{property.address}</Text>
            </View>

            {property.unit && (
              <View style={styles.detailRow}>
                <Ionicons name="apps" size={20} color="#666" />
                <Text style={styles.detailText}>Unit: {property.unit}</Text>
              </View>
            )}

            {property.landlordName && (
              <View style={styles.detailRow}>
                <Ionicons name="person" size={20} color="#666" />
                <Text style={styles.detailText}>Landlord: {property.landlordName}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>You're invited!</Text>
            <Text style={styles.infoText}>
              {user
                ? `Accept this invite to connect to ${property.name}. You'll be able to report maintenance issues and communicate with your landlord.`
                : `Sign up to connect to ${property.name}. You'll be able to report maintenance issues and communicate with your landlord.`
              }
            </Text>
          </View>

          <View style={styles.actions}>
            <CustomButton
              title={isAccepting ? 'Connecting...' : (user ? 'Accept Invite' : 'Sign Up & Accept')}
              onPress={handleAccept}
              variant="primary"
              disabled={isAccepting}
              loading={isAccepting}
              style={styles.acceptButton}
              testID="invite-accept"
            />

            <CustomButton
              title="Decline"
              onPress={handleDecline}
              variant="outline"
              disabled={isAccepting}
            />
          </View>

          {/* Full-screen overlay during acceptance to prevent flashing */}
          {isAccepting && (
            <View style={[StyleSheet.absoluteFill, { pointerEvents: 'auto' }]}>
              <View style={styles.acceptingOverlay}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.acceptingText}>Connecting to {property.name}...</Text>
              </View>
            </View>
          )}
        </View>
      </ScreenContainer>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  propertyDetails: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  infoCard: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#E8F4FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    marginTop: 32,
    gap: 12,
  },
  acceptButton: {
    marginBottom: 8,
  },
  errorContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#E74C3C',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 24,
  },
  backButton: {
    marginTop: 12,
  },
  acceptingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  acceptingText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default PropertyInviteAcceptScreen;

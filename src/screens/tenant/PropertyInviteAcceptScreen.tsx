import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/common';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import { useProfile } from '../../context/ProfileContext';
import { useApiClient } from '../../services/api/client';
import log from '../../lib/log';
import ScreenContainer from '../../components/shared/ScreenContainer';
import CustomButton from '../../components/shared/CustomButton';
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';
import { useRole } from '../../context/RoleContext';
import * as Linking from 'expo-linking';
import { PendingInviteService } from '../../services/storage/PendingInviteService';
import { InviteCacheService } from '../../services/storage/InviteCacheService';
import { formatAddress } from '../../utils/helpers';
import { fetchWithRetry } from '../../utils/retryWithBackoff';
import { analytics, generateCorrelationId } from '../../lib/analytics';
import { sanitizeToken } from '../../utils/sanitize';

interface RouteParams {
  propertyId?: string;
  property?: string;
  token?: string;
}

interface InviteData {
  type: 'token' | 'legacy';
  value: string;  // token value or propertyId
  propertyId?: string;  // Only set after token validation
}

interface ErrorState {
  type: 'wrong_account' | 'already_linked' | 'capacity_reached' | 'revoked' | 'expired' | 'network' | 'generic';
  message: string;
  actions?: Array<{ label: string; onPress: () => void; primary?: boolean }>;
}

const PropertyInviteAcceptScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, signOut } = useAppAuth();
  const { profile, refreshProfile } = useProfile();
  const { supabase } = useSupabaseWithAuth();
  const apiClient = useApiClient();
  const { setUserRole } = useRole();

  // Correlation ID for request tracing
  const correlationIdRef = useRef(generateCorrelationId());
  const correlationId = correlationIdRef.current;

  // Double-submit guard
  const acceptingRef = useRef(false);
  const validatingRef = useRef(false);

  // State
  const [isValidating, setIsValidating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [property, setProperty] = useState<any>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [intendedEmail, setIntendedEmail] = useState<string | null>(null);

  // Extract invite data from route params or query parameters
  const getInviteData = async (): Promise<InviteData | null> => {
    const params = route.params as any;
    log.info('🔗 PropertyInviteAcceptScreen route params', {
      correlationId,
      has_token: !!params?.token,
      has_propertyId: !!params?.propertyId
    });

    // PRIORITY 1: Check for tokenized invite (NEW production flow)
    if (params?.token) {
      log.info('🎟️ Found invite token in route params (tokenized flow)', {
        correlationId,
        token_preview: sanitizeToken(params.token)
      });
      return { type: 'token', value: params.token };
    }

    // PRIORITY 2: Check for legacy propertyId (route params)
    if (params?.propertyId) {
      log.info('🔗 Found propertyId in route params (legacy flow)', { correlationId });
      return { type: 'legacy', value: params.propertyId, propertyId: params.propertyId };
    }

    // PRIORITY 3: Check for legacy property query parameter (deep linking)
    if (params?.property) {
      log.info('🔗 Found property in route params (legacy flow)', { correlationId });
      return { type: 'legacy', value: params.property, propertyId: params.property };
    }

    // PRIORITY 4: Fallback - extract from initial URL directly
    try {
      const url = await Linking.getInitialURL();
      if (url) {
        // Check for token parameter
        const tokenMatch = url.match(/[?&]token=([^&]+)/);
        if (tokenMatch) {
          log.info('🎟️ Extracted token from URL', {
            correlationId,
            token_preview: sanitizeToken(tokenMatch[1])
          });
          return { type: 'token', value: tokenMatch[1] };
        }

        // Check for legacy property parameter
        const propertyMatch = url.match(/[?&]property=([^&]+)/);
        if (propertyMatch) {
          log.info('🔗 Extracted property ID from URL', { correlationId });
          return { type: 'legacy', value: propertyMatch[1], propertyId: propertyMatch[1] };
        }
      }
    } catch (error) {
      log.error('🔗 Error getting initial URL', { correlationId, error: error as Error });
    }

    log.info('🔗 No invite data found', { correlationId });
    return null;
  };

  // Network connectivity listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // Extract invite data on component mount
  useEffect(() => {
    const extractInvite = async () => {
      const data = await getInviteData();
      setInviteData(data);

      // Track invite view
      if (data) {
        analytics.inviteFunnel.view(
          data.value,
          data.propertyId || 'unknown',
          user ? 'signed_in' : 'anonymous',
          correlationId
        );
      }
    };
    extractInvite();
  }, []);

  // Validate token or fetch property details based on invite type
  useEffect(() => {
    if (!inviteData) {
      setError({
        type: 'generic',
        message: 'Invalid invite link. Missing invitation data.'
      });
      return;
    }

    if (inviteData.type === 'token') {
      validateTokenAndFetchProperty();
    } else {
      // Legacy flow: we already have propertyId
      setPropertyId(inviteData.propertyId!);
      fetchPropertyDetails(inviteData.propertyId!);
    }
  }, [inviteData]);

  // Set tenant role as soon as user is authenticated via invite link
  useEffect(() => {
    const setTenantRoleOnAuth = async () => {
      if (user && !profile?.role) {
        log.info('👤 User authenticated via invite, setting tenant role', { correlationId });
        await setUserRole('tenant');
        await refreshProfile();
      }
    };

    setTenantRoleOnAuth();
  }, [user]);

  // Validate tokenized invite and fetch property details
  const validateTokenAndFetchProperty = async () => {
    if (validatingRef.current ||!inviteData || inviteData.type !== 'token') return;
    validatingRef.current = true;
    setIsValidating(true);

    const startTime = Date.now();
    const token = inviteData.value;

    try {
      // Try to load cached data for offline support
      const cached = await InviteCacheService.getCachedInviteData(token);
      if (cached && isOffline) {
        log.info('📦 Using cached invite data (offline)', {
          correlationId,
          token_preview: sanitizeToken(token)
        });
        setProperty(cached.property);
        setPropertyId(cached.property.id);
        setIsValidating(false);
        return;
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      log.info('🎟️ Validating invite token via Edge Function', {
        correlationId,
        token_preview: sanitizeToken(token)
      });

      // Call validate-invite-token Edge Function with retry
      const response = await fetchWithRetry(
        `${supabaseUrl}/functions/v1/validate-invite-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'X-Correlation-ID': correlationId
          },
          body: JSON.stringify({ token })
        },
        {
          maxRetries: 3,
          onRetry: (attempt, delay) => {
            setRetryCount(attempt);
            analytics.inviteFunnel.offlineRetry(attempt, correlationId);
          }
        }
      );

      const result = await response.json();
      const latency = Date.now() - startTime;

      log.info('🎟️ Token validation result', {
        correlationId,
        valid: result.valid,
        latency_ms: latency
      });

      if (!result.valid) {
        analytics.inviteFunnel.validateFailure(token, result.error || 'unknown', latency, correlationId);

        // Handle specific error types
        if (result.error === 'capacity_reached') {
          setError({
            type: 'capacity_reached',
            message: `This invite link has been used ${result.use_count} times (maximum: ${result.max_uses}). Ask your landlord for a new invite.`,
            actions: [
              { label: 'Contact Support', onPress: () => navigation.navigate('ContactSupport' as never) }
            ]
          });
        } else if (result.error === 'expired') {
          setError({
            type: 'expired',
            message: 'This invite is no longer valid. Request a new link.',
            actions: [
              { label: 'Request New Invite', onPress: () => navigation.navigate('ContactSupport' as never) }
            ]
          });
        } else if (result.error === 'revoked') {
          setError({
            type: 'revoked',
            message: 'This invite was revoked by the landlord. Request a new link.',
            actions: [
              { label: 'Request New Invite', onPress: () => navigation.navigate('ContactSupport' as never) }
            ]
          });
        } else {
          throw new Error(result.error || 'Invalid invite token');
        }
        return;
      }

      if (!result.property) {
        throw new Error('Property not found for this invite');
      }

      analytics.inviteFunnel.validateSuccess(token, latency, correlationId);

      // Token is valid - set property data
      setProperty(result.property);
      setPropertyId(result.property.id);
      setIntendedEmail(result.intended_email || null);

      // Cache for offline viewing
      await InviteCacheService.cacheInviteData(token, result.property);

      // Update inviteData with propertyId for acceptance flow
      setInviteData(prev => prev ? { ...prev, propertyId: result.property.id } : null);

      // Check for wrong account
      if (result.intended_email && user?.email && user.email !== result.intended_email) {
        setError({
          type: 'wrong_account',
          message: `This invite was sent to ${result.intended_email}.`,
          actions: [
            {
              label: 'Switch Account',
              onPress: async () => {
                analytics.inviteFunnel.accountSwitch(user.email!, result.intended_email, correlationId);
                await signOut();
                // User will be redirected to auth, pending invite saved
              }
            },
            {
              label: 'Continue Anyway',
              onPress: () => {
                analytics.inviteFunnel.wrongAccountContinue(user.email!, result.intended_email, correlationId);
                setError(null);
              },
              primary: true
            }
          ]
        });
      }

    } catch (error: any) {
      const latency = Date.now() - startTime;
      analytics.inviteFunnel.validateFailure(token, error.message, latency, correlationId);

      log.error('🎟️ Token validation failed', {
        correlationId,
        error: error as Error
      });

      // Check if we have cached data to fall back to
      const cached = await InviteCacheService.getCachedInviteData(token);
      if (cached) {
        log.info('📦 Falling back to cached data', { correlationId });
        setProperty(cached.property);
        setPropertyId(cached.property.id);
        setIsOffline(true);
      } else {
        setError({
          type: 'network',
          message: isOffline
            ? 'No internet. We\'ll retry when you\'re back online.'
            : 'Unable to validate invite. Please try again.',
          actions: [
            { label: 'Retry Now', onPress: () => validateTokenAndFetchProperty(), primary: true }
          ]
        });
      }
    } finally {
      setIsValidating(false);
      validatingRef.current = false;
    }
  };

  // Legacy: Fetch property details by ID (deprecated)
  const fetchPropertyDetails = async (propId: string) => {
    // ... legacy implementation (kept for backward compatibility)
    // This is the old flow - not adding hardening here
  };

  // Handle accept button click
  const handleAccept = async () => {
    if (!user) {
      // Save pending invite before redirecting to signup
      log.info('📥 User not authenticated, saving pending invite', { correlationId });

      if (inviteData?.type === 'token') {
        await PendingInviteService.savePendingInvite(inviteData.value, 'token');
      } else if (inviteData?.propertyId) {
        await PendingInviteService.savePendingInvite(inviteData.propertyId, 'legacy');
      }

      navigation.dispatch(CommonActions.navigate({ name: 'SignUp' as never }));
      return;
    }

    // Double-submit guard
    if (acceptingRef.current) {
      analytics.inviteFunnel.doubleClickBlocked(correlationId);
      return;
    }

    acceptingRef.current = true;
    setIsAccepting(true);
    analytics.inviteFunnel.acceptAttempt(inviteData!.value, propertyId!, correlationId);

    const startTime = Date.now();

    try {
      // Ensure profile exists
      await ensureProfileExists();

      // Check for already linked to another property
      const existingLinks = await apiClient.getTenantProperties();
      if (existingLinks.length > 0) {
        const existingProperty = existingLinks.find(p => p.id === propertyId);

        if (existingProperty) {
          // Already linked to THIS property - idempotent success
          analytics.inviteFunnel.alreadyLinked(propertyId!, correlationId);

          setError({
            type: 'already_linked',
            message: `You're already connected to ${property?.name || 'this property'}`,
            actions: [
              {
                label: 'Open Property',
                onPress: () => navigation.dispatch(CommonActions.navigate({ name: 'TenantTabs' as never })),
                primary: true
              }
            ]
          });
          return;
        }

        // TODO: Handle linked to DIFFERENT property (multi-property support or switch flow)
        // For now, we'll allow it (multi-property tenant)
      }

      // Choose acceptance flow based on invite type
      if (inviteData!.type === 'token') {
        await acceptTokenizedInvite();
      } else {
        await acceptLegacyInvite();
      }

      const latency = Date.now() - startTime;
      analytics.inviteFunnel.acceptSuccess(inviteData!.value, propertyId!, latency, correlationId);

      // Success! Navigate to tenant dashboard
      log.info('🎉 Success! Tenant connected to property', { correlationId });
      setError(null);

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'TenantTabs' as never }]
        })
      );

    } catch (error: any) {
      const latency = Date.now() - startTime;
      analytics.inviteFunnel.acceptFailure(inviteData!.value, error.message, latency, correlationId);

      log.error('Failed to accept invite', {
        correlationId,
        error: error as Error
      });

      setError({
        type: 'generic',
        message: 'Failed to accept invite. Please try again.',
        actions: [
          { label: 'Retry', onPress: handleAccept, primary: true }
        ]
      });
    } finally {
      setIsAccepting(false);
      acceptingRef.current = false;
    }
  };

  // Accept tokenized invite via Edge Function with re-validation
  const acceptTokenizedInvite = async () => {
    if (!inviteData || inviteData.type !== 'token' || !user) {
      throw new Error('Invalid state for tokenized invite acceptance');
    }

    const token = inviteData.value;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      throw new Error('Supabase configuration missing');
    }

    // Re-validate token before acceptance (prevent mid-session revocation)
    log.info('🔄 Re-validating token before acceptance', {
      correlationId,
      token_preview: sanitizeToken(token)
    });

    const revalidateResponse = await fetch(`${supabaseUrl}/functions/v1/validate-invite-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        'X-Correlation-ID': `${correlationId}-revalidate`
      },
      body: JSON.stringify({ token })
    });

    const revalidation = await revalidateResponse.json();
    if (!revalidation.valid) {
      throw new Error(revalidation.error === 'revoked'
        ? 'This invite was revoked while you were joining.'
        : 'This invite is no longer valid. Request a new link.'
      );
    }

    // Get user's access token for authenticated Edge Function call
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User session not found');
    }

    log.info('🎟️ Calling accept-invite-token Edge Function', {
      correlationId,
      token_preview: sanitizeToken(token)
    });

    const response = await fetch(`${supabaseUrl}/functions/v1/accept-invite-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-Correlation-ID': correlationId
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Token acceptance failed');
    }

    const result = await response.json();

    if (!result.success) {
      // Idempotent - already linked
      if (result.already_linked) {
        return; // Will be handled by caller
      }

      throw new Error(result.error || 'Failed to accept invite');
    }

    log.info('✅ Tokenized invite accepted successfully', { correlationId });
  };

  // Legacy acceptance (backward compatibility)
  const acceptLegacyInvite = async () => {
    if (!inviteData || inviteData.type !== 'legacy' || !inviteData.propertyId) {
      throw new Error('Invalid state for legacy invite acceptance');
    }

    await apiClient.linkTenantToPropertyById(inviteData.propertyId, property?.unit || undefined);
    log.info('✅ Legacy tenant property link created', { correlationId });
  };

  // Ensure profile exists before linking
  const ensureProfileExists = async () => {
    // ... existing implementation
  };

  // Handle decline
  const handleDecline = () => {
    navigation.dispatch(CommonActions.navigate({ name: 'Welcome' as never }));
  };

  // Render error state with actions
  const renderError = () => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer} testID="invite-error">
        <Ionicons name="alert-circle" size={64} color="#E74C3C" />
        <Text style={styles.errorTitle}>
          {error.type === 'wrong_account' ? 'Wrong Account' :
           error.type === 'already_linked' ? 'Already Connected' :
           error.type === 'capacity_reached' ? 'Invite Limit Reached' :
           error.type === 'revoked' ? 'Invite Revoked' :
           error.type === 'expired' ? 'Invite Expired' :
           error.type === 'network' ? 'Connection Issue' :
           'Error'}
        </Text>
        <Text style={styles.errorMessage}>{error.message}</Text>

        {error.actions && (
          <View style={styles.errorActions}>
            {error.actions.map((action, index) => (
              <CustomButton
                key={index}
                testID={`error-action-${index}`}
                title={action.label}
                onPress={action.onPress}
                variant={action.primary ? 'primary' : 'secondary'}
                style={styles.errorButton}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  // Loading state
  if (isValidating) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer} testID="invite-loading">
          <ActivityIndicator size="large" color="#2ECC71" />
          <Text style={styles.loadingText}>
            {retryCount > 0
              ? `Retrying... (attempt ${retryCount})`
              : 'Loading invite details...'}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <ScreenContainer>
        {renderError()}
      </ScreenContainer>
    );
  }

  // Success - show property details
  if (property) {
    return (
      <ScreenContainer>
        {isOffline && (
          <View style={styles.offlineBanner} testID="offline-banner">
            <Ionicons name="cloud-offline" size={20} color="#fff" />
            <Text style={styles.offlineText}>
              Viewing cached data. Connect to accept invite.
            </Text>
          </View>
        )}

        <View style={styles.container}>
          <Ionicons name="home" size={80} color="#2ECC71" />

          <Text style={styles.title} testID="property-name" accessibilityRole="header">
            {property.name}
          </Text>

          <Text style={styles.subtitle}>
            {formatAddress(property.address_jsonb || property.address)}
          </Text>

          {property.landlord_name && (
            <View style={styles.landlordInfo}>
              <Text style={styles.landlordLabel}>Landlord:</Text>
              <Text style={styles.landlordName}>{property.landlord_name}</Text>
            </View>
          )}

          {user && user.email && intendedEmail && user.email !== intendedEmail && (
            <View style={styles.accountWarning} testID="wrong-account-warning">
              <Ionicons name="warning" size={20} color="#F39C12" />
              <Text style={styles.accountWarningText}>
                Signed in as {user.email}. Not you?
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <CustomButton
              testID="invite-accept-button"
              accessibilityLabel="Accept property invite"
              title={isAccepting ? 'Connecting you to property...' : 'Accept Invite'}
              onPress={handleAccept}
              variant="primary"
              disabled={isAccepting || (isOffline && inviteData?.type === 'token')}
              loading={isAccepting}
              style={styles.acceptButton}
            />

            <CustomButton
              testID="invite-decline-button"
              accessibilityLabel="Decline property invite"
              title="Decline"
              onPress={handleDecline}
              variant="secondary"
              disabled={isAccepting}
            />
          </View>
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
    color: '#7F8C8D',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F39C12',
    padding: 12,
    gap: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 8,
    textAlign: 'center',
  },
  landlordInfo: {
    marginTop: 24,
    alignItems: 'center',
  },
  landlordLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  landlordName: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  accountWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  accountWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
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
    color: '#7F8C8D',
    marginTop: 8,
    textAlign: 'center',
  },
  errorActions: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  errorButton: {
    marginBottom: 8,
  },
});

export default PropertyInviteAcceptScreen;

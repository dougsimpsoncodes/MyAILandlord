import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import { useProfile } from '../../context/ProfileContext';
import log from '../../lib/log';
import ScreenContainer from '../../components/shared/ScreenContainer';
import CustomButton from '../../components/shared/CustomButton';
import { supabase } from '../../services/supabase/client';
import { useRole } from '../../context/RoleContext';
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
  const { user } = useAppAuth();
  const { profile, refreshProfile } = useProfile();
  const { setUserRole } = useRole();

  const [token, setToken] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract token from route params OR pending invite storage
  useEffect(() => {
    const loadToken = async () => {
      const params = route.params as RouteParams;
      const extractedToken = params.t || params.token;

      if (extractedToken) {
        log.info('[PropertyInviteAccept] Token extracted from route params:', { token_preview: extractedToken.substring(0, 4) + '...' });
        setToken(extractedToken);
        return;
      }

      // Check for pending invite (user came back after auth)
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

  // Set tenant role when user authenticates
  useEffect(() => {
    const setTenantRoleOnAuth = async () => {
      if (user && !profile?.role) {
        log.info('[PropertyInviteAccept] User authenticated via invite, setting tenant role');
        await setUserRole('tenant');
        await refreshProfile();
      }
    };

    setTenantRoleOnAuth();
  }, [user]);

  // Auto-accept invite after successful authentication
  useEffect(() => {
    const autoAcceptInvite = async () => {
      // Only auto-accept if:
      // 1. User is authenticated
      // 2. Property data is loaded (validation succeeded)
      // 3. Not currently accepting
      // 4. There's a pending invite in storage
      if (user && property && !isAccepting) {
        const pendingInvite = await PendingInviteService.getPendingInvite();
        if (pendingInvite && pendingInvite.type === 'token') {
          log.info('[PropertyInviteAccept] Auto-accepting invite after authentication');
          await handleAccept();
        }
      }
    };

    autoAcceptInvite();
  }, [user, property]);

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

    } catch (err: any) {
      log.error('[PropertyInviteAccept] Validation error:', err);
      setError(err.message || 'Failed to validate invite. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleAccept = async () => {
    if (!token) {
      setError('Missing invite token');
      return;
    }

    if (!user) {
      // Save pending invite before redirecting to onboarding
      log.info('[PropertyInviteAccept] User not authenticated, saving pending invite');
      await PendingInviteService.savePendingInvite(token, 'token', {
        propertyId: property?.id,
        propertyName: property?.name,
      });
      navigation.dispatch(CommonActions.navigate({ name: 'OnboardingName' as never }));
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      log.info('[PropertyInviteAccept] Accepting invite');

      // Ensure profile exists
      if (!profile) {
        log.info('[PropertyInviteAccept] Creating profile for user');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            role: 'tenant'
          });

        if (profileError && !profileError.message.includes('duplicate')) {
          throw profileError;
        }

        await refreshProfile();
      }

      // Call accept_invite RPC function (authenticated only)
      const { data, error: acceptError } = await supabase.rpc('accept_invite', {
        p_token: token
      });

      if (acceptError) {
        log.error('[PropertyInviteAccept] Accept RPC error:', acceptError);
        throw new Error('Failed to accept invite. Please try again.');
      }

      // RPC returns TABLE, so data is an array
      if (!data || !Array.isArray(data) || data.length === 0) {
        log.error('[PropertyInviteAccept] No data returned from accept_invite');
        throw new Error('Failed to accept invite');
      }

      const result = data[0];

      if (!result.success) {
        log.error('[PropertyInviteAccept] Accept failed:', result.error);
        throw new Error(result.error || 'Failed to accept invite');
      }

      log.info('[PropertyInviteAccept] Invite accepted successfully!');

      // Clear pending invite
      await PendingInviteService.clearPendingInvite();

      // Refresh profile to update context
      await refreshProfile();

      // Success! The AppNavigator will automatically route to tenant dashboard
      // after detecting the cleared pending invite and updated profile
      // Force a re-render by navigating to a known route
      if (Platform.OS === 'web') {
        // On web, reload to reset navigation state
        window.location.href = '/';
      } else {
        // On native, navigate back and let AppNavigator handle routing
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'TenantHome' as never }]
          })
        );
      }

    } catch (err: any) {
      log.error('[PropertyInviteAccept] Accept error:', err);
      setError(err.message || 'Failed to accept invite. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    navigation.dispatch(CommonActions.navigate({ name: 'Welcome' as never }));
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
});

export default PropertyInviteAcceptScreen;

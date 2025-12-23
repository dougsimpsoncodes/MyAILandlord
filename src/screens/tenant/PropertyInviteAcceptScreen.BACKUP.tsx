import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import { useProfile } from '../../context/ProfileContext';
import { useApiClient } from '../../services/api/client';
import { log } from '../../lib/log';
import ScreenContainer from '../../components/shared/ScreenContainer';
import CustomButton from '../../components/shared/CustomButton';
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';
import { useRole } from '../../context/RoleContext';
import * as Linking from 'expo-linking';
import { PendingInviteService } from '../../services/storage/PendingInviteService';
import { formatAddress } from '../../utils/helpers';

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

const PropertyInviteAcceptScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAppAuth();
  const { profile, refreshProfile } = useProfile();
  const { supabase } = useSupabaseWithAuth();

  // Extract invite data from route params or query parameters
  const getInviteData = async (): Promise<InviteData | null> => {
    const params = route.params as any;
    log.info('🔗 PropertyInviteAcceptScreen route params:', params);
    log.info('🔗 PropertyInviteAcceptScreen route:', route);

    // PRIORITY 1: Check for tokenized invite (NEW production flow)
    if (params?.token) {
      log.info('🎟️ Found invite token in route params (tokenized flow)');
      return { type: 'token', value: params.token };
    }

    // PRIORITY 2: Check for legacy propertyId (route params)
    if (params?.propertyId) {
      log.info('🔗 Found propertyId in route params (legacy flow)');
      return { type: 'legacy', value: params.propertyId, propertyId: params.propertyId };
    }

    // PRIORITY 3: Check for legacy property query parameter (deep linking)
    if (params?.property) {
      log.info('🔗 Found property in route params (legacy flow)');
      return { type: 'legacy', value: params.property, propertyId: params.property };
    }

    // PRIORITY 4: Fallback - extract from initial URL directly
    try {
      const url = await Linking.getInitialURL();
      log.info('🔗 Checking initial URL:', url);

      if (url) {
        // Check for token parameter
        const tokenMatch = url.match(/[?&]token=([^&]+)/);
        if (tokenMatch) {
          log.info('🎟️ Extracted token from URL (tokenized flow)');
          return { type: 'token', value: tokenMatch[1] };
        }

        // Check for legacy property parameter
        const propertyMatch = url.match(/[?&]property=([^&]+)/);
        if (propertyMatch) {
          log.info('🔗 Extracted property ID from URL (legacy flow)');
          return { type: 'legacy', value: propertyMatch[1], propertyId: propertyMatch[1] };
        }
      }
    } catch (error) {
      log.error('🔗 Error getting initial URL:', error as any);
    }

    log.info('🔗 No invite data found anywhere');
    return null;
  };

  const apiClient = useApiClient();
  const { setUserRole } = useRole();

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  // Extract invite data on component mount
  useEffect(() => {
    const extractInvite = async () => {
      const data = await getInviteData();
      setInviteData(data);
    };
    extractInvite();
  }, []);

  // Validate token or fetch property details based on invite type
  useEffect(() => {
    if (!inviteData) {
      setError('Invalid invite link. Missing invitation data.');
      setLoading(false);
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
      if (user) {
        log.info('🎯 User authenticated via invite link - setting role to tenant');
        try {
          await setUserRole('tenant');
          log.info('✅ Role automatically set to tenant via invite');
        } catch (error) {
          log.error('Failed to set tenant role:', error as any);
        }
      }
    };

    setTenantRoleOnAuth();
  }, [user]);

  // Validate tokenized invite and fetch property details
  const validateTokenAndFetchProperty = async () => {
    if (!inviteData || inviteData.type !== 'token') return;

    try {
      setLoading(true);
      setError('');

      const token = inviteData.value;
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      log.info('🎟️ Validating invite token via Edge Function...');

      // Call validate-invite-token Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/validate-invite-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Token validation failed');
      }

      const result = await response.json();
      log.info('🎟️ Token validation result:', result);

      if (!result.valid) {
        throw new Error(result.error || 'Invalid invite token');
      }

      if (!result.property) {
        throw new Error('Property not found for this invite');
      }

      // Token is valid - set property data
      setProperty(result.property);
      setPropertyId(result.property.id);

      // Update inviteData with propertyId for acceptance flow
      setInviteData({
        ...inviteData,
        propertyId: result.property.id
      });

      log.info('✅ Token validated successfully, property loaded');
    } catch (err) {
      log.error('Error validating token:', err as any);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // User-friendly error messages
      if (errorMessage.includes('expired')) {
        setError('This invite link has expired. Please ask your landlord for a new one.');
      } else if (errorMessage.includes('revoked')) {
        setError('This invite link has been cancelled. Please contact your landlord.');
      } else if (errorMessage.includes('used')) {
        setError('This invite link has already been used.');
      } else {
        setError('Unable to validate invite. The link may be invalid or expired.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertyDetails = async (propId: string) => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors

      // Use the property-invite-preview Edge Function for safe property access
      const { data: propertyData, error } = await supabase.functions.invoke(
        'property-invite-preview',
        {
          body: { propertyId: propId }
        }
      );

      if (error || !propertyData) {
        throw new Error('Property not found or invite is invalid');
      }

      setProperty(propertyData);
    } catch (err) {
      log.error('Error fetching property:', err as any);
      setError('Unable to load property details. The invite link may be invalid.');
    } finally {
      setLoading(false);
    }
  };

  const ensureProfileExists = async () => {
    if (!user || !apiClient) {
      throw new Error('User not authenticated');
    }

    // Use cached profile from ProfileContext
    if (!profile) {
      const email = user.email;
      const name = user.name;
      const avatarUrl = user.avatar || '';
      await apiClient.createUserProfile({ email, name, avatarUrl, role: 'tenant' });
      await refreshProfile();
      log.info('Tenant profile created during invite acceptance');
      await setUserRole('tenant');
      log.info('Tenant role set in context');
    }
  };

  const handleAcceptInvite = async () => {
    log.info('🎯 Accept button clicked!', { hasProperty: !!property, hasUser: !!user, inviteType: inviteData?.type });

    if (!property || !inviteData) {
      // Use window.alert on web, Alert.alert on native
      const isWeb = typeof window !== 'undefined' && typeof window.alert === 'function';
      if (isWeb) {
        window.alert('Property information is missing. Please try again.');
      } else {
        Alert.alert('Error', 'Property information is missing. Please try again.');
      }
      return;
    }

    // If user is not authenticated, save pending invite and redirect to signup
    if (!user) {
      log.info('🔄 Redirecting to signup - user not authenticated');

      // Save pending invite data (token or propertyId)
      if (inviteData.type === 'token') {
        // For tokens, save the token itself for post-auth acceptance
        await PendingInviteService.savePendingInvite(inviteData.value, 'token');
        log.info('📥 Saved pending token before redirect to signup');
      } else if (inviteData.propertyId) {
        await PendingInviteService.savePendingInvite(inviteData.propertyId, 'legacy');
        log.info('📥 Saved pending propertyId before redirect to signup');
      } else {
        log.warn('⚠️ No invite data available to save for pending invite');
      }

      navigation.dispatch(CommonActions.navigate({ name: 'SignUp' }));
      return;
    }

    log.info('🚀 Starting invite acceptance process for authenticated user');

    if (!apiClient) {
      Alert.alert('Error', 'Unable to connect to services. Please try again.');
      return;
    }

    try {
      log.info('🔧 Setting loading state...');
      setLoading(true);
      setError('');

      log.info('👤 Ensuring profile exists...');
      await ensureProfileExists();
      log.info('✅ Profile exists confirmed');

      // Choose acceptance flow based on invite type
      if (inviteData.type === 'token') {
        // NEW: Tokenized invite acceptance via Edge Function
        log.info('🎟️ Accepting invite via tokenized flow...');
        await acceptTokenizedInvite();
      } else {
        // LEGACY: Direct property link via API client
        log.info('🔗 Accepting invite via legacy flow...');
        await acceptLegacyInvite();
      }

      // Success! Property connected - navigate to home to trigger AppNavigator
      log.info('🎉 Success! Tenant connected to property');

      // Clear any error state
      setError('');

      // Reset navigation stack to go to tenant home
      log.info('🚀 Navigating to tenant dashboard');
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'TenantTabs' }],
        })
      );
      log.info('✅ Navigation to tenant dashboard initiated');
    } catch (error) {
      log.error('Error accepting invite:', error as any);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError('Failed to connect to property. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Accept tokenized invite via Edge Function
  const acceptTokenizedInvite = async () => {
    if (!inviteData || inviteData.type !== 'token' || !user) {
      throw new Error('Invalid state for tokenized invite acceptance');
    }

    const token = inviteData.value;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      throw new Error('Supabase configuration missing');
    }

    // Get user's access token for authenticated Edge Function call
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User session not found');
    }

    log.info('🎟️ Calling accept-invite-token Edge Function...');

    const response = await fetch(`${supabaseUrl}/functions/v1/accept-invite-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Token acceptance failed');
    }

    const result = await response.json();
    log.info('🎟️ Token acceptance result:', result);

    if (!result.success) {
      // Check if already linked (idempotent success)
      if (result.already_linked) {
        log.warn('⚠️ Already connected - showing alert');
        Alert.alert(
          'Already Connected',
          `You're already connected to ${property?.name || 'this property'}`,
          [
            { text: 'Continue', onPress: () => navigation.dispatch(CommonActions.navigate({ name: 'TenantTabs' })) }
          ]
        );
        return;
      }

      throw new Error(result.error || 'Failed to accept invite');
    }

    log.info('✅ Tokenized invite accepted successfully');
  };

  // Accept legacy invite via API client (old flow)
  const acceptLegacyInvite = async () => {
    if (!inviteData || inviteData.type !== 'legacy' || !inviteData.propertyId) {
      throw new Error('Invalid state for legacy invite acceptance');
    }

    try {
      await apiClient.linkTenantToPropertyById(inviteData.propertyId, property?.unit || undefined);
      log.info('✅ Legacy tenant property link created successfully');
    } catch (linkError: unknown) {
      // Check if already linked (unique violation)
      const message = linkError instanceof Error ? linkError.message : '';
      if (message.includes('duplicate') || message.includes('23505')) {
        log.warn('⚠️ Already connected - showing alert');
        Alert.alert(
          'Already Connected',
          `You're already connected to ${property?.name || 'this property'}`,
          [
            { text: 'Continue', onPress: () => navigation.dispatch(CommonActions.navigate({ name: 'TenantTabs' })) }
          ]
        );
        return;
      }
      throw linkError;
    }
  };

  const handleDecline = () => {
    // Direct navigation without confirmation - smooth UX
    navigation.dispatch(CommonActions.navigate({ name: 'Welcome' }));
  };

  if (loading && !property) {
    return (
      <ScreenContainer
        title="Property Invitation"
        userRole="tenant"
        scrollable={false}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading property details...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error && !property) {
    return (
      <ScreenContainer
        title="Invalid Invite"
        showBackButton
        onBackPress={() => navigation.dispatch(CommonActions.navigate({ name: 'Welcome' }))}
        userRole="tenant"
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ff4444" />
          <Text style={styles.errorTitle}>Invalid Invite</Text>
          <Text style={styles.errorMessageText}>{error}</Text>
          <CustomButton
            title="Go to Home"
            onPress={() => navigation.dispatch(CommonActions.navigate({ name: 'Home' }))}
            style={styles.homeButton}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="Property Invitation"
      subtitle="You've been invited to connect"
      showBackButton
      onBackPress={handleDecline}
      userRole="tenant"
    >
      {/* Property Card */}
      {property && (
        <View style={styles.propertyCard}>
          <View style={styles.propertyHeader}>
            <Ionicons name="home" size={32} color="#007AFF" />
          </View>
          <Text style={styles.propertyName}>{property.name}</Text>
          <Text style={styles.propertyAddress}>{formatAddress(property.address)}</Text>
          {property.unit && (
            <Text style={styles.propertyUnit}>Unit: {property.unit}</Text>
          )}
        </View>
      )}

      {/* Benefits */}
      <View style={styles.benefitsSection}>
        <Text style={styles.benefitsTitle}>By accepting, you'll be able to:</Text>
        <View style={styles.benefitItem}>
          <Ionicons name="construct" size={20} color="#666" />
          <Text style={styles.benefitText}>Report maintenance issues</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="chatbubbles" size={20} color="#666" />
          <Text style={styles.benefitText}>Communicate with your landlord</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="document-text" size={20} color="#666" />
          <Text style={styles.benefitText}>Access property information</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="notifications" size={20} color="#666" />
          <Text style={styles.benefitText}>Receive important updates</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <CustomButton
          title={loading ? 'Connecting...' : 'Accept & Connect'}
          onPress={handleAcceptInvite}
          disabled={loading}
          style={styles.acceptButton}
          icon="checkmark-circle"
        />

        <CustomButton
          title="Not Now"
          onPress={handleDecline}
          variant="outline"
          style={styles.declineButton}
        />
      </View>

      {/* Error Message */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 20,
    fontWeight: '600',
    color: '#ff4444',
  },
  errorMessageText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  homeButton: {
    marginTop: 24,
  },
  propertyCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  propertyHeader: {
    marginBottom: 16,
  },
  propertyName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  propertyAddress: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  propertyUnit: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  benefitsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 15,
    color: '#666',
    flex: 1,
  },
  actionSection: {
    paddingHorizontal: 24,
    gap: 12,
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  declineButton: {
    borderColor: '#666',
  },
});

export default PropertyInviteAcceptScreen;

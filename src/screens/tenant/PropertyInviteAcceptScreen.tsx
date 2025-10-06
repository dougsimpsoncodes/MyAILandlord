import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useApiClient } from '../../services/api/client';
import { log } from '../../lib/log';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { ResponsiveTitle, ResponsiveBody, ResponsiveCaption } from '../../components/shared/ResponsiveText';
import CustomButton from '../../components/shared/CustomButton';
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';
import { useRole } from '../../context/RoleContext';
import * as Linking from 'expo-linking';

// Union type to handle both AuthStack and TenantStack navigation
type PropertyInviteAcceptNavigationProp = 
  | NativeStackNavigationProp<AuthStackParamList, 'PropertyInviteAccept'>
  | NativeStackNavigationProp<TenantStackParamList, 'PropertyInviteAccept'>;

interface RouteParams {
  propertyId: string;
}

const PropertyInviteAcceptScreen = () => {
  const navigation = useNavigation<PropertyInviteAcceptNavigationProp>();
  const route = useRoute();
  const { userId, getToken } = useAuth();
  const { user } = useUser();
  const { supabase } = useSupabaseWithAuth();
  
  // Extract propertyId from route params or query parameters
  const getPropertyId = async () => {
    const params = route.params as any;
    log.info('🔗 PropertyInviteAcceptScreen route params:', params);
    log.info('🔗 PropertyInviteAcceptScreen route:', route);
    
    // Try route params first (for direct navigation)
    if (params?.propertyId) {
      log.info('🔗 Found propertyId in route params:', params.propertyId);
      return params.propertyId;
    }
    // Try query parameters (for deep linking)
    if (params?.property) {
      log.info('🔗 Found property in route params:', params.property);
      return params.property;
    }
    
    // Fallback: extract from initial URL directly
    try {
      const url = await Linking.getInitialURL();
      log.info('🔗 Checking initial URL for property ID:', url);
      if (url && url.includes('property=')) {
        const match = url.match(/property=([^&]+)/);
        if (match) {
          log.info('🔗 Extracted property ID from URL:', match[1]);
          return match[1];
        }
      }
    } catch (error) {
      log.error('🔗 Error getting initial URL:', error as any);
    }
    
    log.info('🔗 No property ID found anywhere');
    return null;
  };
  
  const apiClient = useApiClient();
  const responsive = useResponsive();
  const { setUserRole } = useRole();
  
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [error, setError] = useState('');
  const [propertyId, setPropertyId] = useState<string | null>(null);

  // Extract propertyId on component mount
  useEffect(() => {
    const extractPropertyId = async () => {
      const id = await getPropertyId();
      setPropertyId(id);
    };
    extractPropertyId();
  }, []);

  useEffect(() => {
    if (!propertyId) {
      setError('Invalid invite link. Property ID is missing.');
      setLoading(false);
      return;
    }
    fetchPropertyDetails();
  }, [propertyId]);

  // Set tenant role as soon as user is authenticated via invite link
  useEffect(() => {
    const setTenantRoleOnAuth = async () => {
      if (userId) {
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
  }, [userId]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      
      // Use the property-invite-preview Edge Function for safe property access
      const { data: propertyData, error } = await supabase.functions.invoke(
        'property-invite-preview',
        {
          body: { propertyId }
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
    if (!user || !userId) {
      throw new Error('User not authenticated');
    }

    if (!apiClient || !user) throw new Error('User not authenticated');
    const existing = await apiClient.getUserProfile();
    if (!existing) {
      const email = user.primaryEmailAddress?.emailAddress || '';
      const name = user.fullName || user.username || '';
      const avatarUrl = user.imageUrl || '';
      await apiClient.createUserProfile({ email, name, avatarUrl, role: 'tenant' });
      log.info('👤 Tenant profile created during invite acceptance');
      await setUserRole('tenant');
      log.info('✅ Tenant role set in context');
    }
  };

  const handleAcceptInvite = async () => {
    log.info('🎯 Accept button clicked!', { hasProperty: !!property, hasUser: !!userId });
    
    if (!property) {
      Alert.alert('Error', 'Property information is missing. Please try again.');
      return;
    }

    // If user is not authenticated, redirect to signup with invite context
    if (!userId) {
      log.info('🔄 Redirecting to signup - user not authenticated');
      navigation.navigate('SignUp');
      return;
    }

    log.info('🚀 Starting invite acceptance process for authenticated user');

    try {
      log.info('🔧 Setting loading state...');
      setLoading(true);
      setError('');

      log.info('👤 Ensuring profile exists...');
      await ensureProfileExists();
      log.info('✅ Profile exists confirmed');

      // Get the user's profile ID
      // Link tenant to property via unified API
      try {
        await apiClient.linkTenantToPropertyById(propertyId!, property?.unit || undefined);
        log.info('✅ Tenant property link created successfully');
      } catch (linkError: any) {
        // Check if already linked (unique violation)
        const message = (linkError && linkError.message) || '';
        if (message.includes('duplicate') || message.includes('23505')) {
          log.warn('⚠️ Already connected - showing alert');
          Alert.alert(
            'Already Connected',
            `You're already connected to ${property?.name || 'this property'}`,
            [
              { text: 'Continue', onPress: () => navigation.navigate('Welcome') }
            ]
          );
          return;
        }
        throw linkError;
      }

      // Success! Property connected - navigate to home to trigger AppNavigator
      log.info('🎉 Success! Tenant connected to property');
      
      // Clear any error state
      setError('');
      
      // Navigate to home URL to trigger AppNavigator to show tenant dashboard
      log.info('🚀 Navigating to home to show tenant dashboard');
      window.location.href = window.location.origin;
      log.info('✅ Navigation to tenant dashboard initiated');
    } catch (error) {
      log.error('Error accepting invite:', error as any);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError('Failed to connect to property. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    // Direct navigation without confirmation - smooth UX
    navigation.navigate('Welcome');
  };

  if (loading && !property) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading property details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !property) {
    return (
      <SafeAreaView style={styles.container}>
        <ResponsiveContainer>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#ff4444" />
            <ResponsiveTitle style={styles.errorTitle}>Invalid Invite</ResponsiveTitle>
            <ResponsiveBody style={styles.errorText}>{error}</ResponsiveBody>
            <CustomButton
              title="Go to Home"
              onPress={() => navigation.navigate('Home')}
              style={styles.homeButton}
            />
          </View>
        </ResponsiveContainer>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ResponsiveContainer>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="mail-open" size={48} color="#007AFF" />
          <ResponsiveTitle style={styles.title}>
            Property Invitation
          </ResponsiveTitle>
          <ResponsiveBody style={styles.subtitle}>
            You've been invited to connect to a property
          </ResponsiveBody>
        </View>

        {/* Property Card */}
        {property && (
          <View style={styles.propertyCard}>
            <View style={styles.propertyHeader}>
              <Ionicons name="home" size={32} color="#007AFF" />
            </View>
            <Text style={styles.propertyName}>{property.name}</Text>
            <Text style={styles.propertyAddress}>{property.address}</Text>
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
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
    color: '#ff4444',
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
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  title: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
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

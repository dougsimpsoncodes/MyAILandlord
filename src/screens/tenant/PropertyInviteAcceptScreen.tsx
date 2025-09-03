import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useApiClient } from '../../services/api/client';
import { upsertProfile, getProfileByClerkId } from '../../clients/ClerkSupabaseClient';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { ResponsiveTitle, ResponsiveBody, ResponsiveCaption } from '../../components/shared/ResponsiveText';
import CustomButton from '../../components/shared/CustomButton';
import { supabase } from '../../services/supabase/config';
import { useRole } from '../../context/RoleContext';

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
  
  // Extract propertyId from route params or query parameters
  const getPropertyId = () => {
    const params = route.params as any;
    // Try route params first (for direct navigation)
    if (params?.propertyId) {
      return params.propertyId;
    }
    // Try query parameters (for deep linking)
    if (params?.property) {
      return params.property;
    }
    // Fallback: try to extract from URL if available
    return null;
  };
  
  const propertyId = getPropertyId();
  const apiClient = useApiClient();
  const responsive = useResponsive();
  const { setUserRole } = useRole();
  
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [error, setError] = useState('');

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
        console.log('🎯 User authenticated via invite link - setting role to tenant');
        try {
          await setUserRole('tenant');
          console.log('✅ Role automatically set to tenant via invite');
        } catch (error) {
          console.error('Failed to set tenant role:', error);
        }
      }
    };
    
    setTenantRoleOnAuth();
  }, [userId]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      // Fetch basic property details for invite preview
      // For testing: Use anonymous Supabase client to fetch property details
      // TODO: In production, create proper public property view for invites
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, property_type')
        .eq('id', propertyId)
        .single();

      if (error || !data) {
        throw new Error('Property not found');
      }

      setProperty(data);
    } catch (err) {
      console.error('Error fetching property:', err);
      setError('Unable to load property details. The invite link may be invalid.');
    } finally {
      setLoading(false);
    }
  };

  const ensureProfileExists = async () => {
    if (!user || !userId) {
      throw new Error('User not authenticated');
    }

    const token = await getToken();
    if (!token) {
      throw new Error('Failed to get authentication token');
    }

    const tokenProvider = { getToken: async () => token };
    
    // Check if profile exists
    const existingProfile = await getProfileByClerkId(userId, tokenProvider);
    
    if (!existingProfile) {
      // Create profile
      const email = user.primaryEmailAddress?.emailAddress || '';
      const name = user.fullName || user.username || '';
      const avatar_url = user.imageUrl || '';
      
      await upsertProfile({ 
        id: '', 
        clerk_user_id: userId, 
        email, 
        name, 
        avatar_url,
        role: 'tenant' // Auto-set as tenant when accepting invite
      }, tokenProvider);
      
      // Immediately set tenant role in RoleContext after profile creation
      console.log('👤 Setting tenant role in context after profile creation...');
      await setUserRole('tenant');
      console.log('✅ Tenant role set in context');
    }
  };

  const handleAcceptInvite = async () => {
    console.log('🎯 Accept button clicked!', { property, userId });
    
    if (!property) {
      Alert.alert('Error', 'Property information is missing. Please try again.');
      return;
    }

    // If user is not authenticated, redirect to signup with invite context
    if (!userId) {
      console.log('🔄 Redirecting to signup - user not authenticated');
      navigation.navigate('SignUp');
      return;
    }

    console.log('🚀 Starting invite acceptance process for authenticated user');

    try {
      console.log('🔧 Setting loading state...');
      setLoading(true);
      setError('');

      console.log('👤 Ensuring profile exists...');
      await ensureProfileExists();
      console.log('✅ Profile exists confirmed');

      // Get the user's profile ID
      console.log('🎫 Getting auth token...');
      const token = await getToken();
      const tokenProvider = { getToken: async () => token };
      
      console.log('👤 Getting user profile...');
      const profile = await getProfileByClerkId(userId, tokenProvider);
      console.log('✅ Profile retrieved:', profile);

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Link tenant to property using authenticated Supabase client
      console.log('🔗 Creating tenant property link...', {
        tenant_id: profile.id,
        property_id: propertyId,
        unit_number: property.unit || null,
      });
      
      const { data: linkData, error: linkError } = await supabase
        .from('tenant_property_links')
        .insert({
          tenant_id: profile.id,
          property_id: propertyId,
          unit_number: property.unit || null,
          is_active: true,
        })
        .select()
        .single();
        
      console.log('🔗 Link result:', { linkData, linkError });

      if (linkError) {
        console.log('❌ Link error occurred:', linkError);
        // Check if already linked
        if (linkError.code === '23505') { // Unique violation
          console.log('⚠️ Already connected - showing alert');
          Alert.alert(
            'Already Connected',
            `You're already connected to ${property.name}`,
            [
              {
                text: 'Continue',
                onPress: () => navigation.navigate('Welcome')
              }
            ]
          );
          return;
        }
        throw linkError;
      }

      // Success! Property connected - navigate to home to trigger AppNavigator
      console.log('🎉 Success! Tenant connected to property');
      
      // Clear any error state
      setError('');
      
      // Navigate to home URL to trigger AppNavigator to show tenant dashboard
      console.log('🚀 Navigating to home to show tenant dashboard');
      window.location.href = window.location.origin;
      
      console.log('✅ Navigation to tenant dashboard initiated');
    } catch (error) {
      console.error('Error accepting invite:', error);
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
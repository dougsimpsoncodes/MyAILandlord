import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/shared/Card';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { PropertyImage } from '../../components/shared/PropertyImage';
import { DesignSystem } from '../../theme/DesignSystem';
import { PropertyArea, PropertyData } from '../../types/property';
import { propertyAreasService } from '../../services/supabase/propertyAreasService';
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';
import log from '../../lib/log';
import { formatAddress } from '../../utils/helpers';

type PropertyDetailsNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'PropertyDetails'>;
type PropertyDetailsRouteProp = RouteProp<LandlordStackParamList, 'PropertyDetails'>;

const PropertyDetailsScreen = () => {
  const navigation = useNavigation<PropertyDetailsNavigationProp>();
  const route = useRoute<PropertyDetailsRouteProp>();
  const { property } = route.params;
  const { supabase } = useSupabaseWithAuth();

  // State for areas loaded from database
  const [areas, setAreas] = useState<PropertyArea[]>([]);

  // Load areas from database when screen comes into focus
  const loadAreasFromDatabase = useCallback(async () => {
    try {
      log.info('Loading property areas from database', { propertyId: property.id });
      const loadedAreas = await propertyAreasService.getAreasWithAssets(property.id, supabase);
      setAreas(loadedAreas);
    } catch (error) {
      log.error('Failed to load property areas', { error: String(error) });
    }
  }, [property.id, supabase]);

  // Reload areas whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAreasFromDatabase();
    }, [loadAreasFromDatabase])
  );

  const handleEditProperty = () => {
    // Navigate to edit property flow (reuse AddProperty with existing data)
    Alert.alert('Edit Property', 'Property editing will be available soon.');
  };

  const handleViewAreas = () => {
    // Create a minimal PropertyData from the property object
    const propertyData: PropertyData = {
      name: property.name,
      address: {
        line1: property.address,
        city: '',
        state: '',
        zipCode: ''
      },
      type: property.type as PropertyData['type'],
      unit: '',
      bedrooms: 0,
      bathrooms: 0,
      photos: []
    };

    // For existing properties, go directly to Photos & Assets screen
    // (not the area selection screen - that's only for initial setup)
    navigation.navigate('PropertyAssets', {
      propertyData,
      areas, // Pass areas loaded from database
      propertyId: property.id // Pass property ID for database operations
    });
  };

  const handleAddTenant = () => {
    navigation.navigate('InviteTenant', {
      propertyId: property.id,
      propertyName: property.name,
    });
  };

  const handleMaintenanceRequests = () => {
    // Navigate to the Maintenance tab (LandlordRequests)
    navigation.getParent()?.navigate('LandlordRequests');
  };

  return (
    <ScreenContainer
      title="Property Details"
      showBackButton
      onBackPress={() => navigation.goBack()}
      headerRight={
        <TouchableOpacity onPress={handleEditProperty}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      }
      userRole="landlord"
      padded={false}
    >
        {/* Property Header */}
        <View style={styles.propertyHeader}>
          <PropertyImage
            address={property.address}
            width={320}
            height={200}
            borderRadius={12}
          />
          <Text style={styles.propertyAddress}>{formatAddress(property.address)}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <Card style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleViewAreas}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="grid-outline" size={24} color="#3498DB" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Rooms & Inventory</Text>
                <Text style={styles.actionSubtitle}>View rooms and inventory items</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
            </TouchableOpacity>
          </Card>

          <Card style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddTenant}
              activeOpacity={0.7}
              testID="invite-tenant"
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E8F8F0' }]}>
                <Ionicons name="person-add-outline" size={24} color="#2ECC71" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Invite Tenant</Text>
                <Text style={styles.actionSubtitle}>Send an invitation to your tenant</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
            </TouchableOpacity>
          </Card>

          <Card style={styles.actionCard}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleMaintenanceRequests}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="hammer-outline" size={24} color="#F39C12" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Maintenance Requests</Text>
                <Text style={styles.actionSubtitle}>View and manage requests</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
            </TouchableOpacity>
          </Card>
        </View>

    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  editText: {
    fontSize: 16,
    color: '#3498DB',
    fontWeight: '500',
  },
  // Property Header
  propertyHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  propertyAddress: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2C3E50',
    marginTop: 12,
    textAlign: 'center',
  },
  section: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: DesignSystem.colors.text,
    marginBottom: 12,
  },
  actionCard: {
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DesignSystem.colors.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
});

export default PropertyDetailsScreen;

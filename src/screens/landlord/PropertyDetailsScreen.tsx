import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import { DesignSystem } from '../../theme/DesignSystem';
import { PropertyArea, PropertyData } from '../../types/property';
import { propertyAreasService } from '../../services/supabase/propertyAreasService';
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';
import log from '../../lib/log';

type PropertyDetailsNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'PropertyDetails'>;
type PropertyDetailsRouteProp = RouteProp<LandlordStackParamList, 'PropertyDetails'>;

const PropertyDetailsScreen = () => {
  const navigation = useNavigation<PropertyDetailsNavigationProp>();
  const route = useRoute<PropertyDetailsRouteProp>();
  const { property } = route.params;
  const { supabase } = useSupabaseWithAuth();

  // State for areas loaded from database
  const [areas, setAreas] = useState<PropertyArea[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(true);
  const [areaCount, setAreaCount] = useState(0);
  const [assetCount, setAssetCount] = useState(0);

  // Load areas from database when screen comes into focus
  const loadAreasFromDatabase = useCallback(async () => {
    try {
      setIsLoadingAreas(true);
      console.log('🔍 PropertyDetailsScreen: Loading areas for property:', property.id);
      console.log('🔍 PropertyDetailsScreen: Using authenticated client:', !!supabase);
      log.info('Loading property areas from database', { propertyId: property.id });

      const loadedAreas = await propertyAreasService.getAreasWithAssets(property.id, supabase);
      console.log('🔍 PropertyDetailsScreen: Loaded', loadedAreas.length, 'areas from database');
      setAreas(loadedAreas);
      setAreaCount(loadedAreas.length);

      // Calculate total assets across all areas
      const totalAssets = loadedAreas.reduce(
        (sum, area) => sum + (area.assets?.length || 0),
        0
      );
      setAssetCount(totalAssets);

      // Debug: Log what we got from database
      loadedAreas.forEach(area => {
        console.log(`📸 Area "${area.name}": photos=${area.photos?.length || 0}, photoPaths=${area.photoPaths?.length || 0}`);
        if (area.photoPaths && area.photoPaths.length > 0) {
          console.log(`   photoPaths[0]: ${area.photoPaths[0]?.substring(0, 50)}...`);
        }
        if (area.photos && area.photos.length > 0) {
          console.log(`   photos[0]: ${area.photos[0]?.substring(0, 50)}...`);
        }
      });

      log.info('Loaded property areas from database', {
        propertyId: property.id,
        areaCount: loadedAreas.length,
        assetCount: totalAssets
      });
    } catch (error) {
      console.error('🔍 PropertyDetailsScreen: ERROR loading areas:', error);
      log.error('Failed to load property areas', { error: String(error) });
      // Keep showing 0 counts on error
      setAreaCount(0);
      setAssetCount(0);
    } finally {
      setIsLoadingAreas(false);
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
    navigation.navigate('Dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Details</Text>
        <TouchableOpacity onPress={handleEditProperty}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Property Information */}
        <Card style={styles.propertyCard}>
          <Text style={styles.propertyName}>{property.name}</Text>
          <Text style={styles.propertyAddress}>{property.address}</Text>
          
          <View style={styles.propertyMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="home" size={20} color="#3498DB" />
              <Text style={styles.metaText}>{property.type}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people" size={20} color="#2ECC71" />
              <Text style={styles.metaText}>{property.tenants} Tenant{property.tenants !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons 
                name="construct" 
                size={20} 
                color={property.activeRequests > 0 ? '#E74C3C' : '#95A5A6'} 
              />
              <Text style={[
                styles.metaText, 
                property.activeRequests > 0 && { color: '#E74C3C', fontWeight: '600' }
              ]}>
                {property.activeRequests} Request{property.activeRequests !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </Card>

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
                <Text style={styles.actionTitle}>Manage Areas & Assets</Text>
                <Text style={styles.actionSubtitle}>View rooms, photos, and inventory</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
            </TouchableOpacity>
          </Card>

          <Card style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddTenant}
              activeOpacity={0.7}
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

        {/* Property Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Overview</Text>

          <Card style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                {isLoadingAreas ? (
                  <ActivityIndicator size="small" color="#3498DB" />
                ) : (
                  <Text style={styles.statNumber}>{areaCount}</Text>
                )}
                <Text style={styles.statLabel}>Areas</Text>
              </View>
              <View style={styles.statItem}>
                {isLoadingAreas ? (
                  <ActivityIndicator size="small" color="#3498DB" />
                ) : (
                  <Text style={styles.statNumber}>{assetCount}</Text>
                )}
                <Text style={styles.statLabel}>Assets</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{property.tenants}</Text>
                <Text style={styles.statLabel}>Tenants</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, property.activeRequests > 0 && { color: '#E74C3C' }]}>
                  {property.activeRequests}
                </Text>
                <Text style={styles.statLabel}>Active Issues</Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignSystem.colors.surfaceSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: DesignSystem.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DesignSystem.colors.text,
  },
  editText: {
    fontSize: 16,
    color: '#3498DB',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  propertyCard: {
    marginTop: 20,
    marginBottom: 16,
  },
  propertyName: {
    fontSize: 24,
    fontWeight: '700',
    color: DesignSystem.colors.text,
    marginBottom: 8,
  },
  propertyAddress: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 16,
    lineHeight: 22,
  },
  propertyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  section: {
    marginVertical: 16,
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
  statsCard: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3498DB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default PropertyDetailsScreen;
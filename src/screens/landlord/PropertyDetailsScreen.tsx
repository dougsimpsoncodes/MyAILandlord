import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import { DesignSystem } from '../../theme/DesignSystem';
import { getPropertyAreasParams, getPropertyAssetsParams } from '../../utils/navigationHelpers';
import { useApiClient } from '../../services/api/client';
import { log } from '../../lib/log';

type PropertyDetailsNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'PropertyDetails'>;
type PropertyDetailsRouteProp = RouteProp<LandlordStackParamList, 'PropertyDetails'>;

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  tenants: number;
  activeRequests: number;
  propertyCode?: string;
}

const PropertyDetailsScreen = () => {
  const navigation = useNavigation<PropertyDetailsNavigationProp>();
  const route = useRoute<PropertyDetailsRouteProp>();
  const { propertyId } = route.params as any;
  const api = useApiClient();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  const loadProperty = async () => {
    try {
      if (!api) {
        setError('API not available');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const properties = await api.getUserProperties();
      const foundProperty = properties.find((p: any) => p.id === propertyId);

      if (foundProperty) {
        setProperty({
          id: foundProperty.id,
          name: foundProperty.name || 'Unnamed Property',
          address: typeof foundProperty.address === 'string'
            ? foundProperty.address
            : JSON.stringify(foundProperty.address),
          type: foundProperty.property_type || 'Unknown',
          tenants: 0, // TODO: Add tenant count
          activeRequests: 0, // TODO: Add maintenance request count
          propertyCode: foundProperty.property_code,
        });
      } else {
        setError('Property not found');
      }
    } catch (err) {
      log.error('Error loading property', { error: err, propertyId });
      setError('Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProperty = () => {
    // Navigate to edit property flow
    Alert.alert('Edit Property', 'Property editing will be available soon.');
  };

  const handleViewAreas = () => {
    // Navigate to PropertyAreas screen using helper
    if (!property) return;
    navigation.navigate('PropertyAreas', getPropertyAreasParams(property) as any);
  };

  const handleViewAssets = () => {
    // Navigate to PropertyAssets screen using helper
    if (!property) return;
    navigation.navigate('PropertyAssets', getPropertyAssetsParams(property) as any);
  };

  const handleAddTenant = () => {
    // Navigate to InviteTenant screen (assumes property has a code)
    if (property?.id) {
      navigation.navigate('InviteTenant', {
        propertyId: property!.id,
        propertyName: property!.name,
        propertyCode: property!.propertyCode || 'GENERATE', // Will generate if not exists
      });
    } else {
      Alert.alert('Error', 'Property information is incomplete.');
    }
  };

  const handleMaintenanceRequests = () => {
    // Navigate to Dashboard (maintenance hub)
    navigation.navigate('Dashboard');
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Property Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Loading property...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !property) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Property Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={64} color="#E74C3C" />
          <Text style={styles.errorText}>{error || 'Property not found'}</Text>
          <Button title="Try Again" onPress={loadProperty} />
        </View>
      </SafeAreaView>
    );
  }

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
                <Text style={styles.actionTitle}>Manage Areas</Text>
                <Text style={styles.actionSubtitle}>View and edit property areas</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
            </TouchableOpacity>
          </Card>

          <Card style={styles.actionCard}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleViewAssets}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="cube-outline" size={24} color="#9B59B6" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Manage Assets</Text>
                <Text style={styles.actionSubtitle}>View and manage property inventory</Text>
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
              <View style={styles.actionIcon}>
                <Ionicons name="person-add-outline" size={24} color="#2ECC71" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Manage Tenants</Text>
                <Text style={styles.actionSubtitle}>Add or manage tenants</Text>
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
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Areas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7F8C8D',
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
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

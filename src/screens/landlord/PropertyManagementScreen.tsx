import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useApiClient } from '../../services/api/client';
import { useAppAuth } from '../../context/ClerkAuthContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useApiErrorHandling } from '../../hooks/useErrorHandling';
import { formatCurrency } from '../../utils/helpers';

interface Property {
  id: string;
  name: string;
  address: string;
  type: 'apartment' | 'house' | 'condo' | 'commercial';
  units: number;
  occupiedUnits: number;
  monthlyRent: number;
  totalRent: number;
  activeRequests: number;
  emergencyRequests: number;
  maintenanceScore: number;
  tenantSatisfaction: number;
  lastInspection: string;
  nextInspection: string;
  status: 'excellent' | 'good' | 'fair' | 'needs_attention';
}

interface PortfolioStats {
  totalProperties: number;
  totalUnits: number;
  occupancyRate: number;
  monthlyRevenue: number;
  averageMaintenanceScore: number;
  averageTenantSatisfaction: number;
}

const { width } = Dimensions.get('window');

const PropertyManagementScreen = () => {
  const navigation = useNavigation();
  const apiClient = useApiClient();
  const { user } = useAppAuth();
  const { handleApiError } = useApiErrorHandling();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats>({
    totalProperties: 0,
    totalUnits: 0,
    occupancyRate: 0,
    monthlyRevenue: 0,
    averageMaintenanceScore: 0,
    averageTenantSatisfaction: 0,
  });
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'needs_attention' | 'excellent'>('all');

  useEffect(() => {
    loadPropertiesData();
  }, []);

  const loadPropertiesData = async () => {
    try {
      setLoading(true);
      
      if (!apiClient) {
        console.error('API client not available');
        setLoading(false);
        return;
      }
      
      const propertiesFromApi = await apiClient.getUserProperties();
      
      // TODO: Replace with real data from API
      // For now, generating mock data based on real properties
      const mockProperties: Property[] = propertiesFromApi.map((prop, index) => ({
        id: prop.id,
        name: prop.name,
        address: prop.address,
        type: 'apartment' as const,
        units: Math.floor(Math.random() * 10) + 1,
        occupiedUnits: Math.floor(Math.random() * 8) + 1,
        monthlyRent: 1200 + (Math.floor(Math.random() * 800)),
        totalRent: 0, // Will be calculated
        activeRequests: Math.floor(Math.random() * 5),
        emergencyRequests: Math.floor(Math.random() * 2),
        maintenanceScore: 70 + Math.floor(Math.random() * 30),
        tenantSatisfaction: 75 + Math.floor(Math.random() * 25),
        lastInspection: '2 weeks ago',
        nextInspection: 'Next month',
        status: 'good' as const,
      }));

      // Calculate derived fields
      mockProperties.forEach(prop => {
        prop.totalRent = prop.monthlyRent * prop.occupiedUnits;
        if (prop.maintenanceScore >= 90) prop.status = 'excellent';
        else if (prop.maintenanceScore >= 80) prop.status = 'good';
        else if (prop.maintenanceScore >= 70) prop.status = 'fair';
        else prop.status = 'needs_attention';
      });

      // Calculate portfolio stats
      const stats: PortfolioStats = {
        totalProperties: mockProperties.length,
        totalUnits: mockProperties.reduce((sum, p) => sum + p.units, 0),
        occupancyRate: mockProperties.length > 0 
          ? mockProperties.reduce((sum, p) => sum + (p.occupiedUnits / p.units), 0) / mockProperties.length * 100 
          : 0,
        monthlyRevenue: mockProperties.reduce((sum, p) => sum + p.totalRent, 0),
        averageMaintenanceScore: mockProperties.length > 0 
          ? mockProperties.reduce((sum, p) => sum + p.maintenanceScore, 0) / mockProperties.length 
          : 0,
        averageTenantSatisfaction: mockProperties.length > 0 
          ? mockProperties.reduce((sum, p) => sum + p.tenantSatisfaction, 0) / mockProperties.length 
          : 0,
      };

      setProperties(mockProperties);
      setPortfolioStats(stats);
    } catch (error) {
      handleApiError(error, 'Loading properties data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPropertiesData();
    setRefreshing(false);
  };

  const filteredProperties = properties.filter(property => {
    if (selectedFilter === 'all') return true;
    return property.status === selectedFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return '#27AE60';
      case 'good': return '#3498DB';
      case 'fair': return '#F39C12';
      case 'needs_attention': return '#E74C3C';
      default: return '#95A5A6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return 'checkmark-circle';
      case 'good': return 'thumbs-up';
      case 'fair': return 'warning';
      case 'needs_attention': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const handlePropertyPress = (property: Property) => {
    // TODO: Navigate to property detail screen
    console.log('Open property details:', property.id);
  };

  const handleAddProperty = () => {
    // TODO: Navigate to add property screen
    console.log('Add new property');
  };

  if (loading) {
    return <LoadingSpinner message="Loading your properties..." />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#34495E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Property Management</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddProperty}>
            <Ionicons name="add" size={24} color="#3498DB" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Portfolio Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio Overview</Text>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewCard}>
                <Ionicons name="business" size={24} color="#3498DB" />
                <Text style={styles.overviewNumber}>{portfolioStats.totalProperties}</Text>
                <Text style={styles.overviewLabel}>Properties</Text>
              </View>
              <View style={styles.overviewCard}>
                <Ionicons name="home" size={24} color="#27AE60" />
                <Text style={styles.overviewNumber}>{portfolioStats.totalUnits}</Text>
                <Text style={styles.overviewLabel}>Total Units</Text>
              </View>
              <View style={styles.overviewCard}>
                <Ionicons name="people" size={24} color="#F39C12" />
                <Text style={styles.overviewNumber}>{portfolioStats.occupancyRate.toFixed(1)}%</Text>
                <Text style={styles.overviewLabel}>Occupancy</Text>
              </View>
              <View style={styles.overviewCard}>
                <Ionicons name="cash" size={24} color="#9B59B6" />
                <Text style={styles.overviewNumber}>{formatCurrency(portfolioStats.monthlyRevenue)}</Text>
                <Text style={styles.overviewLabel}>Monthly Revenue</Text>
              </View>
            </View>
          </View>

          {/* Performance Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Metrics</Text>
            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Ionicons name="construct" size={20} color="#3498DB" />
                  <Text style={styles.metricTitle}>Maintenance Score</Text>
                </View>
                <Text style={styles.metricValue}>{portfolioStats.averageMaintenanceScore.toFixed(1)}/100</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${portfolioStats.averageMaintenanceScore}%`,
                        backgroundColor: getStatusColor(portfolioStats.averageMaintenanceScore >= 80 ? 'excellent' : 'fair')
                      }
                    ]} 
                  />
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Ionicons name="star" size={20} color="#F39C12" />
                  <Text style={styles.metricTitle}>Tenant Satisfaction</Text>
                </View>
                <Text style={styles.metricValue}>{portfolioStats.averageTenantSatisfaction.toFixed(1)}/100</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${portfolioStats.averageTenantSatisfaction}%`,
                        backgroundColor: getStatusColor(portfolioStats.averageTenantSatisfaction >= 80 ? 'excellent' : 'fair')
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Property Filters */}
          <View style={styles.section}>
            <View style={styles.filtersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[
                  { key: 'all', label: 'All Properties', count: properties.length },
                  { key: 'excellent', label: 'Excellent', count: properties.filter(p => p.status === 'excellent').length },
                  { key: 'needs_attention', label: 'Needs Attention', count: properties.filter(p => p.status === 'needs_attention').length },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterButton,
                      selectedFilter === filter.key && styles.filterButtonActive,
                    ]}
                    onPress={() => setSelectedFilter(filter.key as any)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selectedFilter === filter.key && styles.filterTextActive,
                      ]}
                    >
                      {filter.label} ({filter.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Properties List */}
          <View style={styles.section}>
            {filteredProperties.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={64} color="#BDC3C7" />
                <Text style={styles.emptyTitle}>No Properties Found</Text>
                <Text style={styles.emptySubtitle}>
                  {selectedFilter === 'all' 
                    ? 'Add your first property to get started.'
                    : `No properties with ${selectedFilter.replace('_', ' ')} status.`}
                </Text>
                <TouchableOpacity style={styles.addPropertyButton} onPress={handleAddProperty}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addPropertyText}>Add Property</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredProperties.map((property) => (
                <TouchableOpacity
                  key={property.id}
                  style={styles.propertyCard}
                  onPress={() => handlePropertyPress(property)}
                  activeOpacity={0.7}
                >
                  <View style={styles.propertyHeader}>
                    <View style={styles.propertyInfo}>
                      <Text style={styles.propertyName}>{property.name}</Text>
                      <Text style={styles.propertyAddress}>{property.address}</Text>
                    </View>
                    <View style={styles.propertyStatus}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(property.status) }
                      ]}>
                        <Ionicons 
                          name={getStatusIcon(property.status) as any} 
                          size={16} 
                          color="#FFFFFF" 
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.propertyStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{property.occupiedUnits}/{property.units}</Text>
                      <Text style={styles.statLabel}>Units</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{formatCurrency(property.totalRent)}</Text>
                      <Text style={styles.statLabel}>Monthly Rent</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{property.activeRequests}</Text>
                      <Text style={styles.statLabel}>Active Requests</Text>
                    </View>
                  </View>

                  <View style={styles.propertyMetrics}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Maintenance Score</Text>
                      <Text style={[styles.metricScore, { color: getStatusColor(property.status) }]}>
                        {property.maintenanceScore}/100
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Tenant Satisfaction</Text>
                      <Text style={[styles.metricScore, { color: getStatusColor(property.status) }]}>
                        {property.tenantSatisfaction}/100
                      </Text>
                    </View>
                  </View>

                  {property.emergencyRequests > 0 && (
                    <View style={styles.emergencyAlert}>
                      <Ionicons name="warning" size={16} color="#E74C3C" />
                      <Text style={styles.emergencyText}>
                        {property.emergencyRequests} emergency request{property.emergencyRequests > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}

                  <View style={styles.propertyActions}>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="eye" size={16} color="#3498DB" />
                      <Text style={styles.actionText}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="construct" size={16} color="#F39C12" />
                      <Text style={styles.actionText}>Maintenance</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="people" size={16} color="#27AE60" />
                      <Text style={styles.actionText}>Tenants</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  addButton: {
    padding: 8,
    backgroundColor: '#E8F4FD',
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (width - 52) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
  },
  metricsContainer: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#34495E',
    borderColor: '#34495E',
  },
  filterText: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#6C757D',
  },
  propertyStatus: {},
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F2F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6C757D',
  },
  propertyMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 4,
  },
  metricScore: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emergencyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEAEA',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    gap: 6,
  },
  emergencyText: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '600',
  },
  propertyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#3498DB',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C757D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#ADB5BD',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  addPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498DB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  addPropertyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PropertyManagementScreen;
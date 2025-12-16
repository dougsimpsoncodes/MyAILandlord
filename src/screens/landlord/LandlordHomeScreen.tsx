import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import { useApiClient } from '../../services/api/client';
import { usePropertyDrafts } from '../../hooks/usePropertyDrafts';
import { log } from '../../lib/log';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { PropertyImage } from '../../components/shared/PropertyImage';

type LandlordHomeNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'Home'>;

interface MaintenanceRequest {
  id: string;
  title: string;
  location: string;
  propertyId: string;
  propertyName: string;
  priority: 'urgent' | 'medium' | 'low';
  timeAgo: string;
}

interface PropertySummary {
  id: string;
  name: string;
  address: string;
  type: string;
  issueCount: number;
}

const LandlordHomeScreen = () => {
  const navigation = useNavigation<LandlordHomeNavigationProp>();
  const { user } = useAppAuth();
  const api = useApiClient();
  const { drafts, isLoading: isDraftsLoading } = usePropertyDrafts();

  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [activeRequests, setActiveRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const hasRedirectedToDraft = useRef(false);

  // Filter requests based on selected property
  const filteredRequests = selectedProperty === 'all'
    ? activeRequests
    : activeRequests.filter(r => r.propertyId === selectedProperty);

  const loadData = useCallback(async () => {
    try {
      if (!api) return;

      // Load properties
      const userProperties = await api.getUserProperties();
      const propertySummaries: PropertySummary[] = userProperties.map((p: any) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        type: p.property_type || 'house',
        issueCount: 0,
      }));
      setProperties(propertySummaries);

      // Load maintenance requests from API
      const maintenanceData = await api.getMaintenanceRequests({ limit: 20 });

      // Map API data to UI format
      const mappedRequests: MaintenanceRequest[] = maintenanceData.map((req: any) => {
        // Calculate time ago
        const createdAt = new Date(req.created_at);
        const now = new Date();
        const diffMs = now.getTime() - createdAt.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        let timeAgo = 'just now';
        if (diffDays > 0) {
          timeAgo = `${diffDays}d ago`;
        } else if (diffHours > 0) {
          timeAgo = `${diffHours}h ago`;
        } else if (diffMins > 0) {
          timeAgo = `${diffMins}m ago`;
        }

        return {
          id: req.id,
          title: req.title || 'Maintenance Request',
          location: req.area || 'Unknown',
          propertyId: req.property_id,
          propertyName: req.properties?.name || 'Unknown Property',
          priority: req.priority || 'medium',
          timeAgo,
        };
      });

      // Update issue counts on properties
      const updatedSummaries = propertySummaries.map(p => ({
        ...p,
        issueCount: mappedRequests.filter(r => r.propertyId === p.id).length,
      }));
      setProperties(updatedSummaries);

      // Only show pending/in_progress requests (not completed)
      const activeOnly = mappedRequests.filter((r: any) =>
        maintenanceData.find((m: any) => m.id === r.id)?.status !== 'completed'
      );
      setActiveRequests(activeOnly);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Load data on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Redirect to incomplete draft if no published properties
  useEffect(() => {
    if (isLoading || isDraftsLoading || hasRedirectedToDraft.current || properties.length > 0) {
      return;
    }

    const incompleteDraft = drafts.find(d => d.status !== 'completed');
    if (incompleteDraft) {
      hasRedirectedToDraft.current = true;
      log.info('Redirecting to incomplete draft', {
        draftId: incompleteDraft.id,
        currentStep: incompleteDraft.currentStep,
      });

      if (incompleteDraft.currentStep <= 1) {
        navigation.navigate('AddProperty', { draftId: incompleteDraft.id });
      } else if (incompleteDraft.currentStep === 2) {
        navigation.navigate('PropertyAssets', {
          propertyData: incompleteDraft.propertyData,
          areas: incompleteDraft.areas || [],
          draftId: incompleteDraft.id
        });
      } else {
        navigation.navigate('PropertyReview', {
          propertyData: incompleteDraft.propertyData,
          areas: incompleteDraft.areas || [],
          draftId: incompleteDraft.id
        });
      }
    }
  }, [isLoading, isDraftsLoading, properties.length, drafts, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#E74C3C';
      case 'medium': return '#F39C12';
      case 'low': return '#2ECC71';
      default: return '#7F8C8D';
    }
  };

  const getPropertyIcon = (type: string) => {
    switch (type) {
      case 'apartment': return 'business';
      case 'condo': return 'business';
      case 'townhouse': return 'home';
      default: return 'home';
    }
  };

  const handlePropertyPress = (property: PropertySummary) => {
    navigation.navigate('PropertyDetails', {
      property: {
        id: property.id,
        name: property.name,
        address: property.address,
        type: property.type,
        tenants: 0,
        activeRequests: property.issueCount,
      }
    });
  };

  const handleRequestPress = (request: MaintenanceRequest) => {
    navigation.navigate('CaseDetail', { caseId: request.id });
  };

  const handleRespondPress = (request: MaintenanceRequest) => {
    navigation.navigate('CaseDetail', { caseId: request.id });
  };

  // Empty state for new users with no properties
  if (!isLoading && properties.length === 0) {
    return (
      <ScreenContainer
        title="MyAILandlord"
        userRole="landlord"
        scrollable={false}
      >
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={48} color="#BDC3C7" />
            <Text style={styles.emptyTitle}>No Properties Yet</Text>
            <Text style={styles.emptySubtitle}>Add your first property to get started</Text>
            <TouchableOpacity
              style={styles.addPropertyBtn}
              onPress={() => navigation.navigate('AddProperty')}
              testID="add-property-button"
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addPropertyBtnText}>Add Property</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="MyAILandlord"
      userRole="landlord"
      refreshing={refreshing}
      onRefresh={onRefresh}
      backgroundColor="#F5F7FA"
    >
        {/* Property Selector */}
        {properties.length > 1 && (
          <TouchableOpacity
            style={styles.propertySelector}
            activeOpacity={0.8}
            onPress={() => setShowPropertyPicker(true)}
          >
            <View style={styles.propertySelectorInfo}>
              <Text style={styles.propertySelectorLabel}>VIEWING</Text>
              <Text style={styles.propertySelectorName}>
                {selectedProperty === 'all' ? 'All Properties' : properties.find(p => p.id === selectedProperty)?.name}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}

        {/* Property Picker Modal */}
        <Modal
          visible={showPropertyPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPropertyPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPropertyPicker(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Property</Text>
                <TouchableOpacity onPress={() => setShowPropertyPicker(false)}>
                  <Ionicons name="close" size={24} color="#7F8C8D" />
                </TouchableOpacity>
              </View>

              {/* All Properties Option */}
              <TouchableOpacity
                style={[
                  styles.propertyOption,
                  selectedProperty === 'all' && styles.propertyOptionSelected
                ]}
                onPress={() => {
                  setSelectedProperty('all');
                  setShowPropertyPicker(false);
                }}
              >
                <View style={styles.propertyOptionIcon}>
                  <Ionicons name="grid-outline" size={20} color="#3498DB" />
                </View>
                <View style={styles.propertyOptionInfo}>
                  <Text style={styles.propertyOptionName}>All Properties</Text>
                  <Text style={styles.propertyOptionAddress}>{properties.length} properties</Text>
                </View>
                {selectedProperty === 'all' && (
                  <Ionicons name="checkmark-circle" size={22} color="#3498DB" />
                )}
              </TouchableOpacity>

              {/* Individual Properties */}
              <FlatList
                data={properties}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.propertyOption,
                      selectedProperty === item.id && styles.propertyOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedProperty(item.id);
                      setShowPropertyPicker(false);
                    }}
                  >
                    <View style={styles.propertyOptionIcon}>
                      <Ionicons name={getPropertyIcon(item.type)} size={20} color="#3498DB" />
                    </View>
                    <View style={styles.propertyOptionInfo}>
                      <Text style={styles.propertyOptionName}>{item.name}</Text>
                      <Text style={styles.propertyOptionAddress}>{item.address}</Text>
                    </View>
                    {selectedProperty === item.id && (
                      <Ionicons name="checkmark-circle" size={22} color="#3498DB" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Properties Section - Now First */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Properties ({properties.length})</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PropertyManagement')}>
            <Text style={styles.sectionLink}>Manage</Text>
          </TouchableOpacity>
        </View>

        {properties.map((property) => (
          <TouchableOpacity
            key={property.id}
            style={styles.propertyItem}
            onPress={() => handlePropertyPress(property)}
            activeOpacity={0.7}
          >
            <PropertyImage
              address={property.address}
              width={60}
              height={60}
              borderRadius={10}
            />
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyName}>{property.name}</Text>
              <Text style={styles.propertyAddress}>{property.address}</Text>
            </View>
            <View style={[
              styles.statusDot,
              { backgroundColor: property.issueCount === 0 ? '#2ECC71' : property.issueCount <= 2 ? '#F1C40F' : '#E74C3C' }
            ]} />
          </TouchableOpacity>
        ))}

        {/* Add Property Button */}
        <TouchableOpacity
          style={styles.addPropertyListBtn}
          onPress={() => navigation.navigate('AddProperty')}
        >
          <Ionicons name="add-circle-outline" size={20} color="#3498DB" />
          <Text style={styles.addPropertyListBtnText}>Add Another Property</Text>
        </TouchableOpacity>

        {/* Maintenance Requests Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>
            Maintenance ({filteredRequests.length})
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.sectionLink}>View All</Text>
          </TouchableOpacity>
        </View>

        {filteredRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="construct-outline" size={40} color="#3498DB" />
            <Text style={styles.emptyCardTitle}>No New Requests</Text>
            <Text style={styles.emptyCardSubtitle}>
              {selectedProperty === 'all'
                ? 'No active maintenance requests'
                : 'No maintenance requests for this property'}
            </Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => handleRequestPress(request)}
              activeOpacity={0.7}
            >
              <View style={[styles.requestPriority, { backgroundColor: getPriorityColor(request.priority) }]} />
              <View style={styles.requestContent}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestTitle}>{request.title}</Text>
                  <Text style={styles.requestTime}>{request.timeAgo}</Text>
                </View>
                <Text style={styles.requestLocation}>
                  {request.location} • {request.propertyName}
                </Text>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.requestBtnPrimary}
                    onPress={() => handleRespondPress(request)}
                  >
                    <Text style={styles.requestBtnPrimaryText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Messages Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Messages (0)</Text>
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate('LandlordMessages')}>
            <Text style={styles.sectionLink}>View All</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.emptyCard}
          onPress={() => navigation.getParent()?.navigate('LandlordMessages')}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubbles-outline" size={40} color="#3498DB" />
          <Text style={styles.emptyCardTitle}>No New Messages</Text>
          <Text style={styles.emptyCardSubtitle}>View and respond to tenant communications</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  // Property Selector
  propertySelector: {
    backgroundColor: '#3498DB',
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propertySelectorInfo: {
    flex: 1,
  },
  propertySelectorLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
  propertySelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  sectionLink: {
    fontSize: 13,
    color: '#3498DB',
    fontWeight: '500',
  },
  // Request Cards
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    paddingLeft: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  requestPriority: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
    minHeight: 48,
  },
  requestContent: {
    flex: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  requestTime: {
    fontSize: 11,
    color: '#95A5A6',
  },
  requestLocation: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 10,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestBtnPrimary: {
    backgroundColor: '#3498DB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  requestBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  requestBtnSecondary: {
    backgroundColor: '#F5F7FA',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  requestBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  // Empty State Card
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyCardSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  // Property Items
  propertyItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  propertyIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
  },
  propertyAddress: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  // Add Property Button
  addPropertyListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    marginTop: 4,
  },
  addPropertyListBtnText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  // Empty State for No Properties
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 24,
    textAlign: 'center',
  },
  addPropertyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  addPropertyBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacer: {
    height: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  propertyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  propertyOptionSelected: {
    backgroundColor: '#F0F8FF',
  },
  propertyOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  propertyOptionInfo: {
    flex: 1,
  },
  propertyOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
  },
  propertyOptionAddress: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
});

export default LandlordHomeScreen;

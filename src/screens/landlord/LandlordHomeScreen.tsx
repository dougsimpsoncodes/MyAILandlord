import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { useApiClient } from '../../services/api/client';
import { usePropertyDrafts } from '../../hooks/usePropertyDrafts';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { useAppState } from '../../context/AppStateContext';
import { log } from '../../lib/log';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { PropertyImage } from '../../components/shared/PropertyImage';
import { haptics } from '../../lib/haptics';
import { formatAddress } from '../../utils/helpers';
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';

type LandlordHomeNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'Home'>;

interface MaintenanceRequest {
  id: string;
  title: string;
  location: string;
  propertyId: string;
  propertyName: string;
  priority: 'urgent' | 'medium' | 'low';
  status: 'submitted' | 'pending' | 'in_progress' | 'completed';
  timeAgo: string;
}

interface PropertySummary {
  id: string;
  name: string;
  address: string;
  type: string;
  issueCount: number;
  tenantCount: number;
}

const LandlordHomeScreen = () => {
  const navigation = useNavigation<LandlordHomeNavigationProp>();
  const { user } = useUnifiedAuth();
  const api = useApiClient();
  const { supabase } = useSupabaseWithAuth();
  const { drafts, isLoading: isDraftsLoading } = usePropertyDrafts();
  const { unreadMessagesCount } = useAppState();

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
      if (!api || !supabase) return;

      // Load properties and maintenance requests together
      const userProperties = await api.getUserProperties();
      const maintenanceData = await api.getMaintenanceRequests({ limit: 20 });

      // Get tenant counts for all properties
      const propertyIds = userProperties.map((p: any) => p.id);
      let tenantCounts: Record<string, number> = {};

      if (propertyIds.length > 0) {
        const { data: tenantLinks, error: tenantError } = await supabase
          .from('tenant_property_links')
          .select('property_id')
          .in('property_id', propertyIds)
          .eq('is_active', true);

        if (!tenantError && tenantLinks) {
          // Count tenants per property
          tenantCounts = tenantLinks.reduce((acc: Record<string, number>, link: any) => {
            acc[link.property_id] = (acc[link.property_id] || 0) + 1;
            return acc;
          }, {});
        }
      }

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
          status: req.status || 'pending',
          timeAgo,
        };
      });

      // Filter to only active requests (not completed/cancelled)
      const filteredActiveRequests = mappedRequests.filter((r: any) => {
        const originalReq = maintenanceData.find((m: any) => m.id === r.id);
        return originalReq?.status !== 'completed' && originalReq?.status !== 'cancelled';
      });

      // Create property summaries with ACTIVE issue counts and tenant counts
      const summaries: PropertySummary[] = userProperties.map((p: any) => {
        // Format address from address_jsonb (preferred) or fall back to legacy address field
        let formattedAddress = '';
        if (p.address_jsonb) {
          const addr = p.address_jsonb;
          formattedAddress = `${addr.line1 || ''}${addr.line2 ? ', ' + addr.line2 : ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}`.trim();
        } else if (p.address) {
          formattedAddress = p.address;
        }

        return {
          id: p.id,
          name: p.name,
          address: formattedAddress,
          type: p.property_type || 'house',
          issueCount: filteredActiveRequests.filter(r => r.propertyId === p.id).length,
          tenantCount: tenantCounts[p.id] || 0,
        };
      });
      setProperties(summaries);
      setActiveRequests(filteredActiveRequests);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [api, supabase]);

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
        navigation.navigate('PropertyBasics', { draftId: incompleteDraft.id });
      } else if (incompleteDraft.currentStep === 2) {
        // Navigate with draft-only params - areas will be loaded from draft
        navigation.navigate('PropertyAssets', {
          draftId: incompleteDraft.id,
        });
      } else {
        // Navigate with draft-only params - propertyData and areas will be loaded from draft
        navigation.navigate('PropertyReview', {
          draftId: incompleteDraft.id,
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
    haptics.light();
    navigation.navigate('PropertyDetails', {
      propertyId: property.id,
    });
  };

  const handleRequestPress = (request: MaintenanceRequest) => {
    haptics.light();
    navigation.navigate('CaseDetail', { caseId: request.id });
  };

  // Empty state for new users with no properties
  if (!isLoading && properties.length === 0) {
    return (
      <ScreenContainer
        title="My AI Landlord"
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
              onPress={() => {
                haptics.medium();
                navigation.navigate('PropertyBasics');
              }}
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
      title="My AI Landlord"
      userRole="landlord"
      refreshing={refreshing}
      onRefresh={onRefresh}
      backgroundColor="#D6E1EA"
    >

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
                  haptics.selection();
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
                      haptics.selection();
                      setSelectedProperty(item.id);
                      setShowPropertyPicker(false);
                    }}
                  >
                    <View style={styles.propertyOptionIcon}>
                      <Ionicons name={getPropertyIcon(item.type)} size={20} color="#3498DB" />
                    </View>
                    <View style={styles.propertyOptionInfo}>
                      <Text style={styles.propertyOptionName}>{item.name}</Text>
                      <Text style={styles.propertyOptionAddress}>{formatAddress(item.address)}</Text>
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

        {/* Properties Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Properties ({properties.length})</Text>
            {properties.length > 1 && (
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => {
                  haptics.light();
                  setShowPropertyPicker(true);
                }}
              >
                <Text style={styles.filterText}>
                  {selectedProperty === 'all' ? 'All' : properties.find(p => p.id === selectedProperty)?.name}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#3498DB" />
              </TouchableOpacity>
            )}
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
              <Text style={styles.propertyAddress}>
                {formatAddress(property.address)} • {property.tenantCount} {property.tenantCount === 1 ? 'Tenant' : 'Tenants'}
              </Text>
            </View>
            <View style={[
              styles.statusDot,
              { backgroundColor: property.issueCount === 0 ? '#2ECC71' : property.issueCount <= 2 ? '#F1C40F' : '#E74C3C' }
            ]} />
          </TouchableOpacity>
          ))}
        </View>

        {/* Maintenance Requests Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Maintenance ({filteredRequests.length})</Text>
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
              <View style={styles.requestHeader}>
                <Text style={styles.requestTitle}>{request.title}</Text>
                <View style={styles.requestHeaderRight}>
                  {request.status === 'submitted' && (
                    <Text style={styles.requestTime}>{request.timeAgo}</Text>
                  )}
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: request.status === 'submitted' ? '#E74C3C' : '#F39C12' }
                  ]} />
                </View>
              </View>
              <Text style={styles.requestLocation}>
                {request.location} • {request.propertyName}
              </Text>
            </TouchableOpacity>
          ))
        )}
        </View>

        {/* Messages Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Messages ({unreadMessagesCount})</Text>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('LandlordMessages')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

        <TouchableOpacity
          style={[styles.emptyCard, unreadMessagesCount > 0 && styles.highlightCard]}
          onPress={() => navigation.getParent()?.navigate('LandlordMessages')}
          activeOpacity={0.7}
        >
          <View style={unreadMessagesCount > 0 ? styles.badgeContainer : undefined}>
            <Ionicons name="chatbubbles-outline" size={40} color={unreadMessagesCount > 0 ? '#2ECC71' : '#3498DB'} />
            {unreadMessagesCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadMessagesCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.emptyCardTitle}>
            {unreadMessagesCount > 0 ? `${unreadMessagesCount} New Message${unreadMessagesCount > 1 ? 's' : ''}` : 'No New Messages'}
          </Text>
          <Text style={styles.emptyCardSubtitle}>
            {unreadMessagesCount > 0 ? 'Tap to view and respond' : 'View and respond to tenant communications'}
          </Text>
        </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  // Filter Button (in section header)
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF5FB',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  filterText: {
    fontSize: 13,
    color: '#3498DB',
    fontWeight: '500',
  },
  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  // Request Cards
  requestCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  requestTime: {
    fontSize: 11,
    color: '#95A5A6',
  },
  requestHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestLocation: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  // Empty State Card
  emptyCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 24,
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
  highlightCard: {
    backgroundColor: '#FFF5F5',
    marginHorizontal: -16,
    marginBottom: -16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  badgeContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Property Items
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
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
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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

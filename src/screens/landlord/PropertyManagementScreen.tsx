import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { usePropertyDrafts } from '../../hooks/usePropertyDrafts';
import { PropertySetupState } from '../../types/property';
import { formatAddressString } from '../../utils/addressValidation';

type PropertyManagementNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'PropertyManagement'>;

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  image: string;
  tenants: number;
  activeRequests: number;
}

const PropertyManagementScreen = () => {
  const navigation = useNavigation<PropertyManagementNavigationProp>();
  
  // Mock data for now
  const [properties, setProperties] = useState<Property[]>([
    {
      id: '1',
      name: 'Sunset Apartments Unit 4B',
      address: '123 Main St, Apt 4B',
      type: 'Apartment',
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80',
      tenants: 1,
      activeRequests: 2,
    },
    {
      id: '2',
      name: 'Downtown Condo',
      address: '456 City Center Dr',
      type: 'Condo',
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80',
      tenants: 2,
      activeRequests: 0,
    },
  ]);

  // Draft management
  const {
    drafts,
    isLoading: isDraftsLoading,
    error: draftsError,
    refreshDrafts,
    deleteDraft,
    clearAllDrafts,
  } = usePropertyDrafts();

  const [refreshing, setRefreshing] = useState(false);

  const handleAddProperty = () => {
    navigation.navigate('AddProperty');
  };

  const handlePropertyPress = (property: Property) => {
    // TODO: Navigate to property details
    // Navigate to property details
  };

  const handleDraftPress = (draft: PropertySetupState) => {
    // Navigate to the appropriate screen based on current step
    if (draft.currentStep === 0 || draft.currentStep === 1) {
      navigation.navigate('AddProperty', { draftId: draft.id });
    } else if (draft.currentStep === 2) {
      navigation.navigate('PropertyAreas', { 
        propertyData: draft.propertyData, 
        draftId: draft.id 
      });
    } else {
      // For steps 3+, go to AddProperty for now
      navigation.navigate('AddProperty', { draftId: draft.id });
    }
  };

  const handleDeleteDraft = async (draft: PropertySetupState) => {
    Alert.alert(
      'Delete Draft',
      `Are you sure you want to delete the draft for "${draft.propertyData.name || 'Untitled Property'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDraft(draft.id);
              Alert.alert('Success', 'Draft deleted successfully.');
            } catch (error) {
              // Error already shown in alert
              Alert.alert('Error', 'Failed to delete draft. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleClearAllDrafts = async () => {
    if (drafts.length === 0) return;
    
    Alert.alert(
      'Clear All Drafts',
      `Are you sure you want to delete all ${drafts.length} drafts? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllDrafts();
              Alert.alert('Success', 'All drafts cleared successfully.');
            } catch (error) {
              // Error already shown in alert
              Alert.alert('Error', 'Failed to clear drafts. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshDrafts();
    } catch (error) {
      // Silently fail refresh
    } finally {
      setRefreshing(false);
    }
  };

  const formatLastModified = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#95A5A6';
      case 'in_progress': return '#3498DB';
      case 'completed': return '#2ECC71';
      default: return '#95A5A6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return 'Draft';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Management</Text>
        <TouchableOpacity onPress={handleAddProperty}>
          <Ionicons name="add" size={24} color="#3498DB" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3498DB']}
            tintColor="#3498DB"
          />
        }
      >
        {/* Drafts Section */}
        {drafts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="document-text" size={20} color="#3498DB" />
                <Text style={styles.sectionTitle}>Property Drafts</Text>
                <View style={styles.draftCount}>
                  <Text style={styles.draftCountText}>{drafts.length}</Text>
                </View>
              </View>
              {drafts.length > 1 && (
                <TouchableOpacity onPress={handleClearAllDrafts}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.draftsList}>
              {drafts.map((draft) => (
                <TouchableOpacity
                  key={draft.id}
                  style={styles.draftCard}
                  onPress={() => handleDraftPress(draft)}
                  activeOpacity={0.7}
                >
                  <View style={styles.draftHeader}>
                    <View style={styles.draftInfo}>
                      <Text style={styles.draftName}>
                        {draft.propertyData.name || 'Untitled Property'}
                      </Text>
                      <Text style={styles.draftAddress}>
                        {typeof draft.propertyData.address === 'string' 
                          ? draft.propertyData.address 
                          : draft.propertyData.address.line1 
                            ? formatAddressString(draft.propertyData.address)
                            : 'No address entered'
                        }
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteDraftButton}
                      onPress={() => handleDeleteDraft(draft)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.draftStatus}>
                    <View style={styles.draftStatusInfo}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(draft.status) }]} />
                      <Text style={styles.statusText}>{getStatusText(draft.status)}</Text>
                      <Text style={styles.completionText}>
                        {draft.completionPercentage}% complete
                      </Text>
                    </View>
                    <Text style={styles.draftTime}>
                      {formatLastModified(new Date(draft.lastModified))}
                    </Text>
                  </View>
                  
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${draft.completionPercentage}%`,
                          backgroundColor: getStatusColor(draft.status)
                        }
                      ]} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Properties Count */}
        <View style={styles.countSection}>
          <Text style={styles.countText}>{properties.length} Properties</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={20} color="#7F8C8D" />
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Properties List */}
        <View style={styles.propertiesList}>
          {properties.map((property) => (
            <TouchableOpacity
              key={property.id}
              style={styles.propertyCard}
              onPress={() => handlePropertyPress(property)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: property.image }} style={styles.propertyImage} />
              <View style={styles.propertyInfo}>
                <Text style={styles.propertyName}>{property.name}</Text>
                <Text style={styles.propertyAddress}>{property.address}</Text>
                
                <View style={styles.propertyStats}>
                  <View style={styles.stat}>
                    <Ionicons name="people" size={16} color="#7F8C8D" />
                    <Text style={styles.statText}>{property.tenants} Tenant{property.tenants !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="construct" size={16} color={property.activeRequests > 0 ? '#E74C3C' : '#2ECC71'} />
                    <Text style={[styles.statText, property.activeRequests > 0 && styles.alertText]}>
                      {property.activeRequests} Active Request{property.activeRequests !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Add Property Button */}
        <TouchableOpacity style={styles.addPropertyButton} onPress={handleAddProperty}>
          <View style={styles.addIconCircle}>
            <Ionicons name="add" size={32} color="#3498DB" />
          </View>
          <View style={styles.addButtonContent}>
            <Text style={styles.addButtonTitle}>Add New Property</Text>
            <Text style={styles.addButtonSubtitle}>Set up a property with areas and assets</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#3498DB" />
        </TouchableOpacity>

        {/* Empty State (shown when no properties) */}
        {properties.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="business" size={48} color="#BDC3C7" />
            </View>
            <Text style={styles.emptyTitle}>No Properties Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first property to start managing maintenance requests and tenants.
            </Text>
            <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddProperty}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyAddButtonText}>Add Your First Property</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  content: {
    flex: 1,
  },
  countSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  propertiesList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  propertyCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 12,
  },
  propertyImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  propertyStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  alertText: {
    color: '#E74C3C',
    fontWeight: '500',
  },
  addPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3498DB',
    borderStyle: 'dashed',
  },
  addIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addButtonContent: {
    flex: 1,
  },
  addButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498DB',
    marginBottom: 2,
  },
  addButtonSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F3F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyAddButton: {
    flexDirection: 'row',
    backgroundColor: '#3498DB',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    backgroundColor: '#FFFFFF',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  draftCount: {
    backgroundColor: '#3498DB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  draftCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clearAllText: {
    fontSize: 14,
    color: '#E74C3C',
    fontWeight: '500',
  },
  draftsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  draftCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  draftInfo: {
    flex: 1,
    marginRight: 12,
  },
  draftName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  draftAddress: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  deleteDraftButton: {
    padding: 4,
  },
  draftStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  draftStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2C3E50',
  },
  completionText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  draftTime: {
    fontSize: 12,
    color: '#95A5A6',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default PropertyManagementScreen;
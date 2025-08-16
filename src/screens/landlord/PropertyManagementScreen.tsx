import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { usePropertyDrafts } from '../../hooks/usePropertyDrafts';
import { PropertySetupState } from '../../types/property';
import { formatAddressString } from '../../utils/addressValidation';
import DeleteButton from '../../components/shared/DeleteButton';
import { DataClearer } from '../../utils/dataClearer';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import { DesignSystem } from '../../theme/DesignSystem';
import { getUserProperties } from '../../clients/ClerkSupabaseClient';

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
  
  // Properties will be loaded from backend/database
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);

  // Load properties on screen mount and when screen is focused
  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setIsLoadingProperties(true);
      const dbProperties = await getUserProperties();
      
      // Map database properties to screen interface
      const mappedProperties = dbProperties.map((prop: any) => ({
        id: prop.id,
        name: prop.name || 'Unnamed Property',
        address: prop.address || 'No Address',
        type: prop.property_type || 'Unknown',
        image: '', // TODO: Add property image support
        tenants: 0, // TODO: Add tenant count
        activeRequests: 0, // TODO: Add maintenance request count
      }));
      
      setProperties(mappedProperties);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setIsLoadingProperties(false);
    }
  };

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
    navigation.navigate('PropertyDetails', { property });
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
    const startTime = Date.now();
    console.log('Property draft delete executing:', {
      draftId: draft.id,
      propertyName: draft.propertyData.name || 'Untitled',
      completionPercentage: draft.completionPercentage,
      currentStep: draft.currentStep,
      lastModified: draft.lastModified,
      platform: Platform.OS,
      timestamp: new Date().toISOString()
    });
    
    try {
      await deleteDraft(draft.id);
      const duration = Date.now() - startTime;
      
      console.log('Property draft delete successful:', {
        draftId: draft.id,
        duration: `${duration}ms`,
        remainingDrafts: drafts.length - 1
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('Property draft delete failed:', {
        draftId: draft.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      Alert.alert('Error', 'Failed to delete draft. Please try again.');
    }
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

  const handleClearAllAppData = async () => {
    Alert.alert(
      'Clear All App Data',
      'This will remove ALL data from the app including drafts, cache, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const stats = await DataClearer.getStorageStats();
              console.log('Storage before clear:', stats);
              
              await DataClearer.clearAllData();
              await refreshDrafts(); // Refresh the drafts list
              
              Alert.alert('Success', 'All app data cleared successfully.');
            } catch (error) {
              console.error('Failed to clear app data:', error);
              Alert.alert('Error', 'Failed to clear app data. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshDrafts(),
        loadProperties()
      ]);
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
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Management</Text>
        <View style={styles.headerActions}>
          <Button
            title="Clear Data"
            onPress={handleClearAllAppData}
            type="danger"
            size="sm"
            icon={<Ionicons name="refresh" size={16} color={DesignSystem.colors.dangerText} />}
          />
          <TouchableOpacity onPress={handleAddProperty} activeOpacity={0.7} style={styles.addIconButton}>
            <Ionicons name="add" size={24} color={DesignSystem.colors.primary} />
          </TouchableOpacity>
        </View>
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
                <TouchableOpacity onPress={handleClearAllDrafts} activeOpacity={0.7}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.draftsList}>
              {drafts.map((draft) => (
                <View
                  key={draft.id}
                  style={styles.draftCardContainer}
                >
                  <Card style={{ flex: 1 }}>
                    <TouchableOpacity
                      onPress={() => handleDraftPress(draft)}
                      activeOpacity={0.7}
                      style={styles.draftCard}
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
                  </Card>
                  
                  {/* Enhanced delete button with undo functionality */}
                  <DeleteButton
                    onDelete={() => handleDeleteDraft(draft)}
                    itemName={`${draft.propertyData.name || 'Untitled Property'} draft`}
                    experimentEnabled={true}
                    iconOnly={true}
                    style={styles.deleteDraftButton}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Properties Count */}
        <View style={styles.countSection}>
          <Text style={styles.countText}>{properties.length} Properties</Text>
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
            <Ionicons name="filter" size={20} color="#7F8C8D" />
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Properties List */}
        <View style={styles.propertiesList}>
          {properties.map((property) => (
            <Card key={property.id} style={styles.propertyCard}>
              <TouchableOpacity
                onPress={() => handlePropertyPress(property)}
                activeOpacity={0.7}
                style={styles.propertyCardContent}
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
            </Card>
          ))}
        </View>

        {/* Add Property Button */}
        <Card style={styles.addPropertyButton}>
          <TouchableOpacity 
            onPress={handleAddProperty} 
            activeOpacity={0.7}
            style={styles.addPropertyButtonContent}
          >
            <View style={styles.addIconCircle}>
              <Ionicons name="add" size={32} color={DesignSystem.colors.primary} />
            </View>
            <View style={styles.addButtonContent}>
              <Text style={styles.addButtonTitle}>Add New Property</Text>
              <Text style={styles.addButtonSubtitle}>Set up a property with areas and assets</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={DesignSystem.colors.primary} />
          </TouchableOpacity>
        </Card>

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
            <Button
              title="Add Your First Property"
              onPress={handleAddProperty}
              type="primary"
              size="lg"
              fullWidth
              icon={<Ionicons name="add" size={20} color={DesignSystem.colors.primaryText} />}
            />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clearDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearDataText: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '500',
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
  draftCardContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  draftCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    
    
    
    
    elevation: 1,
    padding: 16,
  },
  draftHeader: {
    marginBottom: 12,
    paddingRight: 50, // Add space for absolutely positioned delete button
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
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1000,
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
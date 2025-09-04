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
  Dimensions,
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
import { getUserProperties, deleteProperty } from '../../clients/ClerkSupabaseClient';

const { width: screenWidth } = Dimensions.get('window');

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
  const [draftsCollapsed, setDraftsCollapsed] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
        address: typeof prop.address === 'string' 
          ? prop.address 
          : prop.address 
            ? formatAddressString(prop.address)
            : 'No Address',
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

  const handleInviteTenant = async (property: Property) => {
    // Simply navigate with property ID - no need for property code anymore
    navigation.navigate('InviteTenant', {
      propertyId: property.id,
      propertyName: property.name,
    });
  };

  const handleToggleSelect = (propertyId: string) => {
    const newSelected = new Set(selectedProperties);
    if (newSelected.has(propertyId)) {
      newSelected.delete(propertyId);
    } else {
      newSelected.add(propertyId);
    }
    setSelectedProperties(newSelected);
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
          {properties.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                setIsDeleteMode(!isDeleteMode);
                setSelectedProperties(new Set());
              }} 
              activeOpacity={0.7} 
              style={styles.deleteIconButton}
            >
              <Ionicons 
                name={isDeleteMode ? "close" : "trash-outline"} 
                size={22} 
                color={isDeleteMode ? "#E74C3C" : "#7F8C8D"} 
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleAddProperty} activeOpacity={0.7} style={styles.addIconButton}>
            <Ionicons name="add" size={24} color={DesignSystem.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Action Bar */}
      {isDeleteMode && selectedProperties.size > 0 && (
        <View style={styles.deleteActionBar}>
          <Text style={styles.deleteActionText}>
            {selectedProperties.size} selected
          </Text>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={async () => {
              const count = selectedProperties.size;
              const propertyNames = properties
                .filter(p => selectedProperties.has(p.id))
                .map(p => p.name)
                .join(', ');
              
              // Show custom modal instead of system popup
              setShowDeleteModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

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
        {/* Drafts Section - Compact */}
        {drafts.length > 0 && (
          <View style={styles.draftsContainer}>
            <TouchableOpacity 
              style={styles.draftsHeader}
              onPress={() => setDraftsCollapsed(!draftsCollapsed)}
              activeOpacity={0.7}
            >
              <View style={styles.draftsHeaderLeft}>
                <Ionicons 
                  name={draftsCollapsed ? "chevron-forward" : "chevron-down"} 
                  size={16} 
                  color="#7F8C8D" 
                />
                <Text style={styles.draftsTitle}>Drafts ({drafts.length})</Text>
              </View>
              {drafts.length > 1 && (
                <TouchableOpacity onPress={handleClearAllDrafts} activeOpacity={0.7}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {!draftsCollapsed && (
              <View style={styles.draftsList}>
                {drafts.map((draft) => (
                  <TouchableOpacity
                    key={draft.id}
                    style={styles.draftItem}
                    onPress={() => handleDraftPress(draft)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.draftItemContent}>
                      <View style={styles.draftItemLeft}>
                        <Text style={styles.draftItemName} numberOfLines={1}>
                          {draft.propertyData.name || 'Untitled'}
                        </Text>
                        <View style={styles.draftItemMeta}>
                          <View style={[styles.draftDot, { backgroundColor: getStatusColor(draft.status) }]} />
                          <Text style={styles.draftItemStatus}>{draft.completionPercentage}%</Text>
                          <Text style={styles.draftItemTime}>{formatLastModified(new Date(draft.lastModified))}</Text>
                        </View>
                      </View>
                      <DeleteButton
                        onDelete={() => handleDeleteDraft(draft)}
                        itemName={`${draft.propertyData.name || 'Untitled Property'} draft`}
                        experimentEnabled={true}
                        iconOnly={true}
                        style={styles.draftDeleteBtn}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Properties Header */}
        <View style={styles.propertiesHeader}>
          <Text style={styles.propertiesTitle}>Properties ({properties.length})</Text>
        </View>

        {/* Properties Grid */}
        <View style={styles.propertiesGrid}>
          {properties.map((property) => (
            <TouchableOpacity
              key={property.id}
              style={[
                styles.propertyCard,
                isDeleteMode && selectedProperties.has(property.id) && styles.selectedCard
              ]}
              onPress={() => isDeleteMode ? handleToggleSelect(property.id) : handlePropertyPress(property)}
              activeOpacity={0.7}
            >
              {isDeleteMode && (
                <View style={styles.selectionIndicator}>
                  <Ionicons 
                    name={selectedProperties.has(property.id) ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={selectedProperties.has(property.id) ? "#E74C3C" : "#BDC3C7"} 
                  />
                </View>
              )}
              
              <View style={styles.propertyCardInner}>
                <Text style={styles.propertyName} numberOfLines={1}>{property.name}</Text>
                <Text style={styles.propertyAddress} numberOfLines={2}>
                  {property.address}
                </Text>
                
                <View style={styles.propertyStats}>
                  <View style={styles.stat}>
                    <Ionicons name="people-outline" size={14} color="#7F8C8D" />
                    <Text style={styles.statText}>{property.tenants}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons 
                      name="build-outline" 
                      size={14} 
                      color={property.activeRequests > 0 ? '#E74C3C' : '#27AE60'} 
                    />
                    <Text style={[styles.statText, property.activeRequests > 0 && styles.alertText]}>
                      {property.activeRequests}
                    </Text>
                  </View>
                </View>
                
                {!isDeleteMode && (
                  <TouchableOpacity 
                    style={styles.inviteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleInviteTenant(property);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person-add-outline" size={14} color="#007AFF" />
                    <Text style={styles.inviteText}>Invite Tenant</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
          
          {/* Add Property Card */}
          <TouchableOpacity
            style={[styles.propertyCard, styles.addCard]}
            onPress={handleAddProperty}
            activeOpacity={0.7}
          >
            <View style={styles.addCardContent}>
              <Ionicons name="add-circle-outline" size={32} color="#3498DB" />
              <Text style={styles.addCardText}>Add Property</Text>
            </View>
          </TouchableOpacity>
        </View>


        {/* Empty State */}
        {properties.length === 0 && drafts.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={48} color="#BDC3C7" />
            <Text style={styles.emptyTitle}>No Properties Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first property to get started
            </Text>
            <TouchableOpacity 
              style={styles.emptyAddBtn}
              onPress={handleAddProperty}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyAddText}>Add Property</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Custom Delete Modal */}
      {showDeleteModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Properties</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete {selectedProperties.size} property(ies)?
            </Text>
            <Text style={styles.modalPropertyNames}>
              {properties
                .filter(p => selectedProperties.has(p.id))
                .map(p => p.name)
                .join(', ')}
            </Text>
            <Text style={styles.modalWarning}>
              This action cannot be undone.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalDeleteButton}
                onPress={async () => {
                  setShowDeleteModal(false);
                  try {
                    const count = selectedProperties.size;
                    const ids = Array.from(selectedProperties);
                    await Promise.all(ids.map(id => deleteProperty(id)));
                    
                    setSelectedProperties(new Set());
                    setIsDeleteMode(false);
                    await loadProperties();
                    
                    // Show success with custom modal or simple alert
                    Alert.alert('Success', `${count} property(ies) deleted successfully.`);
                  } catch (error) {
                    console.error('Delete failed:', error);
                    Alert.alert('Error', 'Failed to delete properties. Please try again.');
                  }
                }}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addIconButton: {
    padding: 4,
  },
  deleteIconButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  
  // Drafts Section - Compact
  draftsContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  draftsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8F9FA',
  },
  draftsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
  },
  clearAllText: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '500',
  },
  draftsList: {
    maxHeight: 120,
  },
  draftItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
  },
  draftItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftItemLeft: {
    flex: 1,
  },
  draftItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 2,
  },
  draftItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  draftItemStatus: {
    fontSize: 11,
    color: '#7F8C8D',
  },
  draftItemTime: {
    fontSize: 11,
    color: '#95A5A6',
  },
  draftDeleteBtn: {
    padding: 4,
  },

  // Properties Section
  propertiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  propertiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  deleteSelectedBtn: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteSelectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Grid Layout
  propertiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  propertyCard: {
    width: (screenWidth - 36) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    margin: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 2,
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#E74C3C',
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  propertyCardContent: {
    flex: 1,
  },
  propertyCardInner: {
    flex: 1,
  },
  propertyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
    lineHeight: 16,
    minHeight: 32,
  },
  propertyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F3F5',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7F8C8D',
  },
  alertText: {
    color: '#E74C3C',
  },
  
  // Add Card
  addCard: {
    borderStyle: 'dashed',
    borderColor: '#3498DB',
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardContent: {
    alignItems: 'center',
    gap: 8,
  },
  addCardText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3498DB',
  },
  addPropertyButtonContent: {
    flex: 1,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
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
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    backgroundColor: '#3498DB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    gap: 8,
  },
  emptyAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Delete Action Bar
  deleteActionBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteActionText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Custom Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    minWidth: 280,
    maxWidth: Platform.OS === 'web' ? 360 : 400,
    width: Platform.OS === 'web' ? 'auto' : '90%',
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)',
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalPropertyNames: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalWarning: {
    fontSize: 12,
    color: '#E74C3C',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BDC3C7',
    backgroundColor: '#FFFFFF',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    textAlign: 'center',
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#E74C3C',
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  
  // Invite Button
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 8,
    gap: 4,
  },
  inviteText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
});

export default PropertyManagementScreen;
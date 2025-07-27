import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import { PropertyData, PropertyArea, InventoryItem, AssetCondition } from '../../types/property';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';

type PropertyReviewNavigationProp = NativeStackNavigationProp<LandlordStackParamList>;
type PropertyReviewRouteProp = RouteProp<LandlordStackParamList, 'PropertyReview'>;

const PropertyReviewScreen = () => {
  const navigation = useNavigation<PropertyReviewNavigationProp>();
  const route = useRoute<PropertyReviewRouteProp>();
  const { propertyData, areas, draftId } = route.params;

  // Initialize draft management
  const {
    draftState,
    isLoading: isDraftLoading,
    isSaving,
    lastSaved,
    error: draftError,
    updateCurrentStep,
    saveDraft,
    deleteDraft,
    clearError,
  } = usePropertyDraft({ 
    draftId,
    enableAutoSave: true,
    autoSaveDelay: 2000 
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set current step to 4 (review step)
  useEffect(() => {
    if (draftState && draftState.currentStep !== 4) {
      updateCurrentStep(4);
    }
  }, [draftState?.currentStep, updateCurrentStep]);

  // Handle draft error display
  useEffect(() => {
    if (draftError) {
      Alert.alert('Auto-save Error', draftError, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [draftError, clearError]);

  const totalAssets = areas.reduce((total, area) => total + (area.assets || []).length, 0);
  const areasWithAssets = areas.filter(area => (area.assets || []).length > 0);

  const handleEdit = (section: 'property' | 'areas' | 'assets') => {
    switch (section) {
      case 'property':
        navigation.navigate('AddProperty', { draftId });
        break;
      case 'areas':
        navigation.navigate('PropertyAreas', { propertyData, draftId });
        break;
      case 'assets':
        navigation.navigate('PropertyAssets', { propertyData, areas, draftId });
        break;
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || isDraftLoading) return;
    
    try {
      setIsSubmitting(true);
      
      // Save final state
      if (draftState) {
        await saveDraft();
      }

      // TODO: Submit to Supabase
      // This would create the actual property record and all related data
      
      Alert.alert(
        'Property Added Successfully!',
        'Your property has been added to your portfolio.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Clean up draft
              if (draftState) {
                await deleteDraft();
              }
              // Navigate back to property management
              navigation.navigate('PropertyManagement');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit property. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConditionColor = (condition: AssetCondition) => {
    switch (condition) {
      case AssetCondition.EXCELLENT:
        return '#2ECC71';
      case AssetCondition.GOOD:
        return '#3498DB';
      case AssetCondition.FAIR:
        return '#F39C12';
      case AssetCondition.POOR:
        return '#E74C3C';
      case AssetCondition.NEEDS_REPLACEMENT:
        return '#8E44AD';
      default:
        return '#7F8C8D';
    }
  };

  const renderAssetItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.assetItem}>
      <View style={styles.assetInfo}>
        <Text style={styles.assetName}>{item.name}</Text>
        <Text style={styles.assetDetails}>
          {item.brand && item.model ? `${item.brand} ${item.model}` : item.category}
        </Text>
        <View style={[styles.conditionBadge, { backgroundColor: getConditionColor(item.condition) }]}>
          <Text style={styles.conditionText}>
            {item.condition.charAt(0).toUpperCase() + item.condition.slice(1).replace('_', ' ')}
          </Text>
        </View>
      </View>
      <View style={styles.assetMeta}>
        <View style={styles.photoCount}>
          <Ionicons name="camera" size={14} color="#7F8C8D" />
          <Text style={styles.photoCountText}>{item.photos.length}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Review Property</Text>
          {(isSaving || lastSaved) && (
            <View style={styles.saveStatus}>
              {isSaving ? (
                <>
                  <Ionicons name="sync" size={12} color="#3498DB" />
                  <Text style={styles.saveStatusText}>Saving...</Text>
                </>
              ) : lastSaved ? (
                <>
                  <Ionicons name="checkmark-circle" size={12} color="#2ECC71" />
                  <Text style={styles.saveStatusText}>
                    Saved {new Date(lastSaved).toLocaleTimeString()}
                  </Text>
                </>
              ) : null}
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('PropertyManagement')}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '80%' }]} />
        </View>
        <Text style={styles.progressText}>Step 4 of 5: Review & Submit</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Property Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Property Information</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEdit('property')}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.propertyCard}>
            <Text style={styles.propertyName}>{propertyData.name}</Text>
            <Text style={styles.propertyAddress}>
              {propertyData.address.line1}
              {propertyData.address.line2 && `, ${propertyData.address.line2}`}
              {'\n'}{propertyData.address.city}, {propertyData.address.state} {propertyData.address.zipCode}
            </Text>
            <View style={styles.propertyMeta}>
              <View style={styles.propertyMetaItem}>
                <Text style={styles.propertyMetaLabel}>Type</Text>
                <Text style={styles.propertyMetaValue}>{propertyData.type}</Text>
              </View>
              {propertyData.bedrooms && (
                <View style={styles.propertyMetaItem}>
                  <Text style={styles.propertyMetaLabel}>Bedrooms</Text>
                  <Text style={styles.propertyMetaValue}>{propertyData.bedrooms}</Text>
                </View>
              )}
              {propertyData.bathrooms && (
                <View style={styles.propertyMetaItem}>
                  <Text style={styles.propertyMetaLabel}>Bathrooms</Text>
                  <Text style={styles.propertyMetaValue}>{propertyData.bathrooms}</Text>
                </View>
              )}
            </View>
            {propertyData.photos && propertyData.photos.length > 0 && (
              <View style={styles.photoGrid}>
                {propertyData.photos.slice(0, 4).map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.propertyPhoto} />
                ))}
                {propertyData.photos.length > 4 && (
                  <View style={styles.morePhotos}>
                    <Text style={styles.morePhotosText}>+{propertyData.photos.length - 4}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Areas & Assets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Areas & Assets</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEdit('assets')}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Areas</Text>
              <Text style={styles.summaryValue}>{areas.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Areas with Assets</Text>
              <Text style={styles.summaryValue}>{areasWithAssets.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Assets</Text>
              <Text style={styles.summaryValue}>{totalAssets}</Text>
            </View>
          </View>

          {areas.map((area) => (
            <View key={area.id} style={styles.areaCard}>
              <View style={styles.areaHeader}>
                <View>
                  <Text style={styles.areaName}>{area.name}</Text>
                  <Text style={styles.areaType}>{area.type}</Text>
                </View>
                <View style={styles.areaStats}>
                  <Text style={styles.areaAssetCount}>
                    {(area.assets || []).length} assets
                  </Text>
                  {area.photos && area.photos.length > 0 && (
                    <View style={styles.areaPhotoCount}>
                      <Ionicons name="camera" size={14} color="#7F8C8D" />
                      <Text style={styles.areaPhotoCountText}>{area.photos.length}</Text>
                    </View>
                  )}
                </View>
              </View>
              
              {area.assets && area.assets.length > 0 && (
                <FlatList
                  data={area.assets}
                  renderItem={renderAssetItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.assetSeparator} />}
                />
              )}
            </View>
          ))}
        </View>

        {/* Completion Summary */}
        <View style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#2ECC71" />
            <Text style={styles.completionTitle}>Ready to Submit</Text>
          </View>
          <Text style={styles.completionText}>
            Your property setup is complete with {areas.length} areas and {totalAssets} assets inventoried.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={saveDraft}
          disabled={isSaving || isDraftLoading}
        >
          <Ionicons 
            name={isSaving ? "sync" : "bookmark-outline"} 
            size={18} 
            color={isSaving ? "#007AFF" : "#8E8E93"} 
          />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.submitButton, 
            (isSubmitting || isDraftLoading) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || isDraftLoading}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Add Property'}
          </Text>
        </TouchableOpacity>
      </View>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  saveStatusText: {
    fontSize: 11,
    color: '#7F8C8D',
  },
  cancelText: {
    fontSize: 16,
    color: '#E74C3C',
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498DB',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  editButton: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 12,
  },
  propertyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  propertyMetaItem: {
    flex: 1,
    minWidth: 80,
  },
  propertyMetaLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  propertyMetaValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
    marginTop: 2,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  propertyPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  morePhotos: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  morePhotosText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  areaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  areaType: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  areaStats: {
    alignItems: 'flex-end',
  },
  areaAssetCount: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  areaPhotoCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  areaPhotoCountText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
  },
  assetDetails: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  conditionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  conditionText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  assetMeta: {
    alignItems: 'flex-end',
  },
  photoCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoCountText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  assetSeparator: {
    height: 1,
    backgroundColor: '#F8F9FA',
    marginVertical: 4,
  },
  completionCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2ECC71',
  },
  completionText: {
    fontSize: 14,
    color: '#27AE60',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    gap: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#C7C7CC',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
});

export default PropertyReviewScreen;
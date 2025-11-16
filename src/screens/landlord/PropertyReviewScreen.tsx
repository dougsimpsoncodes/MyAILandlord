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
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import { DesignSystem } from '../../theme/DesignSystem';
import { useApiClient } from '../../services/api/client';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import { supabase } from '../../lib/supabaseClient';

type PropertyReviewNavigationProp = NativeStackNavigationProp<LandlordStackParamList>;
type PropertyReviewRouteProp = RouteProp<LandlordStackParamList, 'PropertyReview'>;

const PropertyReviewScreen = () => {
  const navigation = useNavigation<PropertyReviewNavigationProp>();
  const route = useRoute<PropertyReviewRouteProp>();
  const { propertyData, areas, draftId } = route.params;
  const api = useApiClient();

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
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

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
    console.log('🚨🚨🚨 handleSubmit called! State:', { isSubmitting, isDraftLoading });
    
    if (isSubmitting || isDraftLoading) {
      console.log('🚨 Exiting handleSubmit due to loading conditions:', { isSubmitting, isDraftLoading });
      return;
    }

    
    try {
      setIsSubmitting(true);
      
      // Ensure API is ready
      if (!api) throw new Error('Authentication required');
      
      if (draftState) await saveDraft();

      const propertyPayload = {
        name: propertyData.name,
        address_jsonb: propertyData.address,
        property_type: propertyData.type,
        unit: propertyData.unit || '',
        bedrooms: propertyData.bedrooms || 0,
        bathrooms: propertyData.bathrooms || 0
      };
      
      console.log('🏠 Submitting property with payload:', propertyPayload);
      const newProperty = await api.createProperty(propertyPayload);
      console.log('🏠 Property created successfully:', newProperty);
      
      // Create area records
      if (areas && areas.length > 0) {
        const areaRecords = areas.map(area => ({
          property_id: newProperty.id,
          name: area.name,
          area_type: area.type,
          photos: area.photos || []
        }));
        
        try {
          await api.createPropertyAreas(areaRecords);
        } catch (areasError) {
          console.error('Error creating areas:', areasError);
          // Continue anyway - areas are not critical
        }
      }
      
      console.log('🏠 Property submission complete');
      
      // Show success state
      setSubmissionSuccess(true);
      setIsSubmitting(false);
      
      // Clean up draft
      try {
        if (draftState) {
          await deleteDraft();
        }
      } catch (error) {
        console.error('🏠 Error cleaning up draft:', error);
      }
      
      // Navigate to PropertyManagement after 2 seconds
      setTimeout(() => {
        navigation.navigate('PropertyManagement');
      }, 2000);
    } catch (error) {
      console.error('🏠 PropertyReviewScreen: Submit error:', error);
      setIsSubmitting(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('Authentication') || errorMessage.includes('token')) {
        Alert.alert(
          'Authentication Error', 
          'Please sign out and sign back in to refresh your authentication, then try again.',
          [
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert(
          'Error', 
          `Failed to submit property: ${errorMessage}\n\nPlease check your internet connection and try again.`,
          [
            { text: 'OK' }
          ]
        );
      }
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

  // Test logging on every render (centralized)
  // Note: Uses console in dev originally; you may replace with log if desired.
  
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
            <Button
              title="Edit"
              onPress={() => handleEdit('property')}
              type="secondary"
              size="sm"
            />
          </View>
          
          <Card style={styles.propertyCard}>
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
          </Card>
        </View>

        {/* Areas & Assets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Areas & Assets</Text>
            <Button
              title="Edit"
              onPress={() => handleEdit('assets')}
              type="secondary"
              size="sm"
            />
          </View>

          <Card style={styles.summaryCard}>
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
          </Card>

          {areas.map((area) => (
            <Card key={area.id} style={styles.areaCard}>
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
            </Card>
          ))}
        </View>

        {/* Completion Summary */}
        <Card style={styles.completionCard} backgroundColor={submissionSuccess ? DesignSystem.colors.success + '20' : DesignSystem.colors.success + '10'}>
          <View style={styles.completionHeader}>
            <Ionicons 
              name={submissionSuccess ? "checkmark-circle" : "checkmark-circle"} 
              size={32} 
              color={DesignSystem.colors.success} 
            />
            <Text style={[styles.completionTitle, submissionSuccess && { fontSize: 20 }]}>
              {submissionSuccess ? 'Property Added Successfully!' : 'Ready to Submit'}
            </Text>
          </View>
          <Text style={styles.completionText}>
            {submissionSuccess 
              ? 'Your property has been added to your portfolio. Redirecting...'
              : `Your property setup is complete with ${areas.length} areas and ${totalAssets} assets inventoried.`
            }
          </Text>
        </Card>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          title={isSaving ? 'Saving...' : 'Save Draft'}
          onPress={() => {
            console.log('🚨 Save Draft button pressed');
            saveDraft();
          }}
          type="secondary"
          size="md"
          disabled={isSaving || isDraftLoading}
          loading={isSaving}
          icon={!isSaving ? <Ionicons name="bookmark-outline" size={18} color={DesignSystem.colors.secondaryText} /> : undefined}
        />
        
        <Button
          title={isSubmitting ? 'Submitting...' : 'Add Property'}
          onPress={handleSubmit}
          type="primary"
          size="md"
          disabled={isSubmitting || isDraftLoading}
          loading={isSubmitting}
          style={{ flex: 1, marginLeft: DesignSystem.spacing.md }}
        />
      </View>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DesignSystem.colors.text,
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
    backgroundColor: DesignSystem.colors.background,
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
    color: DesignSystem.colors.text,
  },
  propertyCard: {
    // Card styles handled by Card component
    marginBottom: DesignSystem.spacing.md,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '600',
    color: DesignSystem.colors.text,
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
    color: DesignSystem.colors.text,
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
    // Card styles handled by Card component
    marginBottom: DesignSystem.spacing.md,
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
    color: DesignSystem.colors.text,
  },
  areaCard: {
    // Card styles handled by Card component
    marginBottom: DesignSystem.spacing.md,
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
    color: DesignSystem.colors.text,
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
    color: DesignSystem.colors.text,
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
    // Card styles and background handled by Card component
    marginVertical: DesignSystem.spacing.lg,
    alignItems: 'center',
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
    paddingHorizontal: DesignSystem.spacing.lg,
    paddingVertical: DesignSystem.spacing.lg,
    backgroundColor: DesignSystem.colors.background,
    borderTopWidth: 1,
    borderTopColor: DesignSystem.colors.border,
    gap: DesignSystem.spacing.md,
    alignItems: 'center',
  },
});

export default PropertyReviewScreen;

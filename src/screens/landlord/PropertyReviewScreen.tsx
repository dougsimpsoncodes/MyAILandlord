import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
} from 'react-native';
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
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';
import { propertyAreasService } from '../../services/supabase/propertyAreasService';
import log from '../../lib/log';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { uploadPropertyPhotos } from '../../services/PhotoUploadService';
import { clearOnboardingInProgress } from '../../hooks/useOnboardingStatus';

type PropertyReviewNavigationProp = NativeStackNavigationProp<LandlordStackParamList>;
type PropertyReviewRouteProp = RouteProp<LandlordStackParamList, 'PropertyReview'>;

const PropertyReviewScreen = () => {
  const navigation = useNavigation<PropertyReviewNavigationProp>();
  const route = useRoute<PropertyReviewRouteProp>();
  const { propertyData, areas, draftId, propertyId } = route.params;
  const api = useApiClient();
  const { supabase } = useSupabaseWithAuth();

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
    
    if (isSubmitting || isDraftLoading) {
      return;
    }

    
    try {
      setIsSubmitting(true);
      
      // Ensure API is ready
      if (!api) throw new Error('Authentication required');

      if (draftState) await saveDraft();

      // Determine if property already exists (from onboarding flow)
      let currentPropertyId = propertyId;

      // Only create property if it doesn't already exist
      if (!currentPropertyId) {
        log.info('PropertyReview: Creating new property in database');
        const propertyPayload = {
          name: propertyData.name,
          address_jsonb: propertyData.address,
          property_type: propertyData.type,
          unit: propertyData.unit || '',
          bedrooms: propertyData.bedrooms || 0,
          bathrooms: propertyData.bathrooms || 0
        };

        const newProperty = await api.createProperty(propertyPayload);
        currentPropertyId = newProperty.id;
      } else {
        log.info('PropertyReview: Property already exists (onboarding flow), skipping creation', { propertyId: currentPropertyId });
      }

      // Upload area photos to storage before saving areas to database
      let areasWithUploadedPhotos = areas;
      if (areas && areas.length > 0) {
        areasWithUploadedPhotos = await Promise.all(
          areas.map(async (area) => {
            // If area has photos (local URIs), upload them to storage
            if (area.photos && area.photos.length > 0) {
              // Check if photos are already storage paths (start with property ID)
              const hasLocalPhotos = area.photos.some(p => !p.includes('/') || p.startsWith('file://') || p.startsWith('blob:'));

              if (hasLocalPhotos) {
                try {
                  const uploadedPhotos = await uploadPropertyPhotos(
                    currentPropertyId,
                    area.id,
                    area.photos.map(uri => ({ uri }))
                  );

                  // Replace local URIs with storage paths
                  return {
                    ...area,
                    photos: uploadedPhotos.map(p => p.url), // Use signed URLs
                    photoPaths: uploadedPhotos.map(p => p.path), // Store paths for later regeneration
                  };
                } catch (error) {
                  log.error(`Failed to upload photos for area ${area.name}:`, { error: String(error) });
                  // Continue without photos if upload fails
                  return { ...area, photos: [], photoPaths: [] };
                }
              }
            }
            return area;
          })
        );
      }

      // Save areas and assets to database (only if property was just created)
      // In onboarding flow, areas/assets were already saved by PropertyAreasScreen
      if (!propertyId && areasWithUploadedPhotos && areasWithUploadedPhotos.length > 0) {
        try {
          log.info('Saving property areas and assets to database', {
            propertyId: currentPropertyId,
            areaCount: areasWithUploadedPhotos.length,
            totalAssets: areasWithUploadedPhotos.reduce((sum, area) => sum + (area.assets?.length || 0), 0)
          });

          await propertyAreasService.saveAreasAndAssets(currentPropertyId, areasWithUploadedPhotos, supabase);

          log.info('Successfully saved areas and assets to database');
        } catch (areasError) {
          log.error('Error creating areas and assets:', { error: String(areasError) });
          // Continue anyway - property is created, areas can be added later
        }
      }
      

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

      // Clear onboarding in-progress flag (property creation complete!)
      try {
        await clearOnboardingInProgress();
        log.info('✅ Onboarding complete - property created successfully');
      } catch (error) {
        log.error('Error clearing onboarding flag:', error);
      }

      // Navigate to PropertyDetails after 2 seconds to allow user to invite tenant
      setTimeout(() => {
        // Format address as string for PropertyDetails
        const addressString = `${propertyData.address.line1}${propertyData.address.line2 ? ', ' + propertyData.address.line2 : ''}, ${propertyData.address.city}, ${propertyData.address.state} ${propertyData.address.zipCode}`;

        navigation.navigate('PropertyDetails', {
          property: {
            id: currentPropertyId,
            name: propertyData.name,
            address: addressString,
            type: propertyData.type,
            tenants: 0,
            activeRequests: 0,
          }
        });
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

  // Save status indicator for header (no button)
  const headerRight = (isSaving || lastSaved) ? (
    <View style={styles.saveStatus}>
      {isSaving ? (
        <>
          <Ionicons name="sync" size={12} color="#3498DB" />
          <Text style={styles.saveStatusText}>Saving...</Text>
        </>
      ) : lastSaved ? (
        <>
          <Ionicons name="checkmark-circle" size={12} color="#2ECC71" />
          <Text style={styles.saveStatusText}>Saved</Text>
        </>
      ) : null}
    </View>
  ) : null;

  // Bottom navigation button
  const bottomContent = (
    <Button
      title={isSubmitting ? "Submitting..." : "Submit Property"}
      onPress={handleSubmit}
      type="primary"
      size="lg"
      fullWidth
      disabled={isSubmitting || isDraftLoading}
      loading={isSubmitting}
    />
  );

  return (
    <ScreenContainer
      title="Review & Submit"
      subtitle="Step 4 of 4"
      showBackButton
      onBackPress={() => navigation.goBack()}
      headerRight={headerRight}
      userRole="landlord"
      scrollable
      bottomContent={bottomContent}
    >
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

        {/* Rooms Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rooms</Text>
            <Button
              title="Edit"
              onPress={() => handleEdit('assets')}
              type="secondary"
              size="sm"
            />
          </View>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryRowCompact}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValueLarge}>{areas.length}</Text>
                <Text style={styles.summaryLabelSmall}>Rooms</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValueLarge}>
                  {areas.reduce((total, area) => total + (area.photos?.length || 0), 0)}
                </Text>
                <Text style={styles.summaryLabelSmall}>Photos</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValueLarge}>{totalAssets}</Text>
                <Text style={styles.summaryLabelSmall}>Equipment</Text>
              </View>
            </View>
          </Card>

          {areas.map((area) => {
            const photoCount = area.photos?.length || 0;
            const equipmentCount = (area.assets || []).length;
            return (
              <Card key={area.id} style={styles.areaCard}>
                <View style={styles.areaHeader}>
                  <View>
                    <Text style={styles.areaName}>{area.name}</Text>
                    <Text style={styles.areaType}>{area.type}</Text>
                  </View>
                  <Text style={styles.areaStatsText}>
                    {photoCount} {photoCount === 1 ? 'photo' : 'photos'} · {equipmentCount} equipment
                  </Text>
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
            );
          })}
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
              ? 'Your property has been added. Taking you to property details where you can invite a tenant...'
              : `Your property setup is complete with ${areas.length} rooms and ${totalAssets} equipment items.`
            }
          </Text>
        </Card>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saveStatusText: {
    fontSize: 11,
    color: '#7F8C8D',
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
    marginBottom: DesignSystem.spacing.md,
  },
  summaryRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValueLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: DesignSystem.colors.text,
  },
  summaryLabelSmall: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E9ECEF',
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
  areaStatsText: {
    fontSize: 13,
    color: '#7F8C8D',
    fontWeight: '500',
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
  bottomActionsRow: {
    flexDirection: 'row',
    gap: DesignSystem.spacing.md,
    alignItems: 'center',
  },
});

export default PropertyReviewScreen;

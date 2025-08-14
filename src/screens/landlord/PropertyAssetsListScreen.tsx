import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PropertyArea, InventoryItem } from '../../types/property';
import { validateImageFile } from '../../utils/propertyValidation';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import ResponsiveGrid from '../../components/shared/ResponsiveGrid';
import { ResponsiveTitle, ResponsiveSubtitle, ResponsiveBody, ResponsiveCaption } from '../../components/shared/ResponsiveText';

type PropertyAssetsListNavigationProp = NativeStackNavigationProp<LandlordStackParamList>;
type PropertyAssetsListRouteProp = RouteProp<LandlordStackParamList, 'PropertyAssets'>;

interface ExpandableAreaProps {
  area: PropertyArea;
  isSelected: boolean;
  onToggle: () => void;
  onAddPhoto: () => void;
  onAddAsset: () => void;
  onRemoveAsset: (assetId: string) => void;
  responsive: ReturnType<typeof useResponsive>;
}

const ExpandableAreaCard: React.FC<ExpandableAreaProps> = ({
  area,
  isSelected,
  onToggle,
  onAddPhoto,
  onAddAsset,
  onRemoveAsset,
  responsive,
}) => {
  const [expanded, setExpanded] = useState(false);
  const animatedHeight = useState(new Animated.Value(0))[0];

  const toggleExpanded = () => {
    setExpanded(!expanded);
    Animated.timing(animatedHeight, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const photoCount = area.photos.length;
  const assetCount = area.assets?.length || 0;
  const isComplete = photoCount > 0 && assetCount > 0;

  return (
    <View style={[styles.areaCard, responsive.isWeb && styles.areaCardWeb]}>
      {/* Area Header - Always Visible */}
      <TouchableOpacity
        style={[styles.areaHeader, expanded && styles.areaHeaderExpanded]}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.areaHeaderLeft}>
          <View style={[styles.areaStatusIndicator, isComplete && styles.areaStatusComplete]} />
          <Ionicons
            name={area.icon as keyof typeof Ionicons.glyphMap}
            size={responsive.select({ mobile: 24, desktop: 28, default: 24 })}
            color="#3498DB"
          />
          <View style={styles.areaInfo}>
            <ResponsiveBody style={styles.areaName}>
              {area.name}
            </ResponsiveBody>
            <View style={styles.areaStats}>
              <View style={styles.statItem}>
                <Ionicons name="camera" size={14} color="#7F8C8D" />
                <Text style={styles.statText}>{photoCount} photos</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="cube" size={14} color="#7F8C8D" />
                <Text style={styles.statText}>{assetCount} assets</Text>
              </View>
            </View>
          </View>
        </View>
        
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#7F8C8D"
        />
      </TouchableOpacity>

      {/* Expandable Content */}
      {expanded && (
        <View style={styles.areaContent}>
          {/* Photos Section */}
          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={onAddPhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={20} color="#3498DB" />
                <Text style={styles.addButtonText}>Add Photo</Text>
              </TouchableOpacity>
            </View>
            
            {photoCount > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoScroll}
              >
                {area.photos.map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo }}
                    style={[
                      styles.photoThumbnail,
                      { width: responsive.select({ mobile: 80, desktop: 100, default: 80 }) }
                    ]}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>No photos yet</Text>
            )}
          </View>

          {/* Assets Section */}
          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Assets & Inventory</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={onAddAsset}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={20} color="#3498DB" />
                <Text style={styles.addButtonText}>Add Asset</Text>
              </TouchableOpacity>
            </View>
            
            {assetCount > 0 ? (
              <View style={styles.assetsList}>
                {area.assets?.map((asset) => (
                  <View key={asset.id} style={styles.assetItem}>
                    <View style={styles.assetItemInfo}>
                      <Text style={styles.assetName}>{asset.name}</Text>
                      <Text style={styles.assetDetails}>
                        {asset.brand && asset.model ? `${asset.brand} ${asset.model}` : asset.category}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onRemoveAsset(asset.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No assets documented yet</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const PropertyAssetsListScreen = () => {
  const navigation = useNavigation<PropertyAssetsListNavigationProp>();
  const route = useRoute<PropertyAssetsListRouteProp>();
  const responsive = useResponsive();
  const { propertyData, areas, draftId } = route.params;

  // Initialize draft management
  const {
    draftState,
    isLoading: isDraftLoading,
    isSaving,
    lastSaved,
    error: draftError,
    updateAreas,
    updateCurrentStep,
    saveDraft,
    clearError,
  } = usePropertyDraft({ 
    draftId,
    enableAutoSave: true,
    autoSaveDelay: 2000 
  });

  const [selectedAreas, setSelectedAreas] = useState<PropertyArea[]>(areas);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set current step to 2 (photos & assets step)
  useEffect(() => {
    if (draftState && draftState.currentStep !== 2) {
      updateCurrentStep(2);
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

  const handleAddPhoto = async (areaId: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Validate image
        const validation = await validateImageFile(imageUri);
        if (!validation.isValid) {
          Alert.alert('Invalid Image', validation.error || 'Please select a valid image.');
          return;
        }

        // Update area with new photo
        const updatedAreas = selectedAreas.map(area => {
          if (area.id === areaId) {
            return {
              ...area,
              photos: [...area.photos, imageUri]
            };
          }
          return area;
        });

        setSelectedAreas(updatedAreas);
        updateAreas(updatedAreas);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleAddAsset = (areaId: string, areaName: string) => {
    const area = selectedAreas.find(a => a.id === areaId);
    if (!area) return;

    // Navigate to AddAssetScreen
    navigation.navigate('AddAsset', {
      areaId,
      areaName,
      template: null,
      propertyData,
      draftId
    });
  };

  const handleRemoveAsset = (areaId: string, assetId: string) => {
    Alert.alert(
      'Remove Asset',
      'Are you sure you want to remove this asset?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedAreas = selectedAreas.map(area => {
              if (area.id === areaId) {
                return {
                  ...area,
                  assets: (area.assets || []).filter(asset => asset.id !== assetId)
                };
              }
              return area;
            });
            setSelectedAreas(updatedAreas);
            updateAreas(updatedAreas);
          }
        }
      ]
    );
  };

  const handleNext = async () => {
    if (isSubmitting || isDraftLoading) return;
    
    try {
      setIsSubmitting(true);
      
      // Save current progress
      if (draftState) {
        await saveDraft();
      }

      navigation.navigate('PropertyReview', { 
        propertyData,
        areas: selectedAreas,
        draftId 
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOverallProgress = () => {
    const totalAreas = selectedAreas.length;
    const areasWithPhotos = selectedAreas.filter(area => area.photos.length > 0).length;
    const areasWithAssets = selectedAreas.filter(area => (area.assets || []).length > 0).length;
    
    const photoProgress = totalAreas > 0 ? (areasWithPhotos / totalAreas) * 50 : 0;
    const assetProgress = totalAreas > 0 ? (areasWithAssets / totalAreas) * 50 : 0;
    
    return Math.round(photoProgress + assetProgress);
  };

  return (
    <SafeAreaView style={[styles.container, responsive.isWeb && styles.containerWeb]}>
      <ResponsiveContainer maxWidth={responsive.isLargeScreen() ? 'large' : 'desktop'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <ResponsiveSubtitle style={styles.headerTitle}>
              Property Photos & Assets
            </ResponsiveSubtitle>
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Step Counter */}
        <View style={styles.stepCounterContainer}>
          <View style={styles.stepCounterHeader}>
            <Text style={styles.stepCounterTitle}>Property Setup Progress</Text>
            <Text style={styles.stepCounterSubtitle}>Step 2 of 3</Text>
          </View>
          
          <View style={styles.stepsRow}>
            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, styles.stepNumberComplete]}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepLabel, styles.stepLabelComplete]}>Areas Selected</Text>
            </View>
            
            <View style={styles.stepConnector} />
            
            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, styles.stepNumberActive]}>
                <Text style={[styles.stepNumberText, styles.stepNumberTextActive]}>2</Text>
              </View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Photos & Assets</Text>
            </View>
            
            <View style={styles.stepConnector} />
            
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepLabel}>Review & Save</Text>
            </View>
          </View>
        </View>

        {/* Progress Summary */}
        <View style={styles.progressSummary}>
          <Text style={styles.progressTitle}>Overall Progress: {getOverallProgress()}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getOverallProgress()}%` }]} />
          </View>
          <Text style={styles.progressHint}>
            Add at least one photo and one asset to each area for complete documentation
          </Text>
        </View>

        {/* Areas List */}
        <ScrollView
          style={styles.areasList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.areasListContent}
        >
          <ResponsiveGrid
            minItemWidth={responsive.isLargeScreen() ? 400 : 320}
            maxColumns={responsive.isLargeScreen() ? 2 : 1}
          >
            {selectedAreas.map((area) => (
              <ExpandableAreaCard
                key={area.id}
                area={area}
                isSelected={false}
                onToggle={() => {}}
                onAddPhoto={() => handleAddPhoto(area.id)}
                onAddAsset={() => handleAddAsset(area.id, area.name)}
                onRemoveAsset={(assetId) => handleRemoveAsset(area.id, assetId)}
                responsive={responsive}
              />
            ))}
          </ResponsiveGrid>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={saveDraft}
            disabled={isSaving || isDraftLoading}
            activeOpacity={0.7}
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
              styles.nextButton, 
              (isSubmitting || isDraftLoading) && styles.nextButtonDisabled
            ]}
            onPress={handleNext}
            disabled={isSubmitting || isDraftLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {isSubmitting ? 'Processing...' : 'Review & Submit'}
            </Text>
          </TouchableOpacity>
        </View>
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  containerWeb: {
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
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
  stepCounterContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  stepCounterHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stepCounterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  stepCounterSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepNumberActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  stepNumberComplete: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  stepNumberTextActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    maxWidth: 80,
  },
  stepLabelActive: {
    color: '#3498DB',
    fontWeight: '600',
  },
  stepLabelComplete: {
    color: '#2ECC71',
    fontWeight: '600',
  },
  stepConnector: {
    height: 2,
    backgroundColor: '#E9ECEF',
    flex: 0.5,
    marginHorizontal: 8,
    marginBottom: 24,
  },
  progressSummary: {
    backgroundColor: '#E8F4FD',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#D6EAF8',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498DB',
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 13,
    color: '#3498DB',
    fontStyle: 'italic',
  },
  areasList: {
    flex: 1,
  },
  areasListContent: {
    padding: 20,
    paddingBottom: 100,
  },
  areaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  areaCardWeb: {
    // Web-specific styles handled by React Native Web
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  areaHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  areaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  areaStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E9ECEF',
    marginRight: 12,
  },
  areaStatusComplete: {
    backgroundColor: '#2ECC71',
  },
  areaInfo: {
    marginLeft: 12,
    flex: 1,
  },
  areaName: {
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  areaStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  areaContent: {
    padding: 16,
    paddingTop: 0,
  },
  contentSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  photoScroll: {
    marginHorizontal: -4,
  },
  photoThumbnail: {
    height: 80,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  assetsList: {
    gap: 8,
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  assetItemInfo: {
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
  removeButton: {
    padding: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#95A5A6',
    fontStyle: 'italic',
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
  nextButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonDisabled: {
    backgroundColor: '#C7C7CC',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
});

export default PropertyAssetsListScreen;
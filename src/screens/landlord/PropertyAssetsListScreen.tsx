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
import { PropertyArea, InventoryItem } from '../../types/property';
import { validateImageFile } from '../../utils/propertyValidation';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import PhotoPicker from '../../components/media/PhotoPicker';
import { saveDraftWithoutEmbeddingPhotos } from '../../services/PropertyDraftService.patch';
import { useResponsive } from '../../hooks/useResponsive';
import Card from '../../components/shared/Card';
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
  onPhotosUploaded: (photos: { path: string; url: string }[]) => void;
  onAddAsset: () => void;
  onRemoveAsset: (assetId: string) => void;
  responsive: ReturnType<typeof useResponsive>;
  propertyId: string;
}

const ExpandableAreaCard: React.FC<ExpandableAreaProps> = ({
  area,
  isSelected,
  onToggle,
  onAddPhoto,
  onPhotosUploaded,
  onAddAsset,
  onRemoveAsset,
  responsive,
  propertyId,
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
    <Card style={[styles.areaCard, responsive.isWeb && styles.areaCardWeb]}>
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

      {/* Photos Section - Always Visible */}
      <View style={styles.areaContent}>
        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={onAddPhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="camera" size={20} color="#3498DB" />
                <Text style={styles.addButtonText}>Camera</Text>
              </TouchableOpacity>
              <View style={styles.addButton}>
                <PhotoPicker 
                  propertyId={propertyId}
                  areaId={area.id}
                  onUploaded={onPhotosUploaded}
                />
              </View>
            </View>
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
      </View>

      {/* Assets Section - Only when expanded */}
      {expanded && (
        <View style={styles.areaContent}>
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
    </Card>
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

  const [selectedAreas, setSelectedAreas] = useState<PropertyArea[]>(areas || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // Debug: Areas are being received correctly
  console.log('Areas count:', selectedAreas.length);
  
  // Use draft areas if available and route areas are empty
  useEffect(() => {
    if ((!areas || areas.length === 0) && draftState?.areas && draftState.areas.length > 0) {
      console.log('Using draft areas instead of route params');
      setSelectedAreas(draftState.areas);
    }
  }, [areas, draftState?.areas]);

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

  const handlePhotosUploaded = (areaId: string) => (photos: { path: string; url: string }[]) => {
    console.log('📸 PropertyAssetsListScreen: Photos uploaded:', photos.length);
    
    if (photos.length > 0) {
      const photoUrls = photos.map(p => p.url);
      
      const updatedAreas = selectedAreas.map(area => {
        if (area.id === areaId) {
          return {
            ...area,
            photos: [...area.photos, ...photoUrls]
          };
        }
        return area;
      });

      console.log('📸 PropertyAssetsListScreen: Updating state with', photoUrls.length, 'photos');
      setSelectedAreas(updatedAreas);
      updateAreas(updatedAreas);
      
      // Save draft without embedding photos for performance
      saveDraftWithoutEmbeddingPhotos({
        ...draftState,
        areas: updatedAreas
      }).catch(console.error);
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


  return (
    <SafeAreaView style={[styles.container, responsive.isWeb && styles.containerWeb]}>
      <ResponsiveContainer maxWidth={responsive.isLargeScreen() ? 'large' : 'desktop'} style={{ flex: 1 }}>
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

        {/* Areas List */}
        <View style={styles.scrollContainer}>
          <ScrollView
            style={styles.areasList}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.areasListContent}
            scrollEnabled={true}
          >
          {selectedAreas.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle" size={48} color="#8E8E93" />
              <Text style={styles.emptyStateTitle}>No Areas Selected</Text>
              <Text style={styles.emptyStateText}>
                Please go back to Step 1 and select areas for your property.
              </Text>
              <Text style={styles.emptyStateText}>
                Debug: Areas length = {selectedAreas.length}
              </Text>
              <TouchableOpacity
                style={styles.goBackButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.goBackButtonText}>Go Back to Step 1</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.areasContainer}>
              {selectedAreas.map((area) => (
                <ExpandableAreaCard
                  key={area.id}
                  area={area}
                  isSelected={false}
                  onToggle={() => {}}
                  onAddPhoto={() => handleAddPhoto(area.id)}
                  onPhotosUploaded={handlePhotosUploaded(area.id)}
                  onAddAsset={() => handleAddAsset(area.id, area.name)}
                  onRemoveAsset={(assetId) => handleRemoveAsset(area.id, assetId)}
                  responsive={responsive}
                  propertyId={draftId || 'temp'}
                />
              ))}
            </View>
          )}
          </ScrollView>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity 
            style={[
              styles.saveButton,
              isSaving && styles.saveButtonActive
            ]} 
            onPress={async () => {
              console.log('Save draft button pressed, isSaving:', isSaving);
              if (isSaving || isDraftLoading) return;
              
              try {
                await saveDraft();
                setShowSaveSuccess(true);
                setTimeout(() => setShowSaveSuccess(false), 2000);
              } catch (error) {
                console.error('Save failed:', error);
              }
            }}
            disabled={isSaving || isDraftLoading}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isSaving ? "sync" : "bookmark-outline"} 
              size={18} 
              color={isSaving ? "#007AFF" : "#8E8E93"} 
            />
            <Text style={[
              styles.saveButtonText,
              isSaving && styles.saveButtonTextActive
            ]}>
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Text>
            {showSaveSuccess && (
              <Ionicons 
                name="checkmark-circle" 
                size={16} 
                color="#2ECC71" 
              />
            )}
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
  scrollContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  areasList: {
    flex: 1,
  },
  areasListContent: {
    padding: 20,
    paddingBottom: 120,
    flexGrow: 1,
  },
  areasContainer: {
    gap: 16,
  },
  debugText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  areaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    
    
    
    
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
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  goBackButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  saveButtonActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },
  saveButtonTextActive: {
    color: '#007AFF',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    
    
    
    
    elevation: 3,
  },
  nextButtonDisabled: {
    backgroundColor: '#C7C7CC',
    
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
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PropertyArea, InventoryItem, AssetCondition, AssetTemplate } from '../../types/property';
import { validateImageFile } from '../../utils/propertyValidation';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import { getAssetsByRoom, templateToInventoryItem } from '../../data/assetTemplates';
import ScreenContainer from '../../components/shared/ScreenContainer';

type PropertyAssetsNavigationProp = NativeStackNavigationProp<LandlordStackParamList>;
type PropertyAssetsRouteProp = RouteProp<LandlordStackParamList, 'PropertyAssets'>;

const { width: screenWidth } = Dimensions.get('window');

const PropertyAssetsScreen = () => {
  const navigation = useNavigation<PropertyAssetsNavigationProp>();
  const route = useRoute<PropertyAssetsRouteProp>();
  const { propertyData, areas, draftId, newAsset } = route.params;

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

  // State management
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  // Initialize from draftState if available, otherwise fall back to route params
  const [selectedAreas, setSelectedAreas] = useState<PropertyArea[]>(() => {
    // Don't use empty areas from route - that indicates we need to load from draft
    if (areas && areas.length > 0) {
      return areas;
    }
    return [];
  });
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAssetSuggestions, setShowAssetSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Asset form state
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetCondition, setNewAssetCondition] = useState<AssetCondition>(AssetCondition.GOOD);
  const [newAssetBrand, setNewAssetBrand] = useState('');
  const [newAssetModel, setNewAssetModel] = useState('');
  const [newAssetNotes, setNewAssetNotes] = useState('');

  const currentArea = selectedAreas[currentAreaIndex];
  const totalAreas = selectedAreas.length;

  // Get smart suggestions for current room
  const assetSuggestions = useMemo(() => 
    getAssetsByRoom(currentArea?.type || 'other'), 
    [currentArea?.type]
  );

  // Set current step to 2 (assets step)
  useEffect(() => {
    if (draftState && draftState.currentStep !== 2) {
      updateCurrentStep(2);
    }
  }, [draftState?.currentStep, updateCurrentStep]);

  // Sync selectedAreas from draftState when it changes
  // This handles the case where we navigate back from AddAssetScreen with empty areas
  useEffect(() => {
    if (draftState?.areas && draftState.areas.length > 0) {
      // Only update if local state is empty or if draftState has more recent assets
      if (selectedAreas.length === 0) {
        setSelectedAreas(draftState.areas);
      } else {
        // Merge assets from draftState into local state to capture any updates
        const mergedAreas = selectedAreas.map(localArea => {
          const draftArea = draftState.areas.find(a => a.id === localArea.id);
          if (draftArea && draftArea.assets && draftArea.assets.length > localArea.assets?.length) {
            return { ...localArea, assets: draftArea.assets };
          }
          return localArea;
        });
        // Check if we need to update
        const needsUpdate = mergedAreas.some((area, idx) =>
          area.assets?.length !== selectedAreas[idx]?.assets?.length
        );
        if (needsUpdate) {
          setSelectedAreas(mergedAreas);
        }
      }
    }
  }, [draftState?.areas]);

  // Handle new asset from AddAssetScreen
  useEffect(() => {
    if (newAsset) {
      // Use a function updater to get the latest selectedAreas state
      setSelectedAreas(prevAreas => {
        // Find the source of truth for areas
        const currentAreas = prevAreas.length > 0 ? prevAreas : (draftState?.areas || []);

        // Check if this asset already exists (prevent duplicates)
        const areaWithAsset = currentAreas.find(a => a.id === newAsset.areaId);
        if (areaWithAsset?.assets?.some(asset => asset.id === newAsset.id)) {
          return prevAreas; // Asset already added, skip
        }

        const updatedAreas = currentAreas.map(area => {
          if (area.id === newAsset.areaId) {
            return {
              ...area,
              assets: [...(area.assets || []), newAsset]
            };
          }
          return area;
        });

        // Update draft with new areas (schedule after state update)
        setTimeout(() => updateAreas(updatedAreas), 0);

        return updatedAreas;
      });

      // Clear the navigation parameter to prevent re-adding
      navigation.setParams({ newAsset: undefined });
    }
  }, [newAsset, draftState?.areas, updateAreas, navigation]);

  // Handle draft error display
  useEffect(() => {
    if (draftError) {
      Alert.alert('Auto-save Error', draftError, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [draftError, clearError]);

  // Navigation between areas
  const goToNextArea = () => {
    if (currentAreaIndex < totalAreas - 1) {
      setCurrentAreaIndex(currentAreaIndex + 1);
    }
  };

  const goToPreviousArea = () => {
    if (currentAreaIndex > 0) {
      setCurrentAreaIndex(currentAreaIndex - 1);
    }
  };

  // Asset management
  const addAssetToCurrentArea = (asset: Partial<InventoryItem>) => {
    if (!currentArea) return;

    const newAsset: InventoryItem = {
      id: `asset_${Date.now()}`,
      areaId: currentArea.id,
      name: asset.name || '',
      assetType: asset.assetType || 'other',
      category: asset.category || 'Other',
      subcategory: asset.subcategory,
      condition: asset.condition || AssetCondition.GOOD,
      brand: asset.brand,
      model: asset.model,
      notes: asset.notes,
      photos: asset.photos || [],
      isActive: true,
    };

    // Update the current area with the new asset
    const updatedAreas = selectedAreas.map(area => {
      if (area.id === currentArea.id) {
        return {
          ...area,
          assets: [...(area.assets || []), newAsset]
        };
      }
      return area;
    });

    // Update draft with new areas
    updateAreas(updatedAreas);
  };

  const handleSelectAssetTemplate = (template: AssetTemplate) => {
    // Navigate to AddAssetScreen with template pre-selected
    navigation.navigate('AddAsset', {
      areaId: currentArea.id,
      areaName: currentArea.name,
      template,
      propertyData,
      draftId
    });
    setShowAssetSuggestions(false);
  };

  const handleSelectCustomAsset = () => {
    // Navigate to AddAssetScreen without template (custom asset)
    navigation.navigate('AddAsset', {
      areaId: currentArea.id,
      areaName: currentArea.name,
      template: null,
      propertyData,
      draftId
    });
    setShowAssetSuggestions(false);
  };

  const handleAddCustomAsset = () => {
    if (!newAssetName.trim()) {
      Alert.alert('Invalid Name', 'Please enter an asset name.');
      return;
    }

    const customAsset: Partial<InventoryItem> = {
      name: newAssetName.trim(),
      assetType: 'other',
      category: 'Other',
      condition: newAssetCondition,
      brand: newAssetBrand.trim() || undefined,
      model: newAssetModel.trim() || undefined,
      notes: newAssetNotes.trim() || undefined,
    };

    addAssetToCurrentArea(customAsset);
    
    // Reset form
    setNewAssetName('');
    setNewAssetBrand('');
    setNewAssetModel('');
    setNewAssetNotes('');
    setNewAssetCondition(AssetCondition.GOOD);
    setShowAddAssetModal(false);
  };

  const handleAddAssetPhoto = async (assetId: string) => {
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

        // Update asset with new photo
        const updatedAreas = selectedAreas.map(area => {
          if (area.id === currentArea.id) {
            const updatedAssets = (area.assets || []).map(asset => {
              if (asset.id === assetId) {
                return {
                  ...asset,
                  photos: [...asset.photos, imageUri]
                };
              }
              return asset;
            });
            return { ...area, assets: updatedAssets };
          }
          return area;
        });

        updateAreas(updatedAreas);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const removeAsset = (assetId: string) => {
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
              if (area.id === currentArea.id) {
                return {
                  ...area,
                  assets: (area.assets || []).filter(asset => asset.id !== assetId)
                };
              }
              return area;
            });
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

  const getProgressPercentage = () => {
    const areasWithAssets = selectedAreas.filter(area => (area.assets || []).length > 0).length;
    return totalAreas > 0 ? Math.round((areasWithAssets / totalAreas) * 100) : 0;
  };

  const currentAssets = currentArea?.assets || [];

  const headerRight = (
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Text style={styles.cancelText}>Cancel</Text>
    </TouchableOpacity>
  );

  const bottomActions = (
    <View style={styles.bottomActionsRow}>
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
          styles.nextButton,
          (isSubmitting || isDraftLoading) && styles.nextButtonDisabled
        ]}
        onPress={handleNext}
        disabled={isSubmitting || isDraftLoading}
      >
        <Text style={styles.nextButtonText}>
          {isSubmitting ? 'Processing...' : 'Review & Submit'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer
      title="Property Assets"
      subtitle={`Step 3 of 5: Asset Inventory`}
      showBackButton
      onBackPress={() => navigation.goBack()}
      headerRight={headerRight}
      userRole="landlord"
      scrollable
      bottomContent={bottomActions}
    >

      {/* Area Navigation */}
      <View style={styles.areaNavigation}>
        <TouchableOpacity 
          style={[styles.navButton, currentAreaIndex === 0 && styles.navButtonDisabled]}
          onPress={goToPreviousArea}
          disabled={currentAreaIndex === 0}
        >
          <Ionicons name="chevron-back" size={20} color={currentAreaIndex === 0 ? "#BDC3C7" : "#3498DB"} />
        </TouchableOpacity>
        
        <View style={styles.areaInfo}>
          <Text style={styles.areaName}>{currentArea?.name}</Text>
          <Text style={styles.areaProgress}>
            {currentAreaIndex + 1} of {totalAreas} • {currentAssets.length} assets
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.navButton, currentAreaIndex === totalAreas - 1 && styles.navButtonDisabled]}
          onPress={goToNextArea}
          disabled={currentAreaIndex === totalAreas - 1}
        >
          <Ionicons name="chevron-forward" size={20} color={currentAreaIndex === totalAreas - 1 ? "#BDC3C7" : "#3498DB"} />
        </TouchableOpacity>
      </View>
        {/* Current Assets */}
        {currentAssets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Assets</Text>
            {currentAssets.map((asset) => (
              <View key={asset.id} style={styles.assetCard}>
                <View style={styles.assetHeader}>
                  <View style={styles.assetInfo}>
                    <Text style={styles.assetName}>{asset.name}</Text>
                    <Text style={styles.assetDetails}>
                      {asset.brand && asset.model 
                        ? `${asset.brand} ${asset.model}` 
                        : asset.category
                      }
                    </Text>
                    <View style={styles.conditionBadge}>
                      <Text style={styles.conditionText}>
                        {asset.condition.charAt(0).toUpperCase() + asset.condition.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.assetActions}>
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={() => handleAddAssetPhoto(asset.id)}
                    >
                      <Ionicons name="camera" size={20} color="#3498DB" />
                      <Text style={styles.photoCount}>{asset.photos.length}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeAsset(asset.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                </View>
                {asset.photos.length > 0 && (
                  <ScrollView horizontal style={styles.assetPhotos}>
                    {asset.photos.map((photo, index) => (
                      <Image key={index} source={{ uri: photo }} style={styles.assetPhoto} />
                    ))}
                  </ScrollView>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Add Asset Dropdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Asset to {currentArea?.name}</Text>
          
          <TouchableOpacity
            style={styles.addAssetDropdown}
            onPress={() => setShowAssetSuggestions(!showAssetSuggestions)}
          >
            <View style={styles.dropdownContent}>
              <Ionicons name="add-circle" size={20} color="#3498DB" />
              <Text style={styles.dropdownText}>Select asset type...</Text>
            </View>
            <Ionicons 
              name={showAssetSuggestions ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#3498DB" 
            />
          </TouchableOpacity>
          
          {showAssetSuggestions && (
            <View style={styles.dropdownMenu}>
              {assetSuggestions.map((template, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dropdownItem}
                  onPress={() => handleSelectAssetTemplate(template)}
                >
                  <View style={styles.dropdownItemContent}>
                    <Text style={styles.dropdownItemName}>{template.name}</Text>
                    <Text style={styles.dropdownItemCategory}>{template.category}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#7F8C8D" />
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={[styles.dropdownItem, styles.dropdownItemOther]}
                onPress={() => handleSelectCustomAsset()}
              >
                <View style={styles.dropdownItemContent}>
                  <Text style={styles.dropdownItemName}>Other</Text>
                  <Text style={styles.dropdownItemCategory}>Custom asset type</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#7F8C8D" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Progress Summary */}
        <View style={styles.progressSummary}>
          <Text style={styles.summaryTitle}>Inventory Progress</Text>
          <Text style={styles.summaryText}>
            {getProgressPercentage()}% complete • {selectedAreas.reduce((total, area) => total + (area.assets || []).length, 0)} total assets
          </Text>
        </View>

      {/* Add Custom Asset Modal */}
      <Modal
        visible={showAddAssetModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddAssetModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddAssetModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Asset</Text>
            <TouchableOpacity onPress={handleAddCustomAsset}>
              <Text style={styles.modalSaveText}>Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Asset Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Kitchen Sink, Ceiling Fan"
                value={newAssetName}
                onChangeText={setNewAssetName}
                autoFocus
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Condition</Text>
              <View style={styles.conditionGrid}>
                {Object.values(AssetCondition).map((condition) => (
                  <TouchableOpacity
                    key={condition}
                    style={[
                      styles.conditionOption,
                      newAssetCondition === condition && styles.conditionOptionSelected,
                    ]}
                    onPress={() => setNewAssetCondition(condition)}
                  >
                    <Text
                      style={[
                        styles.conditionOptionText,
                        newAssetCondition === condition && styles.conditionOptionTextSelected,
                      ]}
                    >
                      {condition.charAt(0).toUpperCase() + condition.slice(1).replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Brand (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Whirlpool, GE, Samsung"
                value={newAssetBrand}
                onChangeText={setNewAssetBrand}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Model (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., WRF555SDFZ"
                value={newAssetModel}
                onChangeText={setNewAssetModel}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Additional notes about this asset..."
                value={newAssetNotes}
                onChangeText={setNewAssetNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  cancelText: {
    fontSize: 16,
    color: '#E74C3C',
  },
  areaNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  areaInfo: {
    flex: 1,
    alignItems: 'center',
  },
  areaName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  areaProgress: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  assetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    
    
    
    
    elevation: 2,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  assetDetails: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  conditionBadge: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  conditionText: {
    fontSize: 12,
    color: '#3498DB',
    fontWeight: '500',
  },
  assetActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  photoCount: {
    fontSize: 12,
    color: '#3498DB',
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#FDF2F2',
    padding: 8,
    borderRadius: 8,
  },
  assetPhotos: {
    marginTop: 12,
  },
  assetPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    width: (screenWidth - 64) / 2,
    
    
    
    
    elevation: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 8,
    textAlign: 'center',
  },
  suggestionCategory: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
    textAlign: 'center',
  },
  addAssetDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    
    
    
    
    elevation: 1,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: '#3498DB',
    fontWeight: '500',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    
    
    
    
    elevation: 3,
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  dropdownItemOther: {
    borderBottomWidth: 0,
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  dropdownItemCategory: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2,
  },
  progressSummary: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#3498DB',
  },
  bottomActionsRow: {
    flexDirection: 'row',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  modalCancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalSaveText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    
    
    
    
    elevation: 1,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  conditionOptionSelected: {
    borderColor: '#3498DB',
    backgroundColor: '#E8F4FD',
  },
  conditionOptionText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  conditionOptionTextSelected: {
    color: '#3498DB',
    fontWeight: '600',
  },
});

export default PropertyAssetsScreen;
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PropertyData, PropertyArea, AssetCondition } from '../../types/property';
import { validateImageFile } from '../../utils/propertyValidation';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import { useResponsive } from '../../hooks/useResponsive';

type PropertyAreasNavigationProp = NativeStackNavigationProp<LandlordStackParamList>;
type PropertyAreasRouteProp = RouteProp<LandlordStackParamList, 'PropertyAreas'>;

// Move generateDynamicAreas outside component to prevent re-creation
const generateDynamicAreas = (propertyData: PropertyData): PropertyArea[] => {
  const bedrooms = propertyData.bedrooms || 0;
  const bathrooms = propertyData.bathrooms || 0;
  
  // Essential areas that every property should have
  const essentialAreas: PropertyArea[] = [
    { id: 'kitchen', name: 'Kitchen', type: 'kitchen', icon: 'restaurant', isDefault: true, photos: [], inventoryComplete: false, condition: AssetCondition.GOOD, assets: [] },
    { id: 'living', name: 'Living Room', type: 'living_room', icon: 'tv', isDefault: true, photos: [], inventoryComplete: false, condition: AssetCondition.GOOD, assets: [] },
  ];

  // Generate bedrooms based on user input
  const bedroomAreas: PropertyArea[] = [];
  for (let i = 1; i <= bedrooms; i++) {
    const isFirst = i === 1;
    const bedroomName = bedrooms === 1 ? 'Bedroom' : 
                       isFirst ? 'Master Bedroom' : 
                       `Bedroom ${i}`;
    
    bedroomAreas.push({
      id: `bedroom${i}`,
      name: bedroomName,
      type: 'bedroom',
      icon: 'bed',
      isDefault: true, // All specified bedrooms are essential
      photos: [],
      inventoryComplete: false,
      condition: AssetCondition.GOOD,
      assets: []
    });
  }

  // Generate bathrooms based on user input  
  const bathroomAreas: PropertyArea[] = [];
  const fullBathrooms = Math.floor(bathrooms);
  const hasHalfBath = bathrooms % 1 !== 0;
  
  for (let i = 1; i <= fullBathrooms; i++) {
    const isFirst = i === 1;
    const bathroomName = fullBathrooms === 1 ? 'Bathroom' : 
                        isFirst ? 'Master Bathroom' : 
                        `Bathroom ${i}`;
    
    bathroomAreas.push({
      id: `bathroom${i}`,
      name: bathroomName,
      type: 'bathroom',
      icon: 'water',
      isDefault: true, // All specified bathrooms are essential
      photos: [],
      inventoryComplete: false,
      condition: AssetCondition.GOOD,
      assets: []
    });
  }
  
  // Add half bathroom if needed
  if (hasHalfBath) {
    bathroomAreas.push({
      id: 'half-bathroom',
      name: 'Half Bathroom',
      type: 'bathroom',
      icon: 'water',
      isDefault: true,
      photos: [],
      inventoryComplete: false,
      condition: AssetCondition.GOOD,
      assets: []
    });
  }

  // Property-type specific optional areas
  const optionalAreas: PropertyArea[] = [];
  
  if (propertyData.type === 'apartment' || propertyData.type === 'condo') {
    optionalAreas.push(
      { id: 'balcony', name: 'Balcony/Patio', type: 'outdoor', icon: 'flower', isDefault: false, photos: [], inventoryComplete: false, condition: AssetCondition.GOOD, assets: [] },
      { id: 'laundry', name: 'Laundry Room', type: 'laundry', icon: 'shirt', isDefault: false, photos: [], inventoryComplete: false, condition: AssetCondition.GOOD, assets: [] },
      { id: 'storage', name: 'Storage Closet', type: 'other', icon: 'archive', isDefault: false, photos: [], inventoryComplete: false, condition: AssetCondition.GOOD, assets: [] }
    );
  } else {
    optionalAreas.push(
      { id: 'garage', name: 'Garage', type: 'garage', icon: 'car', isDefault: false, photos: [], inventoryComplete: false, condition: AssetCondition.GOOD, assets: [] },
      { id: 'yard', name: 'Yard', type: 'outdoor', icon: 'leaf', isDefault: false, photos: [], inventoryComplete: false, condition: AssetCondition.GOOD, assets: [] },
      { id: 'basement', name: 'Basement', type: 'other', icon: 'layers', isDefault: false, photos: [], inventoryComplete: false, condition: AssetCondition.GOOD, assets: [] },
      { id: 'laundry', name: 'Laundry Room', type: 'laundry', icon: 'shirt', isDefault: false, photos: [], inventoryComplete: false, condition: AssetCondition.GOOD, assets: [] }
    );
  }

  return [...essentialAreas, ...bedroomAreas, ...bathroomAreas, ...optionalAreas];
};


const PropertyAreasScreen = () => {
  const navigation = useNavigation<PropertyAreasNavigationProp>();
  const route = useRoute<PropertyAreasRouteProp>();
  const responsive = useResponsive();
  const propertyData = route.params.propertyData;
  const draftId = route.params.draftId;

  // Initialize draft management
  const {
    draftState,
    isLoading: isDraftLoading,
    isSaving,
    lastSaved,
    error: draftError,
    updatePropertyData,
    updateAreas,
    updateCurrentStep,
    saveDraft,
    loadDraft,
    clearError,
  } = usePropertyDraft({ 
    draftId,
    enableAutoSave: true,
    autoSaveDelay: 2000 
  });


  // Initialize areas based on draft state or route params
  const initializeAreas = () => {
    if (draftState?.areas && draftState.areas.length > 0) {
      return draftState.areas;
    }
    return propertyData ? generateDynamicAreas(propertyData) : [];
  };

  const initializeSelectedAreas = () => {
    if (draftState?.areas && draftState.areas.length > 0) {
      return draftState.areas.map(area => area.id);
    }
    const initialAreas = propertyData ? generateDynamicAreas(propertyData) : [];
    return initialAreas.filter(area => area.isDefault).map(area => area.id);
  };

  const [areas, setAreas] = useState<PropertyArea[]>(initializeAreas);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(initializeSelectedAreas);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<PropertyArea['type']>('other');
  const [customRoomName, setCustomRoomName] = useState('');
  const [showRoomTypeDropdown, setShowRoomTypeDropdown] = useState(false);
  
  // Use draft photos if available, otherwise use route params
  const currentPropertyData = draftState?.propertyData || propertyData;
  const [propertyPhotos, setPropertyPhotos] = useState<string[]>(currentPropertyData.photos || []);

  // Sync with draft state when it changes
  useEffect(() => {
    if (draftState) {
      if (draftState.areas && draftState.areas.length > 0) {
        setAreas(draftState.areas);
        setSelectedAreas(draftState.areas.map(area => area.id));
      }
      if (draftState.propertyData.photos) {
        setPropertyPhotos(draftState.propertyData.photos);
      }
    }
  }, [draftState?.areas, draftState?.propertyData?.photos]);

  // Update draft when route property data changes (if no existing draft areas)
  useEffect(() => {
    if (draftState && propertyData && (!draftState.areas || draftState.areas.length === 0)) {
      updatePropertyData(propertyData);
      const newAreas = generateDynamicAreas(propertyData);
      const defaultSelectedAreas = newAreas.filter(area => area.isDefault);
      setAreas(newAreas);
      setSelectedAreas(defaultSelectedAreas.map(area => area.id));
      updateAreas(defaultSelectedAreas);
    }
  }, [draftState?.areas?.length, propertyData?.bedrooms, propertyData?.bathrooms]);

  // Set current step to 1 (areas step)
  useEffect(() => {
    if (draftState && draftState.currentStep !== 1) {
      updateCurrentStep(1);
    }
  }, [draftState?.currentStep]);

  // Handle draft error display
  useEffect(() => {
    if (draftError) {
      Alert.alert('Auto-save Error', draftError, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [draftError]);

  // Property Photos Manager Component
  const PropertyPhotosManager = ({ photos, onPhotosChange }: { photos: string[], onPhotosChange: (photos: string[]) => void }) => {
    const handlePickImages = async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library permission is required to select photos.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.8,
          base64: false,
        });

        if (!result.canceled && result.assets) {
          const newPhotos = result.assets.map(asset => asset.uri);
          
          if (photos.length + newPhotos.length > 20) {
            Alert.alert('Too many photos', 'Maximum 20 property photos allowed. Please select fewer photos.');
            return;
          }
          
          const updatedPhotos = [...photos, ...newPhotos];
          setPropertyPhotos(updatedPhotos);
          onPhotosChange(updatedPhotos);
          
          // Update draft with new photos
          updatePropertyData({ photos: updatedPhotos });
        }
      } catch (error) {
        console.error('Error picking images:', error);
        Alert.alert('Error', 'Failed to pick images. Please try again.');
      }
    };

    const handleTakePhoto = async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to take photos.');
          return;
        }

        if (photos.length >= 20) {
          Alert.alert('Too many photos', 'Maximum 20 property photos allowed.');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          base64: false,
        });

        if (!result.canceled && result.assets) {
          const updatedPhotos = [...photos, result.assets[0].uri];
          setPropertyPhotos(updatedPhotos);
          onPhotosChange(updatedPhotos);
          
          // Update draft with new photo
          updatePropertyData({ photos: updatedPhotos });
        }
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    };

    const removePhoto = (index: number) => {
      const updatedPhotos = photos.filter((_, i) => i !== index);
      setPropertyPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);
      
      // Update draft with removed photo
      updatePropertyData({ photos: updatedPhotos });
    };

    const screenWidth = Dimensions.get('window').width;
    const photoSize = (screenWidth - 60) / 3; // 3 photos per row with margins

    return (
      <View style={styles.propertyPhotosContainer}>
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={index} style={[styles.propertyPhotoContainer, { width: photoSize, height: photoSize }]}>
              <Image source={{ uri: photo }} style={styles.propertyPhoto} />
              <TouchableOpacity
                style={styles.removePropertyPhotoButton}
                onPress={() => removePhoto(index)}
              >
                <Ionicons name="close-circle" size={24} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          ))}
          
          {photos.length < 20 && (
            <>
              <TouchableOpacity 
                style={[styles.addPropertyPhotoButton, { width: photoSize, height: photoSize }]} 
                onPress={handlePickImages}
              >
                <Ionicons name="images" size={28} color="#3498DB" />
                <Text style={styles.addPropertyPhotoText}>Add Photos</Text>
              </TouchableOpacity>
              
              {photos.length < 19 && (
                <TouchableOpacity 
                  style={[styles.addPropertyPhotoButton, { width: photoSize, height: photoSize }]} 
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={28} color="#3498DB" />
                  <Text style={styles.addPropertyPhotoText}>Take Photo</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        
        <View style={styles.photosSummary}>
          <Ionicons name="information-circle" size={16} color="#3498DB" />
          <Text style={styles.photosSummaryText}>
            {photos.length} of 20 property photos added
          </Text>
        </View>
      </View>
    );
  };

  const toggleArea = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    
    // Prevent deselecting essential areas
    if (area?.isDefault && selectedAreas.includes(areaId)) {
      Alert.alert(
        'Essential Area',
        'This area is required for your property type and cannot be removed.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    let updatedSelectedAreas: string[];
    if (selectedAreas.includes(areaId)) {
      updatedSelectedAreas = selectedAreas.filter(id => id !== areaId);
    } else {
      updatedSelectedAreas = [...selectedAreas, areaId];
    }
    
    setSelectedAreas(updatedSelectedAreas);
    
    // Update draft with selected areas
    const selectedAreaData = areas.filter(area => updatedSelectedAreas.includes(area.id));
    updateAreas(selectedAreaData);
  };

  const getIconForRoomType = (type: PropertyArea['type']): string => {
    const iconMap: Record<PropertyArea['type'], string> = {
      'kitchen': 'restaurant',
      'living_room': 'tv',
      'bedroom': 'bed',
      'bathroom': 'water',
      'garage': 'car',
      'outdoor': 'leaf',
      'laundry': 'shirt',
      'other': 'home'
    };
    return iconMap[type] || 'home';
  };


  // Helper function to get room type label
  const getRoomTypeLabel = (type: PropertyArea['type']): string => {
    const typeMap = {
      'bedroom': 'Bedroom',
      'bathroom': 'Bathroom', 
      'living_room': 'Living Room',
      'kitchen': 'Kitchen',
      'laundry': 'Laundry/Utility',
      'garage': 'Garage/Storage',
      'outdoor': 'Outdoor',
      'other': 'Other'
    };
    return typeMap[type] || 'Other';
  };

  const handleAddCustomRoom = () => {
    const roomName = newRoomType === 'other' ? customRoomName.trim() : newRoomName.trim();
    
    if (!roomName) {
      Alert.alert('Invalid Name', newRoomType === 'other' ? 'Please enter a room name.' : 'Please select a room type.');
      return;
    }

    // Check if room name already exists
    if (areas.some(area => area.name.toLowerCase() === roomName.toLowerCase())) {
      Alert.alert('Duplicate Name', 'A room with this name already exists.');
      return;
    }

    const customRoomId = `custom_${Date.now()}`;
    const newRoom: PropertyArea = {
      id: customRoomId,
      name: roomName,
      type: newRoomType,
      icon: getIconForRoomType(newRoomType),
      isDefault: false,
      photos: [],
      inventoryComplete: false,
      condition: AssetCondition.GOOD,
      assets: []
    };

    const updatedAreas = [...areas, newRoom];
    const updatedSelectedAreas = [...selectedAreas, customRoomId];
    
    setAreas(updatedAreas);
    setSelectedAreas(updatedSelectedAreas);
    
    // Update draft with new areas
    const selectedAreaData = updatedAreas.filter(area => updatedSelectedAreas.includes(area.id));
    updateAreas(selectedAreaData);
    
    // Reset form
    setNewRoomName('');
    setCustomRoomName('');
    setNewRoomType('other');
    setShowAddRoomModal(false);
    setShowRoomTypeDropdown(false);
  };


  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [recentlyAddedPhoto, setRecentlyAddedPhoto] = useState<string | null>(null);

  const handleAddPhoto = async (areaId: string) => {
    try {
      setUploadingPhoto(areaId);
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        setUploadingPhoto(null);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets) {
        const imageUri = result.assets[0].uri;
        
        // Validate the image
        const validation = await validateImageFile(imageUri);
        if (!validation.isValid) {
          Alert.alert('Invalid Image', validation.error || 'Please select a valid image.');
          setUploadingPhoto(null);
          return;
        }

        const updatedAreas = areas.map(area => 
          area.id === areaId 
            ? { ...area, photos: [...area.photos, imageUri] }
            : area
        );
        
        setAreas(updatedAreas);
        
        // Update draft with new photo
        const selectedAreaData = updatedAreas.filter(area => selectedAreas.includes(area.id));
        updateAreas(selectedAreaData);
        
        // Show visual success feedback
        setRecentlyAddedPhoto(areaId);
        setTimeout(() => {
          setRecentlyAddedPhoto(null);
        }, 2000); // Clear the success indicator after 2 seconds
      }
    } catch (error) {
      console.error('Error adding photo:', error);
      Alert.alert('Error', 'Failed to add photo. Please try again.');
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleNext = async () => {
    if (isSubmitting || isDraftLoading) return;
    
    try {
      setIsSubmitting(true);
      
      const selectedAreaData = areas.filter(area => selectedAreas.includes(area.id));
      
      if (selectedAreaData.length === 0) {
        Alert.alert('No Areas Selected', 'Please select at least one area to continue.');
        return;
      }
      
      // Save current progress before navigating
      if (draftState) {
        try {
          await saveDraft();
        } catch (error) {
          console.warn('Failed to save draft before navigation:', error);
          // Continue anyway - user can manually save later
        }
      }
      
      // Use draft property data if available, otherwise use route data
      const currentData = draftState?.propertyData || propertyData;
      const updatedPropertyData = {
        ...currentData,
        photos: propertyPhotos,
      };
      
      navigation.navigate('PropertyAssets', { 
        propertyData: updatedPropertyData,
        areas: selectedAreaData,
        draftId: draftState?.id,
      });
    } catch (error) {
      console.error('Error proceeding to next step:', error);
      Alert.alert('Error', 'Failed to proceed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft();
      Alert.alert('Draft Saved', 'Your property draft has been saved successfully.');
    } catch (error) {
      console.error('Failed to save draft:', error);
      Alert.alert('Save Error', 'Failed to save draft. Please try again.');
    }
  };

  const getSelectedAreasWithPhotos = () => {
    return areas.filter(area => selectedAreas.includes(area.id) && area.photos.length > 0).length;
  };

  return (
    <SafeAreaView style={[styles.container, responsive.isWeb && styles.containerWeb]}>
      <View style={[styles.contentWrapper, responsive.maxWidth() as any]}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Property Areas</Text>
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

      {/* Step Counter */}
      <View style={styles.stepCounterContainer}>
        <View style={styles.stepCounterHeader}>
          <Text style={styles.stepCounterTitle}>Property Areas Setup</Text>
          <Text style={styles.stepCounterSubtitle}>3 steps to complete</Text>
        </View>
        
        <View style={styles.stepsRow}>
          <View style={styles.stepItem}>
            <View style={[styles.stepNumber, styles.stepNumberActive]}>
              <Text style={[styles.stepNumberText, styles.stepNumberTextActive]}>1</Text>
            </View>
            <Text style={[styles.stepLabel, styles.stepLabelActive]}>Identify Areas</Text>
          </View>
          
          <View style={styles.stepConnector} />
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepLabel}>Add Photos</Text>
          </View>
          
          <View style={styles.stepConnector} />
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepLabel}>Add Inventory</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Identify Areas Section */}
        <View style={styles.section}>
          <View style={styles.stepSectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 1</Text>
            </View>
            <Text style={styles.title}>Identify Areas in Your Property</Text>
          </View>
          <Text style={styles.subtitle}>
            Based on your property details ({propertyData?.bedrooms} bedrooms, {propertyData?.bathrooms} bathrooms), 
            we've pre-selected the essential areas. Choose additional areas below. On the next screen, you will be able to add photos and provide a list of the inventory in these areas of your home.
          </Text>
        </View>

        {/* Interior Areas Section */}
        {areas.filter(area => ['kitchen', 'living_room', 'bedroom', 'bathroom', 'laundry', 'other'].includes(area.type)).length > 0 && (
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Ionicons name="home" size={20} color="#2ECC71" />
              <Text style={styles.categoryTitle}>Interior Areas</Text>
              <Text style={styles.categoryCount}>
                {areas.filter(area => selectedAreas.includes(area.id) && ['kitchen', 'living_room', 'bedroom', 'bathroom', 'laundry', 'other'].includes(area.type)).length} of {areas.filter(area => ['kitchen', 'living_room', 'bedroom', 'bathroom', 'laundry', 'other'].includes(area.type)).length} selected
              </Text>
            </View>
            
            <View style={styles.areasGrid}>
              {areas.filter(area => ['kitchen', 'living_room', 'bedroom', 'bathroom', 'laundry', 'other'].includes(area.type)).map((area) => {
                const isSelected = selectedAreas.includes(area.id);
                const hasPhotos = area.photos.length > 0;
                
                return (
                  <View key={area.id} style={styles.areaWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.areaCard,
                        isSelected && styles.areaCardSelected,
                        hasPhotos && styles.areaCardWithPhotos,
                        area.isDefault && styles.areaCardEssential, // Special styling only for essential areas
                        recentlyAddedPhoto === area.id && styles.areaCardPhotoSuccess, // Success animation
                      ]}
                      onPress={() => toggleArea(area.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                      </View>
                      
                      <Ionicons
                        name={area.icon as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={isSelected ? '#3498DB' : '#7F8C8D'}
                        style={styles.areaIcon}
                      />
                      
                      <Text style={[styles.areaName, isSelected && styles.areaNameSelected]}>
                        {area.name}
                      </Text>
                      
                      <View style={styles.areaIndicators}>
                        {/* Essential area lock indicator - only for default areas */}
                        {area.isDefault && (
                          <View style={styles.essentialIndicator}>
                            <Ionicons name="lock-closed" size={12} color="#E74C3C" />
                          </View>
                        )}
                        {hasPhotos && (
                          <View style={[
                            styles.photoIndicator,
                            recentlyAddedPhoto === area.id && styles.photoIndicatorSuccess
                          ]}>
                            <Ionicons 
                              name={recentlyAddedPhoto === area.id ? "checkmark-circle" : "image"} 
                              size={12} 
                              color="#FFFFFF" 
                            />
                            <Text style={styles.photoCount}>{area.photos.length}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                    
                    {isSelected && (
                      <TouchableOpacity
                        style={[
                          styles.cameraButton,
                          uploadingPhoto === area.id && styles.cameraButtonUploading
                        ]}
                        onPress={() => handleAddPhoto(area.id)}
                        disabled={uploadingPhoto === area.id}
                      >
                        {uploadingPhoto === area.id ? (
                          <Ionicons name="sync" size={20} color="#3498DB" />
                        ) : (
                          <Ionicons name="camera" size={20} color="#3498DB" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              
              {/* Add Room Button at the bottom of interior areas */}
              <View style={styles.areaWrapper}>
                <TouchableOpacity
                  style={styles.addRoomCard}
                  onPress={() => setShowAddRoomModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, { borderColor: '#3498DB' }]}>
                    <Ionicons name="add" size={16} color="#3498DB" />
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color="#3498DB" style={styles.areaIcon} />
                  <Text style={[styles.areaName, { color: '#3498DB' }]}>Add Custom Room</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Exterior Areas Section */}
        {areas.filter(area => ['garage', 'outdoor'].includes(area.type)).length > 0 && (
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Ionicons name="leaf" size={20} color="#2ECC71" />
              <Text style={styles.categoryTitle}>Exterior Areas</Text>
              <Text style={styles.categoryCount}>
                {areas.filter(area => selectedAreas.includes(area.id) && ['garage', 'outdoor'].includes(area.type)).length} of {areas.filter(area => ['garage', 'outdoor'].includes(area.type)).length} selected
              </Text>
            </View>
            
            <View style={styles.areasGrid}>
              {areas.filter(area => ['garage', 'outdoor'].includes(area.type)).map((area) => {
                const isSelected = selectedAreas.includes(area.id);
                const hasPhotos = area.photos.length > 0;
                
                return (
                  <View key={area.id} style={styles.areaWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.areaCard,
                        isSelected && styles.areaCardSelected,
                        hasPhotos && styles.areaCardWithPhotos,
                        area.isDefault && styles.areaCardEssential, // Special styling only for essential areas
                        recentlyAddedPhoto === area.id && styles.areaCardPhotoSuccess, // Success animation
                      ]}
                      onPress={() => toggleArea(area.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                      </View>
                      
                      <Ionicons
                        name={area.icon as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={isSelected ? '#3498DB' : '#7F8C8D'}
                        style={styles.areaIcon}
                      />
                      
                      <Text style={[styles.areaName, isSelected && styles.areaNameSelected]}>
                        {area.name}
                      </Text>
                      
                      <View style={styles.areaIndicators}>
                        {/* Essential area lock indicator - only for default areas */}
                        {area.isDefault && (
                          <View style={styles.essentialIndicator}>
                            <Ionicons name="lock-closed" size={12} color="#E74C3C" />
                          </View>
                        )}
                        {hasPhotos && (
                          <View style={[
                            styles.photoIndicator,
                            recentlyAddedPhoto === area.id && styles.photoIndicatorSuccess
                          ]}>
                            <Ionicons 
                              name={recentlyAddedPhoto === area.id ? "checkmark-circle" : "image"} 
                              size={12} 
                              color="#FFFFFF" 
                            />
                            <Text style={styles.photoCount}>{area.photos.length}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                    
                    {isSelected && (
                      <TouchableOpacity
                        style={[
                          styles.cameraButton,
                          uploadingPhoto === area.id && styles.cameraButtonUploading
                        ]}
                        onPress={() => handleAddPhoto(area.id)}
                        disabled={uploadingPhoto === area.id}
                      >
                        {uploadingPhoto === area.id ? (
                          <Ionicons name="sync" size={20} color="#3498DB" />
                        ) : (
                          <Ionicons name="camera" size={20} color="#3498DB" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}


        {/* Photo Summary */}
        <View style={styles.photoSummary}>
          <Ionicons name="information-circle" size={20} color="#3498DB" />
          <Text style={styles.photoSummaryText}>
            Photos added: {getSelectedAreasWithPhotos()} of {selectedAreas.length} selected areas
          </Text>
        </View>

        {/* Next Steps Preview */}
        <View style={styles.nextStepsCard}>
          <View style={styles.nextStepsHeader}>
            <Ionicons name="information-circle" size={20} color="#3498DB" />
            <Text style={styles.nextStepsTitle}>What's Next?</Text>
          </View>
          <View style={styles.nextStepsList}>
            <View style={styles.nextStepItem}>
              <View style={styles.nextStepNumber}>
                <Text style={styles.nextStepNumberText}>2</Text>
              </View>
              <Text style={styles.nextStepText}>Add photos for each selected area</Text>
            </View>
            <View style={styles.nextStepItem}>
              <View style={styles.nextStepNumber}>
                <Text style={styles.nextStepNumberText}>3</Text>
              </View>
              <Text style={styles.nextStepText}>Document appliances and assets in each area</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSaveDraft}
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
            (selectedAreas.length === 0 || isSubmitting || isDraftLoading) && styles.nextButtonDisabled
          ]}
          onPress={handleNext}
          disabled={selectedAreas.length === 0 || isSubmitting || isDraftLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {isSubmitting ? 'Processing...' : 'Continue to Photos & Assets'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Custom Room Modal */}
      <Modal
        visible={showAddRoomModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddRoomModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowAddRoomModal(false)}
              activeOpacity={0.7}
              style={styles.modalHeaderButton}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Room</Text>
            <TouchableOpacity 
              onPress={handleAddCustomRoom}
              activeOpacity={0.7}
              style={styles.modalHeaderButton}
            >
              <Text style={styles.modalSaveText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Room Type Dropdown */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Room Type</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowRoomTypeDropdown(!showRoomTypeDropdown)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownContent}>
                  <Ionicons
                    name={getIconForRoomType(newRoomType) as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color="#3498DB"
                  />
                  <Text style={styles.dropdownText}>
                    {getRoomTypeLabel(newRoomType)}
                  </Text>
                </View>
                <Ionicons
                  name={showRoomTypeDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#7F8C8D"
                />
              </TouchableOpacity>
              
              {showRoomTypeDropdown && (
                <View style={styles.dropdownList}>
                  {[
                    { type: 'bedroom' as const, label: 'Bedroom' },
                    { type: 'bathroom' as const, label: 'Bathroom' },
                    { type: 'living_room' as const, label: 'Living Room' },
                    { type: 'kitchen' as const, label: 'Kitchen' },
                    { type: 'laundry' as const, label: 'Laundry/Utility' },
                    { type: 'garage' as const, label: 'Garage/Storage' },
                    { type: 'outdoor' as const, label: 'Outdoor' },
                    { type: 'other' as const, label: 'Other' },
                  ].map((roomType) => (
                    <TouchableOpacity
                      key={roomType.type}
                      style={[
                        styles.dropdownItem,
                        newRoomType === roomType.type && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        setNewRoomType(roomType.type);
                        setShowRoomTypeDropdown(false);
                        if (roomType.type !== 'other') {
                          setNewRoomName(roomType.label);
                        }
                      }}
                    >
                      <Ionicons
                        name={getIconForRoomType(roomType.type) as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color={newRoomType === roomType.type ? '#3498DB' : '#7F8C8D'}
                      />
                      <Text
                        style={[
                          styles.dropdownItemText,
                          newRoomType === roomType.type && styles.dropdownItemTextSelected,
                        ]}
                      >
                        {roomType.label}
                      </Text>
                      {newRoomType === roomType.type && (
                        <Ionicons name="checkmark" size={18} color="#3498DB" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Custom Name Field - Only shown for "Other" */}
            {newRoomType === 'other' && (
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Room Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter custom room name"
                  value={customRoomName}
                  onChangeText={(text) => {
                    setCustomRoomName(text);
                    setNewRoomName(text);
                  }}
                  autoFocus
                />
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
      </View>
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
  contentWrapper: {
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
  stepConnector: {
    height: 2,
    backgroundColor: '#E9ECEF',
    flex: 0.5,
    marginHorizontal: 8,
    marginBottom: 24,
  },
  stepSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  stepBadge: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    lineHeight: 22,
  },
  areasGrid: {
    gap: 8,
    marginBottom: 24,
  },
  areaWrapper: {
    width: '100%',
    position: 'relative',
  },
  areaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    minHeight: 56,
  },
  areaCardSelected: {
    borderColor: '#3498DB',
    backgroundColor: '#E8F4FD',
  },
  areaCardWithPhotos: {
    borderColor: '#2ECC71',
  },
  areaCardEssential: {
    borderColor: '#FED7CC',
    backgroundColor: '#FFF9F7',
  },
  areaCardPhotoSuccess: {
    borderColor: '#2ECC71',
    backgroundColor: '#D5EDDA',
    shadowColor: '#2ECC71',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  essentialIndicator: {
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    padding: 2,
    marginLeft: 4,
  },
  areaIcon: {
    marginLeft: 12,
    marginRight: 10,
  },
  areaIndicators: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#BDC3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ECC71',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  photoIndicatorSuccess: {
    backgroundColor: '#27AE60',
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  photoCount: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  areaName: {
    fontSize: 16,
    color: '#7F8C8D',
    flex: 1,
  },
  areaNameSelected: {
    color: '#3498DB',
    fontWeight: '600',
  },
  defaultLabel: {
    fontSize: 10,
    color: '#95A5A6',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  cameraButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -18,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraButtonUploading: {
    backgroundColor: '#E8F4FD',
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  photoSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  photoSummaryText: {
    fontSize: 14,
    color: '#3498DB',
    flex: 1,
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#7F8C8D',
    flex: 1,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
    gap: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
    color: '#7F8C8D',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  addRoomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498DB',
    borderStyle: 'dashed',
    minHeight: 56,
  },
  addRoomText: {
    fontSize: 14,
    color: '#3498DB',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  modalHeaderButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  modalCancelText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  modalSaveText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  roomTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roomTypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    width: '22%',
    minHeight: 80,
    justifyContent: 'center',
  },
  roomTypeCardSelected: {
    borderColor: '#3498DB',
    backgroundColor: '#E8F4FD',
  },
  roomTypeLabel: {
    fontSize: 11,
    color: '#7F8C8D',
    marginTop: 4,
    textAlign: 'center',
  },
  roomTypeLabelSelected: {
    color: '#3498DB',
    fontWeight: '500',
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
  propertyPhotosContainer: {
    marginBottom: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  propertyPhotoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
  },
  propertyPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removePropertyPhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addPropertyPhotoButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addPropertyPhotoText: {
    fontSize: 11,
    color: '#3498DB',
    fontWeight: '500',
    textAlign: 'center',
  },
  photosSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  photosSummaryText: {
    fontSize: 14,
    color: '#3498DB',
    flex: 1,
  },
  // Enhanced dropdown styles
  dropdownButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 52,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
    gap: 12,
  },
  dropdownItemSelected: {
    backgroundColor: '#E8F4FD',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#2C3E50',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#3498DB',
    fontWeight: '600',
  },
  // Empty state and prominent add button styles
  emptyAdditionalAreas: {
    marginTop: 8,
  },
  addFirstRoomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3498DB',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 56,
  },
  addFirstRoomTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3498DB',
    marginLeft: 12,
  },
  nextStepsCard: {
    backgroundColor: '#E8F4FD',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#D6EAF8',
  },
  nextStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  nextStepsList: {
    gap: 12,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3498DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextStepText: {
    fontSize: 14,
    color: '#34495E',
    flex: 1,
  },
});

export default PropertyAreasScreen;
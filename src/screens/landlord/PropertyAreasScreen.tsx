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
import { PropertyData, PropertyArea } from '../../types/property';
import { validateImageFile } from '../../utils/propertyValidation';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';

type PropertyAreasNavigationProp = NativeStackNavigationProp<LandlordStackParamList>;
type PropertyAreasRouteProp = RouteProp<LandlordStackParamList, 'PropertyAreas'>;

// Move generateDynamicAreas outside component to prevent re-creation
const generateDynamicAreas = (propertyData: PropertyData): PropertyArea[] => {
  const bedrooms = propertyData.bedrooms || 0;
  const bathrooms = propertyData.bathrooms || 0;
  
  // Essential areas that every property should have
  const essentialAreas: PropertyArea[] = [
    { id: 'kitchen', name: 'Kitchen', type: 'kitchen', icon: 'restaurant', isDefault: true, photos: [] },
    { id: 'living', name: 'Living Room', type: 'living_room', icon: 'tv', isDefault: true, photos: [] },
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
      photos: []
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
      photos: []
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
      photos: []
    });
  }

  // Property-type specific optional areas
  const optionalAreas: PropertyArea[] = [];
  
  if (propertyData.type === 'apartment' || propertyData.type === 'condo') {
    optionalAreas.push(
      { id: 'balcony', name: 'Balcony/Patio', type: 'outdoor', icon: 'flower', isDefault: false, photos: [] },
      { id: 'laundry', name: 'Laundry Room', type: 'laundry', icon: 'shirt', isDefault: false, photos: [] },
      { id: 'storage', name: 'Storage Closet', type: 'other', icon: 'archive', isDefault: false, photos: [] }
    );
  } else {
    optionalAreas.push(
      { id: 'garage', name: 'Garage', type: 'garage', icon: 'car', isDefault: false, photos: [] },
      { id: 'yard', name: 'Yard', type: 'outdoor', icon: 'leaf', isDefault: false, photos: [] },
      { id: 'basement', name: 'Basement', type: 'other', icon: 'layers', isDefault: false, photos: [] },
      { id: 'laundry', name: 'Laundry Room', type: 'laundry', icon: 'shirt', isDefault: false, photos: [] }
    );
  }

  return [...essentialAreas, ...bedroomAreas, ...bathroomAreas, ...optionalAreas];
};


const PropertyAreasScreen = () => {
  const navigation = useNavigation<PropertyAreasNavigationProp>();
  const route = useRoute<PropertyAreasRouteProp>();
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
  const [showRoomSuggestions, setShowRoomSuggestions] = useState(false);
  
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

  // Enhanced room suggestions based on property type and existing rooms
  const getRoomSuggestions = (): string[] => {
    const existingRoomNames = areas.map(area => area.name.toLowerCase());
    
    const allSuggestions = [
      // Common additional rooms
      'Home Office', 'Study', 'Den', 'Family Room', 'Dining Room',
      'Pantry', 'Walk-in Closet', 'Utility Room', 'Mudroom',
      'Guest Bedroom', 'Master Closet', 'Powder Room',
      
      // Storage areas
      'Storage Room', 'Attic', 'Cellar', 'Loft', 'Bonus Room',
      
      // Outdoor spaces
      'Patio', 'Deck', 'Balcony', 'Garden', 'Pool Area', 'Courtyard',
      
      // Specialty rooms
      'Workshop', 'Craft Room', 'Exercise Room', 'Game Room',
      'Wine Cellar', 'Bar Area', 'Library', 'Media Room',
      
      // Property-specific
      ...(propertyData.type === 'house' ? [
        'Garage', 'Driveway', 'Front Yard', 'Back Yard', 'Shed'
      ] : []),
      
      ...(propertyData.type === 'apartment' || propertyData.type === 'condo' ? [
        'Balcony', 'Storage Unit', 'Parking Space'
      ] : [])
    ];
    
    // Filter out rooms that already exist
    return allSuggestions.filter(suggestion => 
      !existingRoomNames.includes(suggestion.toLowerCase())
    ).slice(0, 12); // Show top 12 suggestions
  };

  const handleAddCustomRoom = () => {
    if (!newRoomName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a room name.');
      return;
    }

    // Check if room name already exists
    if (areas.some(area => area.name.toLowerCase() === newRoomName.trim().toLowerCase())) {
      Alert.alert('Duplicate Name', 'A room with this name already exists.');
      return;
    }

    const customRoomId = `custom_${Date.now()}`;
    const newRoom: PropertyArea = {
      id: customRoomId,
      name: newRoomName.trim(),
      type: newRoomType,
      icon: getIconForRoomType(newRoomType),
      isDefault: false,
      photos: []
    };

    const updatedAreas = [...areas, newRoom];
    const updatedSelectedAreas = [...selectedAreas, customRoomId];
    
    setAreas(updatedAreas);
    setSelectedAreas(updatedSelectedAreas);
    
    // Update draft with new areas
    const selectedAreaData = updatedAreas.filter(area => updatedSelectedAreas.includes(area.id));
    updateAreas(selectedAreaData);
    
    setNewRoomName('');
    setNewRoomType('other');
    setShowAddRoomModal(false);
    setShowRoomSuggestions(false);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setNewRoomName(suggestion);
    setShowRoomSuggestions(false);
    
    // Auto-suggest room type based on name
    const lowerSuggestion = suggestion.toLowerCase();
    if (lowerSuggestion.includes('bedroom') || lowerSuggestion.includes('closet')) {
      setNewRoomType('bedroom');
    } else if (lowerSuggestion.includes('bathroom') || lowerSuggestion.includes('powder')) {
      setNewRoomType('bathroom');
    } else if (lowerSuggestion.includes('kitchen') || lowerSuggestion.includes('dining') || lowerSuggestion.includes('pantry')) {
      setNewRoomType('kitchen');
    } else if (lowerSuggestion.includes('living') || lowerSuggestion.includes('family') || lowerSuggestion.includes('den')) {
      setNewRoomType('living_room');
    } else if (lowerSuggestion.includes('laundry') || lowerSuggestion.includes('utility')) {
      setNewRoomType('laundry');
    } else if (lowerSuggestion.includes('garage') || lowerSuggestion.includes('storage') || lowerSuggestion.includes('attic')) {
      setNewRoomType('garage');
    } else if (lowerSuggestion.includes('patio') || lowerSuggestion.includes('deck') || lowerSuggestion.includes('yard') || lowerSuggestion.includes('garden')) {
      setNewRoomType('outdoor');
    } else {
      setNewRoomType('other');
    }
  };

  const handleAddPhoto = async (areaId: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
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
      }
    } catch (error) {
      console.error('Error adding photo:', error);
      Alert.alert('Error', 'Failed to add photo. Please try again.');
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
    <SafeAreaView style={styles.container}>
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

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '40%' }]} />
        </View>
        <Text style={styles.progressText}>Step 2 of 5: Photos & Areas</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Property Photos Section */}
        <View style={styles.section}>
          <Text style={styles.title}>Property Photos</Text>
          <Text style={styles.subtitle}>
            Add photos of your property's exterior, main areas, and overall appeal. These help tenants get a complete picture.
          </Text>
          
          <PropertyPhotosManager 
            photos={propertyPhotos}
            onPhotosChange={(photos) => {
              setPropertyPhotos(photos);
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Select Areas in Your Property</Text>
          <Text style={styles.subtitle}>
            Based on your property details ({propertyData?.bedrooms} bedrooms, {propertyData?.bathrooms} bathrooms), 
            we've pre-selected the essential areas. Choose additional areas as needed.
          </Text>
        </View>

        {/* Essential Areas Section */}
        {areas.filter(area => area.isDefault).length > 0 && (
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
              <Text style={styles.categoryTitle}>Essential Areas</Text>
              <Text style={styles.categoryCount}>
                {areas.filter(area => area.isDefault && selectedAreas.includes(area.id)).length} of {areas.filter(area => area.isDefault).length} selected
              </Text>
            </View>
            
            <View style={styles.areasGrid}>
              {areas.filter(area => area.isDefault).map((area) => {
                const isSelected = selectedAreas.includes(area.id);
                const hasPhotos = area.photos.length > 0;
                
                return (
                  <View key={area.id} style={styles.areaWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.areaCard,
                        isSelected && styles.areaCardSelected,
                        hasPhotos && styles.areaCardWithPhotos,
                      ]}
                      onPress={() => toggleArea(area.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.areaHeader}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                        </View>
                        {hasPhotos && (
                          <View style={styles.photoIndicator}>
                            <Ionicons name="image" size={12} color="#FFFFFF" />
                            <Text style={styles.photoCount}>{area.photos.length}</Text>
                          </View>
                        )}
                      </View>
                      
                      <Ionicons
                        name={area.icon as keyof typeof Ionicons.glyphMap}
                        size={32}
                        color={isSelected ? '#3498DB' : '#7F8C8D'}
                      />
                      <Text style={[styles.areaName, isSelected && styles.areaNameSelected]}>
                        {area.name}
                      </Text>
                    </TouchableOpacity>
                    
                    {isSelected && (
                      <TouchableOpacity
                        style={styles.cameraButton}
                        onPress={() => handleAddPhoto(area.id)}
                      >
                        <Ionicons name="camera" size={20} color="#3498DB" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Additional Areas Section */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Ionicons name="add-circle-outline" size={20} color="#3498DB" />
            <Text style={styles.categoryTitle}>Additional Areas</Text>
            {areas.filter(area => !area.isDefault).length > 0 && (
              <Text style={styles.categoryCount}>
                {areas.filter(area => !area.isDefault && selectedAreas.includes(area.id)).length} of {areas.filter(area => !area.isDefault).length} selected
              </Text>
            )}
          </View>
          
          {areas.filter(area => !area.isDefault).length === 0 ? (
            // No additional areas - prominent add button
            <View style={styles.emptyAdditionalAreas}>
              <TouchableOpacity
                style={styles.addFirstRoomCard}
                onPress={() => setShowAddRoomModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={48} color="#3498DB" />
                <Text style={styles.addFirstRoomTitle}>Add a Room</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Existing additional areas grid
            <View style={styles.areasGrid}>
              {areas.filter(area => !area.isDefault).map((area) => {
                const isSelected = selectedAreas.includes(area.id);
                const hasPhotos = area.photos.length > 0;
                
                return (
                  <View key={area.id} style={styles.areaWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.areaCard,
                        isSelected && styles.areaCardSelected,
                        hasPhotos && styles.areaCardWithPhotos,
                      ]}
                      onPress={() => toggleArea(area.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.areaHeader}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                        </View>
                        {hasPhotos && (
                          <View style={styles.photoIndicator}>
                            <Ionicons name="image" size={12} color="#FFFFFF" />
                            <Text style={styles.photoCount}>{area.photos.length}</Text>
                          </View>
                        )}
                      </View>
                      
                      <Ionicons
                        name={area.icon as keyof typeof Ionicons.glyphMap}
                        size={32}
                        color={isSelected ? '#3498DB' : '#7F8C8D'}
                      />
                      <Text style={[styles.areaName, isSelected && styles.areaNameSelected]}>
                        {area.name}
                      </Text>
                    </TouchableOpacity>
                    
                    {isSelected && (
                      <TouchableOpacity
                        style={styles.cameraButton}
                        onPress={() => handleAddPhoto(area.id)}
                      >
                        <Ionicons name="camera" size={20} color="#3498DB" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              
              {/* Add Another Custom Room Button */}
              <View style={styles.areaWrapper}>
                <TouchableOpacity
                  style={styles.addRoomCard}
                  onPress={() => setShowAddRoomModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={32} color="#3498DB" />
                  <Text style={styles.addRoomText}>Add Another Room</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Photo Summary */}
        <View style={styles.photoSummary}>
          <Ionicons name="information-circle" size={20} color="#3498DB" />
          <Text style={styles.photoSummaryText}>
            Photos added: {getSelectedAreasWithPhotos()} of {selectedAreas.length} selected areas
          </Text>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Smart Area Selection</Text>
          <View style={styles.tip}>
            <Ionicons name="bulb" size={16} color="#F39C12" />
            <Text style={styles.tipText}>Areas automatically generated from your property details</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="add-circle" size={16} color="#3498DB" />
            <Text style={styles.tipText}>Add custom rooms with smart suggestions and auto-categorization</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="bulb-outline" size={16} color="#9B59B6" />
            <Text style={styles.tipText}>Get room suggestions based on your property type and existing areas</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="camera" size={16} color="#2ECC71" />
            <Text style={styles.tipText}>Take photos to help tenants identify each area</Text>
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
            {isSubmitting ? 'Processing...' : 'Add Assets'}
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
            <Text style={styles.modalTitle}>Add Custom Room</Text>
            <TouchableOpacity 
              onPress={handleAddCustomRoom}
              activeOpacity={0.7}
              style={styles.modalHeaderButton}
            >
              <Text style={styles.modalSaveText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Room Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Home Office, Den, Pantry"
                value={newRoomName}
                onChangeText={(text) => {
                  setNewRoomName(text);
                  setShowRoomSuggestions(text.length === 0);
                }}
                onFocus={() => setShowRoomSuggestions(newRoomName.length === 0)}
                autoFocus
              />
              
              {/* Quick suggestions button */}
              <TouchableOpacity 
                style={styles.suggestionsButton}
                onPress={() => setShowRoomSuggestions(!showRoomSuggestions)}
              >
                <Ionicons name="bulb-outline" size={16} color="#3498DB" />
                <Text style={styles.suggestionsButtonText}>Show Suggestions</Text>
                <Ionicons 
                  name={showRoomSuggestions ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#3498DB" 
                />
              </TouchableOpacity>
              
              {/* Room suggestions */}
              {showRoomSuggestions && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Popular room types:</Text>
                  <View style={styles.suggestionsGrid}>
                    {getRoomSuggestions().map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionChip}
                        onPress={() => handleSuggestionPress(suggestion)}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Room Type</Text>
              <View style={styles.roomTypeGrid}>
                {[
                  { type: 'bedroom' as const, label: 'Bedroom', icon: 'bed', desc: 'Sleeping areas, closets' },
                  { type: 'bathroom' as const, label: 'Bathroom', icon: 'water', desc: 'Full & half baths' },
                  { type: 'living_room' as const, label: 'Living Space', icon: 'tv', desc: 'Living, family, den' },
                  { type: 'kitchen' as const, label: 'Kitchen/Dining', icon: 'restaurant', desc: 'Kitchen, dining, pantry' },
                  { type: 'laundry' as const, label: 'Utility', icon: 'construct', desc: 'Laundry, utility, mudroom' },
                  { type: 'garage' as const, label: 'Storage', icon: 'archive', desc: 'Garage, storage, attic' },
                  { type: 'outdoor' as const, label: 'Outdoor', icon: 'leaf', desc: 'Patio, yard, deck' },
                  { type: 'other' as const, label: 'Other', icon: 'home', desc: 'Office, gym, specialty' },
                ].map((roomType) => (
                  <TouchableOpacity
                    key={roomType.type}
                    style={[
                      styles.roomTypeCard,
                      newRoomType === roomType.type && styles.roomTypeCardSelected,
                    ]}
                    onPress={() => setNewRoomType(roomType.type)}
                  >
                    <Ionicons
                      name={roomType.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={newRoomType === roomType.type ? '#3498DB' : '#7F8C8D'}
                    />
                    <Text
                      style={[
                        styles.roomTypeLabel,
                        newRoomType === roomType.type && styles.roomTypeLabelSelected,
                      ]}
                    >
                      {roomType.label}
                    </Text>
                    <Text
                      style={[
                        styles.roomTypeDesc,
                        newRoomType === roomType.type && styles.roomTypeDescSelected,
                      ]}
                    >
                      {roomType.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  areaWrapper: {
    width: '48%',
    position: 'relative',
  },
  areaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    minHeight: 120,
  },
  areaCardSelected: {
    borderColor: '#3498DB',
    backgroundColor: '#E8F4FD',
  },
  areaCardWithPhotos: {
    borderColor: '#2ECC71',
  },
  areaHeader: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  photoCount: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  areaName: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 8,
    textAlign: 'center',
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
    bottom: -10,
    right: '35%',
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
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498DB',
    borderStyle: 'dashed',
    minHeight: 120,
    justifyContent: 'center',
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
  // Enhanced custom room styles
  suggestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  suggestionsButtonText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
    flex: 1,
  },
  suggestionsContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionText: {
    fontSize: 13,
    color: '#2C3E50',
    fontWeight: '500',
  },
  roomTypeDesc: {
    fontSize: 11,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },
  roomTypeDescSelected: {
    color: '#3498DB',
  },
  // Empty state and prominent add button styles
  emptyAdditionalAreas: {
    marginTop: 8,
  },
  addFirstRoomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8F4FD',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addFirstRoomTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default PropertyAreasScreen;
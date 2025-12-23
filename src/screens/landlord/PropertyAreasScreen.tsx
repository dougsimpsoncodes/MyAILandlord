import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PropertyData, PropertyArea, AssetCondition } from '../../types/property';
import { validateImageFile } from '../../utils/propertyValidation';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import { PropertyDraftService } from '../../services/storage/PropertyDraftService';
import { useAppAuth } from '../../context/SupabaseAuthContext';
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';
import { useApiClient } from '../../services/api/client';
import { clearOnboardingInProgress } from '../../hooks/useOnboardingStatus';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import Input from '../../components/shared/Input';
import { DesignSystem } from '../../theme/DesignSystem';

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
  const { user } = useAppAuth();
  const { supabase } = useSupabaseWithAuth();
  const api = useApiClient();
  const propertyData = route.params.propertyData;
  const draftId = route.params.draftId;
  const propertyId = route.params.propertyId; // For existing properties from database
  const existingAreas = route.params.existingAreas; // Areas loaded from database
  const isOnboarding = (route.params as any)?.isOnboarding || false; // Check if in onboarding mode

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


  // Initialize areas based on existing areas (from DB), draft state, or generate new
  const initializeAreas = () => {
    // Priority 1: Use existing areas from database (for existing properties)
    if (existingAreas && existingAreas.length > 0) {
      return existingAreas;
    }
    // Priority 2: Use draft state areas
    if (draftState?.areas && draftState.areas.length > 0) {
      return draftState.areas;
    }
    // Priority 3: Generate new areas based on property data
    return propertyData ? generateDynamicAreas(propertyData) : [];
  };

  const initializeSelectedAreas = () => {
    // Priority 1: Use existing areas from database (all are selected)
    if (existingAreas && existingAreas.length > 0) {
      return existingAreas.map(area => area.id);
    }
    // Priority 2: Use draft state areas
    if (draftState?.areas && draftState.areas.length > 0) {
      return draftState.areas.map(area => area.id);
    }
    // Start with no areas selected - user chooses what they want
    return [];
  };

  const [areas, setAreas] = useState<PropertyArea[]>(initializeAreas);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(initializeSelectedAreas);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<PropertyArea['type']>('other');
  const [customRoomName, setCustomRoomName] = useState('');
  const [showRoomTypeDropdown, setShowRoomTypeDropdown] = useState(false);

  // Room counts for +/- counter UI
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({
    kitchen: 1,
    living_room: 1,
    garage: 0,
    outdoor: 0,
    laundry: 0,
  });
  
  // Use draft photos if available, otherwise use route params
  const currentPropertyData = draftState?.propertyData || propertyData;
  const [propertyPhotos, setPropertyPhotos] = useState<string[]>(currentPropertyData.photos || []);
  const isInitialized = useRef(false);

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

  // Update draft when route property data changes (if no existing draft areas) - only run once
  useEffect(() => {
    if (!isInitialized.current && draftState && propertyData && (!draftState.areas || draftState.areas.length === 0)) {
      isInitialized.current = true;
      updatePropertyData(propertyData);
      const newAreas = generateDynamicAreas(propertyData);
      const defaultSelectedAreas = newAreas.filter(area => area.isDefault);
      setAreas(newAreas);
      setSelectedAreas(defaultSelectedAreas.map(area => area.id));
      updateAreas(defaultSelectedAreas);
    }
  }, [draftState, propertyData]);

  // Set current step to 1 (areas step) - only run once
  useEffect(() => {
    if (draftState && draftState.currentStep !== 1) {
      updateCurrentStep(1);
    }
  }, []); // Remove dependency to prevent infinite loop

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
                activeOpacity={0.7}
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
                activeOpacity={0.7}
              >
                <Ionicons name="images" size={28} color="#3498DB" />
                <Text style={styles.addPropertyPhotoText}>Add Photos</Text>
              </TouchableOpacity>
              
              {photos.length < 19 && (
                <TouchableOpacity 
                  style={[styles.addPropertyPhotoButton, { width: photoSize, height: photoSize }]} 
                  onPress={handleTakePhoto}
                  activeOpacity={0.7}
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

  // Generate room name based on type and count
  const generateRoomName = (type: string, count: number, index: number): string => {
    const typeNames: Record<string, string> = {
      kitchen: 'Kitchen',
      living_room: 'Living Room',
      garage: 'Garage',
      outdoor: 'Yard',
      laundry: 'Laundry Room',
    };

    const baseName = typeNames[type] || 'Room';

    if (count === 1) return baseName;
    if (index === 0) return `Main ${baseName}`;
    return `${baseName} ${index + 1}`;
  };

  // Generate areas from room counts
  const generateAreasFromCounts = (): PropertyArea[] => {
    const generatedAreas: PropertyArea[] = [];

    // Add bedrooms and bathrooms as read-only (from PropertyBasicsScreen)
    const bedrooms = propertyData?.bedrooms || 0;
    const bathrooms = propertyData?.bathrooms || 0;

    for (let i = 1; i <= bedrooms; i++) {
      const isFirst = i === 1;
      const bedroomName = bedrooms === 1 ? 'Bedroom' :
                         isFirst ? 'Master Bedroom' :
                         `Bedroom ${i}`;

      generatedAreas.push({
        id: `bedroom${i}`,
        name: bedroomName,
        type: 'bedroom',
        icon: 'bed',
        isDefault: true,
        photos: [],
        inventoryComplete: false,
        condition: AssetCondition.GOOD,
        assets: []
      });
    }

    const fullBathrooms = Math.floor(bathrooms);
    const hasHalfBath = bathrooms % 1 !== 0;

    for (let i = 1; i <= fullBathrooms; i++) {
      const isFirst = i === 1;
      const bathroomName = fullBathrooms === 1 ? 'Bathroom' :
                          isFirst ? 'Master Bathroom' :
                          `Bathroom ${i}`;

      generatedAreas.push({
        id: `bathroom${i}`,
        name: bathroomName,
        type: 'bathroom',
        icon: 'water',
        isDefault: true,
        photos: [],
        inventoryComplete: false,
        condition: AssetCondition.GOOD,
        assets: []
      });
    }

    if (hasHalfBath) {
      generatedAreas.push({
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

    // Generate rooms from counters
    Object.entries(roomCounts).forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        const icon = getIconForRoomType(type as PropertyArea['type']);
        generatedAreas.push({
          id: `${type}${i + 1}`,
          name: generateRoomName(type, count, i),
          type: type as PropertyArea['type'],
          icon,
          isDefault: false,
          photos: [],
          inventoryComplete: false,
          condition: AssetCondition.GOOD,
          assets: []
        });
      }
    });

    return generatedAreas;
  };

  // Increment room count
  const incrementRoom = (type: string) => {
    const maxCounts: Record<string, number> = {
      kitchen: 4,
      living_room: 4,
      garage: 2,
      outdoor: 4,
      laundry: 2,
    };

    const max = maxCounts[type] || 4;
    const current = roomCounts[type] || 0;

    if (current < max) {
      setRoomCounts(prev => {
        const newCounts = { ...prev, [type]: current + 1 };

        // Generate new areas based on updated counts - need to do it in callback
        setTimeout(() => {
          const generatedAreas: PropertyArea[] = [];

          // Add bedrooms and bathrooms as read-only (from PropertyBasicsScreen)
          const bedrooms = propertyData?.bedrooms || 0;
          const bathrooms = propertyData?.bathrooms || 0;

          for (let i = 1; i <= bedrooms; i++) {
            const isFirst = i === 1;
            const bedroomName = bedrooms === 1 ? 'Bedroom' :
                               isFirst ? 'Master Bedroom' :
                               `Bedroom ${i}`;

            generatedAreas.push({
              id: `bedroom${i}`,
              name: bedroomName,
              type: 'bedroom',
              icon: 'bed',
              isDefault: true,
              photos: [],
              inventoryComplete: false,
              condition: AssetCondition.GOOD,
              assets: []
            });
          }

          const fullBathrooms = Math.floor(bathrooms);
          const hasHalfBath = bathrooms % 1 !== 0;

          for (let i = 1; i <= fullBathrooms; i++) {
            const isFirst = i === 1;
            const bathroomName = fullBathrooms === 1 ? 'Bathroom' :
                                isFirst ? 'Master Bathroom' :
                                `Bathroom ${i}`;

            generatedAreas.push({
              id: `bathroom${i}`,
              name: bathroomName,
              type: 'bathroom',
              icon: 'water',
              isDefault: true,
              photos: [],
              inventoryComplete: false,
              condition: AssetCondition.GOOD,
              assets: []
            });
          }

          if (hasHalfBath) {
            generatedAreas.push({
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

          // Generate rooms from counters
          Object.entries(newCounts).forEach(([roomType, count]) => {
            for (let i = 0; i < count; i++) {
              const icon = getIconForRoomType(roomType as PropertyArea['type']);
              const typeNames: Record<string, string> = {
                kitchen: 'Kitchen',
                living_room: 'Living Room',
                garage: 'Garage',
                outdoor: 'Yard',
                laundry: 'Laundry Room',
              };
              const baseName = typeNames[roomType] || 'Room';
              let roomName = baseName;
              if (count > 1) {
                roomName = i === 0 ? `Main ${baseName}` : `${baseName} ${i + 1}`;
              }

              generatedAreas.push({
                id: `${roomType}${i + 1}`,
                name: roomName,
                type: roomType as PropertyArea['type'],
                icon,
                isDefault: false,
                photos: [],
                inventoryComplete: false,
                condition: AssetCondition.GOOD,
                assets: []
              });
            }
          });

          setAreas(generatedAreas);
          updateAreas(generatedAreas);
        }, 0);

        return newCounts;
      });
    }
  };

  // Decrement room count
  const decrementRoom = (type: string) => {
    const current = roomCounts[type] || 0;

    if (current > 0) {
      setRoomCounts(prev => {
        const newCounts = { ...prev, [type]: current - 1 };

        // Generate new areas based on updated counts - need to do it in callback
        setTimeout(() => {
          const generatedAreas: PropertyArea[] = [];

          // Add bedrooms and bathrooms as read-only (from PropertyBasicsScreen)
          const bedrooms = propertyData?.bedrooms || 0;
          const bathrooms = propertyData?.bathrooms || 0;

          for (let i = 1; i <= bedrooms; i++) {
            const isFirst = i === 1;
            const bedroomName = bedrooms === 1 ? 'Bedroom' :
                               isFirst ? 'Master Bedroom' :
                               `Bedroom ${i}`;

            generatedAreas.push({
              id: `bedroom${i}`,
              name: bedroomName,
              type: 'bedroom',
              icon: 'bed',
              isDefault: true,
              photos: [],
              inventoryComplete: false,
              condition: AssetCondition.GOOD,
              assets: []
            });
          }

          const fullBathrooms = Math.floor(bathrooms);
          const hasHalfBath = bathrooms % 1 !== 0;

          for (let i = 1; i <= fullBathrooms; i++) {
            const isFirst = i === 1;
            const bathroomName = fullBathrooms === 1 ? 'Bathroom' :
                                isFirst ? 'Master Bathroom' :
                                `Bathroom ${i}`;

            generatedAreas.push({
              id: `bathroom${i}`,
              name: bathroomName,
              type: 'bathroom',
              icon: 'water',
              isDefault: true,
              photos: [],
              inventoryComplete: false,
              condition: AssetCondition.GOOD,
              assets: []
            });
          }

          if (hasHalfBath) {
            generatedAreas.push({
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

          // Generate rooms from counters
          Object.entries(newCounts).forEach(([roomType, count]) => {
            for (let i = 0; i < count; i++) {
              const icon = getIconForRoomType(roomType as PropertyArea['type']);
              const typeNames: Record<string, string> = {
                kitchen: 'Kitchen',
                living_room: 'Living Room',
                garage: 'Garage',
                outdoor: 'Yard',
                laundry: 'Laundry Room',
              };
              const baseName = typeNames[roomType] || 'Room';
              let roomName = baseName;
              if (count > 1) {
                roomName = i === 0 ? `Main ${baseName}` : `${baseName} ${i + 1}`;
              }

              generatedAreas.push({
                id: `${roomType}${i + 1}`,
                name: roomName,
                type: roomType as PropertyArea['type'],
                icon,
                isDefault: false,
                photos: [],
                inventoryComplete: false,
                condition: AssetCondition.GOOD,
                assets: []
              });
            }
          });

          setAreas(generatedAreas);
          updateAreas(generatedAreas);
        }, 0);

        return newCounts;
      });
    }
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
      
      // Show options for camera or gallery
      Alert.alert(
        'Add Photo',
        'Choose how you want to add a photo',
        [
          {
            text: 'Camera',
            onPress: () => handleCameraPhoto(areaId),
          },
          {
            text: 'Gallery',
            onPress: () => handleGalleryPhoto(areaId),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setUploadingPhoto(null),
          },
        ]
      );
    } catch (error) {
      console.error('Error adding photo:', error);
      Alert.alert('Error', 'Failed to add photo. Please try again.');
      setUploadingPhoto(null);
    }
  };

  const handleCameraPhoto = async (areaId: string) => {
    try {
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
        await processAreaPhoto(areaId, result.assets[0].uri);
      } else {
        setUploadingPhoto(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setUploadingPhoto(null);
    }
  };

  const handleGalleryPhoto = async (areaId: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required to select photos.');
        setUploadingPhoto(null);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets) {
        await processAreaPhoto(areaId, result.assets[0].uri);
      } else {
        setUploadingPhoto(null);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to pick photo. Please try again.');
      setUploadingPhoto(null);
    }
  };

  const processAreaPhoto = async (areaId: string, imageUri: string) => {
    try {
      // Validate the image
      const validation = await validateImageFile(imageUri);

      if (!validation.isValid) {
        console.error('Image validation failed:', validation.error);
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
    } catch (error) {
      console.error('Error processing photo:', error);
      Alert.alert('Error', 'Failed to process photo. Please try again.');
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleNext = async () => {
    if (isSubmitting || isDraftLoading) return;

    try {
      setIsSubmitting(true);

      // With counter system, all generated areas are included (no selection)
      const areasToSave = areas;

      if (areasToSave.length === 0) {
        Alert.alert('No Areas', 'Please add at least one area to continue.');
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

      // Save current draft ID for page refresh persistence (step 2)
      if (user?.id && draftState?.id) {
        await PropertyDraftService.setCurrentDraftId(user.id, draftState.id, 2);
      }

      // Navigate based on context
      if (isOnboarding) {
        // In onboarding mode, create property and save areas to database, then go to PropertyAssets (photos/inventory)
        try {
          // Ensure API is ready
          if (!api) {
            throw new Error('Authentication required');
          }

          // Create the property first
          const propertyPayload = {
            name: updatedPropertyData.name,
            address_jsonb: updatedPropertyData.address,
            property_type: updatedPropertyData.type,
            unit: updatedPropertyData.unit || '',
            bedrooms: updatedPropertyData.bedrooms || 0,
            bathrooms: updatedPropertyData.bathrooms || 0
          };

          const newProperty = await api.createProperty(propertyPayload);

          // Save areas and assets to the new property
          let savedAreas = areasToSave;
          if (areasToSave.length > 0) {
            const { propertyAreasService } = await import('../../services/supabase/propertyAreasService');
            await propertyAreasService.saveAreasAndAssets(newProperty.id, areasToSave, supabase);

            // Fetch the saved areas from database to get proper UUIDs
            savedAreas = await propertyAreasService.getAreasWithAssets(newProperty.id, supabase);
          }

          // Clear onboarding in-progress flag since property is now created
          await clearOnboardingInProgress();

          // Navigate to PropertyAssets for photos and inventory during onboarding
          navigation.navigate('PropertyAssets', {
            propertyData: updatedPropertyData,
            areas: savedAreas, // Use areas with proper UUIDs from database
            draftId: draftState?.id,
            propertyId: newProperty.id,
            isOnboarding: true, // Pass onboarding flag
            firstName: (route.params as any)?.firstName || 'there', // Pass for final screen
          });
        } catch (error) {
          console.error('Error in onboarding save:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          Alert.alert('Error', `Failed to save property: ${errorMessage}`);
          return;
        }
      } else {
        // Regular flow - go to PropertyAssets
        navigation.navigate('PropertyAssets', {
          propertyData: updatedPropertyData,
          areas: areasToSave,
          draftId: draftState?.id,
          propertyId, // Pass property ID for existing properties
        });
      }
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
      title="Continue"
      onPress={handleNext}
      type="primary"
      size="lg"
      fullWidth
      disabled={areas.length === 0 || isSubmitting || isDraftLoading}
    />
  );

  return (
    <ScreenContainer
      title="Select Rooms"
      subtitle="Step 2 of 4"
      showBackButton
      onBackPress={() => navigation.goBack()}
      headerRight={headerRight}
      userRole="landlord"
      scrollable
      bottomContent={bottomContent}
    >
        {/* Header Section */}
        <View style={styles.section}>
          <View style={styles.headerSection}>
            <Text style={styles.title}>Property Areas</Text>
          </View>
          <Text style={styles.subtitle}>
            Add the areas in your property. Properties with varied layouts are supported.
          </Text>
        </View>

        {/* Read-Only: Bedrooms & Bathrooms from PropertyBasicsScreen */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Ionicons name="bed" size={20} color="#9CA3AF" />
            <Text style={styles.categoryTitle}>From Property Basics</Text>
          </View>

          {/* Bedrooms - Read Only */}
          <View style={styles.readOnlyRow}>
            <View style={styles.readOnlyIconContainer}>
              <Ionicons name="bed" size={24} color="#7F8C8D" />
            </View>
            <Text style={styles.readOnlyLabel}>Bedrooms</Text>
            <View style={styles.readOnlyBadge}>
              <Text style={styles.readOnlyCount}>{propertyData?.bedrooms || 0}</Text>
            </View>
          </View>

          {/* Bathrooms - Read Only */}
          <View style={styles.readOnlyRow}>
            <View style={styles.readOnlyIconContainer}>
              <Ionicons name="water" size={24} color="#7F8C8D" />
            </View>
            <Text style={styles.readOnlyLabel}>Bathrooms</Text>
            <View style={styles.readOnlyBadge}>
              <Text style={styles.readOnlyCount}>{propertyData?.bathrooms || 0}</Text>
            </View>
          </View>
        </View>

        {/* Counter Section: Other Rooms */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Ionicons name="home" size={20} color="#2ECC71" />
            <Text style={styles.categoryTitle}>Additional Areas</Text>
          </View>
          <Text style={styles.counterHelp}>
            Use +/− to add multiple instances (e.g., 2 kitchens)
          </Text>

          {/* Kitchen Counter */}
          <View style={styles.counterRow}>
            <View style={styles.counterLeft}>
              <View style={styles.counterIconContainer}>
                <Ionicons name="restaurant" size={24} color="#3498DB" />
              </View>
              <Text style={styles.counterLabel}>Kitchen</Text>
            </View>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={[styles.counterButton, roomCounts.kitchen === 0 && styles.counterButtonDisabled]}
                onPress={() => decrementRoom('kitchen')}
                disabled={roomCounts.kitchen === 0}
              >
                <Ionicons name="remove" size={20} color={roomCounts.kitchen === 0 ? '#BDC3C7' : '#3498DB'} />
              </TouchableOpacity>
              <View style={styles.counterDisplay}>
                <Text style={styles.counterNumber}>{roomCounts.kitchen}</Text>
              </View>
              <TouchableOpacity
                style={[styles.counterButton, roomCounts.kitchen === 4 && styles.counterButtonDisabled]}
                onPress={() => incrementRoom('kitchen')}
                disabled={roomCounts.kitchen === 4}
              >
                <Ionicons name="add" size={20} color={roomCounts.kitchen === 4 ? '#BDC3C7' : '#3498DB'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Living Room Counter */}
          <View style={styles.counterRow}>
            <View style={styles.counterLeft}>
              <View style={styles.counterIconContainer}>
                <Ionicons name="tv" size={24} color="#3498DB" />
              </View>
              <Text style={styles.counterLabel}>Living Room</Text>
            </View>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={[styles.counterButton, roomCounts.living_room === 0 && styles.counterButtonDisabled]}
                onPress={() => decrementRoom('living_room')}
                disabled={roomCounts.living_room === 0}
              >
                <Ionicons name="remove" size={20} color={roomCounts.living_room === 0 ? '#BDC3C7' : '#3498DB'} />
              </TouchableOpacity>
              <View style={styles.counterDisplay}>
                <Text style={styles.counterNumber}>{roomCounts.living_room}</Text>
              </View>
              <TouchableOpacity
                style={[styles.counterButton, roomCounts.living_room === 4 && styles.counterButtonDisabled]}
                onPress={() => incrementRoom('living_room')}
                disabled={roomCounts.living_room === 4}
              >
                <Ionicons name="add" size={20} color={roomCounts.living_room === 4 ? '#BDC3C7' : '#3498DB'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Laundry Counter */}
          <View style={styles.counterRow}>
            <View style={styles.counterLeft}>
              <View style={styles.counterIconContainer}>
                <Ionicons name="shirt" size={24} color="#3498DB" />
              </View>
              <Text style={styles.counterLabel}>Laundry Room</Text>
            </View>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={[styles.counterButton, roomCounts.laundry === 0 && styles.counterButtonDisabled]}
                onPress={() => decrementRoom('laundry')}
                disabled={roomCounts.laundry === 0}
              >
                <Ionicons name="remove" size={20} color={roomCounts.laundry === 0 ? '#BDC3C7' : '#3498DB'} />
              </TouchableOpacity>
              <View style={styles.counterDisplay}>
                <Text style={styles.counterNumber}>{roomCounts.laundry}</Text>
              </View>
              <TouchableOpacity
                style={[styles.counterButton, roomCounts.laundry === 2 && styles.counterButtonDisabled]}
                onPress={() => incrementRoom('laundry')}
                disabled={roomCounts.laundry === 2}
              >
                <Ionicons name="add" size={20} color={roomCounts.laundry === 2 ? '#BDC3C7' : '#3498DB'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Garage Counter */}
          <View style={styles.counterRow}>
            <View style={styles.counterLeft}>
              <View style={styles.counterIconContainer}>
                <Ionicons name="car" size={24} color="#3498DB" />
              </View>
              <Text style={styles.counterLabel}>Garage</Text>
            </View>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={[styles.counterButton, roomCounts.garage === 0 && styles.counterButtonDisabled]}
                onPress={() => decrementRoom('garage')}
                disabled={roomCounts.garage === 0}
              >
                <Ionicons name="remove" size={20} color={roomCounts.garage === 0 ? '#BDC3C7' : '#3498DB'} />
              </TouchableOpacity>
              <View style={styles.counterDisplay}>
                <Text style={styles.counterNumber}>{roomCounts.garage}</Text>
              </View>
              <TouchableOpacity
                style={[styles.counterButton, roomCounts.garage === 2 && styles.counterButtonDisabled]}
                onPress={() => incrementRoom('garage')}
                disabled={roomCounts.garage === 2}
              >
                <Ionicons name="add" size={20} color={roomCounts.garage === 2 ? '#BDC3C7' : '#3498DB'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Outdoor/Yard Counter */}
          <View style={styles.counterRow}>
            <View style={styles.counterLeft}>
              <View style={styles.counterIconContainer}>
                <Ionicons name="leaf" size={24} color="#3498DB" />
              </View>
              <Text style={styles.counterLabel}>Yard/Outdoor</Text>
            </View>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={[styles.counterButton, roomCounts.outdoor === 0 && styles.counterButtonDisabled]}
                onPress={() => decrementRoom('outdoor')}
                disabled={roomCounts.outdoor === 0}
              >
                <Ionicons name="remove" size={20} color={roomCounts.outdoor === 0 ? '#BDC3C7' : '#3498DB'} />
              </TouchableOpacity>
              <View style={styles.counterDisplay}>
                <Text style={styles.counterNumber}>{roomCounts.outdoor}</Text>
              </View>
              <TouchableOpacity
                style={[styles.counterButton, roomCounts.outdoor === 4 && styles.counterButtonDisabled]}
                onPress={() => incrementRoom('outdoor')}
                disabled={roomCounts.outdoor === 4}
              >
                <Ionicons name="add" size={20} color={roomCounts.outdoor === 4 ? '#BDC3C7' : '#3498DB'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Custom Rooms List */}
          {areas.filter(area => area.id.startsWith('custom_')).map((customRoom) => (
            <View key={customRoom.id} style={styles.customRoomRow}>
              <View style={styles.counterLeft}>
                <View style={styles.counterIconContainer}>
                  <Ionicons name={customRoom.icon as any} size={24} color="#3498DB" />
                </View>
                <Text style={styles.counterLabel}>{customRoom.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeCustomRoomButton}
                onPress={() => {
                  Alert.alert(
                    'Remove Room',
                    `Remove "${customRoom.name}"?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => {
                          const updatedAreas = areas.filter(area => area.id !== customRoom.id);
                          const updatedSelectedAreas = selectedAreas.filter(id => id !== customRoom.id);
                          setAreas(updatedAreas);
                          setSelectedAreas(updatedSelectedAreas);
                          const selectedAreaData = updatedAreas.filter(area => updatedSelectedAreas.includes(area.id));
                          updateAreas(selectedAreaData);
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="close-circle" size={24} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Add Custom Room Button */}
          <TouchableOpacity
            style={styles.addCustomRoomButton}
            onPress={() => setShowAddRoomModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={24} color="#3498DB" />
            <Text style={styles.addCustomRoomText}>Add Custom Room</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCardCounter}>
          <Ionicons name="information-circle" size={20} color="#3498DB" />
          <Text style={styles.infoTextCounter}>
            Total areas: {areas.length} ({propertyData?.bedrooms || 0} bedrooms, {propertyData?.bathrooms || 0} bathrooms, {Object.values(roomCounts).reduce((a, b) => a + b, 0)} other areas)
          </Text>
        </View>


        {/* Photo Summary */}
        <View style={styles.photoSummary}>
          <Ionicons name="information-circle" size={20} color="#3498DB" />
          <Text style={styles.photoSummaryText}>
            Photos added: {getSelectedAreasWithPhotos()} of {selectedAreas.length} selected areas
          </Text>
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
            <View style={styles.modalHeaderButton} />
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
              <Input
                label="Room Name"
                placeholder="Enter custom room name"
                value={customRoomName}
                onChangeText={(text) => {
                  setCustomRoomName(text);
                  setNewRoomName(text);
                }}
                autoFocus
              />
            )}
          </View>

          {/* Bottom Add Button */}
          <View style={styles.modalBottomButton}>
            <Button
              title="Add Room"
              onPress={handleAddCustomRoom}
              type="primary"
              size="lg"
              fullWidth
              disabled={!newRoomName.trim()}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
  headerNextButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerNextButtonDisabled: {
    opacity: 0.4,
  },
  headerNextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498DB',
  },
  headerNextButtonTextDisabled: {
    color: '#BDC3C7',
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
  section: {
    marginBottom: 24,
  },
  headerSection: {
    marginBottom: 8,
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
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalBottomButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
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
  // New Counter UI Styles
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  readOnlyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  readOnlyLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  readOnlyBadge: {
    backgroundColor: '#E9ECEF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  readOnlyCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  counterHelp: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
    lineHeight: 20,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  counterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  counterIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  counterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F4FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonDisabled: {
    backgroundColor: '#F8F9FA',
    opacity: 0.5,
  },
  counterDisplay: {
    minWidth: 32,
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  addCustomRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#3498DB',
    borderStyle: 'dashed',
  },
  addCustomRoomText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3498DB',
    marginLeft: 8,
  },
  customRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  removeCustomRoomButton: {
    padding: 4,
  },
  infoCardCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoTextCounter: {
    flex: 1,
    fontSize: 14,
    color: '#3498DB',
    lineHeight: 20,
  },
});

export default PropertyAreasScreen;
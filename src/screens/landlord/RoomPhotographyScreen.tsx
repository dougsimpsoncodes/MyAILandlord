import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { PropertyData } from '../../types/property';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { ResponsiveText, ResponsiveTitle, ResponsiveBody } from '../../components/shared/ResponsiveText';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import ScreenContainer from '../../components/shared/ScreenContainer';

type RoomPhotographyNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'RoomPhotography'>;

interface RoomPhoto {
  roomId: string;
  photos: string[];
  condition: 'excellent' | 'good' | 'fair' | 'poor' | null;
  notes: string;
}

const conditionOptions = [
  { value: 'excellent', label: 'Excellent', color: '#28A745', icon: 'star' },
  { value: 'good', label: 'Good', color: '#17A2B8', icon: 'checkmark-circle' },
  { value: 'fair', label: 'Fair', color: '#FFC107', icon: 'warning' },
  { value: 'poor', label: 'Poor', color: '#DC3545', icon: 'close-circle' },
];

const RoomPhotographyScreen = () => {
  const navigation = useNavigation<RoomPhotographyNavigationProp>();
  const route = useRoute();
  const { propertyData } = route.params as { propertyData: PropertyData };
  const responsive = useResponsive();
  
  // State
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [roomPhotos, setRoomPhotos] = useState<RoomPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Draft management
  const {
    draftState,
    updatePropertyData,
    updateCurrentStep,
    isLoading: isDraftLoading,
    saveDraft,
  } = usePropertyDraft();

  // Initialize room photos from property rooms
  useEffect(() => {
    if (propertyData.rooms && roomPhotos.length === 0) {
      const initialRoomPhotos = propertyData.rooms.map(room => ({
        roomId: room.id,
        photos: [],
        condition: null,
        notes: '',
      }));
      setRoomPhotos(initialRoomPhotos);
    }
  }, [propertyData.rooms]);

  // Load existing room photos from draft
  useEffect(() => {
    if (draftState?.propertyData?.roomPhotos) {
      setRoomPhotos(draftState.propertyData.roomPhotos.map(rp => ({ ...rp, condition: null, notes: '' })));
    }
  }, [draftState]);

  // Auto-save room photos
  useEffect(() => {
    const timer = setTimeout(() => {
      if (roomPhotos.length > 0) {
        updatePropertyData({
          ...propertyData,
          roomPhotos,
        });
        updateCurrentStep(3); // Fourth step
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [roomPhotos]);

  const currentRoom = propertyData.rooms?.[currentRoomIndex];
  const currentRoomPhoto = roomPhotos.find(rp => rp.roomId === currentRoom?.id);

  const pickImage = async (source: 'camera' | 'library') => {
    setIsUploading(true);
    
    try {
      let result;
      
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
          setIsUploading(false);
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }
      
      if (!result.canceled && result.assets[0] && currentRoom) {
        setRoomPhotos(prev => 
          prev.map(rp => 
            rp.roomId === currentRoom.id 
              ? { ...rp, photos: [...rp.photos, result.assets[0].uri].slice(0, 3) }
              : rp
          )
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (photoIndex: number) => {
    if (!currentRoom) return;
    
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setRoomPhotos(prev => 
              prev.map(rp => 
                rp.roomId === currentRoom.id 
                  ? { ...rp, photos: rp.photos.filter((_, i) => i !== photoIndex) }
                  : rp
              )
            );
          },
        },
      ]
    );
  };

  const setCondition = (condition: 'excellent' | 'good' | 'fair' | 'poor') => {
    if (!currentRoom) return;
    
    setRoomPhotos(prev => 
      prev.map(rp => 
        rp.roomId === currentRoom.id 
          ? { ...rp, condition }
          : rp
      )
    );
  };

  const skipRoom = () => {
    if (currentRoomIndex < (propertyData.rooms?.length || 0) - 1) {
      setCurrentRoomIndex(currentRoomIndex + 1);
    } else {
      handleContinue();
    }
  };

  const nextRoom = () => {
    if (currentRoomIndex < (propertyData.rooms?.length || 0) - 1) {
      setCurrentRoomIndex(currentRoomIndex + 1);
    } else {
      handleContinue();
    }
  };

  const previousRoom = () => {
    if (currentRoomIndex > 0) {
      setCurrentRoomIndex(currentRoomIndex - 1);
    }
  };

  const handleContinue = async () => {
    // Check if at least required rooms have photos
    const requiredRooms = propertyData.rooms?.filter(r => r.required) || [];
    const missingPhotos = requiredRooms.filter(room => {
      const roomPhoto = roomPhotos.find(rp => rp.roomId === room.id);
      return !roomPhoto || roomPhoto.photos.length === 0;
    });

    if (missingPhotos.length > 0) {
      Alert.alert(
        'Missing Required Photos',
        `Please add photos for: ${missingPhotos.map(r => r.name).join(', ')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Save and navigate
    await updatePropertyData({
      ...propertyData,
      roomPhotos,
    });
    await saveDraft();
    
    navigation.navigate('AssetScanning', { 
      propertyData: { ...propertyData, roomPhotos } 
    });
  };

  const getProgressPercentage = () => {
    const totalRooms = propertyData.rooms?.length || 1;
    const completedRooms = roomPhotos.filter(rp => rp.photos.length > 0).length;
    const baseProgress = 300; // Previous steps complete
    const roomProgress = Math.round((completedRooms / totalRooms) * 100);
    return Math.round(((baseProgress + roomProgress) / 8) * 100);
  };

  const getCompletedRoomsCount = () => {
    return roomPhotos.filter(rp => rp.photos.length > 0).length;
  };

  const styles = StyleSheet.create({
    progressContainer: {
      marginBottom: 24,
      paddingHorizontal: responsive.spacing.screenPadding[responsive.screenSize],
      paddingTop: responsive.spacing.section[responsive.screenSize],
    },
    progressBar: {
      height: 4,
      backgroundColor: '#E9ECEF',
      borderRadius: 2,
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#28A745',
      borderRadius: 2,
    },
    progressText: {
      fontSize: 14,
      color: '#6C757D',
      textAlign: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: responsive.spacing.screenPadding[responsive.screenSize],
      paddingTop: responsive.spacing.section[responsive.screenSize],
    },
    roomHeader: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
      alignItems: 'center',
    },
    roomIcon: {
      marginBottom: 12,
    },
    roomName: {
      fontSize: 24,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 8,
    },
    roomCounter: {
      fontSize: 16,
      color: '#6C757D',
      marginBottom: 16,
    },
    roomNavigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    navButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
    },
    navButtonDisabled: {
      opacity: 0.3,
    },
    navButtonText: {
      fontSize: 16,
      color: '#007AFF',
      marginLeft: 4,
    },
    photoSection: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#343A40',
      marginBottom: 16,
    },
    photoGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    photoCard: {
      width: responsive.select({
        mobile: '30%',
        tablet: '32%',
        default: '30%'
      }),
      aspectRatio: 4/3,
      backgroundColor: '#F8F9FA',
      borderRadius: 8,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: '#DEE2E6',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    photoCardFilled: {
      borderStyle: 'solid',
      borderColor: '#28A745',
    },
    photoImage: {
      width: '100%',
      height: '100%',
    },
    photoOverlay: {
      position: 'absolute',
      top: 4,
      right: 4,
    },
    removeButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addPhotoButton: {
      alignItems: 'center',
      padding: 8,
    },
    addPhotoText: {
      fontSize: 12,
      color: '#6C757D',
      marginTop: 4,
    },
    conditionSection: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
    },
    conditionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    conditionOption: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: '#F8F9FA',
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    conditionOptionSelected: {
      backgroundColor: '#F8FFF9',
      borderColor: '#28A745',
    },
    conditionIcon: {
      marginBottom: 4,
    },
    conditionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#343A40',
    },
    footer: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E9ECEF',
      paddingHorizontal: responsive.spacing.screenPadding[responsive.screenSize],
      paddingVertical: 16,
      paddingBottom: Math.max(16, (responsive as any).spacing?.safeAreaBottom || 0),
    },
    saveStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    saveStatusText: {
      fontSize: 14,
      color: '#6C757D',
      marginLeft: 6,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    skipButton: {
      flex: 1,
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      minHeight: 56,
      borderWidth: 1,
      borderColor: '#DEE2E6',
    },
    skipButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#6C757D',
    },
    continueButton: {
      flex: 2,
      backgroundColor: '#28A745',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      minHeight: 56,
    },
    continueButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    uploadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (!currentRoom) {
    return (
      <ScreenContainer
        title="Room Photos"
        showBackButton
        onBackPress={() => navigation.goBack()}
        userRole="landlord"
        scrollable={false}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ResponsiveTitle>No Rooms Selected</ResponsiveTitle>
          <ResponsiveBody style={{ marginTop: 16, textAlign: 'center' }}>
            Please go back and select rooms to document.
          </ResponsiveBody>
        </View>
      </ScreenContainer>
    );
  }

  const footerContent = (
    <View style={styles.footer}>
      {/* Save Status */}
      <View style={styles.saveStatus}>
        <Ionicons
          name={isDraftLoading ? 'sync' : 'checkmark-circle'}
          size={16}
          color={isDraftLoading ? '#6C757D' : '#28A745'}
        />
        <Text style={styles.saveStatusText}>
          {isDraftLoading ? 'Saving...' : 'All changes saved'}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={skipRoom}
        >
          <Text style={styles.skipButtonText}>
            {currentRoomIndex === (propertyData.rooms?.length || 0) - 1 ? 'Skip All' : 'Skip Room'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={nextRoom}
        >
          <Text style={styles.continueButtonText}>
            {currentRoomIndex === (propertyData.rooms?.length || 0) - 1 ? 'Continue to Assets' : 'Next Room'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenContainer
      title="Room Photos"
      subtitle="Document each room with photos and condition assessment"
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="landlord"
      scrollable={true}
      padded={false}
      bottomContent={footerContent}
    >
      <ResponsiveContainer maxWidth="large" padding={false}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${getProgressPercentage()}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {getProgressPercentage()}% complete • Step 4 of 8
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Current Room Header */}
          <View style={styles.roomHeader}>
            <Ionicons 
              name={currentRoom.icon as any} 
              size={48} 
              color="#28A745" 
              style={styles.roomIcon}
            />
            <Text style={styles.roomName}>{currentRoom.name}</Text>
            <Text style={styles.roomCounter}>
              Room {currentRoomIndex + 1} of {propertyData.rooms?.length || 0} • {getCompletedRoomsCount()} completed
            </Text>
            
            <View style={styles.roomNavigation}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentRoomIndex === 0 && styles.navButtonDisabled
                ]}
                onPress={previousRoom}
                disabled={currentRoomIndex === 0}
              >
                <Ionicons name="chevron-back" size={20} color="#007AFF" />
                <Text style={styles.navButtonText}>Previous</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.navButton}
                onPress={nextRoom}
              >
                <Text style={styles.navButtonText}>
                  {currentRoomIndex === (propertyData.rooms?.length || 0) - 1 ? 'Finish' : 'Next'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Photo Section */}
          <View style={styles.photoSection}>
            <Text style={styles.sectionTitle}>Photos (up to 3)</Text>
            <View style={styles.photoGrid}>
              {[...Array(3)].map((_, index) => {
                const photo = currentRoomPhoto?.photos[index];
                
                if (photo) {
                  return (
                    <View key={index} style={[styles.photoCard, styles.photoCardFilled]}>
                      <Image source={{ uri: photo }} style={styles.photoImage} />
                      <View style={styles.photoOverlay}>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removePhoto(index)}
                        >
                          <Ionicons name="close" size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                } else if (index === (currentRoomPhoto?.photos.length || 0)) {
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.photoCard}
                      onPress={() => {
                        Alert.alert(
                          'Add Photo',
                          'Choose photo source',
                          [
                            { text: 'Camera', onPress: () => pickImage('camera') },
                            { text: 'Photo Library', onPress: () => pickImage('library') },
                            { text: 'Cancel', style: 'cancel' },
                          ]
                        );
                      }}
                      disabled={isUploading}
                    >
                      <View style={styles.addPhotoButton}>
                        <Ionicons name="camera-outline" size={24} color="#6C757D" />
                        <Text style={styles.addPhotoText}>Add Photo</Text>
                      </View>
                    </TouchableOpacity>
                  );
                } else {
                  return <View key={index} style={styles.photoCard} />;
                }
              })}
            </View>
          </View>

          {/* Condition Assessment */}
          <View style={styles.conditionSection}>
            <Text style={styles.sectionTitle}>Room Condition</Text>
            <View style={styles.conditionGrid}>
              {conditionOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.conditionOption,
                    currentRoomPhoto?.condition === option.value && styles.conditionOptionSelected
                  ]}
                  onPress={() => setCondition(option.value as any)}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={24} 
                    color={currentRoomPhoto?.condition === option.value ? option.color : '#6C757D'} 
                    style={styles.conditionIcon}
                  />
                  <Text style={styles.conditionLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Uploading Overlay */}
        {isUploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#28A745" />
            <ResponsiveBody style={{ marginTop: 16, color: '#6C757D' }}>
              Processing photo...
            </ResponsiveBody>
          </View>
        )}
      </ResponsiveContainer>
    </ScreenContainer>
  );
};

export default RoomPhotographyScreen;
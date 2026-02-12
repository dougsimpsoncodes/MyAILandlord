import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LandlordStackParamList } from '../../navigation/MainStack';
import { PropertyData } from '../../types/property';
import { Photo, PHOTO_CONFIG } from '../../types/photo';
import { PhotoService } from '../../services/PhotoService';
import ResponsiveContainer from '../../components/shared/ResponsiveContainer';
import { ResponsiveBody } from '../../components/shared/ResponsiveText';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';
import { usePhotoCapture } from '../../hooks/usePhotoCapture';
import PhotoCapture from '../../components/property/PhotoCapture';
import PhotoGrid from '../../components/property/PhotoGrid';
import PhotoPreviewModal from '../../components/property/PhotoPreviewModal';
import ScreenContainer from '../../components/shared/ScreenContainer';
import { log } from '../../lib/log';

type PropertyPhotosNavigationProp = NativeStackNavigationProp<LandlordStackParamList, 'PropertyPhotos'>;

interface RouteParams {
  propertyData: PropertyData;
}

const PropertyPhotosScreen = () => {
  const navigation = useNavigation<PropertyPhotosNavigationProp>();
  const route = useRoute();
  const { propertyData } = route.params as RouteParams;
  
  // Photo preview state
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(-1);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Draft management
  const {
    draftState,
    updatePropertyData,
    updateCurrentStep,
    saveDraft,
  } = usePropertyDraft();

  // Convert existing photo URLs to Photo objects for initial state
  const convertUrlsToPhotos = (urls: string[]): Photo[] => {
    return urls.map((url, index) => ({
      id: `existing_${index}_${Date.now()}`,
      uri: url,
      width: 1024,
      height: 768,
      fileSize: 500000, // Estimate
      mimeType: 'image/jpeg',
      timestamp: new Date(),
      compressed: false,
    }));
  };

  // Initialize photos from draft
  const initialPhotos = draftState?.propertyData?.photos 
    ? convertUrlsToPhotos(draftState.propertyData.photos.slice(0, PHOTO_CONFIG.MAX_PHOTOS.PROPERTY))
    : [];

  // Photo capture hook
  const {
    photos,
    isCapturing,
    isSelecting,
    addPhoto,
    addPhotos,
    deletePhoto,
    replacePhoto,
    reorderPhotos,
    canAddMore,
    validatePhotos,
  } = usePhotoCapture({
    maxPhotos: PHOTO_CONFIG.MAX_PHOTOS.PROPERTY,
    initialPhotos,
    autoSave: true,
  });

  // Auto-save photos to draft
  useEffect(() => {
    const timer = setTimeout(() => {
      const photoUrls = photos.map(photo => photo.uri);
      updatePropertyData({
        ...propertyData,
        photos: photoUrls,
      });
      updateCurrentStep(1); // Second step
    }, 1000);

    return () => clearTimeout(timer);
  }, [photos, propertyData, updatePropertyData, updateCurrentStep]);

  // Photo event handlers
  const handlePhotoPress = (photo: Photo, index: number) => {
    setSelectedPhoto(photo);
    setSelectedPhotoIndex(index);
    setShowPreviewModal(true);
  };

  const handlePhotoDelete = (index: number) => {
    deletePhoto(index);
  };

  const handlePhotoReplace = async () => {
    if (selectedPhotoIndex >= 0) {
      Alert.alert(
        'Replace Photo',
        'Choose how you\'d like to replace this photo.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Take New Photo',
            onPress: async () => {
              try {
                const photo = await PhotoService.capturePhoto({
                  aspect: PHOTO_CONFIG.ASPECT_RATIO,
                  quality: PHOTO_CONFIG.QUALITY,
                  allowsEditing: true,
                });
                if (photo) {
                  replacePhoto(selectedPhotoIndex, photo);
                  setShowPreviewModal(false);
                }
              } catch (error: unknown) {
                log.error('PropertyPhotos: photo capture failed', {
                  error: error instanceof Error ? error.message : String(error),
                });
                Alert.alert('Error', 'Failed to capture photo. Please try again.');
              }
            },
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              try {
                const photos = await PhotoService.selectFromGallery({
                  aspect: PHOTO_CONFIG.ASPECT_RATIO,
                  quality: PHOTO_CONFIG.QUALITY,
                  allowsMultipleSelection: false,
                  allowsEditing: false,
                });
                if (photos.length > 0) {
                  replacePhoto(selectedPhotoIndex, photos[0]);
                  setShowPreviewModal(false);
                }
              } catch (error: unknown) {
                log.error('PropertyPhotos: gallery selection failed', {
                  error: error instanceof Error ? error.message : String(error),
                });
                Alert.alert('Error', 'Failed to select photo. Please try again.');
              }
            },
          },
        ]
      );
    }
  };

  const handleModalClose = () => {
    setShowPreviewModal(false);
    setSelectedPhoto(null);
    setSelectedPhotoIndex(-1);
  };

  const handleContinue = async () => {
    const validation = validatePhotos();

    if (!validation.isValid) {
      Alert.alert(
        'Photo Issues',
        validation.errors.join('\n'),
        [{ text: 'OK' }]
      );
      return;
    }

    if (photos.length === 0) {
      Alert.alert(
        'Add Photos',
        'Please add at least one photo of your property to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Convert photos to URLs for storage
    const photoUrls = photos.map(photo => photo.uri);
    const updatedPropertyData = { ...propertyData, photos: photoUrls };

    try {
      await updatePropertyData(updatedPropertyData);
      await saveDraft();
    } catch (error: unknown) {
      log.error('PropertyPhotos: failed saving photos draft', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue anyway - navigation can work without draft save
    }

    // Navigate regardless of draft save success (use draftId from draft system)
    navigation.navigate('PropertyAreas', {
      draftId: draftState?.id || '',
    });
  };

  const handleSkip = async () => {
    Alert.alert(
      'Skip Photos?',
      'Photos help document your property\'s condition. You can always add them later. Continue without photos?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            const updatedPropertyData = { ...propertyData, photos: [] };

            try {
              await updatePropertyData(updatedPropertyData);
              await saveDraft();
            } catch (error: unknown) {
              log.error('PropertyPhotos: failed saving skip draft', {
                error: error instanceof Error ? error.message : String(error),
              });
              // Continue anyway - navigation can work without draft save
            }

            // Navigate regardless of draft save success (use draftId from draft system)
            navigation.navigate('PropertyAreas', {
              draftId: draftState?.id || '',
            });
          },
        },
      ]
    );
  };


  const styles = StyleSheet.create({
    tipBox: {
      backgroundColor: '#E7F5FF',
      borderRadius: 12,
      padding: 16,
      marginTop: 24,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    tipIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    tipContent: {
      flex: 1,
    },
    tipTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0066CC',
      marginBottom: 4,
    },
    tipText: {
      fontSize: 14,
      color: '#004499',
      lineHeight: 20,
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
      fontSize: 18,
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
    continueButtonDisabled: {
      backgroundColor: '#DEE2E6',
    },
    continueButtonText: {
      fontSize: 18,
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

  const bottomActions = (
    <View style={styles.buttonRow}>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
      >
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.continueButton,
          photos.length === 0 && styles.continueButtonDisabled
        ]}
        onPress={handleContinue}
        disabled={photos.length === 0}
      >
        <Text style={styles.continueButtonText}>
          Continue to Rooms
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer
      title="Property Photos"
      subtitle="Add up to 5 exterior photos to document your property's condition and features."
      showBackButton
      onBackPress={() => navigation.goBack()}
      userRole="landlord"
      scrollable
      bottomContent={bottomActions}
    >
      <ResponsiveContainer maxWidth="large" padding={false}>
          {/* Photo Capture Section */}
          {canAddMore && (
            <PhotoCapture
              onPhotoTaken={addPhoto}
              onPhotosSelected={addPhotos}
              maxPhotos={PHOTO_CONFIG.MAX_PHOTOS.PROPERTY}
              currentPhotoCount={photos.length}
              disabled={isCapturing || isSelecting}
              style={{ marginBottom: 24 }}
            />
          )}

          {/* Photo Grid */}
          <PhotoGrid
            photos={photos}
            onPhotoPress={handlePhotoPress}
            onPhotoDelete={handlePhotoDelete}
            onPhotoReorder={reorderPhotos}
            maxPhotos={PHOTO_CONFIG.MAX_PHOTOS.PROPERTY}
            emptyStateText="No photos added yet"
            showDeleteButton={true}
            numColumns={2}
            style={{ marginBottom: 24 }}
          />

          {/* Photo Tips */}
          <View style={styles.tipBox}>
            <Ionicons name="bulb-outline" size={24} color="#0066CC" style={styles.tipIcon} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Photo Tips</Text>
              <Text style={styles.tipText}>
                • Take photos during daylight for best results{'\n'}
                • Include front, back, and side views{'\n'}
                • Show any unique features or recent improvements{'\n'}
                • Photos help with maintenance tracking over time
              </Text>
            </View>
          </View>

        {/* Photo Preview Modal */}
        <PhotoPreviewModal
          photo={selectedPhoto}
          visible={showPreviewModal}
          onClose={handleModalClose}
          onDelete={() => handlePhotoDelete(selectedPhotoIndex)}
          onReplace={handlePhotoReplace}
          photoIndex={selectedPhotoIndex}
          totalPhotos={photos.length}
          canNavigate={photos.length > 1}
          onNext={() => {
            const nextIndex = (selectedPhotoIndex + 1) % photos.length;
            setSelectedPhotoIndex(nextIndex);
            setSelectedPhoto(photos[nextIndex]);
          }}
          onPrevious={() => {
            const prevIndex = selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : photos.length - 1;
            setSelectedPhotoIndex(prevIndex);
            setSelectedPhoto(photos[prevIndex]);
          }}
        />

        {/* Loading Overlay */}
        {(isCapturing || isSelecting) && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#28A745" />
            <ResponsiveBody style={{ marginTop: 16, color: '#6C757D' }}>
              {isCapturing ? 'Opening camera...' : 'Loading photos...'}
            </ResponsiveBody>
          </View>
        )}
      </ResponsiveContainer>
    </ScreenContainer>
  );
};

export default PropertyPhotosScreen;
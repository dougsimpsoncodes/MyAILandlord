import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ViewStyle,
  StyleProp,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Photo, CameraOptions, ImagePickerOptions } from '../../types/photo';
import { PhotoService } from '../../services/PhotoService';
import { log } from '../../lib/log';

interface PhotoCaptureProps {
  onPhotoTaken: (photo: Photo) => void;
  onPhotosSelected: (photos: Photo[]) => void;
  maxPhotos: number;
  currentPhotoCount: number;
  aspectRatio?: [number, number];
  quality?: number;
  disabled?: boolean;
  isProcessing?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Web-specific file input handler
const useWebFileInput = (onPhotosSelected: (photos: Photo[]) => void, maxPhotos: number, currentPhotoCount: number) => {
  // Store the latest callback in a ref so the event listener always uses current values
  const callbackRef = useRef({ onPhotosSelected, maxPhotos, currentPhotoCount });
  callbackRef.current = { onPhotosSelected, maxPhotos, currentPhotoCount };

  const openFilePicker = useCallback(() => {
    console.log('📸 openFilePicker called');
    // Create a fresh file input each time to avoid stale closure issues
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';

    input.onchange = async (event: Event) => {
      console.log('📸 File input onchange triggered', event);
      const target = event.target as HTMLInputElement;
      const files = target.files;
      console.log('📸 Files selected:', files?.length);
      if (!files || files.length === 0) {
        document.body.removeChild(input);
        return;
      }

      const { onPhotosSelected: callback, maxPhotos: max, currentPhotoCount: current } = callbackRef.current;
      const remainingSlots = max - current;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      log.info('📸 Web: Processing', filesToProcess.length, 'files');

      const photos: Photo[] = [];
      for (const file of filesToProcess) {
        try {
          // Create object URL for the file
          const uri = URL.createObjectURL(file);

          // Get image dimensions
          const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
            const img = new window.Image();
            img.onload = () => {
              resolve({ width: img.width, height: img.height });
            };
            img.onerror = () => {
              resolve({ width: 0, height: 0 });
            };
            img.src = uri;
          });

          const photo: Photo = {
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            uri,
            width: dimensions.width,
            height: dimensions.height,
            fileSize: file.size,
            mimeType: file.type || 'image/jpeg',
            timestamp: new Date(),
            compressed: false,
            localPath: uri,
          };
          photos.push(photo);
        } catch (error) {
          log.error('Error processing file:', { error: String(error) });
        }
      }

      if (photos.length > 0) {
        console.log('📸 Web: Calling callback with', photos.length, 'photos');
        log.info('📸 Web: Selected', photos.length, 'photos');
        callback(photos);
      }

      // Clean up the input element
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    console.log('📸 Clicking file input');
    input.click();
  }, []);

  return { openFilePicker };
};

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onPhotoTaken,
  onPhotosSelected,
  maxPhotos,
  currentPhotoCount,
  aspectRatio = [4, 3],
  quality = 0.8,
  disabled = false,
  isProcessing = false,
  style,
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const canAddMore = currentPhotoCount < maxPhotos;
  const isWeb = Platform.OS === 'web';

  // Web file input handler
  const { openFilePicker } = useWebFileInput(onPhotosSelected, maxPhotos, currentPhotoCount);

  const handleCameraCapture = async () => {
    if (!canAddMore || disabled) return;
    setShowOptionsModal(false);

    setIsCapturing(true);
    try {
      const cameraOptions: Partial<CameraOptions> = {
        aspect: aspectRatio,
        quality,
        allowsEditing: true,
      };

      const photo = await PhotoService.capturePhoto(cameraOptions);
      if (photo) {
        onPhotoTaken(photo);
      }
    } catch (error) {
      log.error('Camera capture error:', { error: String(error) });
      if (isWeb) {
        window.alert('Failed to capture photo. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleGallerySelection = async () => {
    if (!canAddMore || disabled) return;
    setShowOptionsModal(false);

    // On web, use native file input for better compatibility
    if (isWeb) {
      openFilePicker();
      return;
    }

    setIsSelecting(true);
    try {
      const remainingSlots = maxPhotos - currentPhotoCount;
      const galleryOptions: Partial<ImagePickerOptions> = {
        aspect: aspectRatio,
        quality,
        allowsMultipleSelection: remainingSlots > 1,
        allowsEditing: false,
      };

      const photos = await PhotoService.selectFromGallery(galleryOptions);
      log.info('📸 PhotoCapture: Selected photos from gallery:', { count: photos.length });
      if (photos.length > 0) {
        // Limit to available slots
        const photosToAdd = photos.slice(0, remainingSlots);
        log.info('📸 PhotoCapture: Photos to add after limiting:', { count: photosToAdd.length });
        onPhotosSelected(photosToAdd);
      }
    } catch (error) {
      log.error('Gallery selection error:', { error: String(error) });
      Alert.alert('Error', 'Failed to select photos. Please try again.');
    } finally {
      setIsSelecting(false);
    }
  };

  const showCaptureOptions = () => {
    // On web, directly open file picker (better UX than showing modal)
    if (isWeb) {
      console.log('📸 showCaptureOptions: Opening file picker directly on web');
      openFilePicker();
      return;
    }

    Alert.alert(
      'Add Photos',
      'Choose how you\'d like to add photos to your property.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Take Photo',
          onPress: handleCameraCapture,
        },
        {
          text: 'Choose from Gallery',
          onPress: handleGallerySelection,
        },
      ],
      { cancelable: true }
    );
  };

  if (!canAddMore) {
    return (
      <View style={[styles.container, styles.maxReachedContainer, style]}>
        <Ionicons name="checkmark-circle" size={24} color="#28A745" />
        <Text style={styles.maxReachedText}>
          Maximum photos reached ({maxPhotos})
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* Web options modal - using conditional render instead of Modal for web stability */}
      {isWeb && showOptionsModal && (
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowOptionsModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add Photos</Text>
            <Text style={styles.modalSubtitle}>Choose how you'd like to add photos</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleGallerySelection}
                activeOpacity={0.7}
              >
                <View style={styles.modalButtonIcon}>
                  <Ionicons name="images" size={24} color="#28A745" />
                </View>
                <Text style={styles.modalButtonText}>Choose from Files</Text>
                <Text style={styles.modalButtonHint}>Select images from your computer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleCameraCapture}
                activeOpacity={0.7}
              >
                <View style={styles.modalButtonIcon}>
                  <Ionicons name="camera" size={24} color="#3498DB" />
                </View>
                <Text style={styles.modalButtonText}>Use Camera</Text>
                <Text style={styles.modalButtonHint}>Take a photo with your webcam</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}
      <TouchableOpacity
        style={[
          styles.container,
          disabled && styles.disabledContainer,
          style,
        ]}
        onPress={showCaptureOptions}
        disabled={disabled || isCapturing || isSelecting || isProcessing}
        activeOpacity={0.7}
      >
        {isCapturing || isSelecting || isProcessing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#28A745" />
            <Text style={styles.loadingText}>
              {isCapturing ? 'Opening Camera...' : isSelecting ? 'Loading Photos...' : 'Processing Photos...'}
            </Text>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="camera" size={32} color="#28A745" />
              <Ionicons
                name="add-circle"
                size={20}
                color="#28A745"
                style={styles.addIcon}
              />
            </View>
            <Text style={styles.primaryText}>Add Photos</Text>
            <Text style={styles.secondaryText}>
              {currentPhotoCount} of {maxPhotos} photos
            </Text>
            <Text style={styles.hintText}>
              {isWeb ? 'Click to select files or use camera' : 'Tap to take a photo or choose from gallery'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    marginVertical: 8,
  },
  disabledContainer: {
    opacity: 0.6,
    backgroundColor: '#F8F9FA',
  },
  maxReachedContainer: {
    borderColor: '#28A745',
    borderStyle: 'solid',
    backgroundColor: '#F8FFF9',
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  addIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  primaryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  secondaryText: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#ADB5BD',
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 8,
  },
  maxReachedText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#28A745',
  },
  // Modal styles for web - use fixed positioning to cover entire viewport
  modalOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  modalButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  modalButtonHint: {
    fontSize: 12,
    color: '#95A5A6',
    textAlign: 'center',
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#7F8C8D',
    fontWeight: '500',
  },
});

export default PhotoCapture;

import React, { useState } from 'react';
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

  const canAddMore = currentPhotoCount < maxPhotos;

  const handleCameraCapture = async () => {
    if (!canAddMore || disabled) return;

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
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleGallerySelection = async () => {
    if (!canAddMore || disabled) return;

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
            Tap to take a photo or choose from gallery
          </Text>
        </View>
      )}
    </TouchableOpacity>
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
});

export default PhotoCapture;

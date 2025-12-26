import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import { log } from '../lib/log';
import { 
  Photo, 
  CameraOptions, 
  ImagePickerOptions, 
  PhotoValidationResult, 
  PhotoCompressionOptions,
  PHOTO_CONFIG 
} from '../types/photo';

export class PhotoService {
  /**
   * Request camera and media library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and photo library access are needed to document your property.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => this.openSettings() }
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      log.error('Error requesting permissions:', error as any);
      return false;
    }
  }

  /**
   * Open device settings for permission management
   */
  static openSettings(): void {
    if (Platform.OS === 'ios') {
      ImagePicker.requestCameraPermissionsAsync();
    } else {
      Alert.alert(
        'Permissions',
        'Please enable camera and storage permissions in your device settings.'
      );
    }
  }

  /**
   * Capture photo using device camera
   */
  static async capturePhoto(options?: Partial<CameraOptions>): Promise<Photo | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const defaultOptions: CameraOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: PHOTO_CONFIG.ASPECT_RATIO,
        quality: PHOTO_CONFIG.QUALITY,
        exif: false,
      };

      const result = await ImagePicker.launchCameraAsync({
        ...defaultOptions,
        ...options,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      const asset = result.assets[0];
      const photo = await this.processImageAsset(asset);
      
      // Compress if file is too large
      if (photo.fileSize > PHOTO_CONFIG.MAX_FILE_SIZE) {
        return await this.compressPhoto(photo, {
          quality: PHOTO_CONFIG.COMPRESSION_QUALITY,
        });
      }

      return photo;
    } catch (error) {
      log.error('Error capturing photo:', error as any);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      return null;
    }
  }

  /**
   * Select photos from device gallery
   */
  static async selectFromGallery(options?: Partial<ImagePickerOptions>): Promise<Photo[]> {
    log.info('📸 PhotoService: selectFromGallery called with options:', options);
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        log.warn('📸 PhotoService: No permissions, returning empty array');
        return [];
      }

      const defaultOptions: ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Opens directly to Photos library
        allowsMultipleSelection: true,
        quality: PHOTO_CONFIG.QUALITY,
        aspect: PHOTO_CONFIG.ASPECT_RATIO,
        allowsEditing: false,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      };

      const finalOptions = {
        ...defaultOptions,
        ...options,
      };
      log.info('📸 PhotoService: Final options for ImagePicker:', finalOptions);

      const result = await ImagePicker.launchImageLibraryAsync(finalOptions);

      if (result.canceled || !result.assets) {
        log.info('📸 PhotoService: Selection canceled or no assets');
        return [];
      }

      log.info('📸 PhotoService: Processing', result.assets.length, 'selected assets');
      const photos: Photo[] = [];
      for (const asset of result.assets) {
        const photo = await this.processImageAsset(asset);
        
        // Compress if needed
        if (photo.fileSize > PHOTO_CONFIG.MAX_FILE_SIZE) {
          const compressedPhoto = await this.compressPhoto(photo, {
            quality: PHOTO_CONFIG.COMPRESSION_QUALITY,
          });
          photos.push(compressedPhoto);
        } else {
          photos.push(photo);
        }
      }

      log.info('📸 PhotoService: Returning', photos.length, 'processed photos');
      return photos;
    } catch (error) {
      log.error('Error selecting from gallery:', error as any);
      Alert.alert('Error', 'Failed to select photos. Please try again.');
      return [];
    }
  }

  /**
   * Compress photo to reduce file size
   */
  static async compressPhoto(
    photo: Photo, 
    options: PhotoCompressionOptions
  ): Promise<Photo> {
    try {
      const manipulatorResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [],
        {
          compress: options.quality,
          format: options.format === 'png' ? 
            ImageManipulator.SaveFormat.PNG : 
            ImageManipulator.SaveFormat.JPEG,
        }
      );

      const fileInfo = await FileSystem.getInfoAsync(manipulatorResult.uri);
      
      return {
        ...photo,
        uri: manipulatorResult.uri,
        width: manipulatorResult.width,
        height: manipulatorResult.height,
        fileSize: fileInfo.size || photo.fileSize,
        compressed: true,
      };
    } catch (error) {
      log.error('Error compressing photo:', error as any);
      return photo; // Return original if compression fails
    }
  }

  /**
   * Delete photo from device storage
   */
  static async deletePhoto(photoUri: string): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(photoUri, { idempotent: true });
      return true;
    } catch (error) {
      log.error('Error deleting photo:', error as any);
      return false;
    }
  }

  /**
   * Validate photo meets requirements
   */
  static validatePhoto(photo: Photo): PhotoValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (photo.fileSize > PHOTO_CONFIG.MAX_FILE_SIZE) {
      errors.push(`File size too large (${(photo.fileSize / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`);
    }

    // Check format
    if (!PHOTO_CONFIG.SUPPORTED_FORMATS.includes(photo.mimeType)) {
      errors.push(`Unsupported format: ${photo.mimeType}. Use JPEG or PNG.`);
    }

    // Check dimensions
    if (photo.width < 800 || photo.height < 600) {
      warnings.push('Low resolution photo. Consider taking a higher quality photo.');
    }

    // Check aspect ratio (with tolerance)
    const expectedRatio = PHOTO_CONFIG.ASPECT_RATIO[0] / PHOTO_CONFIG.ASPECT_RATIO[1];
    const actualRatio = photo.width / photo.height;
    const tolerance = 0.1;
    
    if (Math.abs(actualRatio - expectedRatio) > tolerance) {
      warnings.push('Photo aspect ratio differs from recommended 4:3 ratio.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get total storage used by photos
   */
  static async getStorageUsage(photos: Photo[]): Promise<number> {
    let totalSize = 0;
    for (const photo of photos) {
      totalSize += photo.fileSize;
    }
    return totalSize;
  }

  /**
   * Generate photo thumbnail
   */
  static async generateThumbnail(photo: Photo, size: number = 200): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: size, height: size } }],
        {
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return result.uri;
    } catch (error) {
      log.error('Error generating thumbnail:', error as any);
      return photo.uri; // Return original if thumbnail generation fails
    }
  }

  /**
   * Process ImagePicker asset into Photo object
   */
  private static async processImageAsset(asset: ImagePicker.ImagePickerAsset): Promise<Photo> {
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    
    return {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uri: asset.uri,
      width: asset.width || 0,
      height: asset.height || 0,
      fileSize: fileInfo.size || 0,
      mimeType: asset.mimeType || 'image/jpeg',
      timestamp: new Date(),
      compressed: false,
      localPath: asset.uri,
    };
  }
}

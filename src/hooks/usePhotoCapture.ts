import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { Photo, PHOTO_CONFIG } from '../types/photo';
import { PhotoService } from '../services/PhotoService';
import { log } from '../lib/log';

interface UsePhotoCaptureOptions {
  maxPhotos?: number;
  initialPhotos?: Photo[];
  onPhotosChange?: (photos: Photo[]) => void;
  autoSave?: boolean;
}

interface UsePhotoCaptureReturn {
  photos: Photo[];
  isCapturing: boolean;
  isSelecting: boolean;
  isProcessing: boolean;
  error: string | null;

  // Photo management
  addPhoto: (photo: Photo) => void;
  addPhotos: (photos: Photo[]) => void;
  deletePhoto: (index: number) => void;
  replacePhoto: (index: number, newPhoto: Photo) => void;
  reorderPhotos: (fromIndex: number, toIndex: number) => void;
  clearPhotos: () => void;

  // Capture methods
  capturePhoto: () => Promise<void>;
  selectFromGallery: () => Promise<void>;

  // Utility methods
  canAddMore: boolean;
  totalStorageUsed: number;
  validatePhotos: () => { isValid: boolean; errors: string[] };
}

export const usePhotoCapture = (options: UsePhotoCaptureOptions = {}): UsePhotoCaptureReturn => {
  const {
    maxPhotos = PHOTO_CONFIG.MAX_PHOTOS.PROPERTY,
    initialPhotos = [],
    onPhotosChange,
    autoSave = false,
  } = options;

  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalStorageUsed, setTotalStorageUsed] = useState(0);

  // Calculate storage usage when photos change
  useEffect(() => {
    const calculateStorage = async () => {
      const storage = await PhotoService.getStorageUsage(photos);
      setTotalStorageUsed(storage);
    };
    calculateStorage();
  }, [photos]);

  // Notify parent of photo changes
  useEffect(() => {
    onPhotosChange?.(photos);
  }, [photos, onPhotosChange]);

  const canAddMore = photos.length < maxPhotos;

  const addPhoto = useCallback((photo: Photo) => {
    if (!canAddMore) {
      setError(`Maximum of ${maxPhotos} photos allowed`);
      return;
    }

    const validation = PhotoService.validatePhoto(photo);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    setPhotos(prev => [...prev, photo]);
    setError(null);
  }, [canAddMore, maxPhotos]);

  const addPhotos = useCallback(async (newPhotos: Photo[]) => {
    setIsProcessing(true);
    try {
      log.info('📸 usePhotoCapture: addPhotos', { addCount: newPhotos.length, current: photos.length });
      const remainingSlots = maxPhotos - photos.length;
      const photosToAdd = newPhotos.slice(0, remainingSlots);
      log.info('📸 usePhotoCapture: after limiting', { addCount: photosToAdd.length });

      if (newPhotos.length > remainingSlots) {
        Alert.alert(
          'Photos Limit',
          `Only ${remainingSlots} photos can be added. ${newPhotos.length - remainingSlots} photos were not added.`
        );
      }

      // Validate all photos
      const validPhotos: Photo[] = [];
      const errors: string[] = [];

      for (const photo of photosToAdd) {
        log.info('📸 usePhotoCapture: validating photo', {
          mimeType: photo.mimeType,
          fileSize: photo.fileSize,
          width: photo.width,
          height: photo.height
        });
        const validation = PhotoService.validatePhoto(photo);
        log.info('📸 usePhotoCapture: validation result', {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings
        });
        if (validation.isValid) {
          validPhotos.push(photo);
        } else {
          errors.push(`Photo validation failed: ${validation.errors.join(', ')}`);
        }
      }

      if (errors.length > 0) {
        setError(errors.join('\n'));
      } else {
        setError(null);
      }

      if (validPhotos.length > 0) {
        log.info('📸 usePhotoCapture: adding valid photos', { count: validPhotos.length });
        setPhotos(prev => {
          const newPhotos = [...prev, ...validPhotos];
          log.info('📸 usePhotoCapture: new state count', { count: newPhotos.length });
          return newPhotos;
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [photos.length, maxPhotos]);

  const deletePhoto = useCallback((index: number) => {
    if (index < 0 || index >= photos.length) return;

    const photoToDelete = photos[index];
    
    // Delete from device storage if it's a local file
    PhotoService.deletePhoto(photoToDelete.uri).catch(error => {
      log.warn('Failed to delete photo from storage:', { error: String(error) });
    });

    setPhotos(prev => prev.filter((_, i) => i !== index));
    setError(null);
  }, [photos]);

  const replacePhoto = useCallback((index: number, newPhoto: Photo) => {
    if (index < 0 || index >= photos.length) return;

    const validation = PhotoService.validatePhoto(newPhoto);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    const oldPhoto = photos[index];
    
    // Delete old photo from storage
    PhotoService.deletePhoto(oldPhoto.uri).catch(error => {
      log.warn('Failed to delete old photo from storage:', { error: String(error) });
    });

    setPhotos(prev => prev.map((photo, i) => i === index ? newPhoto : photo));
    setError(null);
  }, [photos]);

  const reorderPhotos = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= photos.length) return;
    if (toIndex < 0 || toIndex >= photos.length) return;

    setPhotos(prev => {
      const newPhotos = [...prev];
      const [movedPhoto] = newPhotos.splice(fromIndex, 1);
      newPhotos.splice(toIndex, 0, movedPhoto);
      return newPhotos;
    });
  }, [photos]);

  const clearPhotos = useCallback(() => {
    // Delete all photos from storage
    photos.forEach(photo => {
      PhotoService.deletePhoto(photo.uri).catch(error => {
        log.warn('Failed to delete photo from storage:', { error: String(error) });
      });
    });

    setPhotos([]);
    setError(null);
  }, [photos]);

  const capturePhoto = useCallback(async () => {
    if (!canAddMore) {
      setError(`Maximum of ${maxPhotos} photos reached`);
      return;
    }

    setIsCapturing(true);
    setError(null);

    try {
      const photo = await PhotoService.capturePhoto({
        aspect: PHOTO_CONFIG.ASPECT_RATIO,
        quality: PHOTO_CONFIG.QUALITY,
        allowsEditing: true,
        mediaTypes: 'photo',
        exif: false,
      });

      if (photo) {
        addPhoto(photo);
      }
    } catch (error: unknown) {
      log.error('Photo capture error:', { error: String(error) });
      setError('Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [canAddMore, maxPhotos, addPhoto]);

  const selectFromGallery = useCallback(async () => {
    if (!canAddMore) {
      setError(`Maximum of ${maxPhotos} photos reached`);
      return;
    }

    setIsSelecting(true);
    setError(null);

    try {
      const remainingSlots = maxPhotos - photos.length;
      const selectedPhotos = await PhotoService.selectFromGallery({
        aspect: PHOTO_CONFIG.ASPECT_RATIO,
        quality: PHOTO_CONFIG.QUALITY,
        allowsMultipleSelection: remainingSlots > 1,
        allowsEditing: false,
        mediaTypes: 'photo',
      });

      if (selectedPhotos.length > 0) {
        addPhotos(selectedPhotos);
      }
    } catch (error: unknown) {
      console.error('Gallery selection error:', error);
      setError('Failed to select photos. Please try again.');
    } finally {
      setIsSelecting(false);
    }
  }, [canAddMore, maxPhotos, photos.length, addPhotos]);

  const validatePhotos = useCallback(() => {
    const errors: string[] = [];

    if (photos.length === 0) {
      errors.push('At least one photo is required');
    }

    photos.forEach((photo, index) => {
      const validation = PhotoService.validatePhoto(photo);
      if (!validation.isValid) {
        errors.push(`Photo ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [photos]);

  return {
    photos,
    isCapturing,
    isSelecting,
    isProcessing,
    error,

    // Photo management
    addPhoto,
    addPhotos,
    deletePhoto,
    replacePhoto,
    reorderPhotos,
    clearPhotos,

    // Capture methods
    capturePhoto,
    selectFromGallery,

    // Utility
    canAddMore,
    totalStorageUsed,
    validatePhotos,
  };
};

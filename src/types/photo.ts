export interface Photo {
  id: string;
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  timestamp: Date;
  compressed?: boolean;
  localPath?: string;
}

export interface CameraOptions {
  mediaTypes: import('expo-image-picker').MediaTypeOptions;
  allowsEditing: boolean;
  aspect: [number, number];
  quality: number;
  exif: boolean;
}

export interface ImagePickerOptions {
  mediaTypes: import('expo-image-picker').MediaTypeOptions;
  allowsMultipleSelection: boolean;
  quality: number;
  aspect: [number, number];
  allowsEditing: boolean;
  presentationStyle?: import('expo-image-picker').UIImagePickerPresentationStyle;
}

export interface PhotoValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PhotoCompressionOptions {
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png';
}

export const PHOTO_CONFIG = {
  MAX_PHOTOS: {
    PROPERTY: 5,
    ROOM: 3,
    ASSET: 4,
  },
  ASPECT_RATIO: [4, 3] as [number, number],
  QUALITY: 0.8,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  COMPRESSION_QUALITY: 0.7,
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png'],
} as const;
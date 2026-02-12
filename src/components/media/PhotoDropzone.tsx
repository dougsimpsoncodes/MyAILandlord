import React, { useRef, useState, useCallback } from 'react';
import { Platform, View, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadPropertyPhotos } from '../../services/PhotoUploadService';
import { log } from '../../lib/log';

type UploadAsset = {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  mimeType?: string;
  file?: File;
};

type Props = {
  propertyId: string;
  areaId: string;
  onUploaded: (photos: { path: string; url: string }[]) => void;
  onCameraPress?: () => void; // Optional camera handler for mobile
  onPickerOpen?: () => void; // Called before picker opens (for preventing race conditions)
  onPickerClose?: () => void; // Called after picker closes and upload completes
  disabled?: boolean;
  variant?: 'full' | 'compact' | 'inline'; // full = empty state, compact = has photos, inline = fits in scroll strip
  showCameraOption?: boolean; // Show camera option on mobile
};

async function pickNative() {
  const res = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: true,
    quality: 1,
    mediaTypes: ImagePicker.MediaTypeOptions.Images
  });

  if (res.canceled) return [];

  return res.assets?.map(a => ({
    uri: a.uri,
    width: a.width,
    height: a.height,
    fileName: a.fileName ?? undefined,
    mimeType: ('mimeType' in a ? (a as { mimeType?: string }).mimeType : undefined)
  })) ?? [];
}

async function pickWeb(input: HTMLInputElement) {
  return new Promise<{ uri: string; fileName?: string; mimeType?: string; file?: File }[]>((resolve) => {
    input.onchange = () => {
      const files = Array.from(input.files || []);
      const out = files.map(f => ({
        uri: URL.createObjectURL(f),
        fileName: f.name,
        mimeType: f.type,
        file: f,
      }));
      resolve(out);
      input.value = '';
    };
    input.click();
  });
}

async function compressImageWeb(file: File, maxWidth = 1600, quality = 0.85): Promise<{ uri: string; mimeType: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        try {
          const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
          const targetW = Math.round(img.width * ratio);
          const targetH = Math.round(img.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas not supported');
          ctx.drawImage(img, 0, 0, targetW, targetH);
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Failed to encode image'));
            const uri = URL.createObjectURL(blob);
            const fileName = (file.name.replace(/\.[^.]+$/, '') || 'image') + '.jpg';
            resolve({ uri, mimeType: 'image/jpeg', fileName });
          }, 'image/jpeg', quality);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotoDropzone({
  propertyId,
  areaId,
  onUploaded,
  onCameraPress,
  onPickerOpen,
  onPickerClose,
  disabled,
  variant = 'full',
  showCameraOption = true
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropzoneRef = useRef<View>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Create hidden file input for web
  if (Platform.OS === 'web' && !inputRef.current) {
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = 'image/*';
    el.multiple = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    inputRef.current = el;
  }

  const processAndUpload = async (assets: UploadAsset[]) => {
    if (!assets.length) return;

    setIsUploading(true);
    setUploadCount(assets.length);

    try {
      // Web: compress and strip EXIF via canvas re-encode
      if (Platform.OS === 'web') {
        try {
          const processed = await Promise.all(
            assets.map(async (a) => {
              if (!a.file) return a;
              const { uri, mimeType, fileName } = await compressImageWeb(a.file);
              return { ...a, uri, mimeType, fileName };
            })
          );
          assets = processed;
        } catch (e) {
          log.warn('PhotoDropzone web compression failed, using originals', { error: String(e) });
        }
      }

      const uploaded = await uploadPropertyPhotos(propertyId, areaId, assets);
      onUploaded(uploaded.map(u => ({ path: u.path, url: u.url })));
    } finally {
      setIsUploading(false);
      setUploadCount(0);
    }
  };

  const handleBrowse = async () => {
    // Notify parent that picker is opening (prevents race conditions with focus refetch)
    onPickerOpen?.();

    try {
      const assets = Platform.OS === 'web'
        ? await pickWeb(inputRef.current as HTMLInputElement)
        : await pickNative();

      await processAndUpload(assets);
    } finally {
      // Notify parent that picker flow is complete
      onPickerClose?.();
    }
  };

  // Web drag & drop handlers
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (Platform.OS !== 'web') return;

    const files = Array.from(e.dataTransfer?.files || []) as File[];
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    const assets = imageFiles.map(f => ({
      uri: URL.createObjectURL(f),
      fileName: f.name,
      mimeType: f.type,
      file: f,
    }));

    await processAndUpload(assets);
  }, [propertyId, areaId, onUploaded]);

  const isDisabled = disabled || isUploading;
  const isWeb = Platform.OS === 'web';
  const isCompact = variant === 'compact';
  const isInline = variant === 'inline';

  // Web-specific props for drag & drop
  const webDragProps = isWeb ? {
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  } : {};

  // Inline variant: compact + button for horizontal scroll strip
  if (isInline) {
    if (isUploading) {
      return (
        <View style={styles.inlineButton}>
          <ActivityIndicator size="small" color="#3498DB" />
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.inlineButton, isDragOver && styles.inlineButtonDragOver]}
        onPress={handleBrowse}
        disabled={isDisabled}
        activeOpacity={0.7}
        testID={`photo-upload-${areaId}`}
        accessibilityRole="button"
        accessibilityLabel={`Add photo to ${areaId}`}
        {...webDragProps}
      >
        <Ionicons name="add" size={28} color="#3498DB" />
      </TouchableOpacity>
    );
  }

  if (isUploading) {
    return (
      <View style={[styles.dropzone, isCompact && styles.dropzoneCompact, styles.dropzoneUploading]}>
        <ActivityIndicator size="small" color="#3498DB" />
        <Text style={styles.uploadingText}>
          Uploading {uploadCount} photo{uploadCount > 1 ? 's' : ''}...
        </Text>
      </View>
    );
  }

  return (
    <View
      ref={dropzoneRef}
      style={[
        styles.dropzone,
        isCompact && styles.dropzoneCompact,
        isDragOver && styles.dropzoneDragOver,
        isDisabled && styles.dropzoneDisabled,
      ]}
      {...webDragProps}
    >
      {isCompact ? (
        // Compact: horizontal layout for areas with existing photos
        <View style={styles.compactContent}>
          <Ionicons name="cloud-upload-outline" size={24} color={isDragOver ? '#3498DB' : '#7F8C8D'} />
          <Text style={[styles.compactText, isDragOver && styles.textDragOver]}>
            {isWeb ? 'Drag photos here' : 'Add more photos'}
          </Text>
          {isWeb && <Text style={styles.orText}>or</Text>}
          <TouchableOpacity
            style={styles.browseButton}
            onPress={handleBrowse}
            disabled={isDisabled}
            activeOpacity={0.7}
          >
            <Text style={styles.browseButtonText}>Browse</Text>
          </TouchableOpacity>
          {!isWeb && showCameraOption && onCameraPress && (
            <TouchableOpacity
              style={[styles.browseButton, styles.cameraButton]}
              onPress={onCameraPress}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        // Full: vertical layout for empty state
        <View style={styles.fullContent}>
          <Ionicons
            name="cloud-upload-outline"
            size={40}
            color={isDragOver ? '#3498DB' : '#95A5A6'}
          />
          <Text style={[styles.mainText, isDragOver && styles.textDragOver]}>
            {isWeb ? 'Drag photos here to upload' : 'Add photos'}
          </Text>
          {isWeb && <Text style={styles.orTextFull}>or</Text>}
          <TouchableOpacity
            style={styles.browseButtonFull}
            onPress={handleBrowse}
            disabled={isDisabled}
            activeOpacity={0.7}
          >
            <Text style={styles.browseButtonFullText}>Browse Files</Text>
          </TouchableOpacity>
          {!isWeb && showCameraOption && onCameraPress && (
            <TouchableOpacity
              style={[styles.browseButtonFull, styles.cameraButtonFull]}
              onPress={onCameraPress}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.cameraButtonFullText}>Take Photo</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.fileTypes}>
            Supports JPG, PNG, HEIC
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Inline variant - compact + button for scroll strip
  inlineButton: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3498DB',
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineButtonDragOver: {
    borderColor: '#2980B9',
    backgroundColor: '#D4E6F1',
    borderStyle: 'solid',
  },

  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#DEE2E6',
    borderRadius: 12,
    backgroundColor: '#FAFBFC',
    overflow: 'hidden',
  },
  dropzoneCompact: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  dropzoneDragOver: {
    borderColor: '#3498DB',
    backgroundColor: '#E8F4FD',
    borderStyle: 'solid',
  },
  dropzoneDisabled: {
    opacity: 0.6,
  },
  dropzoneUploading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  uploadingText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },

  // Compact variant styles
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  compactText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  orText: {
    fontSize: 14,
    color: '#95A5A6',
  },
  browseButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  browseButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cameraButton: {
    backgroundColor: '#2C3E50',
    paddingHorizontal: 12,
  },

  // Full variant styles
  fullContent: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  mainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 12,
    marginBottom: 4,
  },
  orTextFull: {
    fontSize: 14,
    color: '#95A5A6',
    marginBottom: 12,
  },
  browseButtonFull: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  browseButtonFullText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cameraButtonFull: {
    backgroundColor: '#2C3E50',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cameraButtonFullText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  fileTypes: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 8,
  },
  textDragOver: {
    color: '#3498DB',
  },
});

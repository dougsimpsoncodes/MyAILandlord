import React, { useRef } from 'react';
import { Platform, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Button from '../shared/Button';
import { uploadPropertyPhotos } from '../../services/PhotoUploadService';
import { log } from '../../lib/log';

type Props = {
  propertyId: string;
  areaId: string;
  onUploaded: (photos: { path: string; url: string }[]) => void;
  disabled?: boolean;
};

async function pickNative() {
  const res = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: true,
    quality: 1,
    mediaTypes: (ImagePicker as any).MediaType?.Images ?? (ImagePicker as any).MediaTypeOptions?.Images
  });
  
  if (res.canceled) return [];
  
  return res.assets?.map(a => ({
    uri: a.uri,
    width: a.width,
    height: a.height,
    fileName: (a as any).fileName,
    mimeType: (a as any).mimeType
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

export default function PhotoPicker({ propertyId, areaId, onUploaded, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  if (Platform.OS === 'web' && !inputRef.current) {
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = 'image/*';
    el.multiple = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    inputRef.current = el;
  }
  
  const handlePick = async () => {
    let assets = Platform.OS === 'web' 
      ? await pickWeb(inputRef.current as HTMLInputElement)
      : await pickNative();

    if (!assets.length) return;

    // Web: compress and strip EXIF via canvas re-encode
    if (Platform.OS === 'web') {
      try {
        const processed = await Promise.all(
          (assets as any[]).map(async (a) => {
            if (!a.file) return a; // Fallback if no File object
            const { uri, mimeType, fileName } = await compressImageWeb(a.file);
            return { ...a, uri, mimeType, fileName };
          })
        );
        assets = processed as any;
      } catch (e) {
        log.warn('PhotoPicker web compression failed, using originals', { error: String(e) });
      }
    }

    const uploaded = await uploadPropertyPhotos(propertyId, areaId, assets as any);
    onUploaded(uploaded.map(u => ({ path: u.path, url: u.url })));
  };
  
  return (
    <View style={{ width: '100%' }}>
      <Button 
        title="Add Photos" 
        onPress={handlePick} 
        type="secondary" 
        disabled={disabled} 
        fullWidth 
      />
    </View>
  );
}

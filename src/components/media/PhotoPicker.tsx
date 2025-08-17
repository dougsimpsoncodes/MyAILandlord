import React, { useRef } from 'react';
import { Platform, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Button from '../shared/Button';
import { uploadPropertyPhotos } from '../../services/PhotoUploadService';

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
  return new Promise<{ uri: string; fileName?: string; mimeType?: string }[]>((resolve) => {
    input.onchange = () => {
      const files = Array.from(input.files || []);
      const out = files.map(f => ({
        uri: URL.createObjectURL(f),
        fileName: f.name,
        mimeType: f.type
      }));
      resolve(out);
      input.value = '';
    };
    input.click();
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
    const assets = Platform.OS === 'web' 
      ? await pickWeb(inputRef.current as HTMLInputElement)
      : await pickNative();

    if (!assets.length) return;

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
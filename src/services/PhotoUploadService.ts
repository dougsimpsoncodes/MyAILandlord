import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabaseClient';

type PickedAsset = {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  mimeType?: string;
};

type UploadedPhoto = {
  path: string;
  url: string;
  width?: number;
  height?: number;
  size?: number;
};

function extFromMime(m?: string) {
  if (!m) return 'jpg';
  const t = m.split('/')[1] || 'jpg';
  return t.split('+')[0];
}

function fileNameFor(propertyId: string, areaId: string, base?: string, mime?: string) {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const ext = (base && base.includes('.')) ? base.split('.').pop() as string : extFromMime(mime);
  return `${propertyId}/${areaId}/${ts}-${rand}.${ext}`;
}

async function toBlob(uri: string): Promise<Blob> {
  const r = await fetch(uri);
  return await r.blob();
}

export async function uploadPropertyPhotos(
  propertyId: string,
  areaId: string,
  assets: PickedAsset[],
  bucket = 'property-images'
): Promise<UploadedPhoto[]> {
  const out: UploadedPhoto[] = [];
  
  for (const a of assets) {
    let work = a.uri;
    let w = a.width;
    let h = a.height;
    let mime = a.mimeType;
    
    if (Platform.OS !== 'web') {
      const maxW = 1600;
      const resized = await ImageManipulator.manipulateAsync(
        a.uri,
        w && w > maxW ? [{ resize: { width: maxW } }] : [],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      work = resized.uri;
      w = resized.width;
      h = resized.height;
      mime = 'image/jpeg';
    }
    
    const blob = await toBlob(work);
    const name = fileNameFor(propertyId, areaId, a.fileName, mime);
    const up = await supabase.storage.from(bucket).upload(name, blob, {
      contentType: mime || 'image/jpeg',
      upsert: false
    });
    
    if (up.error && String(up.error.message || '').includes('already exists')) {
      const alt = fileNameFor(propertyId, areaId, undefined, mime);
      const r2 = await supabase.storage.from(bucket).upload(alt, blob, {
        contentType: mime || 'image/jpeg',
        upsert: false
      });
      if (r2.error) {
        console.error('📸 PhotoUploadService: Failed to upload alternative file:', r2.error);
        continue;
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(alt);
      out.push({
        path: alt,
        url: data.publicUrl,
        width: w,
        height: h,
        size: blob.size
      });
      continue;
    }
    
    if (up.error) {
      console.error('📸 PhotoUploadService: Failed to upload file:', up.error);
      continue;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(name);
    out.push({
      path: name,
      url: data.publicUrl,
      width: w,
      height: h,
      size: blob.size
    });
  }
  
  return out;
}
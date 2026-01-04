import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { storageService } from './supabase/storage';
import log from '../lib/log';

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
    // On native, we always convert to JPEG, so use .jpg extension regardless of original filename
    const name = Platform.OS !== 'web'
      ? fileNameFor(propertyId, areaId, undefined, 'image/jpeg')
      : fileNameFor(propertyId, areaId, a.fileName, mime);
    try {
      // Try primary name
      await storageService.uploadFile({ bucket: bucket as any, path: name, file: blob, contentType: mime || 'image/jpeg' });
      const signed = await storageService.getDisplayUrl(bucket as any, name);
      out.push({ path: name, url: signed || '', width: w, height: h, size: blob.size });
    } catch (e) {
      // If exists, retry with alt name
      const alt = fileNameFor(propertyId, areaId, undefined, mime);
      try {
        await storageService.uploadFile({ bucket: bucket as any, path: alt, file: blob, contentType: mime || 'image/jpeg' });
        const signed = await storageService.getDisplayUrl(bucket as any, alt);
        out.push({ path: alt, url: signed || '', width: w, height: h, size: blob.size });
      } catch (e2) {
        log.error('PhotoUploadService: Failed to upload file', { error: String(e2) });
        continue;
      }
    }
  }
  
  return out;
}

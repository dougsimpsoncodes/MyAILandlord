import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from '../../lib/log';
import { decode } from 'base64-arraybuffer';

// Storage client must be set by authenticated context
let storageClient: SupabaseClient | null = null;

export function setStorageSupabaseClient(client: SupabaseClient) {
  storageClient = client;
}

function requireClient(): SupabaseClient {
  if (!storageClient) {
    throw new Error('Storage client not set. Call setStorageSupabaseClient first.');
  }
  return storageClient;
}

export type StorageBucket = 'maintenance-images' | 'voice-notes' | 'property-images' | 'documents';

export interface UploadOptions {
  bucket: StorageBucket;
  path: string;
  file: File | Blob | string; // string for base64
  contentType?: string;
}

export interface UploadResult {
  path: string; // Intentionally no URL; use getSignedUrl/getDisplayUrl
}

export class SupabaseStorageService {
  private signedUrlCache = new Map<string, { url: string; expires: number }>();
  private maxCacheSize = 200;

  private addToCache(key: string, value: { url: string; expires: number }) {
    // purge expired
    for (const [k, v] of this.signedUrlCache.entries()) {
      if (v.expires < Date.now()) this.signedUrlCache.delete(k);
    }
    // bound size (FIFO-ish)
    if (this.signedUrlCache.size >= this.maxCacheSize) {
      const firstKey = this.signedUrlCache.keys().next().value as string | undefined;
      if (firstKey) this.signedUrlCache.delete(firstKey);
    }
    this.signedUrlCache.set(key, value);
  }
  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(options: UploadOptions): Promise<UploadResult> {
    const { bucket, path, file, contentType } = options;

    try {
      let uploadData: ArrayBuffer | Blob | File;

      // Handle base64 string input (common from React Native image pickers)
      if (typeof file === 'string') {
        // Remove data URL prefix if present
        const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
        uploadData = decode(base64Data);
      } else {
        uploadData = file;
      }

      const { data, error } = await requireClient().storage
        .from(bucket)
        .upload(path, uploadData, {
          contentType: contentType || this.getContentType(path),
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      return { path: data.path };
    } catch (error) {
      log.error('Storage upload error', { error: String(error) });
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files: UploadOptions[]): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => this.uploadFile(file));
    return Promise.all(uploadPromises);
  }

  /**
   * Get a signed URL for private file access
   */
  async getSignedUrl(bucket: StorageBucket, path: string, expiresIn = 3600): Promise<string> {
    const cacheKey = `${bucket}:${path}`;
    const cached = this.signedUrlCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.url;
    }
    const { data, error } = await requireClient().storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Failed to get signed URL: ${error.message}`);
    }
    this.addToCache(cacheKey, {
      url: data.signedUrl,
      expires: Date.now() + (expiresIn - 60) * 1000,
    });
    return data.signedUrl;
  }

  /**
   * Delete a file
   */
  async deleteFile(bucket: StorageBucket, path: string): Promise<void> {
    const { error } = await requireClient().storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(bucket: StorageBucket, paths: string[]): Promise<void> {
    const { error } = await requireClient().storage
      .from(bucket)
      .remove(paths);

    if (error) {
      throw new Error(`Failed to delete files: ${error.message}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(bucket: StorageBucket, folder: string) {
    const { data, error } = await requireClient().storage
      .from(bucket)
      .list(folder);

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data;
  }

  async getDisplayUrl(bucket: StorageBucket, path: string | null): Promise<string | null> {
    if (!path) return null;
    try {
      return await this.getSignedUrl(bucket, path);
    } catch {
      return null;
    }
  }

  /**
   * Generate a unique file path
   */
  generateFilePath(folder: string, fileName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    return `${folder}/${timestamp}-${randomString}-${nameWithoutExt}.${extension}`;
  }

  /**
   * Get content type from file name
   */
  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const contentTypes: { [key: string]: string } = {
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'webm': 'audio/webm',
      'aac': 'audio/aac',
      'm4a': 'audio/m4a',
      
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    return contentTypes[extension || ''] || 'application/octet-stream';
  }
}

export const storageService = new SupabaseStorageService();

// Helper functions for specific use cases
export const uploadMaintenanceImage = async (
  maintenanceRequestId: string,
  imageFile: File | Blob | string,
  fileName: string
): Promise<UploadResult> => {
  const path = storageService.generateFilePath(
    `maintenance-requests/${maintenanceRequestId}`,
    fileName
  );

  return storageService.uploadFile({
    bucket: 'maintenance-images',
    path,
    file: imageFile,
  });
};

export const uploadVoiceNote = async (
  maintenanceRequestId: string,
  audioFile: File | Blob | string,
  fileName: string
): Promise<UploadResult> => {
  const path = storageService.generateFilePath(
    `maintenance-requests/${maintenanceRequestId}`,
    fileName
  );

  return storageService.uploadFile({
    bucket: 'voice-notes',
    path,
    file: audioFile,
  });
};

export const uploadPropertyImage = async (
  propertyId: string,
  imageFile: File | Blob | string,
  fileName: string
): Promise<UploadResult> => {
  const path = storageService.generateFilePath(
    `properties/${propertyId}`,
    fileName
  );

  return storageService.uploadFile({
    bucket: 'property-images',
    path,
    file: imageFile,
  });
};

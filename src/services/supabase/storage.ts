import { supabase } from './config';
import { decode } from 'base64-arraybuffer';

export type StorageBucket = 'maintenance-images' | 'voice-notes' | 'property-images' | 'documents';

export interface UploadOptions {
  bucket: StorageBucket;
  path: string;
  file: File | Blob | string; // string for base64
  contentType?: string;
}

export interface UploadResult {
  path: string;
  url: string;
}

export class SupabaseStorageService {
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

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, uploadData, {
          contentType: contentType || this.getContentType(path),
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        path: data.path,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error('Storage upload error:', error);
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
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Failed to get signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Delete a file
   */
  async deleteFile(bucket: StorageBucket, path: string): Promise<void> {
    const { error } = await supabase.storage
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
    const { error } = await supabase.storage
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
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder);

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data;
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
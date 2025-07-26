import { useAuth } from '@clerk/clerk-expo';
import { supabaseClient } from '../supabase/client';
import { withUserContext } from '../supabase/auth-helper';
import { storageService, uploadMaintenanceImage, uploadVoiceNote } from '../supabase/storage';
import { supabase } from '../supabase/config';

const SUPABASE_FUNCTIONS_URL = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL || 
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

export class SupabaseOnlyApiClient {
  // ========== USER PROFILE METHODS ==========
  async getUserProfile(clerkUserId: string) {
    try {
      return await withUserContext(clerkUserId, async () => {
        const profile = await supabaseClient.getProfile(clerkUserId);
        if (!profile) {
          // Create profile if it doesn't exist
          const { user } = await this.getClerkUser(clerkUserId);
          if (user) {
            return await supabaseClient.createProfile({
              clerkUserId,
              email: user.emailAddresses[0]?.emailAddress || '',
              name: user.fullName || user.firstName || '',
              avatarUrl: user.imageUrl,
            });
          }
          throw new Error('User not found');
        }
        return profile;
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(clerkUserId: string, updates: {
    name?: string;
    role?: 'tenant' | 'landlord';
    avatarUrl?: string;
  }) {
    return withUserContext(clerkUserId, () => 
      supabaseClient.updateProfile(clerkUserId, updates)
    );
  }

  async setUserRole(clerkUserId: string, role: 'tenant' | 'landlord') {
    return withUserContext(clerkUserId, () => 
      supabaseClient.updateProfile(clerkUserId, { role })
    );
  }

  // ========== PROPERTY METHODS ==========
  async getUserProperties(clerkUserId: string) {
    return withUserContext(clerkUserId, () => 
      supabaseClient.getUserProperties(clerkUserId)
    );
  }

  // ========== MAINTENANCE REQUEST METHODS ==========
  async getMaintenanceRequests(clerkUserId: string) {
    return withUserContext(clerkUserId, () => 
      supabaseClient.getMaintenanceRequests(clerkUserId)
    );
  }

  async createMaintenanceRequest(clerkUserId: string, requestData: {
    propertyId: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    area: string;
    asset: string;
    issueType: string;
    images?: string[];
    voiceNotes?: string[];
  }) {
    return withUserContext(clerkUserId, async () => {
      const profile = await this.getUserProfile(clerkUserId);
      if (!profile || profile.role !== 'tenant') {
        throw new Error('Only tenants can create maintenance requests');
      }

      // Create the maintenance request first
      const maintenanceRequest = await supabaseClient.createMaintenanceRequest({
        tenantId: profile.id,
        ...requestData,
      });

      // If there are images or voice notes, upload them
      const uploadedImages: string[] = [];
      const uploadedVoiceNotes: string[] = [];

      if (requestData.images?.length) {
        for (const image of requestData.images) {
          try {
            const result = await uploadMaintenanceImage(
              maintenanceRequest.id,
              image,
              `image-${Date.now()}.jpg`
            );
            uploadedImages.push(result.url);
          } catch (error) {
            console.error('Error uploading image:', error);
          }
        }
      }

      if (requestData.voiceNotes?.length) {
        for (const voiceNote of requestData.voiceNotes) {
          try {
            const result = await uploadVoiceNote(
              maintenanceRequest.id,
              voiceNote,
              `voice-${Date.now()}.m4a`
            );
            uploadedVoiceNotes.push(result.url);
          } catch (error) {
            console.error('Error uploading voice note:', error);
          }
        }
      }

      // Update the maintenance request with uploaded file URLs if any
      if (uploadedImages.length || uploadedVoiceNotes.length) {
        await supabaseClient.updateMaintenanceRequest(maintenanceRequest.id, {
          images: uploadedImages.length ? uploadedImages : undefined,
          voice_notes: uploadedVoiceNotes.length ? uploadedVoiceNotes : undefined,
        });
      }

      return maintenanceRequest;
    });
  }

  async updateMaintenanceRequest(
    requestId: string,
    updates: {
      status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assignedVendorEmail?: string;
      vendorNotes?: string;
      estimatedCost?: number;
      actualCost?: number;
      completionNotes?: string;
    }
  ) {
    return supabaseClient.updateMaintenanceRequest(requestId, updates);
  }

  // ========== MESSAGING METHODS ==========
  async getMessages(clerkUserId: string, otherUserId?: string) {
    return withUserContext(clerkUserId, () => 
      supabaseClient.getMessages(clerkUserId, otherUserId)
    );
  }

  async sendMessage(messageData: {
    senderClerkId: string;
    recipientClerkId: string;
    content: string;
    messageType?: 'text' | 'image' | 'file';
    attachmentUrl?: string;
    propertyId?: string;
  }) {
    return withUserContext(messageData.senderClerkId, () => 
      supabaseClient.sendMessage(messageData)
    );
  }

  // ========== AI METHODS (Supabase Edge Functions) ==========
  async analyzeMaintenanceRequest(
    clerkUserId: string,
    description: string,
    images?: string[]
  ) {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-maintenance-request', {
        body: { description, images, clerkUserId }
      });

      if (error) {
        throw new Error(`AI analysis failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error analyzing maintenance request:', error);
      throw error;
    }
  }

  // ========== STORAGE METHODS (Supabase Storage) ==========
  async uploadFile(
    bucket: 'maintenance-images' | 'voice-notes' | 'property-images' | 'documents',
    file: File | Blob | string,
    fileName: string,
    folder?: string
  ) {
    const path = folder 
      ? storageService.generateFilePath(folder, fileName)
      : fileName;

    return storageService.uploadFile({
      bucket,
      path,
      file,
    });
  }

  async getSignedUrl(
    bucket: 'maintenance-images' | 'voice-notes' | 'property-images' | 'documents',
    path: string
  ) {
    return storageService.getSignedUrl(bucket, path);
  }

  async deleteFile(
    bucket: 'maintenance-images' | 'voice-notes' | 'property-images' | 'documents',
    path: string
  ) {
    return storageService.deleteFile(bucket, path);
  }

  // ========== REAL-TIME SUBSCRIPTIONS ==========
  subscribeToMaintenanceRequests(clerkUserId: string, callback: (payload: any) => void) {
    return supabaseClient.subscribeToMaintenanceRequests(clerkUserId, callback);
  }

  subscribeToMessages(clerkUserId: string, callback: (payload: any) => void) {
    return supabaseClient.subscribeToMessages(clerkUserId, callback);
  }

  // ========== HELPER METHODS ==========
  private async getClerkUser(clerkUserId: string): Promise<{ user: any }> {
    // This would need to be called from a component with access to Clerk hooks
    // For now, returning a placeholder
    return { user: null };
  }
}

export const supabaseOnlyApiClient = new SupabaseOnlyApiClient();

// Hook for use in components
export function useSupabaseApiClient() {
  const { getToken, userId } = useAuth();

  return {
    // User methods
    getUserProfile: () => supabaseOnlyApiClient.getUserProfile(userId!),
    updateUserProfile: (updates: any) => supabaseOnlyApiClient.updateUserProfile(userId!, updates),
    setUserRole: (role: 'tenant' | 'landlord') => supabaseOnlyApiClient.setUserRole(userId!, role),
    
    // Property methods
    getUserProperties: () => supabaseOnlyApiClient.getUserProperties(userId!),
    
    // Maintenance request methods
    getMaintenanceRequests: () => supabaseOnlyApiClient.getMaintenanceRequests(userId!),
    createMaintenanceRequest: (data: any) => supabaseOnlyApiClient.createMaintenanceRequest(userId!, data),
    updateMaintenanceRequest: (id: string, updates: any) => 
      supabaseOnlyApiClient.updateMaintenanceRequest(id, updates),
    
    // Messaging methods
    getMessages: (otherUserId?: string) => supabaseOnlyApiClient.getMessages(userId!, otherUserId),
    sendMessage: (data: any) => supabaseOnlyApiClient.sendMessage({ ...data, senderClerkId: userId! }),
    
    // AI methods
    analyzeMaintenanceRequest: (description: string, images?: string[]) => 
      supabaseOnlyApiClient.analyzeMaintenanceRequest(userId!, description, images),
    
    // Storage methods
    uploadFile: (bucket: any, file: any, fileName: string, folder?: string) => 
      supabaseOnlyApiClient.uploadFile(bucket, file, fileName, folder),
    getSignedUrl: (bucket: any, path: string) => 
      supabaseOnlyApiClient.getSignedUrl(bucket, path),
    deleteFile: (bucket: any, path: string) => 
      supabaseOnlyApiClient.deleteFile(bucket, path),
    
    // Subscriptions
    subscribeToMaintenanceRequests: (callback: any) => 
      supabaseOnlyApiClient.subscribeToMaintenanceRequests(userId!, callback),
    subscribeToMessages: (callback: any) => 
      supabaseOnlyApiClient.subscribeToMessages(userId!, callback),
  };
}
import { useAuth } from '@clerk/clerk-expo';
import { supabaseClient } from '../supabase/client';
import { withUserContext } from '../supabase/auth-helper';
import { storageService, uploadMaintenanceImage, uploadVoiceNote } from '../supabase/storage';
import { supabase } from '../supabase/config';
import {
  CreateProfileData,
  UpdateProfileData,
  CreateMaintenanceRequestData,
  UpdateMaintenanceRequestData,
  CreateMessageData,
  FileUploadData,
  AnalyzeMaintenanceRequestData,
  StorageBucket,
  UseApiClientReturn,
  UserRole,
  Priority
} from '../../types/api';
import {
  validateAndSanitize,
  validateProfileData,
  validateMaintenanceRequestData,
  validateMaintenanceRequestUpdate,
  validateMessageData,
  validateFileUpload,
  sanitizeProfileData,
  sanitizeMaintenanceRequestData,
  sanitizeMessageData
} from '../../utils/validation';
import { validateImageFile, validateAudioFile, getErrorMessage, validateRequired, validateLength, sanitizeString } from '../../utils/helpers';
import { FileValidation } from '../../types/api';
import { ENV_CONFIG } from '../../utils/constants';

const SUPABASE_FUNCTIONS_URL = ENV_CONFIG.SUPABASE_FUNCTIONS_URL || 
  `${ENV_CONFIG.SUPABASE_URL}/functions/v1`;

// Hook for use in components - all API logic is contained within this hook
export function useApiClient(): UseApiClientReturn {
  const { getToken, userId } = useAuth();

  if (!userId) {
    throw new Error('User must be authenticated to use API client');
  }

  // ========== USER PROFILE METHODS ==========
  const getUserProfile = async () => {
    try {
      return await withUserContext(userId, async () => {
        const profile = await supabaseClient.getProfile(userId);
        return profile; // Return null if no profile exists - let the calling code handle creation
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  };

  const createUserProfile = async (profileData: Omit<CreateProfileData, 'clerkUserId'>) => {
    try {
      const fullProfileData = { ...profileData, clerkUserId: userId };
      
      // Validate and sanitize input
      const validatedData = validateAndSanitize(
        fullProfileData,
        validateProfileData,
        sanitizeProfileData
      ) as CreateProfileData;

      return await withUserContext(validatedData.clerkUserId, () => 
        supabaseClient.createProfile(validatedData)
      );
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error(`Failed to create profile: ${getErrorMessage(error)}`);
    }
  };

  const updateUserProfile = async (updates: UpdateProfileData) => {
    try {
      // For updates, validate only the provided fields
      const finalUpdates: UpdateProfileData = {};
      
      if (updates.name !== undefined) {
        if (!validateRequired(updates.name)) {
          throw new Error('Name cannot be empty');
        }
        finalUpdates.name = sanitizeString(updates.name);
      }
      
      if (updates.role !== undefined) {
        if (!['tenant', 'landlord'].includes(updates.role)) {
          throw new Error('Invalid role');
        }
        finalUpdates.role = updates.role;
      }
      
      if (updates.avatarUrl !== undefined) {
        finalUpdates.avatarUrl = sanitizeString(updates.avatarUrl);
      }

      if (updates.email !== undefined) {
        finalUpdates.email = sanitizeString(updates.email);
      }

      return await withUserContext(userId, () => 
        supabaseClient.updateProfile(userId, finalUpdates)
      );
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update profile: ${getErrorMessage(error)}`);
    }
  };

  const setUserRole = async (role: UserRole) => {
    try {
      // Validate role directly
      if (!['tenant', 'landlord'].includes(role)) {
        throw new Error('Invalid role');
      }

      return await withUserContext(userId, () => 
        supabaseClient.updateProfile(userId, { role })
      );
    } catch (error) {
      console.error('Error setting user role:', error);
      throw new Error(`Failed to set role: ${getErrorMessage(error)}`);
    }
  };

  // ========== PROPERTY METHODS ==========
  const getUserProperties = async () => {
    return withUserContext(userId, () => 
      supabaseClient.getUserProperties(userId)
    );
  };

  // ========== MAINTENANCE REQUEST METHODS ==========
  const getMaintenanceRequests = async () => {
    return withUserContext(userId, () => 
      supabaseClient.getMaintenanceRequests(userId)
    );
  };

  const createMaintenanceRequest = async (requestData: CreateMaintenanceRequestData) => {
    try {
      // Validate and sanitize input
      const validatedData = validateAndSanitize(
        requestData,
        validateMaintenanceRequestData,
        sanitizeMaintenanceRequestData
      ) as CreateMaintenanceRequestData;

      return await withUserContext(userId, async () => {
        const profile = await getUserProfile();
        if (!profile) {
          throw new Error('User profile not found. Please try again.');
        }
        if (profile.role !== 'tenant') {
          throw new Error('Only tenants can create maintenance requests');
        }

        // Create the maintenance request first
        const apiRequestData = {
          tenantId: profile.id,
          propertyId: validatedData.propertyId,
          title: validatedData.title,
          description: validatedData.description,
          priority: validatedData.priority,
          area: validatedData.area,
          asset: validatedData.asset,
          issueType: validatedData.issueType,
        };
        
        const maintenanceRequest = await supabaseClient.createMaintenanceRequest(apiRequestData);

        // If there are images or voice notes, upload them with validation
        const uploadedImages: string[] = [];
        const uploadedVoiceNotes: string[] = [];

        if (validatedData.images?.length) {
          for (const image of validatedData.images) {
            try {
              // Validate image file if it's a File object
              if (typeof image !== 'string' && 'size' in image && 'type' in image) {
                const validation = validateImageFile(image as FileValidation);
                if (!validation.valid) {
                  throw new Error(validation.error);
                }
              }

              const result = await uploadMaintenanceImage(
                maintenanceRequest.id,
                image,
                `image-${Date.now()}.jpg`
              );
              uploadedImages.push(result.url);
            } catch (error) {
              console.error('Error uploading image:', error);
              throw new Error(`Failed to upload image: ${getErrorMessage(error)}`);
            }
          }
        }

        if (validatedData.voiceNotes?.length) {
          for (const voiceNote of validatedData.voiceNotes) {
            try {
              // Validate audio file if it's a File object
              if (typeof voiceNote !== 'string' && 'size' in voiceNote && 'type' in voiceNote) {
                const validation = validateAudioFile(voiceNote as FileValidation);
                if (!validation.valid) {
                  throw new Error(validation.error);
                }
              }

              const result = await uploadVoiceNote(
                maintenanceRequest.id,
                voiceNote,
                `voice-${Date.now()}.m4a`
              );
              uploadedVoiceNotes.push(result.url);
            } catch (error) {
              console.error('Error uploading voice note:', error);
              throw new Error(`Failed to upload voice note: ${getErrorMessage(error)}`);
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
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      throw new Error(`Failed to create maintenance request: ${getErrorMessage(error)}`);
    }
  };

  const updateMaintenanceRequest = async (
    requestId: string,
    updates: UpdateMaintenanceRequestData
  ) => {
    try {
      // Validate input
      const result = validateMaintenanceRequestUpdate(updates);
      if (!result.valid) {
        throw new Error(result.errors.join(', '));
      }

      if (!validateRequired(requestId)) {
        throw new Error('Request ID is required');
      }

      return await supabaseClient.updateMaintenanceRequest(requestId, updates);
    } catch (error) {
      console.error('Error updating maintenance request:', error);
      throw new Error(`Failed to update maintenance request: ${getErrorMessage(error)}`);
    }
  };

  // ========== MESSAGING METHODS ==========
  const getMessages = async (otherUserId?: string) => {
    try {
      if (!validateRequired(userId)) {
        throw new Error('User ID is required');
      }

      return await withUserContext(userId, () => 
        supabaseClient.getMessages(userId, otherUserId)
      );
    } catch (error) {
      console.error('Error getting messages:', error);
      throw new Error(`Failed to get messages: ${getErrorMessage(error)}`);
    }
  };

  const sendMessage = async (messageData: Omit<CreateMessageData, 'senderClerkId'>) => {
    try {
      const fullMessageData = { ...messageData, senderClerkId: userId };
      
      // Validate and sanitize input
      const validatedData = validateAndSanitize(
        fullMessageData,
        validateMessageData,
        sanitizeMessageData
      ) as CreateMessageData;

      return await withUserContext(validatedData.senderClerkId, () => 
        supabaseClient.sendMessage(validatedData)
      );
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error(`Failed to send message: ${getErrorMessage(error)}`);
    }
  };

  // ========== AI METHODS (Supabase Edge Functions) ==========
  const analyzeMaintenanceRequest = async (
    description: string,
    images?: string[]
  ) => {
    try {
      // Validate input
      if (!validateRequired(userId)) {
        throw new Error('User ID is required');
      }
      if (!validateRequired(description)) {
        throw new Error('Description is required');
      }
      if (!validateLength(description, 1, 2000)) {
        throw new Error('Description must be between 1 and 2000 characters');
      }

      const sanitizedDescription = sanitizeString(description);

      const { data, error } = await supabase.functions.invoke('analyze-maintenance-request', {
        body: { 
          description: sanitizedDescription, 
          images: images || [], 
          clerkUserId: userId 
        }
      });

      if (error) {
        throw new Error(`AI analysis failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error analyzing maintenance request:', error);
      throw new Error(`Failed to analyze maintenance request: ${getErrorMessage(error)}`);
    }
  };

  // ========== STORAGE METHODS (Supabase Storage) ==========
  const uploadFile = async (
    bucket: StorageBucket,
    file: File | Blob | string,
    fileName: string,
    folder?: string
  ) => {
    try {
      // Validate file upload parameters
      const fileData = {
        bucket,
        fileName: sanitizeString(fileName),
        fileSize: typeof file === 'object' && 'size' in file ? file.size : undefined,
        fileType: typeof file === 'object' && 'type' in file ? file.type : undefined
      };

      const result = validateFileUpload(fileData);
      if (!result.valid) {
        throw new Error(result.errors.join(', '));
      }

      // Additional file validation if it's a File object
      if (typeof file === 'object' && 'size' in file && 'type' in file) {
        const fileValidation = file as FileValidation;
        
        if (bucket === 'maintenance-images' || bucket === 'property-images') {
          const validation = validateImageFile(fileValidation);
          if (!validation.valid) {
            throw new Error(validation.error);
          }
        } else if (bucket === 'voice-notes') {
          const validation = validateAudioFile(fileValidation);
          if (!validation.valid) {
            throw new Error(validation.error);
          }
        }
      }

      const path = folder 
        ? storageService.generateFilePath(folder, fileData.fileName)
        : fileData.fileName;

      return await storageService.uploadFile({
        bucket,
        path,
        file,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${getErrorMessage(error)}`);
    }
  };

  const getSignedUrl = async (
    bucket: StorageBucket,
    path: string
  ) => {
    try {
      if (!validateRequired(path)) {
        throw new Error('File path is required');
      }

      const sanitizedPath = sanitizeString(path);
      return await storageService.getSignedUrl(bucket, sanitizedPath);
    } catch (error) {
      console.error('Error getting signed URL:', error);
      throw new Error(`Failed to get signed URL: ${getErrorMessage(error)}`);
    }
  };

  const deleteFile = async (
    bucket: StorageBucket,
    path: string
  ) => {
    try {
      if (!validateRequired(path)) {
        throw new Error('File path is required');
      }

      const sanitizedPath = sanitizeString(path);
      return await storageService.deleteFile(bucket, sanitizedPath);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${getErrorMessage(error)}`);
    }
  };

  // ========== REAL-TIME SUBSCRIPTIONS ==========
  const subscribeToMaintenanceRequests = (callback: (payload: any) => void) => {
    return supabaseClient.subscribeToMaintenanceRequests(userId, callback);
  };

  const subscribeToMessages = (callback: (payload: any) => void) => {
    return supabaseClient.subscribeToMessages(userId, callback);
  };

  return {
    // User methods
    getUserProfile,
    createUserProfile,
    updateUserProfile,
    setUserRole,
    
    // Property methods
    getUserProperties,
    
    // Maintenance request methods
    getMaintenanceRequests,
    createMaintenanceRequest,
    updateMaintenanceRequest,
    
    // Messaging methods
    getMessages,
    sendMessage,
    
    // AI methods
    analyzeMaintenanceRequest,
    
    // Storage methods
    uploadFile,
    getSignedUrl,
    deleteFile,
    
    // Subscriptions
    subscribeToMaintenanceRequests,
    subscribeToMessages,
  };
}
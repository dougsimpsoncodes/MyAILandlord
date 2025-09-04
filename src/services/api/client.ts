import { useAuth } from '@clerk/clerk-expo';
import { SupabaseClient } from '../supabase/client';
import { withUserContext } from '../supabase/auth-helper';
import { storageService, uploadMaintenanceImage, uploadVoiceNote, setStorageSupabaseClient } from '../supabase/storage';
import { supabase } from '../supabase/config';
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';
import { getMaintenanceRequests as getMaintenanceRequestsREST } from '../../lib/maintenanceClient';
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
import log from '../../lib/log';

const SUPABASE_FUNCTIONS_URL = ENV_CONFIG.SUPABASE_FUNCTIONS_URL || 
  `${ENV_CONFIG.SUPABASE_URL}/functions/v1`;

// Hook for use in components - all API logic is contained within this hook
export function useApiClient(): UseApiClientReturn | null {
  const { getToken, userId } = useAuth();
  const { supabase: supabaseClient, getAccessToken } = useSupabaseWithAuth();

  // Set the storage client to use the authenticated Supabase instance
  setStorageSupabaseClient(supabaseClient);

  if (!userId) {
    // Return null instead of throwing when user is not authenticated
    return null;
  }

  // Helper to get authenticated Supabase client
  const getSupabaseClient = () => {
    return new SupabaseClient(supabaseClient);
  };

  // ========== USER PROFILE METHODS ==========
  const getUserProfile = async () => {
    try {
      const client = getSupabaseClient();
      const profile = await client.getProfile(userId);
      return profile; // Return null if no profile exists - let the calling code handle creation
    } catch (error) {
      log.error('Error getting user profile', { error: getErrorMessage(error) });
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

      const client = getSupabaseClient();
      return await client.createProfile(validatedData);
    } catch (error) {
      log.error('Error creating user profile', { error: getErrorMessage(error) });
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

      const client = getSupabaseClient();
      return await client.updateProfile(userId, finalUpdates);
    } catch (error) {
      log.error('Error updating user profile', { error: getErrorMessage(error) });
      throw new Error(`Failed to update profile: ${getErrorMessage(error)}`);
    }
  };

  const setUserRole = async (role: UserRole) => {
    try {
      // Validate role directly
      if (!['tenant', 'landlord'].includes(role)) {
        throw new Error('Invalid role');
      }

      const client = getSupabaseClient();
      return await client.updateProfile(userId, { role });
    } catch (error) {
      log.error('Error setting user role', { error: getErrorMessage(error) });
      throw new Error(`Failed to set role: ${getErrorMessage(error)}`);
    }
  };

  // ========== PROPERTY METHODS ==========
  const getUserProperties = async () => {
    const client = getSupabaseClient();
    return await client.getUserProperties(userId);
  };

  // ========== MAINTENANCE REQUEST METHODS ==========
  const getMaintenanceRequests = async () => {
    // Use REST API with injected token provider (works web + native)
    return await getMaintenanceRequestsREST({ getToken: async () => await getAccessToken() });
  };

  const createMaintenanceRequest = async (requestData: CreateMaintenanceRequestData) => {
    try {
      // Validate and sanitize input
      const validatedData = validateAndSanitize(
        requestData,
        validateMaintenanceRequestData,
        sanitizeMaintenanceRequestData
      ) as CreateMaintenanceRequestData;

      const profile = await getUserProfile();
      if (!profile) {
        throw new Error('User profile not found. Please try again.');
      }
      if (profile.role !== 'tenant') {
        throw new Error('Only tenants can create maintenance requests');
      }

      // Use the Supabase client directly (with proper JWT token transmission)
      console.log('=== DIRECT SUPABASE INSERT DEBUG ===');
      console.log('Profile:', { id: profile.id, clerk_user_id: profile.clerk_user_id, role: profile.role });
      console.log('Request data:', {
        tenant_id: profile.id,
        property_id: validatedData.propertyId,
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority,
      });

      const { data: maintenanceRequest, error } = await supabaseClient
        .from('maintenance_requests')
        .insert({
          tenant_id: profile.id,
          property_id: validatedData.propertyId,
          title: validatedData.title,
          description: validatedData.description,
          priority: validatedData.priority,
          area: validatedData.area,
          asset: validatedData.asset,
          issue_type: validatedData.issueType,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('=== DIRECT SUPABASE INSERT ERROR ===');
        console.error('Error:', error);
        throw new Error(`Failed to create maintenance request: ${error.message}`);
      }

      console.log('=== DIRECT SUPABASE INSERT SUCCESS ===');
      console.log('Created:', maintenanceRequest);

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
            const signed = await storageService.getDisplayUrl('maintenance-images', result.path);
            if (signed) uploadedImages.push(signed);
          } catch (error) {
            log.error('Error uploading image', { error: getErrorMessage(error) });
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
            const signed = await storageService.getDisplayUrl('voice-notes', result.path);
            if (signed) uploadedVoiceNotes.push(signed);
          } catch (error) {
            log.error('Error uploading voice note', { error: getErrorMessage(error) });
            throw new Error(`Failed to upload voice note: ${getErrorMessage(error)}`);
          }
        }
      }

      // Update the maintenance request with uploaded file URLs if any
      if (uploadedImages.length || uploadedVoiceNotes.length) {
        const { error: updateError } = await supabaseClient
          .from('maintenance_requests')
          .update({
            images: uploadedImages.length ? uploadedImages : null,
            voice_notes: uploadedVoiceNotes.length ? uploadedVoiceNotes : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', maintenanceRequest.id);

        if (updateError) {
          console.error('Failed to update maintenance request with file URLs:', updateError);
          // Don't throw here - the request was created successfully
        }
      }

      return maintenanceRequest;
    } catch (error) {
      log.error('Error creating maintenance request', { error: getErrorMessage(error) });
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

      const client = getSupabaseClient();
      return await client.updateMaintenanceRequest(requestId, updates);
    } catch (error) {
      log.error('Error updating maintenance request', { error: getErrorMessage(error) });
      throw new Error(`Failed to update maintenance request: ${getErrorMessage(error)}`);
    }
  };

  // ========== MESSAGING METHODS ==========
  const getMessages = async (otherUserId?: string) => {
    try {
      if (!validateRequired(userId)) {
        throw new Error('User ID is required');
      }

      const client = getSupabaseClient();
      return await client.getMessages(userId, otherUserId);
    } catch (error) {
      log.error('Error getting messages', { error: getErrorMessage(error) });
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

      const client = getSupabaseClient();
      return await client.sendMessage(validatedData);
    } catch (error) {
      log.error('Error sending message', { error: getErrorMessage(error) });
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
      log.error('Error analyzing maintenance request', { error: getErrorMessage(error) });
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
      log.error('Error uploading file', { error: getErrorMessage(error) });
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
      log.error('Error getting signed URL', { error: getErrorMessage(error) });
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
      log.error('Error deleting file', { error: getErrorMessage(error) });
      throw new Error(`Failed to delete file: ${getErrorMessage(error)}`);
    }
  };

  // ========== REAL-TIME SUBSCRIPTIONS ==========
  const subscribeToMaintenanceRequests = async (callback: (payload: any) => void) => {
    const client = getSupabaseClient();
    return client.subscribeToMaintenanceRequests(userId, callback);
  };

  const subscribeToMessages = async (callback: (payload: any) => void) => {
    const client = getSupabaseClient();
    return client.subscribeToMessages(userId, callback);
  };

  // ========== PROPERTY CODE METHODS ==========
  const validatePropertyCode = async (propertyCode: string) => {
    try {
      if (!validateRequired(propertyCode) || !validateLength(propertyCode, 6, 6)) {
        throw new Error('Property code must be exactly 6 characters');
      }

      const client = getSupabaseClient();
      const { data, error } = await client.client.rpc('validate_property_code', {
        input_code: sanitizeString(propertyCode).toUpperCase(),
        tenant_clerk_id: userId
      });

      if (error) {
        throw new Error(`Failed to validate property code: ${error.message}`);
      }

      return data?.[0] || { success: false, error_message: 'Unknown error occurred' };
    } catch (error) {
      log.error('Error validating property code', { error: getErrorMessage(error) });
      throw new Error(`Failed to validate property code: ${getErrorMessage(error)}`);
    }
  };

  const linkTenantToProperty = async (propertyCode: string, unitNumber?: string) => {
    try {
      if (!validateRequired(propertyCode)) {
        throw new Error('Property code is required');
      }

      const client = getSupabaseClient();
      const { data, error } = await client.client.rpc('link_tenant_to_property', {
        input_code: sanitizeString(propertyCode).toUpperCase(),
        tenant_clerk_id: userId,
        unit_number: unitNumber ? sanitizeString(unitNumber) : null
      });

      if (error) {
        throw new Error(`Failed to link to property: ${error.message}`);
      }

      return data?.[0] || { success: false, error_message: 'Unknown error occurred' };
    } catch (error) {
      log.error('Error linking tenant to property', { error: getErrorMessage(error) });
      throw new Error(`Failed to link to property: ${getErrorMessage(error)}`);
    }
  };

  const getTenantProperties = async () => {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.client
        .from('tenant_property_links')
        .select(`
          id,
          unit_number,
          is_active,
          properties (
            id,
            name,
            address,
            wifi_network,
            wifi_password,
            emergency_contact,
            emergency_phone
          )
        `)
        .eq('tenant_id', (await client.getProfile(userId))?.id)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to get tenant properties: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      log.error('Error getting tenant properties', { error: getErrorMessage(error) });
      throw new Error(`Failed to get properties: ${getErrorMessage(error)}`);
    }
  };

  return {
    // User methods
    getUserProfile,
    createUserProfile,
    updateUserProfile,
    setUserRole,
    
    // Property methods
    getUserProperties,
    
    // Property code methods  
    validatePropertyCode,
    linkTenantToProperty,
    getTenantProperties,
    
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

import { useMemo } from 'react';
import { SupabaseClient } from '../supabase/client';
import { storageService, uploadMaintenanceImage, uploadVoiceNote, setStorageSupabaseClient } from '../supabase/storage';
import { supabase } from '../supabase/config';
import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';
import { useUnifiedAuth } from '../../context/UnifiedAuthContext';
import { getMaintenanceRequests as getMaintenanceRequestsREST, getMaintenanceRequestById as getMaintenanceRequestByIdREST } from '../../lib/maintenanceClient';
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
  Priority,
  RealtimePayload,
  MaintenanceRequest,
  Message
} from '../../types/api';
import { PropertyAddress } from '../../types/property';
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
import { validateImageFile, validateAudioFile, getErrorMessage, validateRequired, validateLength, sanitizeString, sanitizePath, sanitizeUrl } from '../../utils/helpers';
import { FileValidation } from '../../types/api';
import { ENV_CONFIG } from '../../utils/constants';
import log from '../../lib/log';
import { captureException } from '../../lib/monitoring';

const SUPABASE_FUNCTIONS_URL = ENV_CONFIG.SUPABASE_FUNCTIONS_URL || 
  `${ENV_CONFIG.SUPABASE_URL}/functions/v1`;

// Cache for SupabaseClient instances to avoid recreating and resetting RLS context
const supabaseClientCache = new WeakMap<object, SupabaseClient>();

// Hook for use in components - all API logic is contained within this hook
export function useApiClient(): UseApiClientReturn | null {
  const { user } = useUnifiedAuth();
  const { supabase: supabaseClient, getAccessToken } = useSupabaseWithAuth();
  const userId = user?.id;

  // Set the storage client to use the authenticated Supabase instance
  setStorageSupabaseClient(supabaseClient);

  // Helper to get authenticated Supabase client - cached to avoid RLS context spam
  const getSupabaseClient = (): SupabaseClient | null => {
    if (!supabaseClient) return null;
    let cached = supabaseClientCache.get(supabaseClient);
    if (!cached) {
      cached = new SupabaseClient(supabaseClient);
      supabaseClientCache.set(supabaseClient, cached);
    }
    return cached;
  };

  // Helper that throws if client is not available
  const requireSupabaseClient = (): SupabaseClient => {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available. Please ensure you are authenticated.');
    }
    return client;
  };

  // Helper that throws if userId is not available
  const requireUserId = (): string => {
    if (!userId) {
      throw new Error('User ID not available. Please ensure you are authenticated.');
    }
    return userId;
  };

  // ========== USER PROFILE METHODS ==========
  const getUserProfile = async () => {
    try {
      const client = requireSupabaseClient();
      const profile = await client.getProfile(requireUserId());
      return profile; // Return null if no profile exists - let the calling code handle creation
    } catch (error) {
      log.error('Error getting user profile', { error: getErrorMessage(error) });
      throw error;
    }
  };

  const createUserProfile = async (profileData: Omit<CreateProfileData, 'userId'>) => {
    try {
      const fullProfileData = { ...profileData, userId };

      // Validate and sanitize input
      const validatedData = validateAndSanitize(
        fullProfileData,
        validateProfileData,
        sanitizeProfileData
      ) as CreateProfileData;

      const client = requireSupabaseClient();
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
        finalUpdates.avatarUrl = sanitizeUrl(updates.avatarUrl);
      }

      if (updates.email !== undefined) {
        finalUpdates.email = sanitizeString(updates.email);
      }

      const client = requireSupabaseClient();
      return await client.updateProfile(requireUserId(), finalUpdates);
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

      const client = requireSupabaseClient();
      return await client.updateProfile(requireUserId(), { role });
    } catch (error) {
      log.error('Error setting user role', { error: getErrorMessage(error) });
      throw new Error(`Failed to set role: ${getErrorMessage(error)}`);
    }
  };

  // ========== PROPERTY METHODS ==========
  const getUserProperties = async (opts?: { limit?: number; offset?: number }) => {
    const client = requireSupabaseClient();
    return await client.getUserProperties(requireUserId(), opts);
  };

  const createProperty = async (payload: {
    name: string;
    address_jsonb: PropertyAddress;
    property_type: string;
    unit?: string;
    bedrooms?: number;
    bathrooms?: number;
  }) => {
    // Insert property with user_id (required by RLS policy: user_id = auth_uid_compat())
    // Convert empty property_type to null (database constraint requires specific values or NULL, not empty string)
    const insertPayload = {
      name: payload.name,
      address_jsonb: payload.address_jsonb,
      property_type: payload.property_type || null,
      unit: payload.unit || null,
      bedrooms: payload.bedrooms ?? null,
      bathrooms: payload.bathrooms ?? null,
      allow_tenant_signup: true,
      user_id: userId, // RLS policy checks user_id = auth_uid_compat()
      landlord_id: userId, // Also set landlord_id for foreign key
    };
    log.debug('createProperty: attempting insert', { userId, hasUserId: !!userId, payload, insertPayload });
    const { data, error } = await supabaseClient
      .from('properties')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      log.error('Error creating property', { error: getErrorMessage(error), fullError: error, insertPayload });
      captureException(error, { op: 'createProperty' });
      throw new Error(`Failed to create property: ${error.message}`);
    }

    // Fallback: if property_code missing, call RPC and patch
    if (data && !data.property_code) {
      try {
        const { data: codeData, error: codeError } = await supabaseClient.rpc('generate_property_code');
        if (codeError) throw codeError;
        if (codeData) {
          const { data: updated, error: patchError } = await supabaseClient
            .from('properties')
            .update({
              property_code: codeData,
              code_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
              allow_tenant_signup: true,
            })
            .eq('id', data.id)
            .select()
            .single();
          if (patchError) throw patchError;
          return updated;
        }
      } catch (fallbackError) {
        log.warn('Property code generation fallback failed', { error: getErrorMessage(fallbackError) });
      }
    }

    return data;
  };

  const createPropertyAreas = async (areas: Array<{ property_id: string; name: string; area_type: string; photos?: string[] }>) => {
    const { error } = await supabaseClient
      .from('property_areas')
      .insert(areas);
    if (error) {
      log.error('Error creating property areas', { error: getErrorMessage(error) });
      captureException(error, { op: 'createPropertyAreas' });
      throw new Error(`Failed to create property areas: ${error.message}`);
    }
    return true;
  };

  const deleteProperty = async (propertyId: string) => {
    const { error } = await supabaseClient
      .from('properties')
      .delete()
      .eq('id', propertyId);
    if (error) {
      log.error('Error deleting property', { propertyId, error: getErrorMessage(error) });
      throw new Error(`Failed to delete property: ${error.message}`);
    }
    return true;
  };

  // ========== MAINTENANCE REQUEST METHODS ==========
  const getMaintenanceRequests = async (opts?: { limit?: number; offset?: number }) => {
    // Use REST API with injected token provider (works web + native)
    return await getMaintenanceRequestsREST({ getToken: async () => await getAccessToken() }, opts || {});
  };

  const getMaintenanceRequestById = async (id: string) => {
    // Use REST API with injected token provider (works web + native)
    return await getMaintenanceRequestByIdREST(id, { getToken: async () => await getAccessToken() });
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
      log.info('=== DIRECT SUPABASE INSERT DEBUG ===');
      log.info('Profile:', { id: profile.id, role: profile.role });
      log.info('Request data:', {
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
          status: 'submitted',
        })
        .select()
        .single();

      if (error) {
        log.error('=== DIRECT SUPABASE INSERT ERROR ===');
        log.error('Error:', error as any);
        throw new Error(`Failed to create maintenance request: ${error.message}`);
      }

      log.info('=== DIRECT SUPABASE INSERT SUCCESS ===');
      log.info('Created:', maintenanceRequest);

      // If there are images or voice notes, upload them with validation
      // Store file paths (not signed URLs) to avoid expiration issues
      const uploadedImagePaths: string[] = [];
      const uploadedVoiceNotePaths: string[] = [];

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
            // Store the path, not a signed URL (signed URLs expire)
            uploadedImagePaths.push(result.path);
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
            // Store the path, not a signed URL (signed URLs expire)
            uploadedVoiceNotePaths.push(result.path);
          } catch (error) {
            log.error('Error uploading voice note', { error: getErrorMessage(error) });
            throw new Error(`Failed to upload voice note: ${getErrorMessage(error)}`);
          }
        }
      }

      // Update the maintenance request with uploaded file paths (not signed URLs)
      if (uploadedImagePaths.length || uploadedVoiceNotePaths.length) {
        const { error: updateError } = await supabaseClient
          .from('maintenance_requests')
          .update({
            images: uploadedImagePaths.length ? uploadedImagePaths : null,
            voice_notes: uploadedVoiceNotePaths.length ? uploadedVoiceNotePaths : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', maintenanceRequest.id);

        if (updateError) {
          console.error('Failed to update maintenance request with file paths:', updateError);
          // Don't throw here - the request was created successfully
        }
      }

      return maintenanceRequest;
    } catch (error) {
      log.error('Error creating maintenance request', { error: getErrorMessage(error) });
      captureException(error, { op: 'createMaintenanceRequest' });
      throw new Error(`Failed to create maintenance request: ${getErrorMessage(error)}`);
    }
  };

  const updateMaintenanceRequest = async (
    requestId: string,
    updates: UpdateMaintenanceRequestData
  ) => {
    try {
      log.info('updateMaintenanceRequest called', { requestId, updates });

      // Validate input
      const result = validateMaintenanceRequestUpdate(updates);
      if (!result.valid) {
        log.error('Validation failed', { errors: result.errors });
        throw new Error(result.errors.join(', '));
      }

      if (!validateRequired(requestId)) {
        throw new Error('Request ID is required');
      }

      const client = requireSupabaseClient();
      log.info('Calling supabase client updateMaintenanceRequest');
      const response = await client.updateMaintenanceRequest(requestId, updates);
      log.info('updateMaintenanceRequest success', { response });
      return response;
    } catch (error) {
      log.error('Error updating maintenance request', { error: getErrorMessage(error), requestId, updates });
      captureException(error, { op: 'updateMaintenanceRequest', requestId });
      throw new Error(`Failed to update maintenance request: ${getErrorMessage(error)}`);
    }
  };

  // ========== MESSAGING METHODS ==========
  const getMessages = async (otherUserId?: string) => {
    try {
      if (!validateRequired(userId)) {
        throw new Error('User ID is required');
      }

      const client = requireSupabaseClient();
      return await client.getMessages(requireUserId(), otherUserId);
    } catch (error) {
      log.error('Error getting messages', { error: getErrorMessage(error) });
      throw new Error(`Failed to get messages: ${getErrorMessage(error)}`);
    }
  };

  const sendMessage = async (messageData: Omit<CreateMessageData, 'senderId'>) => {
    try {
      const fullMessageData = { ...messageData, senderId: userId };

      // Validate and sanitize input
      const validatedData = validateAndSanitize(
        fullMessageData,
        validateMessageData,
        sanitizeMessageData
      ) as CreateMessageData;

      const client = requireSupabaseClient();
      return await client.sendMessage(validatedData);
    } catch (error) {
      log.error('Error sending message', { error: getErrorMessage(error) });
      throw new Error(`Failed to send message: ${getErrorMessage(error)}`);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        throw new Error('User profile not found');
      }

      // Mark all unread messages where user is the recipient as read
      const { error } = await supabaseClient
        .from('messages')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('recipient_id', profile.id)
        .eq('is_read', false);

      if (error) {
        throw new Error(`Failed to mark messages as read: ${error.message}`);
      }

      return true;
    } catch (error) {
      log.error('Error marking messages as read', { error: getErrorMessage(error) });
      throw new Error(`Failed to mark messages as read: ${getErrorMessage(error)}`);
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

      const { data, error } = await supabaseClient.functions.invoke('analyze-maintenance-request', {
        body: {
          description: sanitizedDescription,
          images: images || [],
          userId: userId
        }
      });

      if (error) {
        throw new Error(`AI analysis failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      log.error('Error analyzing maintenance request', { error: getErrorMessage(error) });
      captureException(error, { op: 'analyzeMaintenanceRequest' });
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
      // Sanitize file name and folder to prevent path traversal
      const sanitizedFileName = sanitizePath(fileName);
      const sanitizedFolder = folder ? sanitizePath(folder) : undefined;

      if (!sanitizedFileName) {
        throw new Error('Invalid file name');
      }

      // Validate file upload parameters
      const fileData = {
        bucket,
        fileName: sanitizedFileName,
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

      const path = sanitizedFolder
        ? storageService.generateFilePath(sanitizedFolder, fileData.fileName)
        : fileData.fileName;

      return await storageService.uploadFile({
        bucket,
        path,
        file,
      });
    } catch (error) {
      log.error('Error uploading file', { error: getErrorMessage(error) });
      captureException(error, { op: 'uploadFile', bucket });
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

      const sanitizedPath = sanitizePath(path);
      if (!sanitizedPath) {
        throw new Error('Invalid file path');
      }
      return await storageService.getSignedUrl(bucket, sanitizedPath);
    } catch (error) {
      log.error('Error getting signed URL', { error: getErrorMessage(error) });
      captureException(error, { op: 'getSignedUrl', bucket });
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

      const sanitizedPath = sanitizePath(path);
      if (!sanitizedPath) {
        throw new Error('Invalid file path');
      }
      return await storageService.deleteFile(bucket, sanitizedPath);
    } catch (error) {
      log.error('Error deleting file', { error: getErrorMessage(error) });
      captureException(error, { op: 'deleteFile', bucket });
      throw new Error(`Failed to delete file: ${getErrorMessage(error)}`);
    }
  };

  // ========== REAL-TIME SUBSCRIPTIONS ==========
  const subscribeToMaintenanceRequests = async (callback: (payload: RealtimePayload<MaintenanceRequest>) => void) => {
    const client = requireSupabaseClient();
    return client.subscribeToMaintenanceRequests(requireUserId(), callback as any);
  };

  const subscribeToMessages = async (callback: (payload: RealtimePayload<Message>) => void) => {
    const client = requireSupabaseClient();
    return client.subscribeToMessages(requireUserId(), callback as any);
  };

  // ========== PROPERTY CODE METHODS ==========
  const validatePropertyCode = async (propertyCode: string) => {
    try {
      if (!validateRequired(propertyCode) || !validateLength(propertyCode, 6, 6)) {
        throw new Error('Property code must be exactly 6 characters');
      }

      const client = requireSupabaseClient();
      const profile = await client.getProfile(requireUserId());
      if (!profile) {
        throw new Error('User profile not found');
      }

      const { data, error } = await client.client.rpc('validate_property_code', {
        input_code: sanitizeString(propertyCode).toUpperCase(),
        tenant_id: profile.id
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

      const client = requireSupabaseClient();
      const profile = await client.getProfile(requireUserId());
      if (!profile) {
        throw new Error('User profile not found');
      }

      const { data, error } = await client.client.rpc('link_tenant_to_property', {
        input_code: sanitizeString(propertyCode).toUpperCase(),
        tenant_id: profile.id,
        unit_number: unitNumber ? sanitizeString(unitNumber) : undefined
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
      const client = requireSupabaseClient();
      const profile = await client.getProfile(requireUserId());
      if (!profile) {
        throw new Error('User profile not found');
      }

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
            address_jsonb,
            landlord_id,
            wifi_network,
            wifi_password,
            emergency_contact,
            emergency_phone
          )
        `)
        .eq('tenant_id', profile.id)
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

  const linkTenantToPropertyById = async (propertyId: string, unitNumber?: string) => {
    // Fetch profile to get tenant UUID
    const profile = await getUserProfile();
    if (!profile) throw new Error('User profile not found');
    const { error } = await supabaseClient
      .from('tenant_property_links')
      .insert({
        tenant_id: profile.id,
        property_id: propertyId,
        unit_number: unitNumber || null,
        is_active: true,
      });
    if (error) {
      log.error('Error linking tenant by propertyId', { error: getErrorMessage(error) });
      captureException(error, { op: 'linkTenantToPropertyById' });
      throw new Error(`Failed to link to property: ${error.message}`);
    }
    return true;
  };

  // Memoize the return object to prevent infinite loops in useCallback dependencies
  // MUST be called unconditionally to satisfy React's rules of hooks
  // Only recreate when userId, supabaseClient, or authDisabled changes
  return useMemo(() => {
    // Return null if not authenticated
    if (!userId) {
      return null;
    }

    // Return the full API client
    return {
      // User methods
      getUserProfile,
      createUserProfile,
      updateUserProfile,
      setUserRole,

      // Property methods
      getUserProperties,
      createProperty,
      createPropertyAreas,
      deleteProperty,

      // Property code methods
      validatePropertyCode,
      linkTenantToProperty,
      getTenantProperties,
      linkTenantToPropertyById,

      // Maintenance request methods
      getMaintenanceRequests,
      getMaintenanceRequestById,
      createMaintenanceRequest,
      updateMaintenanceRequest,

      // Messaging methods
      getMessages,
      sendMessage,
      markMessagesAsRead,

      // AI methods
      analyzeMaintenanceRequest,

      // Storage methods
      uploadFile,
      getSignedUrl,
      deleteFile,

      // Subscriptions
      subscribeToMaintenanceRequests,
      subscribeToMessages,
    } as unknown as UseApiClientReturn;
  }, [userId, supabaseClient]);
}

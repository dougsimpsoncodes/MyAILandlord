// Base types
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type UserRole = 'tenant' | 'landlord';
export type MessageType = 'text' | 'image' | 'file';
export type StorageBucket = 'maintenance-images' | 'voice-notes' | 'property-images' | 'documents';

// Property-related imports
import { PropertyAddress } from './property';

// Profile interfaces
export interface CreateProfileData {
  userId: string; // Supabase auth.users.id
  email: string;
  name?: string;
  avatarUrl?: string;
  role?: UserRole;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  role?: UserRole;
  avatarUrl?: string;
}

// Maintenance request interfaces
export interface CreateMaintenanceRequestData {
  propertyId: string;
  title: string;
  description: string;
  priority: Priority;
  area: string;
  asset: string;
  issueType: string;
  images?: string[];
  voiceNotes?: string[];
}

export interface UpdateMaintenanceRequestData {
  status?: RequestStatus;
  priority?: Priority;
  assignedVendorEmail?: string;
  vendorNotes?: string;
  estimatedCost?: number;
  actualCost?: number;
  completionNotes?: string;
}

// Message interfaces
export interface CreateMessageData {
  senderId: string; // Supabase user ID
  recipientId: string; // Supabase user ID
  content: string;
  messageType?: MessageType;
  attachmentUrl?: string;
  propertyId?: string;
}

// File upload interfaces
export interface FileUploadData {
  bucket: StorageBucket;
  file: File | Blob | string;
  fileName: string;
  folder?: string;
}

export interface FileValidation {
  size: number;
  type: string;
}

// AI analysis interfaces
export interface AnalyzeMaintenanceRequestData {
  userId: string; // Supabase user ID
  description: string;
  images?: string[];
}

// API response interfaces
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
}

// Database record interfaces
export interface Profile {
  id: string; // Supabase auth.users.id
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  landlord_id: string;
  name: string;
  address: string;
  property_type: string;
  bedrooms?: number;
  bathrooms?: number;
  property_code?: string;
  allow_tenant_signup: boolean;
  code_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  title: string;
  description: string;
  priority: Priority;
  status: RequestStatus;
  area: string;
  asset: string;
  issue_type: string;
  images?: string[];
  voice_notes?: string[];
  assigned_vendor_email?: string;
  vendor_notes?: string;
  estimated_cost?: number;
  actual_cost?: number;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: MessageType;
  attachment_url?: string;
  property_id?: string;
  read_at?: string;
  created_at: string;
}

export interface StorageFile {
  path: string;
  signedUrl: string;
  expiresAt: number;
}

// Realtime subscription payload
export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  errors: string[] | null;
}

// Hook interfaces
export interface UseApiClientReturn {
  // User methods
  getUserProfile: () => Promise<any>;
  createUserProfile: (profileData: Omit<CreateProfileData, 'userId'>) => Promise<any>;
  updateUserProfile: (updates: UpdateProfileData) => Promise<any>;
  setUserRole: (role: UserRole) => Promise<any>;

  // Property methods
  getUserProperties: (opts?: { limit?: number; offset?: number }) => Promise<any[]>;
  createProperty: (payload: {
    name: string;
    address_jsonb: PropertyAddress;
    property_type: string;
    unit?: string;
    bedrooms?: number;
    bathrooms?: number;
  }) => Promise<any>;
  createPropertyAreas: (areas: Array<{ property_id: string; name: string; area_type: string; photos?: string[] }>) => Promise<boolean>;
  deleteProperty: (propertyId: string) => Promise<boolean>;

  // Property code methods
  validatePropertyCode: (propertyCode: string) => Promise<{ success: boolean; error_message?: string; is_multi_unit?: boolean; property_name?: string; property_address?: string; wifi_network?: string; wifi_password?: string }>;
  linkTenantToProperty: (propertyCode: string, unitNumber?: string) => Promise<{ success: boolean; error_message?: string }>;
  linkTenantToPropertyById: (propertyId: string, unitNumber?: string) => Promise<boolean>;
  getTenantProperties: () => Promise<any[]>;

  // Maintenance request methods
  getMaintenanceRequests: () => Promise<any[]>;
  createMaintenanceRequest: (data: CreateMaintenanceRequestData) => Promise<any>;
  updateMaintenanceRequest: (id: string, updates: UpdateMaintenanceRequestData) => Promise<any>;

  // Messaging methods
  getMessages: (otherUserId?: string) => Promise<any[]>;
  sendMessage: (data: Omit<CreateMessageData, 'senderId'>) => Promise<any>;

  // AI methods
  analyzeMaintenanceRequest: (description: string, images?: string[]) => Promise<{
    suggestedPriority: Priority;
    suggestedArea: string;
    suggestedAsset: string;
    suggestedIssueType: string;
    analysis: string;
  }>;

  // Storage methods
  uploadFile: (bucket: StorageBucket, file: File | Blob | string, fileName: string, folder?: string) => Promise<any>;
  getSignedUrl: (bucket: StorageBucket, path: string) => Promise<string>;
  deleteFile: (bucket: StorageBucket, path: string) => Promise<void>;

  // Subscriptions
  subscribeToMaintenanceRequests: (callback: (payload: RealtimePayload<MaintenanceRequest>) => void) => any;
  subscribeToMessages: (callback: (payload: RealtimePayload<Message>) => void) => any;
}

// Error types
export interface ValidationError extends Error {
  field?: string;
  code?: string;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

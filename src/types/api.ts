// Base types
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type RequestStatus = 'submitted' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type UserRole = 'tenant' | 'landlord';
export type MessageType = 'text' | 'image' | 'file';
export type StorageBucket = 'maintenance-images' | 'voice-notes' | 'property-images' | 'documents';

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
  name?: string | null;
  avatar_url?: string | null;
  role: UserRole | null;
  created_at: string | null;
  updated_at: string | null;
  onboarding_completed?: boolean | null;
}

export interface Property {
  id: string;
  landlord_id: string | null;
  name: string;
  address: string | null;
  property_type: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_code?: string | null;
  allow_tenant_signup: boolean | null;
  code_expires_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  title: string;
  description: string;
  priority: Priority | null;
  status: RequestStatus | null;
  area: string;
  asset: string;
  issue_type: string;
  images?: string[] | null;
  voice_notes?: string[] | null;
  assigned_vendor_email?: string | null;
  vendor_notes?: string | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  completion_notes?: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at?: string | null;
  // Joined relations (from REST API with select)
  profiles?: {
    name?: string;
    email?: string;
  };
  properties?: {
    name?: string;
    address?: string;
  };
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: MessageType | null;
  attachment_url?: string | null;
  property_id?: string | null;
  read_at?: string | null;
  created_at: string | null;
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
  getUserProfile: () => Promise<Profile | null>;
  createUserProfile: (profileData: Omit<CreateProfileData, 'userId'>) => Promise<Profile>;
  updateUserProfile: (updates: UpdateProfileData) => Promise<Profile>;
  setUserRole: (role: UserRole) => Promise<Profile>;

  // Property methods
  getUserProperties: (opts?: { limit?: number; offset?: number }) => Promise<Property[]>;
  createProperty: (payload: {
    name: string;
    address_jsonb: { line1: string; line2?: string; city: string; state: string; zipCode: string };
    property_type: string;
    unit?: string;
    bedrooms?: number;
    bathrooms?: number;
  }) => Promise<Property>;
  createPropertyAreas: (areas: Array<{ property_id: string; name: string; area_type: string; photos?: string[] }>) => Promise<boolean>;
  deleteProperty: (propertyId: string) => Promise<boolean>;

  // Property code methods (tenant linking)
  validatePropertyCode: (propertyCode: string) => Promise<{
    success: boolean;
    property_id?: string;
    property_name?: string;
    property_address?: string;
    is_multi_unit?: boolean;
    wifi_network?: string | null;
    wifi_password?: string | null;
    error_message?: string;
  }>;
  linkTenantToProperty: (propertyCode: string, unitNumber?: string) => Promise<{ success: boolean; error_message?: string }>;
  getTenantProperties: () => Promise<Array<{
    id: string;
    unit_number: string | null;
    is_active: boolean | null;
    properties: {
      id: string;
      name: string;
      address: string | null;
      landlord_id: string | null;
      wifi_network: string | null;
      wifi_password: string | null;
      emergency_contact: string | null;
      emergency_phone: string | null;
    };
  }>>;
  linkTenantToPropertyById: (propertyId: string, unitNumber?: string) => Promise<boolean>;

  // Maintenance request methods
  getMaintenanceRequests: (opts?: { limit?: number; offset?: number }) => Promise<MaintenanceRequest[]>;
  getMaintenanceRequestById: (id: string) => Promise<MaintenanceRequest | null>;
  createMaintenanceRequest: (data: CreateMaintenanceRequestData) => Promise<MaintenanceRequest>;
  updateMaintenanceRequest: (id: string, updates: UpdateMaintenanceRequestData) => Promise<MaintenanceRequest>;

  // Messaging methods
  getMessages: (otherUserId?: string) => Promise<Message[]>;
  sendMessage: (data: Omit<CreateMessageData, 'senderId'>) => Promise<Message>;
  markMessagesAsRead: () => Promise<boolean>;

  // AI methods
  analyzeMaintenanceRequest: (description: string, images?: string[]) => Promise<{
    suggestedPriority: Priority;
    suggestedArea: string;
    suggestedAsset: string;
    suggestedIssueType: string;
    analysis: string;
  }>;

  // Storage methods
  uploadFile: (bucket: StorageBucket, file: File | Blob | string, fileName: string, folder?: string) => Promise<StorageFile>;
  getSignedUrl: (bucket: StorageBucket, path: string) => Promise<string>;
  deleteFile: (bucket: StorageBucket, path: string) => Promise<void>;

  // Subscriptions
  subscribeToMaintenanceRequests: (callback: (payload: RealtimePayload<MaintenanceRequest>) => void) => { unsubscribe: () => void };
  subscribeToMessages: (callback: (payload: RealtimePayload<Message>) => void) => { unsubscribe: () => void };
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
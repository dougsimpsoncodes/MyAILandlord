// Base types
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type UserRole = 'tenant' | 'landlord';
export type MessageType = 'text' | 'image' | 'file';
export type StorageBucket = 'maintenance-images' | 'voice-notes' | 'property-images' | 'documents';

// Profile interfaces
export interface CreateProfileData {
  clerkUserId: string;
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
  senderClerkId: string;
  recipientClerkId: string;
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
  clerkUserId: string;
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

// Hook interfaces
export interface UseApiClientReturn {
  // User methods
  getUserProfile: () => Promise<any>;
  createUserProfile: (profileData: Omit<CreateProfileData, 'clerkUserId'>) => Promise<any>;
  updateUserProfile: (updates: UpdateProfileData) => Promise<any>;
  setUserRole: (role: UserRole) => Promise<any>;
  
  // Property methods
  getUserProperties: () => Promise<any[]>;
  
  // Maintenance request methods
  getMaintenanceRequests: () => Promise<any[]>;
  createMaintenanceRequest: (data: CreateMaintenanceRequestData) => Promise<any>;
  updateMaintenanceRequest: (id: string, updates: UpdateMaintenanceRequestData) => Promise<any>;
  
  // Messaging methods
  getMessages: (otherUserId?: string) => Promise<any[]>;
  sendMessage: (data: Omit<CreateMessageData, 'senderClerkId'>) => Promise<any>;
  
  // AI methods
  analyzeMaintenanceRequest: (description: string, images?: string[]) => Promise<any>;
  
  // Storage methods
  uploadFile: (bucket: StorageBucket, file: File | Blob | string, fileName: string, folder?: string) => Promise<any>;
  getSignedUrl: (bucket: StorageBucket, path: string) => Promise<any>;
  deleteFile: (bucket: StorageBucket, path: string) => Promise<any>;
  
  // Subscriptions
  subscribeToMaintenanceRequests: (callback: (payload: any) => void) => any;
  subscribeToMessages: (callback: (payload: any) => void) => any;
}

// Error types
export interface ValidationError extends Error {
  field?: string;
  code?: string;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}
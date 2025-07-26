// App-wide constants
export const APP_CONSTANTS = {
  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGES_PER_REQUEST: 5,
  MAX_VOICE_NOTE_DURATION: 300, // 5 minutes in seconds
  
  // Allowed file types
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_AUDIO_TYPES: ['audio/mp4', 'audio/m4a', 'audio/wav'],
  
  // Pagination
  DEFAULT_PAGINATION_LIMIT: 20,
  MAX_PAGINATION_LIMIT: 100,
  
  // Text limits
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_MESSAGE_LENGTH: 1000,
  MIN_PASSWORD_LENGTH: 8,
  
  // Priority levels
  PRIORITY_LEVELS: ['low', 'medium', 'high', 'urgent'] as const,
  
  // Status types
  REQUEST_STATUSES: ['pending', 'in_progress', 'completed', 'cancelled'] as const,
  USER_ROLES: ['tenant', 'landlord'] as const,
  
  // UI constants
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000,
  
  // Storage bucket names
  STORAGE_BUCKETS: {
    MAINTENANCE_IMAGES: 'maintenance-images',
    VOICE_NOTES: 'voice-notes',
    PROPERTY_IMAGES: 'property-images',
    DOCUMENTS: 'documents',
  } as const,
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FILE_TOO_LARGE: `File size must be less than ${APP_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB.`,
  INVALID_FILE_TYPE: 'Invalid file type. Please select a valid image or audio file.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  PASSWORD_TOO_SHORT: `Password must be at least ${APP_CONSTANTS.MIN_PASSWORD_LENGTH} characters long.`,
  TITLE_TOO_LONG: `Title must be less than ${APP_CONSTANTS.MAX_TITLE_LENGTH} characters.`,
  DESCRIPTION_TOO_LONG: `Description must be less than ${APP_CONSTANTS.MAX_DESCRIPTION_LENGTH} characters.`,
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  PROFILE_NOT_FOUND: 'User profile not found. Please try signing in again.',
  MAINTENANCE_REQUEST_NOT_FOUND: 'Maintenance request not found.',
  PROPERTY_NOT_FOUND: 'Property not found.',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully.',
  MAINTENANCE_REQUEST_CREATED: 'Maintenance request created successfully.',
  MAINTENANCE_REQUEST_UPDATED: 'Maintenance request updated successfully.',
  MESSAGE_SENT: 'Message sent successfully.',
  FILE_UPLOADED: 'File uploaded successfully.',
  ROLE_UPDATED: 'Role updated successfully.',
};

// Environment variables with defaults
export const ENV_CONFIG = {
  CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  SUPABASE_FUNCTIONS_URL: process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL || '',
};
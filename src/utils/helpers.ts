import { APP_CONSTANTS, ERROR_MESSAGES } from './constants';

// Validation helpers
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateRequired = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value.trim().length > 0;
};

export const validateLength = (value: string, minLength?: number, maxLength?: number): boolean => {
  if (minLength && value.length < minLength) return false;
  if (maxLength && value.length > maxLength) return false;
  return true;
};

export const validateFileSize = (fileSize: number): boolean => {
  return fileSize <= APP_CONSTANTS.MAX_FILE_SIZE;
};

export const validateFileType = (fileType: string, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(fileType.toLowerCase());
};

export const validateImageFile = (file: { size: number; type: string }): { valid: boolean; error?: string } => {
  if (!validateFileSize(file.size)) {
    return { valid: false, error: ERROR_MESSAGES.FILE_TOO_LARGE };
  }
  
  if (!validateFileType(file.type, APP_CONSTANTS.ALLOWED_IMAGE_TYPES)) {
    return { valid: false, error: ERROR_MESSAGES.INVALID_FILE_TYPE };
  }
  
  return { valid: true };
};

export const validateAudioFile = (file: { size: number; type: string }): { valid: boolean; error?: string } => {
  if (!validateFileSize(file.size)) {
    return { valid: false, error: ERROR_MESSAGES.FILE_TOO_LARGE };
  }
  
  if (!validateFileType(file.type, APP_CONSTANTS.ALLOWED_AUDIO_TYPES)) {
    return { valid: false, error: ERROR_MESSAGES.INVALID_FILE_TYPE };
  }
  
  return { valid: true };
};

// Input sanitization - comprehensive protection against XSS and injection
export const sanitizeString = (input: string): string => {
  if (!input) return '';

  return input
    .trim()
    // Remove null bytes (can bypass filters)
    .replace(/\0/g, '')
    // Remove control characters (except newlines and tabs for text areas)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove Unicode direction override characters (text spoofing)
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    // Encode HTML special characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Sanitize for display (decode safe characters back for UI)
export const sanitizeForDisplay = (input: string): string => {
  if (!input) return '';

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove Unicode direction override characters
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    // Remove HTML tags entirely for display
    .replace(/<[^>]*>/g, '');
};

// URL sanitization - prevent javascript: and data: protocol attacks
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';

  const trimmed = url.trim();

  // Block dangerous protocols
  const lowerUrl = trimmed.toLowerCase();
  if (
    lowerUrl.startsWith('javascript:') ||
    lowerUrl.startsWith('data:') ||
    lowerUrl.startsWith('vbscript:')
  ) {
    return '';
  }

  // Validate URL structure for http/https
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return '';
    }
  }

  // Allow relative URLs (paths)
  if (trimmed.startsWith('/')) {
    // Prevent path traversal
    if (trimmed.includes('..')) {
      return '';
    }
    return trimmed;
  }

  return '';
};

// Path sanitization - prevent directory traversal
export const sanitizePath = (path: string): string => {
  if (!path) return '';

  return path
    .trim()
    // Remove path traversal attempts
    .replace(/\.\./g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize multiple slashes
    .replace(/\/+/g, '/')
    // Remove leading slash for storage paths
    .replace(/^\/+/, '');
};

// Formatting helpers
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
};

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
};

export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(dateObj);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  // Remove 4-digit zip code extension (e.g., "12345-6789" -> "12345")
  return address.replace(/(\d{5})-\d{4}/g, '$1');
};

// Utility functions
export const generateUniqueFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `${timestamp}_${random}.${extension}`;
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number = APP_CONSTANTS.DEBOUNCE_DELAY
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Error handling helpers
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return ERROR_MESSAGES.GENERIC_ERROR;
};

export const isNetworkError = (error: unknown): boolean => {
  const errorMessage = getErrorMessage(error).toLowerCase();
  return errorMessage.includes('network') || 
         errorMessage.includes('fetch') || 
         errorMessage.includes('connection');
};

// Type guards
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
type UserRole = 'tenant' | 'landlord';

export const isValidPriority = (value: string): value is Priority => {
  return APP_CONSTANTS.PRIORITY_LEVELS.includes(value as Priority);
};

export const isValidStatus = (value: string): value is RequestStatus => {
  return APP_CONSTANTS.REQUEST_STATUSES.includes(value as RequestStatus);
};

export const isValidRole = (value: string): value is UserRole => {
  return APP_CONSTANTS.USER_ROLES.includes(value as UserRole);
};

// Safe parsing helpers
export const safeParseInt = (value: string | number, defaultValue: number = 0): number => {
  if (typeof value === 'number') return value;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const safeParseFloat = (value: string | number, defaultValue: number = 0): number => {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Async helpers
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries) {
        await delay(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
};
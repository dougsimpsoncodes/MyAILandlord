import { APP_CONSTANTS, ERROR_MESSAGES } from './constants';
import {
  validateEmail,
  validateRequired,
  validateLength,
  sanitizeString,
  sanitizeUrl,
  isValidPriority,
  isValidStatus,
  isValidRole
} from './helpers';

// Validation result type
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Profile validation
export const validateProfileData = (data: {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  avatarUrl?: string;
}): ValidationResult => {
  const errors: string[] = [];

  if (data.userId !== undefined) {
    if (!validateRequired(data.userId)) {
      errors.push('User ID is required');
    }
  }

  if (data.email !== undefined) {
    if (!validateRequired(data.email)) {
      errors.push('Email is required');
    } else if (!validateEmail(data.email)) {
      errors.push(ERROR_MESSAGES.INVALID_EMAIL);
    }
  }

  if (data.name !== undefined) {
    if (!validateRequired(data.name)) {
      errors.push('Name is required');
    } else if (!validateLength(data.name, 1, 100)) {
      errors.push('Name must be between 1 and 100 characters');
    }
  }

  if (data.role !== undefined && !isValidRole(data.role)) {
    errors.push('Invalid role. Must be either "tenant" or "landlord"');
  }

  if (data.avatarUrl !== undefined && data.avatarUrl.length > 0) {
    try {
      new URL(data.avatarUrl);
    } catch {
      errors.push('Avatar URL must be a valid URL');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Maintenance request validation
export const validateMaintenanceRequestData = (data: {
  propertyId?: string;
  title?: string;
  description?: string;
  priority?: string;
  area?: string;
  asset?: string;
  issueType?: string;
  images?: string[];
  voiceNotes?: string[];
}): ValidationResult => {
  const errors: string[] = [];

  if (!validateRequired(data.propertyId)) {
    errors.push('Property ID is required');
  }

  if (!validateRequired(data.title)) {
    errors.push('Title is required');
  } else if (!validateLength(data.title!, 1, APP_CONSTANTS.MAX_TITLE_LENGTH)) {
    errors.push(ERROR_MESSAGES.TITLE_TOO_LONG);
  }

  if (!validateRequired(data.description)) {
    errors.push('Description is required');
  } else if (!validateLength(data.description!, 1, APP_CONSTANTS.MAX_DESCRIPTION_LENGTH)) {
    errors.push(ERROR_MESSAGES.DESCRIPTION_TOO_LONG);
  }

  if (!validateRequired(data.priority)) {
    errors.push('Priority is required');
  } else if (!isValidPriority(data.priority!)) {
    errors.push('Invalid priority. Must be one of: low, medium, high, urgent');
  }

  if (!validateRequired(data.area)) {
    errors.push('Area is required');
  } else if (!validateLength(data.area!, 1, 100)) {
    errors.push('Area must be between 1 and 100 characters');
  }

  if (!validateRequired(data.asset)) {
    errors.push('Asset is required');
  } else if (!validateLength(data.asset!, 1, 100)) {
    errors.push('Asset must be between 1 and 100 characters');
  }

  if (!validateRequired(data.issueType)) {
    errors.push('Issue type is required');
  } else if (!validateLength(data.issueType!, 1, 100)) {
    errors.push('Issue type must be between 1 and 100 characters');
  }

  if (data.images && data.images.length > APP_CONSTANTS.MAX_IMAGES_PER_REQUEST) {
    errors.push(`Maximum ${APP_CONSTANTS.MAX_IMAGES_PER_REQUEST} images allowed per request`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Maintenance request update validation
export const validateMaintenanceRequestUpdate = (data: {
  status?: string;
  priority?: string;
  assignedVendorEmail?: string;
  vendorNotes?: string;
  estimatedCost?: number;
  actualCost?: number;
  completionNotes?: string;
}): ValidationResult => {
  const errors: string[] = [];

  if (data.status !== undefined && !isValidStatus(data.status)) {
    errors.push('Invalid status. Must be one of: pending, in_progress, completed, cancelled');
  }

  if (data.priority !== undefined && !isValidPriority(data.priority)) {
    errors.push('Invalid priority. Must be one of: low, medium, high, urgent');
  }

  if (data.assignedVendorEmail !== undefined && data.assignedVendorEmail.length > 0) {
    if (!validateEmail(data.assignedVendorEmail)) {
      errors.push('Assigned vendor email must be a valid email address');
    }
  }

  if (data.vendorNotes !== undefined && !validateLength(data.vendorNotes, 0, 1000)) {
    errors.push('Vendor notes must be less than 1000 characters');
  }

  if (data.estimatedCost !== undefined && data.estimatedCost < 0) {
    errors.push('Estimated cost cannot be negative');
  }

  if (data.actualCost !== undefined && data.actualCost < 0) {
    errors.push('Actual cost cannot be negative');
  }

  if (data.completionNotes !== undefined && !validateLength(data.completionNotes, 0, 1000)) {
    errors.push('Completion notes must be less than 1000 characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Message validation
export const validateMessageData = (data: {
  senderId?: string;
  recipientId?: string;
  content?: string;
  messageType?: string;
  attachmentUrl?: string;
  propertyId?: string;
}): ValidationResult => {
  const errors: string[] = [];

  if (!validateRequired(data.senderId)) {
    errors.push('Sender ID is required');
  }

  if (!validateRequired(data.recipientId)) {
    errors.push('Recipient ID is required');
  }

  if (!validateRequired(data.content)) {
    errors.push('Message content is required');
  } else if (!validateLength(data.content!, 1, APP_CONSTANTS.MAX_MESSAGE_LENGTH)) {
    errors.push(`Message must be between 1 and ${APP_CONSTANTS.MAX_MESSAGE_LENGTH} characters`);
  }

  if (data.messageType !== undefined) {
    const validTypes = ['text', 'image', 'file'];
    if (!validTypes.includes(data.messageType)) {
      errors.push('Invalid message type. Must be one of: text, image, file');
    }
  }

  if (data.attachmentUrl !== undefined && data.attachmentUrl.length > 0) {
    try {
      new URL(data.attachmentUrl);
    } catch {
      errors.push('Attachment URL must be a valid URL');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// File upload validation
export const validateFileUpload = (data: {
  bucket?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}): ValidationResult => {
  const errors: string[] = [];

  if (!validateRequired(data.bucket)) {
    errors.push('Storage bucket is required');
  } else {
    const validBuckets = Object.values(APP_CONSTANTS.STORAGE_BUCKETS) as string[];
    if (typeof data.bucket !== 'string' || !validBuckets.includes(data.bucket)) {
      errors.push(`Invalid storage bucket. Must be one of: ${validBuckets.join(', ')}`);
    }
  }

  if (!validateRequired(data.fileName)) {
    errors.push('File name is required');
  } else if (!validateLength(data.fileName!, 1, 255)) {
    errors.push('File name must be between 1 and 255 characters');
  }

  if (data.fileSize !== undefined && data.fileSize > APP_CONSTANTS.MAX_FILE_SIZE) {
    errors.push(ERROR_MESSAGES.FILE_TOO_LARGE);
  }

  if (data.fileType !== undefined) {
    const allAllowedTypes = [
      ...APP_CONSTANTS.ALLOWED_IMAGE_TYPES,
      ...APP_CONSTANTS.ALLOWED_AUDIO_TYPES
    ];
    if (!allAllowedTypes.includes(data.fileType)) {
      errors.push(ERROR_MESSAGES.INVALID_FILE_TYPE);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Sanitize input data
export const sanitizeProfileData = (data: {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  avatarUrl?: string;
}) => {
  return {
    ...data,
    userId: data.userId ? sanitizeString(data.userId) : data.userId,
    email: data.email ? sanitizeString(data.email) : data.email,
    name: data.name ? sanitizeString(data.name) : data.name,
    role: data.role ? sanitizeString(data.role) : data.role,
    avatarUrl: data.avatarUrl ? sanitizeUrl(data.avatarUrl) : data.avatarUrl,
  };
};

export const sanitizeMaintenanceRequestData = (data: {
  propertyId?: string;
  title?: string;
  description?: string;
  priority?: string;
  area?: string;
  asset?: string;
  issueType?: string;
}) => {
  return {
    ...data,
    propertyId: data.propertyId ? sanitizeString(data.propertyId) : data.propertyId,
    title: data.title ? sanitizeString(data.title) : data.title,
    description: data.description ? sanitizeString(data.description) : data.description,
    priority: data.priority ? sanitizeString(data.priority) : data.priority,
    area: data.area ? sanitizeString(data.area) : data.area,
    asset: data.asset ? sanitizeString(data.asset) : data.asset,
    issueType: data.issueType ? sanitizeString(data.issueType) : data.issueType,
  };
};

export const sanitizeMessageData = (data: {
  senderId?: string;
  recipientId?: string;
  content?: string;
  messageType?: string;
  attachmentUrl?: string;
  propertyId?: string;
}) => {
  return {
    ...data,
    senderId: data.senderId ? sanitizeString(data.senderId) : data.senderId,
    recipientId: data.recipientId ? sanitizeString(data.recipientId) : data.recipientId,
    content: data.content ? sanitizeString(data.content) : data.content,
    messageType: data.messageType ? sanitizeString(data.messageType) : data.messageType,
    attachmentUrl: data.attachmentUrl ? sanitizeUrl(data.attachmentUrl) : data.attachmentUrl,
    propertyId: data.propertyId ? sanitizeString(data.propertyId) : data.propertyId,
  };
};

// Helper function to throw validation errors
export const throwValidationError = (result: ValidationResult): never => {
  throw new Error(result.errors.join(', '));
};

// Main validation function that combines validation and sanitization
export const validateAndSanitize = <T>(
  data: T,
  validator: (data: T) => ValidationResult,
  sanitizer: (data: T) => T
): T => {
  const sanitizedData = sanitizer(data);
  const result = validator(sanitizedData);
  
  if (!result.valid) {
    throwValidationError(result);
  }
  
  return sanitizedData;
};

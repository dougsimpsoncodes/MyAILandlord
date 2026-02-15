import { PropertyData, PropertyValidationErrors, ValidationResult, ImageValidationOptions, ImageValidationResult, PropertyAddress } from '../types/property';
import { validateAddress } from './addressValidation';

// Property form validation
export const validatePropertyData = (data: PropertyData): ValidationResult => {
  const errors: string[] = [];
  const fieldErrors: PropertyValidationErrors = {};

  // Name validation
  if (!data.name.trim()) {
    fieldErrors.name = 'Property name is required';
    errors.push('Property name is required');
  } else if (data.name.length < 3) {
    fieldErrors.name = 'Property name must be at least 3 characters';
    errors.push('Property name must be at least 3 characters');
  } else if (data.name.length > 100) {
    fieldErrors.name = 'Property name must be less than 100 characters';
    errors.push('Property name must be less than 100 characters');
  }

  // Address validation - using industry-standard multi-field validation
  const addressValidation = validateAddress(data.address);
  if (!addressValidation.isValid) {
    // Map address validation errors to field errors
    Object.entries(addressValidation.errors).forEach(([field, error]) => {
      fieldErrors[`address.${field}` as keyof PropertyValidationErrors] = error;
      errors.push(`Address ${field}: ${error}`);
    });
  }

  // Property type validation
  if (!data.type) {
    fieldErrors.type = 'Property type is required';
    errors.push('Property type is required');
  } else if (!['apartment', 'house', 'condo', 'townhouse'].includes(data.type)) {
    fieldErrors.type = 'Invalid property type';
    errors.push('Invalid property type');
  }

  // Bedrooms validation - now numeric
  if (typeof data.bedrooms === 'number') {
    if (data.bedrooms < 0 || data.bedrooms > 10) {
      fieldErrors.bedrooms = 'Bedrooms must be between 0 and 10';
      errors.push('Bedrooms must be between 0 and 10');
    }
  } else {
    fieldErrors.bedrooms = 'Invalid bedrooms value';
    errors.push('Invalid bedrooms value');
  }

  // Bathrooms validation - now numeric with 0.5 increments
  if (typeof data.bathrooms === 'number') {
    if (data.bathrooms < 0 || data.bathrooms > 10) {
      fieldErrors.bathrooms = 'Bathrooms must be between 0 and 10';
      errors.push('Bathrooms must be between 0 and 10');
    }
    // Check if it's a valid 0.5 increment
    if ((data.bathrooms * 2) % 1 !== 0) {
      fieldErrors.bathrooms = 'Bathrooms must be in 0.5 increments';
      errors.push('Bathrooms must be in 0.5 increments (e.g., 1, 1.5, 2)');
    }
  } else {
    fieldErrors.bathrooms = 'Invalid bathrooms value';
    errors.push('Invalid bathrooms value');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Sanitize input strings
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\s+/g, ' '); // Normalize whitespace
};

// Sanitize address data
export const sanitizeAddress = (address: PropertyAddress): PropertyAddress => {
  return {
    line1: sanitizeString(address.line1),
    line2: address.line2 ? sanitizeString(address.line2) : '',
    city: sanitizeString(address.city),
    state: sanitizeString(address.state.toUpperCase()),
    zipCode: sanitizeString(address.zipCode),
    country: address.country || 'US'
  };
};

// Sanitize property data
export const sanitizePropertyData = (data: PropertyData): PropertyData => {
  return {
    name: sanitizeString(data.name),
    address: sanitizeAddress(data.address),
    type: data.type,
    unit: sanitizeString(data.unit),
    bedrooms: typeof data.bedrooms === 'number' ? data.bedrooms : 0,
    bathrooms: typeof data.bathrooms === 'number' ? data.bathrooms : 0,
    photos: data.photos.filter(photo => photo && typeof photo === 'string'),
  };
};

// Image validation configuration
export const IMAGE_VALIDATION_CONFIG: ImageValidationOptions = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'],
  maxDimensions: {
    width: 4096,
    height: 4096,
  },
};

// Validate image file
export const validateImageFile = async (
  uri: string,
  _options: ImageValidationOptions = IMAGE_VALIDATION_CONFIG
): Promise<ImageValidationResult> => {
  void _options;
  try {
    // Check if URI is valid
    if (!uri || typeof uri !== 'string') {
      return {
        isValid: false,
        error: 'Invalid image URI',
      };
    }

    // For now, we'll do basic validation
    // In a full implementation, you'd check file size, type, etc.
    const isValidUri = uri.startsWith('file://') || 
                      uri.startsWith('content://') || 
                      uri.startsWith('ph://') ||
                      uri.startsWith('blob:') ||
                      uri.startsWith('http://') ||
                      uri.startsWith('https://') ||
                      uri.startsWith('/') ||
                      uri.includes('/'); // Basic file path check for web
    
    if (!isValidUri) {
      return {
        isValid: false,
        error: 'Invalid image source',
      };
    }

    // TODO: Implement actual file size and type checking
    // This would require native modules or expo-file-system

    return {
      isValid: true,
      sanitizedUri: uri,
    };
  } catch {
    return {
      isValid: false,
      error: 'Failed to validate image',
    };
  }
};

// Validate photo array
export const validatePhotos = async (photos: string[]): Promise<ValidationResult> => {
  const errors: string[] = [];

  if (photos.length > 20) {
    errors.push('Maximum 20 photos allowed');
  }

  for (let i = 0; i < photos.length; i++) {
    const result = await validateImageFile(photos[i]);
    if (!result.isValid) {
      errors.push(`Photo ${i + 1}: ${result.error}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Remove EXIF data (basic implementation)
export const sanitizeImageUri = (uri: string): string => {
  // In a full implementation, you'd use a library to strip EXIF data
  // For now, we just return the URI as-is
  // TODO: Implement EXIF stripping with expo-image-manipulator
  return uri;
};

// Legacy address validation for backward compatibility
export const getAddressErrorMessage = (address: string): string => {
  const trimmed = address.trim();
  
  if (!trimmed) return 'Address is required';
  if (trimmed.length > 200) return 'Address is too long. Please use a shorter format.';
  
  const words = trimmed.split(/\s+/);
  const hasNumber = /\d/.test(trimmed);
  
  if (words.length === 1 && trimmed.length < 5) {
    return 'Please include the street number (e.g., "123 Main St")';
  }
  
  if (!hasNumber && words.length < 3) {
    return 'Address should include a street number';
  }
  
  return 'Please enter a valid address';
};
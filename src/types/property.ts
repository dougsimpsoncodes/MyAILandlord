// Property-related TypeScript interfaces for type safety

// Multi-field address structure following industry standards
export interface PropertyAddress {
  line1: string;           // Street number and name (required)
  line2?: string;          // Unit, apt, suite (optional) 
  city: string;            // City name (required)
  state: string;           // Two-letter state code (required)
  zipCode: string;         // ZIP or ZIP+4 format (required)
  country?: string;        // Default to 'US' for now
}

export interface PropertyData {
  name: string;
  address: PropertyAddress;  // Multi-field address structure
  type: 'apartment' | 'house' | 'condo' | 'townhouse' | '';
  unit: string;             // Keep for backward compatibility, will be deprecated
  bedrooms: number;
  bathrooms: number;
  photos: string[];
}

export interface PropertyArea {
  id: string;
  name: string;
  type: 'kitchen' | 'living_room' | 'bedroom' | 'bathroom' | 'garage' | 'outdoor' | 'laundry' | 'other';
  icon: string;
  isDefault: boolean;
  photos: string[];
}

export interface PropertyAsset {
  id: string;
  areaId: string;
  name: string;
  type: 'appliance' | 'fixture' | 'system' | 'structure' | 'other';
  category: string;
  brand?: string;
  model?: string;
  installationDate?: string;
  warrantyInfo?: string;
  notes?: string;
  photos: string[];
}

export interface PropertySetupState {
  id: string;
  status: 'draft' | 'in_progress' | 'completed';
  currentStep: number;
  lastModified: Date;
  completionPercentage: number;
  propertyData: PropertyData;
  areas: PropertyArea[];
  assets: PropertyAsset[];
}

// Navigation parameter types
export interface PropertyAreasParams {
  propertyData: PropertyData;
}

export interface PropertyAssetsParams {
  propertyData: PropertyData;
  areas: PropertyArea[];
}

export interface PropertyReviewParams {
  propertyData: PropertyData;
  areas: PropertyArea[];
  assets: PropertyAsset[];
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PropertyValidationErrors {
  name?: string;
  'address.line1'?: string;
  'address.line2'?: string;
  'address.city'?: string;
  'address.state'?: string;
  'address.zipCode'?: string;
  type?: string;
  bedrooms?: string;
  bathrooms?: string;
  photos?: string;
}

// Image validation types
export interface ImageValidationOptions {
  maxSizeBytes: number;
  allowedTypes: string[];
  maxDimensions?: {
    width: number;
    height: number;
  };
}

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUri?: string;
}
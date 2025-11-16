// Property-related TypeScript interfaces for type safety

export type PropertyType = 'apartment' | 'house' | 'condo' | 'townhouse' | '';

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
  // Optional, used by landlord asset flows
  rooms?: Room[];
  detectedAssets?: DetectedAsset[];
  assetDetails?: any[]; // Detailed per-asset entries collected in AssetDetailsScreen
  assetPhotos?: any[];  // Per-asset photos collected in AssetPhotosScreen
  // Optional: room-level photos used in some flows
  roomPhotos?: { roomId: string; photos: string[] }[];
}

export interface Room {
  id: string;
  name: string;
  icon?: string;
  selected?: boolean;
  required?: boolean;
  custom?: boolean;
}

export interface DetectedAsset {
  id: string;
  name: string;
  category: string;
  roomId: string;
  brand?: string;
  model?: string;
  confidence?: number;
  scannedData?: string;
}

export interface PropertyArea {
  id: string;
  name: string;
  type: 'kitchen' | 'living_room' | 'bedroom' | 'bathroom' | 'garage' | 'outdoor' | 'laundry' | 'other';
  icon: string;
  isDefault: boolean;
  photos: string[];
  inventoryComplete: boolean;
  condition: AssetCondition;
  assets: InventoryItem[];
}

// Enhanced inventory item interface
export interface InventoryItem {
  id: string;
  areaId: string;
  name: string;
  assetType: 'appliance' | 'fixture' | 'system' | 'structure' | 'furniture' | 'other';
  category: string;
  subcategory?: string;
  
  // Identification
  brand?: string;
  model?: string;
  serialNumber?: string;
  
  // Condition and status
  condition: AssetCondition;
  installationDate?: string;
  
  // Warranty tracking
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyProvider?: string;
  
  // Documentation
  photos: string[];
  manualUrl?: string;
  notes?: string;
  
  // Financial tracking
  purchasePrice?: number;
  currentValue?: number;
  
  // Status
  isActive: boolean;
}

// Keep legacy PropertyAsset for backward compatibility
export interface PropertyAsset extends InventoryItem {
  type: InventoryItem['assetType'];
  warrantyInfo?: string;
}

// Asset condition enum
export enum AssetCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  NEEDS_REPLACEMENT = 'needs_replacement'
}

// Asset templates for smart suggestions
export interface AssetTemplate {
  name: string;
  category: string;
  subcategory?: string;
  assetType: InventoryItem['assetType'];
  commonBrands?: string[];
  estimatedLifespan?: number; // in years
  maintenanceFrequency?: 'monthly' | 'quarterly' | 'annually' | 'as-needed';
}

export interface PropertySetupState {
  id: string;
  status: 'draft' | 'in_progress' | 'completed';
  currentStep: number;
  lastModified: Date;
  completionPercentage: number;
  propertyData: PropertyData;
  areas: PropertyArea[];
  assets: InventoryItem[];
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
  draftId?: string;
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

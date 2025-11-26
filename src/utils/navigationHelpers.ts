/**
 * Navigation Helper Functions
 *
 * These helpers ensure consistent navigation parameters across the app,
 * especially when navigating from different contexts (list view vs detail view).
 */

import { PropertyData, PropertyAddress } from '../types/property';

/**
 * Convert a simple property object (from list/details) to PropertyData format
 * required by PropertyAreas and PropertyAssets screens.
 *
 * @param property - Simple property object with basic info
 * @returns PropertyData object with full structure
 */
export function convertToPropertyData(property: {
  id: string;
  name: string;
  address: string;
  type: string;
}): PropertyData {
  // Parse address string into structured format
  // For now, we put the full address in street field
  // In the future, you could parse it properly
  const address: PropertyAddress = {
    line1: property.address,
    city: '',
    state: '',
    zipCode: '',
    line2: '',
  };

  return {
    name: property.name,
    address,
    type: (property.type || '') as any,
    unit: '',
    bedrooms: 0,
    bathrooms: 0,
    photos: [],
  };
}

/**
 * Helper to navigate to PropertyAreas from PropertyDetails
 */
export function getPropertyAreasParams(property: {
  id: string;
  name: string;
  address: string;
  type: string;
}) {
  return {
    propertyData: convertToPropertyData(property),
    propertyId: property.id,
  };
}

/**
 * Helper to navigate to PropertyAssets from PropertyDetails
 */
export function getPropertyAssetsParams(property: {
  id: string;
  name: string;
  address: string;
  type: string;
}) {
  return {
    propertyData: convertToPropertyData(property),
    propertyId: property.id,
  };
}

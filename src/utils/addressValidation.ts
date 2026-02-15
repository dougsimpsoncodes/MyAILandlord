// Enhanced address validation following industry best practices
import { PropertyAddress } from '../types/property';
import { ADDRESS_VALIDATION_RULES, ADDRESS_PATTERNS } from './addressConstants';

export interface AddressValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  suggestions?: {
    formattedAddress?: string;
    corrections?: Partial<PropertyAddress>;
  };
}

export const validateAddress = (address: PropertyAddress): AddressValidationResult => {
  const errors: Record<string, string> = {};
  
  // Address Line 1 validation
  if (!address.line1?.trim()) {
    errors.line1 = 'Street address is required';
  } else {
    const line1 = address.line1.trim();
    if (line1.length < ADDRESS_VALIDATION_RULES.line1.minLength) {
      errors.line1 = 'Please enter a complete street address';
    } else if (line1.length > ADDRESS_VALIDATION_RULES.line1.maxLength) {
      errors.line1 = 'Street address is too long';
    } else if (!ADDRESS_PATTERNS.STREET_ADDRESS.test(line1)) {
      errors.line1 = 'Please enter a valid street address (e.g., "123 Main St")';
    }
  }
  
  // Address Line 2 validation (optional)
  if (address.line2 && address.line2.length > ADDRESS_VALIDATION_RULES.line2.maxLength!) {
    errors.line2 = 'Unit information is too long';
  }
  
  // City validation
  if (!address.city?.trim()) {
    errors.city = 'City is required';
  } else {
    const city = address.city.trim();
    if (city.length < ADDRESS_VALIDATION_RULES.city.minLength) {
      errors.city = 'Please enter a valid city name';
    } else if (city.length > ADDRESS_VALIDATION_RULES.city.maxLength) {
      errors.city = 'City name is too long';
    } else if (!ADDRESS_PATTERNS.CITY_NAME.test(city)) {
      errors.city = 'City name contains invalid characters';
    }
  }
  
  // State validation
  if (!address.state?.trim()) {
    errors.state = 'State is required';
  } else {
    const state = address.state.trim().toUpperCase();
    if (!ADDRESS_VALIDATION_RULES.state.validValues.includes(state)) {
      errors.state = 'Please select a valid US state';
    }
  }
  
  // ZIP Code validation
  if (!address.zipCode?.trim()) {
    errors.zipCode = 'ZIP code is required';
  } else {
    const zipCode = address.zipCode.trim();
    if (!ADDRESS_PATTERNS.US_ZIP_CODE.test(zipCode)) {
      errors.zipCode = 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    suggestions: generateSuggestions(address, errors)
  };
};

// Auto-formatting functions
export const formatZipCode = (input: string): string => {
  // Remove all non-digits
  const digits = input.replace(/\D/g, '');
  
  // Format as ZIP+4 if 9 digits
  if (digits.length >= 6) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
  }
  
  return digits.slice(0, 5);
};

export const formatCityName = (input: string): string => {
  return input
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase()); // Title case
};

export const formatStreetAddress = (input: string): string => {
  return input
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase()) // Title case
    .replace(/\b(st|ave|blvd|rd|dr|ln|ct|pl|way)\b/gi, match => 
      match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()
    );
};

// Convert legacy single address field to multi-field
export const parseAddressString = (addressString: string): Partial<PropertyAddress> => {
  const parts = addressString.trim().split(',').map(p => p.trim());
  
  if (parts.length >= 3) {
    // Try to parse "123 Main St, City, State ZIP"
    const line1 = parts[0];
    const city = parts[1];
    const lastPart = parts[2];
    
    // Extract state and ZIP from last part
    const stateZipMatch = lastPart.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    
    if (stateZipMatch) {
      return {
        line1,
        city,
        state: stateZipMatch[1],
        zipCode: stateZipMatch[2]
      };
    }
  }
  
  // Fallback: put everything in line1
  return { line1: addressString };
};

// Migration helper for existing data
export const migrateAddressData = (address: string | PropertyAddress): PropertyAddress => {
  // If already using new format
  if (typeof address === 'object' && address.line1) {
    return address;
  }
  
  // If using old string format
  if (typeof address === 'string') {
    const parsed = parseAddressString(address);
    return {
      line1: parsed.line1 || '',
      line2: parsed.line2 || '',
      city: parsed.city || '',
      state: parsed.state || '',
      zipCode: parsed.zipCode || '',
      country: 'US'
    };
  }
  
  // Default empty address
  return {
    line1: '',
    line2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  };
};

// Generate formatted address string
export const formatAddressString = (address: PropertyAddress): string => {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state && address.zipCode ? `${address.state} ${address.zipCode}` : ''
  ].filter(Boolean);
  
  return parts.join(', ');
};

const generateSuggestions = (
  address: PropertyAddress, 
  errors: Record<string, string>
): { formattedAddress?: string; corrections?: Partial<PropertyAddress> } => {
  const corrections: Partial<PropertyAddress> = {};
  
  // Auto-format corrections
  if (address.city && !errors.city) {
    corrections.city = formatCityName(address.city);
  }
  
  if (address.line1 && !errors.line1) {
    corrections.line1 = formatStreetAddress(address.line1);
  }
  
  if (address.zipCode && !errors.zipCode) {
    corrections.zipCode = formatZipCode(address.zipCode);
  }
  
  if (address.state && !errors.state) {
    corrections.state = address.state.toUpperCase();
  }
  
  // Generate formatted address string
  const formattedParts = [
    corrections.line1 || address.line1,
    corrections.line2 || address.line2,
    corrections.city || address.city,
    (corrections.state || address.state) + ' ' + (corrections.zipCode || address.zipCode)
  ].filter(Boolean);
  
  return {
    formattedAddress: formattedParts.join(', '),
    corrections: Object.keys(corrections).length > 0 ? corrections : undefined
  };
};
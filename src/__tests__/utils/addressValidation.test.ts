/**
 * Address Validation Tests
 *
 * Tests for address validation, formatting, and migration functions
 */

import {
  validateAddress,
  formatZipCode,
  formatCityName,
  formatStreetAddress,
  parseAddressString,
  migrateAddressData,
  formatAddressString,
} from '../../utils/addressValidation';
import { PropertyAddress } from '../../types/property';

describe('validateAddress', () => {
  test('validates complete valid address', () => {
    const address: PropertyAddress = {
      line1: '123 Main St',
      line2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
    };

    const result = validateAddress(address);

    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  test('validates address without line2 (optional field)', () => {
    const address: PropertyAddress = {
      line1: '456 Oak Ave',
      line2: '',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'US',
    };

    const result = validateAddress(address);

    expect(result.isValid).toBe(true);
  });

  test('rejects address with missing line1', () => {
    const address: PropertyAddress = {
      line1: '',
      line2: '',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101',
      country: 'US',
    };

    const result = validateAddress(address);

    expect(result.isValid).toBe(false);
    expect(result.errors.line1).toBe('Street address is required');
  });

  test('rejects address with invalid street address format', () => {
    const address: PropertyAddress = {
      line1: '!!!',
      line2: '',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      country: 'US',
    };

    const result = validateAddress(address);

    expect(result.isValid).toBe(false);
    expect(result.errors.line1).toContain('valid street address');
  });

  test('rejects address with missing city', () => {
    const address: PropertyAddress = {
      line1: '789 Elm St',
      line2: '',
      city: '',
      state: 'TX',
      zipCode: '75001',
      country: 'US',
    };

    const result = validateAddress(address);

    expect(result.isValid).toBe(false);
    expect(result.errors.city).toBe('City is required');
  });

  test('rejects address with invalid city name', () => {
    const address: PropertyAddress = {
      line1: '789 Elm St',
      line2: '',
      city: '123',
      state: 'TX',
      zipCode: '75001',
      country: 'US',
    };

    const result = validateAddress(address);

    expect(result.isValid).toBe(false);
    expect(result.errors.city).toContain('invalid characters');
  });

  test('rejects address with missing state', () => {
    const address: PropertyAddress = {
      line1: '101 Pine Rd',
      line2: '',
      city: 'Miami',
      state: '',
      zipCode: '33101',
      country: 'US',
    };

    const result = validateAddress(address);

    expect(result.isValid).toBe(false);
    expect(result.errors.state).toBe('State is required');
  });

  test('rejects address with invalid state code', () => {
    const address: PropertyAddress = {
      line1: '101 Pine Rd',
      line2: '',
      city: 'Miami',
      state: 'XX',
      zipCode: '33101',
      country: 'US',
    };

    const result = validateAddress(address);

    expect(result.isValid).toBe(false);
    expect(result.errors.state).toBe('Please select a valid US state');
  });

  test('rejects address with missing ZIP code', () => {
    const address: PropertyAddress = {
      line1: '202 Maple Dr',
      line2: '',
      city: 'Denver',
      state: 'CO',
      zipCode: '',
      country: 'US',
    };

    const result = validateAddress(address);

    expect(result.isValid).toBe(false);
    expect(result.errors.zipCode).toBe('ZIP code is required');
  });

  test('rejects address with invalid ZIP code format', () => {
    const address: PropertyAddress = {
      line1: '202 Maple Dr',
      line2: '',
      city: 'Denver',
      state: 'CO',
      zipCode: '123',
      country: 'US',
    };

    const result = validateAddress(address);

    expect(result.isValid).toBe(false);
    expect(result.errors.zipCode).toContain('valid ZIP code');
  });

  test('accepts ZIP+4 format', () => {
    const address: PropertyAddress = {
      line1: '303 Cedar Ln',
      line2: '',
      city: 'Portland',
      state: 'OR',
      zipCode: '97201-1234',
      country: 'US',
    };

    const result = validateAddress(address);

    expect(result.isValid).toBe(true);
  });

  test('generates formatting suggestions', () => {
    const address: PropertyAddress = {
      line1: '123 main st',
      line2: '',
      city: 'new york',
      state: 'ny',
      zipCode: '10001',
      country: 'US',
    };

    const result = validateAddress(address);

    expect(result.suggestions).toBeDefined();
    expect(result.suggestions?.corrections).toBeDefined();
    expect(result.suggestions?.corrections?.line1).toBe('123 Main St');
    expect(result.suggestions?.corrections?.city).toBe('New York');
    expect(result.suggestions?.corrections?.state).toBe('NY');
  });
});

describe('formatZipCode', () => {
  test('formats 5-digit ZIP code', () => {
    expect(formatZipCode('12345')).toBe('12345');
  });

  test('formats 9-digit ZIP code as ZIP+4', () => {
    expect(formatZipCode('123456789')).toBe('12345-6789');
  });

  test('removes non-digit characters', () => {
    expect(formatZipCode('12-34!5')).toBe('12345');
  });

  test('handles already formatted ZIP+4', () => {
    expect(formatZipCode('12345-6789')).toBe('12345-6789');
  });

  test('truncates extra digits', () => {
    expect(formatZipCode('1234567890')).toBe('12345-6789');
  });
});

describe('formatCityName', () => {
  test('formats lowercase city to title case', () => {
    expect(formatCityName('new york')).toBe('New York');
  });

  test('formats uppercase city to title case', () => {
    expect(formatCityName('LOS ANGELES')).toBe('Los Angeles');
  });

  test('handles mixed case', () => {
    expect(formatCityName('sAn FrAnCiScO')).toBe('San Francisco');
  });

  test('trims whitespace', () => {
    expect(formatCityName('  Boston  ')).toBe('Boston');
  });
});

describe('formatStreetAddress', () => {
  test('formats street address to title case', () => {
    expect(formatStreetAddress('123 main street')).toBe('123 Main Street');
  });

  test('formats common abbreviations correctly', () => {
    expect(formatStreetAddress('456 oak ave')).toBe('456 Oak Ave');
    expect(formatStreetAddress('789 elm blvd')).toBe('789 Elm Blvd');
    expect(formatStreetAddress('101 pine rd')).toBe('101 Pine Rd');
  });

  test('handles uppercase input', () => {
    expect(formatStreetAddress('123 MAIN ST')).toBe('123 Main St');
  });
});

describe('parseAddressString', () => {
  test('parses complete address string', () => {
    const result = parseAddressString('123 Main St, New York, NY 10001');

    expect(result.line1).toBe('123 Main St');
    expect(result.city).toBe('New York');
    expect(result.state).toBe('NY');
    expect(result.zipCode).toBe('10001');
  });

  test('parses address with ZIP+4', () => {
    const result = parseAddressString('456 Oak Ave, Los Angeles, CA 90210-1234');

    expect(result.line1).toBe('456 Oak Ave');
    expect(result.city).toBe('Los Angeles');
    expect(result.state).toBe('CA');
    expect(result.zipCode).toBe('90210-1234');
  });

  test('handles incomplete address by putting in line1', () => {
    const result = parseAddressString('123 Main St');

    expect(result.line1).toBe('123 Main St');
    expect(result.city).toBeUndefined();
  });

  test('handles malformed address', () => {
    const result = parseAddressString('Random text, City, InvalidState 123');

    expect(result.line1).toBe('Random text, City, InvalidState 123');
  });
});

describe('migrateAddressData', () => {
  test('returns address already in new format unchanged', () => {
    const address: PropertyAddress = {
      line1: '123 Main St',
      line2: '',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
    };

    const result = migrateAddressData(address);

    expect(result).toEqual(address);
  });

  test('migrates string address to structured format', () => {
    const result = migrateAddressData('123 Main St, New York, NY 10001');

    expect(result.line1).toBe('123 Main St');
    expect(result.city).toBe('New York');
    expect(result.state).toBe('NY');
    expect(result.zipCode).toBe('10001');
    expect(result.country).toBe('US');
  });

  test('handles empty string', () => {
    const result = migrateAddressData('');

    expect(result.line1).toBe('');
    expect(result.country).toBe('US');
  });

  test('returns default empty address for invalid input', () => {
    const result = migrateAddressData({} as any);

    expect(result.line1).toBe('');
    expect(result.city).toBe('');
    expect(result.state).toBe('');
    expect(result.zipCode).toBe('');
    expect(result.country).toBe('US');
  });
});

describe('formatAddressString', () => {
  test('formats complete address to string', () => {
    const address: PropertyAddress = {
      line1: '123 Main St',
      line2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
    };

    const result = formatAddressString(address);

    expect(result).toBe('123 Main St, Apt 4B, New York, NY 10001');
  });

  test('formats address without line2', () => {
    const address: PropertyAddress = {
      line1: '456 Oak Ave',
      line2: '',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'US',
    };

    const result = formatAddressString(address);

    expect(result).toBe('456 Oak Ave, Los Angeles, CA 90210');
  });

  test('handles incomplete address', () => {
    const address: PropertyAddress = {
      line1: '789 Elm St',
      line2: '',
      city: 'Boston',
      state: '',
      zipCode: '',
      country: 'US',
    };

    const result = formatAddressString(address);

    expect(result).toBe('789 Elm St, Boston');
  });
});

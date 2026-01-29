/**
 * Validation Utilities Tests
 *
 * Tests for all validation functions ensuring data integrity
 */

import {
  validateProfileData,
  validateMaintenanceRequestData,
  validateMaintenanceRequestUpdate,
  validateMessageData,
  validateFileUpload,
  sanitizeProfileData,
  sanitizeMaintenanceRequestData,
  sanitizeMessageData,
  validateAndSanitize,
  throwValidationError,
} from '../../utils/validation';

describe('validateProfileData', () => {
  test('validates valid profile data', () => {
    const result = validateProfileData({
      userId: 'user_123',
      email: 'test@example.com',
      name: 'John Doe',
      role: 'tenant',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects invalid email', () => {
    const result = validateProfileData({
      email: 'invalid-email',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Please enter a valid email address.');
  });

  test('rejects empty required fields', () => {
    const result = validateProfileData({
      userId: '',
      email: '',
      name: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('rejects invalid role', () => {
    const result = validateProfileData({
      role: 'admin', // Invalid role
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid role. Must be either "tenant" or "landlord"');
  });

  test('rejects name that is too long', () => {
    const result = validateProfileData({
      name: 'a'.repeat(101), // 101 characters
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Name must be between 1 and 100 characters');
  });

  test('rejects invalid avatar URL', () => {
    const result = validateProfileData({
      avatarUrl: 'not-a-url',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Avatar URL must be a valid URL');
  });

  test('accepts valid avatar URL', () => {
    const result = validateProfileData({
      avatarUrl: 'https://example.com/avatar.jpg',
    });

    expect(result.valid).toBe(true);
  });
});

describe('validateMaintenanceRequestData', () => {
  test('validates valid maintenance request data', () => {
    const result = validateMaintenanceRequestData({
      propertyId: 'prop_123',
      title: 'Leaking faucet',
      description: 'The kitchen faucet is leaking',
      priority: 'high',
      area: 'Kitchen',
      asset: 'Sink',
      issueType: 'Plumbing',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects missing required fields', () => {
    const result = validateMaintenanceRequestData({});

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Property ID is required');
    expect(result.errors).toContain('Title is required');
    expect(result.errors).toContain('Description is required');
    expect(result.errors).toContain('Priority is required');
    expect(result.errors).toContain('Area is required');
    expect(result.errors).toContain('Asset is required');
    expect(result.errors).toContain('Issue type is required');
  });

  test('rejects invalid priority', () => {
    const result = validateMaintenanceRequestData({
      propertyId: 'prop_123',
      title: 'Issue',
      description: 'Description',
      priority: 'critical', // Invalid
      area: 'Kitchen',
      asset: 'Sink',
      issueType: 'Plumbing',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid priority. Must be one of: low, medium, high, urgent');
  });

  test('rejects too many images', () => {
    const result = validateMaintenanceRequestData({
      propertyId: 'prop_123',
      title: 'Issue',
      description: 'Description',
      priority: 'medium',
      area: 'Kitchen',
      asset: 'Sink',
      issueType: 'Plumbing',
      images: new Array(11).fill('image.jpg'), // Max is 10
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Maximum');
    expect(result.errors[0]).toContain('images allowed');
  });
});

describe('validateMaintenanceRequestUpdate', () => {
  test('validates valid update data', () => {
    const result = validateMaintenanceRequestUpdate({
      status: 'in_progress',
      priority: 'urgent',
      assignedVendorEmail: 'vendor@example.com',
      estimatedCost: 150.0,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects invalid status', () => {
    const result = validateMaintenanceRequestUpdate({
      status: 'invalid_status',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Invalid status. Must be one of: pending, in_progress, completed, cancelled'
    );
  });

  test('rejects invalid vendor email', () => {
    const result = validateMaintenanceRequestUpdate({
      assignedVendorEmail: 'not-an-email',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Assigned vendor email must be a valid email address');
  });

  test('rejects negative costs', () => {
    const result = validateMaintenanceRequestUpdate({
      estimatedCost: -100,
      actualCost: -50,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Estimated cost cannot be negative');
    expect(result.errors).toContain('Actual cost cannot be negative');
  });

  test('rejects notes that are too long', () => {
    const result = validateMaintenanceRequestUpdate({
      vendorNotes: 'a'.repeat(1001),
      completionNotes: 'b'.repeat(1001),
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Vendor notes must be less than 1000 characters');
    expect(result.errors).toContain('Completion notes must be less than 1000 characters');
  });
});

describe('validateMessageData', () => {
  test('validates valid message data', () => {
    const result = validateMessageData({
      senderId: 'user_123',
      recipientId: 'user_456',
      content: 'Hello, how are you?',
      messageType: 'text',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects missing required fields', () => {
    const result = validateMessageData({});

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Sender ID is required');
    expect(result.errors).toContain('Recipient ID is required');
    expect(result.errors).toContain('Message content is required');
  });

  test('rejects invalid message type', () => {
    const result = validateMessageData({
      senderId: 'user_123',
      recipientId: 'user_456',
      content: 'Test message',
      messageType: 'video', // Invalid
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid message type. Must be one of: text, image, file');
  });

  test('rejects invalid attachment URL', () => {
    const result = validateMessageData({
      senderId: 'user_123',
      recipientId: 'user_456',
      content: 'Test',
      attachmentUrl: 'not-a-url',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Attachment URL must be a valid URL');
  });
});

describe('validateFileUpload', () => {
  test('validates valid file upload', () => {
    const result = validateFileUpload({
      bucket: 'property-images',
      fileName: 'photo.jpg',
      fileSize: 1024 * 1024, // 1MB
      fileType: 'image/jpeg',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects invalid bucket', () => {
    const result = validateFileUpload({
      bucket: 'invalid-bucket',
      fileName: 'photo.jpg',
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid storage bucket');
  });

  test('rejects file that is too large', () => {
    const result = validateFileUpload({
      bucket: 'property-images',
      fileName: 'photo.jpg',
      fileSize: 100 * 1024 * 1024, // 100MB (over limit)
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('File size must be less than');
  });

  test('rejects invalid file type', () => {
    const result = validateFileUpload({
      bucket: 'property-images',
      fileName: 'file.exe',
      fileType: 'application/x-msdownload',
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid file type');
  });
});

describe('Sanitization Functions', () => {
  test('sanitizeProfileData encodes dangerous characters', () => {
    const result = sanitizeProfileData({
      name: '<script>alert("xss")</script>John',
      email: 'test@example.com',
    });

    // sanitizeString HTML-encodes rather than removes tags
    expect(result.name).toContain('&lt;script&gt;');
    expect(result.name).not.toContain('<script>');
  });

  test('sanitizeMaintenanceRequestData encodes dangerous characters', () => {
    const result = sanitizeMaintenanceRequestData({
      title: '<img src=x onerror=alert(1)>',
      description: 'Normal description',
    });

    // sanitizeString HTML-encodes rather than removes tags
    expect(result.title).toContain('&lt;img');
    expect(result.title).not.toContain('<img');
  });

  test('sanitizeMessageData encodes dangerous characters', () => {
    const result = sanitizeMessageData({
      content: 'Hello <script>alert("xss")</script>',
    });

    // sanitizeString HTML-encodes rather than removes tags
    expect(result.content).toContain('&lt;script&gt;');
    expect(result.content).not.toContain('<script>');
  });
});

describe('validateAndSanitize', () => {
  test('combines validation and sanitization', () => {
    const data = {
      userId: 'user_123',
      email: 'test@example.com',
      name: 'John Doe',
      role: 'tenant',
    };

    const result = validateAndSanitize(
      data,
      validateProfileData,
      sanitizeProfileData
    );

    expect(result).toBeDefined();
    expect(result.email).toBe('test@example.com');
  });

  test('throws error for invalid data', () => {
    const data = {
      email: 'invalid-email',
    };

    expect(() => {
      validateAndSanitize(data, validateProfileData, sanitizeProfileData);
    }).toThrow();
  });
});

describe('throwValidationError', () => {
  test('throws error with combined error messages', () => {
    const result = {
      valid: false,
      errors: ['Error 1', 'Error 2', 'Error 3'],
    };

    expect(() => {
      throwValidationError(result);
    }).toThrow('Error 1, Error 2, Error 3');
  });
});

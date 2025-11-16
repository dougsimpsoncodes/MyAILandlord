/**
 * Logging Sanitization Tests
 *
 * Ensures sensitive data is never logged
 */

import { log } from '../../lib/log';

// Mock console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

describe('Log Sanitization', () => {
  let logOutput: unknown[];
  let warnOutput: unknown[];
  let errorOutput: unknown[];

  beforeEach(() => {
    logOutput = [];
    warnOutput = [];
    errorOutput = [];

    console.log = jest.fn((...args) => {
      logOutput = args;
    });
    console.warn = jest.fn((...args) => {
      warnOutput = args;
    });
    console.error = jest.fn((...args) => {
      errorOutput = args;
    });
  });

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  });

  test('redacts password fields', () => {
    log.info('User login', { username: 'john', password: 'secret123' });

    expect(logOutput[1]).toEqual({
      username: 'john',
      password: '[REDACTED]',
    });
  });

  test('redacts token fields', () => {
    log.info('API call', { token: 'abc123', apiToken: 'xyz789' });

    expect(logOutput[1]).toEqual({
      token: '[REDACTED]',
      apiToken: '[REDACTED]',
    });
  });

  test('redacts API keys', () => {
    log.info('Config', { apiKey: 'sk_test_123', api_key: 'pk_live_456' });

    expect(logOutput[1]).toEqual({
      apiKey: '[REDACTED]',
      api_key: '[REDACTED]',
    });
  });

  test('redacts authorization headers', () => {
    log.info('Request', { authorization: 'Bearer token123', auth: 'Basic abc' });

    expect(logOutput[1]).toEqual({
      authorization: '[REDACTED]',
      auth: '[REDACTED]',
    });
  });

  test('masks email addresses', () => {
    log.info('User data', { email: 'test@example.com' });

    expect(logOutput[1]).toEqual({
      email: 't***@example.com',
    });
  });

  test('hashes clerk user IDs', () => {
    log.info('Profile', { clerkUserId: 'user_123abc' });

    const result = logOutput[1] as { clerkUserId: string };
    expect(result.clerkUserId).toMatch(/^hash_[a-f0-9]{16}$/);
  });

  test('masks address fields', () => {
    log.info('Property', { address: '123 Main Street, New York, NY 10001' });

    const result = logOutput[1] as { address: string };
    expect(result.address).toBe('123***001');
  });

  test('redacts URLs with tokens', () => {
    log.info('Download', {
      url: 'https://example.com/file?token=secret123',
    });

    expect(logOutput[1]).toEqual({
      url: '[REDACTED_URL]',
    });
  });

  test('redacts signed URLs', () => {
    log.info('Image', {
      signedUrl: 'https://storage.example.com/image.jpg?signature=abc',
    });

    expect(logOutput[1]).toEqual({
      signedUrl: '[REDACTED_URL]',
    });
  });

  test('sanitizes nested objects', () => {
    log.info('User', {
      id: 'user_123',
      credentials: {
        password: 'secret',
        token: 'abc123',
      },
      email: 'test@example.com',
    });

    expect(logOutput[1]).toEqual({
      id: 'user_123',
      credentials: {
        password: '[REDACTED]',
        token: '[REDACTED]',
      },
      email: 't***@example.com',
    });
  });

  test('sanitizes arrays of objects', () => {
    log.info('Users', {
      users: [
        { id: '1', email: 'user1@example.com' },
        { id: '2', email: 'user2@example.com' },
      ],
    });

    expect(logOutput[1]).toEqual({
      users: [
        { id: '1', email: 'u***@example.com' },
        { id: '2', email: 'u***@example.com' },
      ],
    });
  });

  test('handles null and undefined values', () => {
    log.info('Data', { value: null, other: undefined, email: null });

    expect(logOutput[1]).toEqual({
      value: null,
      other: undefined,
      email: null,
    });
  });

  test('does not modify non-sensitive data', () => {
    log.info('Safe data', {
      id: '123',
      name: 'John Doe',
      count: 42,
      active: true,
    });

    expect(logOutput[1]).toEqual({
      id: '123',
      name: 'John Doe',
      count: 42,
      active: true,
    });
  });

  test('sanitizes warn logs', () => {
    log.warn('Warning', { password: 'secret', message: 'Issue detected' });

    expect(warnOutput[1]).toEqual({
      password: '[REDACTED]',
      message: 'Issue detected',
    });
  });

  test('sanitizes error logs', () => {
    log.error('Error', { token: 'abc123', error: 'Something failed' });

    expect(errorOutput[1]).toEqual({
      token: '[REDACTED]',
      error: 'Something failed',
    });
  });

  test('handles session and cookie fields', () => {
    log.info('Auth', {
      sessionToken: 'session_123',
      cookie: 'user=abc',
    });

    expect(logOutput[1]).toEqual({
      sessionToken: '[REDACTED]',
      cookie: '[REDACTED]',
    });
  });

  test('handles private keys and secrets', () => {
    log.info('Keys', {
      privateKey: 'pk_123',
      secret_key: 'sk_456',
      accessKey: 'ak_789',
    });

    expect(logOutput[1]).toEqual({
      privateKey: '[REDACTED]',
      secret_key: '[REDACTED]',
      accessKey: '[REDACTED]',
    });
  });

  test('masks phone numbers', () => {
    log.info('Contact', { phone: '555-123-4567' });

    const result = logOutput[1] as { phone: string };
    expect(result.phone).toBe('555***567');
  });

  test('handles deeply nested structures', () => {
    log.info('Complex', {
      level1: {
        level2: {
          level3: {
            password: 'secret',
            email: 'deep@example.com',
          },
        },
      },
    });

    expect(logOutput[1]).toEqual({
      level1: {
        level2: {
          level3: {
            password: '[REDACTED]',
            email: 'd***@example.com',
          },
        },
      },
    });
  });

  test('does not crash on circular references', () => {
    const obj: any = { id: '123' };
    obj.self = obj; // Circular reference

    // Should not throw
    expect(() => {
      log.info('Circular', { data: obj });
    }).not.toThrow();
  });

  test('handles case-insensitive field matching', () => {
    log.info('Mixed case', {
      PASSWORD: 'secret1',
      Password: 'secret2',
      pAsSwOrD: 'secret3',
      TOKEN: 'abc',
      Token: 'xyz',
    });

    expect(logOutput[1]).toEqual({
      PASSWORD: '[REDACTED]',
      Password: '[REDACTED]',
      pAsSwOrD: '[REDACTED]',
      TOKEN: '[REDACTED]',
      Token: '[REDACTED]',
    });
  });
});

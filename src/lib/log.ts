/**
 * Centralized Logging with Data Sanitization
 *
 * SECURITY: This logger automatically sanitizes sensitive data before logging
 * NEVER LOG: tokens, passwords, full emails, addresses, signed URLs, API keys
 *
 * Usage:
 *   log.info('User logged in', { userId: 'user_123', email: 'test@example.com' })
 *   → Output: User logged in { userId: 'user_123', email: 't***@example.com' }
 */

// Simple hash function for React Native (no Node.js crypto dependency)
// Uses a basic string hash - sufficient for log redaction purposes
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 16);
}

// Sensitive field patterns (case-insensitive)
const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /apikey/i,
  /api[_-]?key/i,
  /auth/i,
  /authorization/i,
  /bearer/i,
  /session/i,
  /cookie/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /secret[_-]?key/i,
];

// Field names that should be hashed (not fully redacted)
const HASH_FIELD_PATTERNS = [
  /email/i,
  /clerk[_-]?user[_-]?id/i,
  /clerk[_-]?id/i,
];

// Field names that should be partially masked
const MASK_FIELD_PATTERNS = [
  /address/i,
  /phone/i,
  /ssn/i,
  /credit[_-]?card/i,
];

// URL patterns to redact
const URL_PATTERNS = [
  /https?:\/\/[^\s]+\?.*token=/i,
  /signed[_-]?url/i,
];

/**
 * Hash a value for consistent logging (using simple hash for RN compatibility)
 */
function hashValue(value: string): string {
  return simpleHash(value);
}

/**
 * Mask an email: test@example.com → t***@example.com
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local[0]}***@${domain}`;
}

/**
 * Mask address: keep first 3 chars and last 3 chars
 */
function maskString(str: string): string {
  if (str.length <= 6) return '***';
  return `${str.substring(0, 3)}***${str.substring(str.length - 3)}`;
}

/**
 * Check if a field name matches sensitive patterns
 */
function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
}

function isHashField(fieldName: string): boolean {
  return HASH_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
}

function isMaskField(fieldName: string): boolean {
  return MASK_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
}

/**
 * Sanitize a single value
 */
function sanitizeValue(key: string, value: unknown, depth = 0, seen?: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Fully redact sensitive fields
  if (isSensitiveField(key)) {
    return '[REDACTED]';
  }

  // Hash fields that need consistent logging
  if (isHashField(key) && typeof value === 'string') {
    // For emails, mask instead of hashing for readability
    if (/email/i.test(key) && value.includes('@')) {
      return maskEmail(value);
    }
    return `hash_${hashValue(value)}`;
  }

  // Mask fields that should be partially visible
  if (isMaskField(key) && typeof value === 'string') {
    return maskString(value);
  }

  // Check for URLs with tokens
  if (typeof value === 'string') {
    for (const pattern of URL_PATTERNS) {
      if (pattern.test(value)) {
        return '[REDACTED_URL]';
      }
    }
  }

  // Recursively sanitize objects
  if (typeof value === 'object' && !Array.isArray(value)) {
    return sanitizeObject(value as Record<string, unknown>, depth + 1, seen);
  }

  // Recursively sanitize arrays
  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(`${key}[${index}]`, item, depth + 1, seen));
  }

  return value;
}

/**
 * Sanitize an object by redacting/hashing sensitive fields
 */
function sanitizeObject(obj: Record<string, unknown>, depth = 0, seen?: WeakSet<object>): Record<string, unknown> | string {
  try {
    // Prevent deep recursion and handle circular references
    if (depth > 3) return '[Object]';
    if (!seen) seen = new WeakSet<object>();
    if (seen.has(obj as object)) return '[Circular]';
    seen.add(obj as object);

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeValue(key, value, depth, seen);
    }
    return sanitized;
  } catch {
    return '[Unserializable Object]';
  }
}

/**
 * Sanitize log arguments
 */
function sanitizeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
      return sanitizeObject(arg as Record<string, unknown>);
    }
    return arg;
  });
}

/**
 * Send logs to external service (Sentry, LogRocket, etc.)
 */
function sendToLoggingService(_level: 'info' | 'warn' | 'error', _args: unknown[]) {
  // TODO: Integrate with Sentry or other logging service
  // Example:
  // if (typeof Sentry !== 'undefined') {
  //   Sentry.captureMessage(JSON.stringify(args), level);
  // }
}

// Check if running in development mode
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const log = {
  /**
   * Debug logs - only shown in development mode
   * Use for verbose logging that helps during development but shouldn't appear in production
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      const sanitized = sanitizeArgs(args);
      console.log(...sanitized);
    }
  },
  info: (...args: unknown[]) => {
    const sanitized = sanitizeArgs(args);
    console.log(...sanitized);
    sendToLoggingService('info', sanitized);
  },
  warn: (...args: unknown[]) => {
    const sanitized = sanitizeArgs(args);
    console.warn(...sanitized);
    sendToLoggingService('warn', sanitized);
  },
  error: (...args: unknown[]) => {
    const sanitized = sanitizeArgs(args);
    console.error(...sanitized);
    sendToLoggingService('error', sanitized);
  },
};

// Provide a default export for compatibility with existing imports
export default log;

/**
 * Security utilities for sanitizing sensitive data in logs and analytics
 */

/**
 * Sanitize token values to prevent exposure in logs
 * Shows first 4 and last 4 characters only
 *
 * @example
 * sanitizeToken('ABC123DEF456') // 'ABC1...F456'
 */
export function sanitizeToken(token: string | null | undefined): string {
  if (!token || token.length < 8) return 'REDACTED';
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

/**
 * Sanitize email addresses for analytics
 * Shows domain but hashes local part
 *
 * @example
 * sanitizeEmail('user@example.com') // 'u***@example.com'
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return 'REDACTED';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***@${domain}`;
}

/**
 * Check if a string contains a token pattern and warn
 * Used in automated log scanning
 */
export function containsTokenPattern(text: string): boolean {
  // Tokens are 12-character base62 strings
  const tokenPattern = /\b[A-Za-z0-9]{12}\b/;
  return tokenPattern.test(text);
}

/**
 * Production-ready CORS configuration with explicit allowlists
 * Replaces wildcard '*' with specific domains
 */

// Parse allowed origins from environment with fallback
const ALLOWED_ORIGINS_PROD = (Deno.env.get('ALLOWED_ORIGINS') || 'https://myailandlord.app,https://www.myailandlord.app')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

// Development mode check
const IS_DEV = Deno.env.get('ENABLE_DEV_ORIGINS') === 'true';

// Pre-compute Set for O(1) lookup
const allowedOriginsSet = new Set(ALLOWED_ORIGINS_PROD);

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const o = origin.toLowerCase();

  // Exact match against production allowlist (fast O(1))
  if (allowedOriginsSet.has(o)) return true;

  // Development origins (only if explicitly enabled)
  if (IS_DEV) {
    // Localhost (any port)
    if (o.startsWith('http://localhost:') || o.startsWith('http://127.0.0.1:')) {
      return true;
    }

    // LAN IPs (192.168.x.x, 10.0.x.x, 172.16-31.x.x)
    if (
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(o) ||
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(o) ||
      /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/.test(o)
    ) {
      return true;
    }

    // Expo development origins (exp://...)
    if (o.startsWith('exp://') && o.includes(':')) {
      return true;
    }
  }

  return false;
}

/**
 * Get CORS headers for a given origin
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Only set Access-Control-Allow-Origin if origin is in allowlist
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Simple best-effort rate limiter (per function instance)
 * Uses sliding window with token bucket
 */
const WINDOW_MS = 60_000; // 1 minute
const LIMIT = 30; // 30 requests per window
const buckets = new Map<string, { count: number; reset: number }>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.reset) {
    buckets.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }

  if (entry.count >= LIMIT) {
    return true;
  }

  entry.count += 1;
  return false;
}

/**
 * Get client IP for rate limiting
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Sanitize logs - never log sensitive data
 */
export function sanitizeLog(data: any): any {
  if (typeof data !== 'object' || data === null) return data;

  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    // Never log these fields
    if (
      lowerKey.includes('token') && key !== 'token_id' ||
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('key') && !lowerKey.includes('key_id') ||
      lowerKey.includes('auth')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLog(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Production-Ready CORS with Postgres-Backed Rate Limiting
 * Addresses:
 * - Native apps (no Origin header)
 * - Persistent rate limiting (Postgres, not in-memory)
 * - Explicit allowlists
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Production allowed origins
const ALLOWED_ORIGINS_PROD = (Deno.env.get('ALLOWED_ORIGINS') || 'https://myailandlord.app,https://www.myailandlord.app')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

// Development mode
const IS_DEV = Deno.env.get('ENABLE_DEV_ORIGINS') === 'true';

// Pre-compute Set for O(1) lookup
const allowedOriginsSet = new Set(ALLOWED_ORIGINS_PROD);

/**
 * Check if request origin is allowed
 * Special handling for native apps (no Origin header)
 */
export function isOriginAllowed(origin: string | null, authHeader: string | null): boolean {
  // Native apps don't send Origin header - check Authorization instead
  if (!origin && authHeader && authHeader.startsWith('Bearer ')) {
    // Native app with valid auth token - allow
    return true;
  }

  if (!origin) return false;

  const o = origin.toLowerCase();

  // Exact match (production)
  if (allowedOriginsSet.has(o)) return true;

  // Development origins
  if (IS_DEV) {
    if (o.startsWith('http://localhost:') || o.startsWith('http://127.0.0.1:')) {
      return true;
    }
    if (/^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(o) ||
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(o) ||
        /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/.test(o)) {
      return true;
    }
    if (o.startsWith('exp://')) {
      return true;
    }
  }

  return false;
}

/**
 * Get CORS headers
 */
export function getCorsHeaders(origin: string | null, authHeader: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Only set CORS headers if origin is allowed
  if (origin && isOriginAllowed(origin, authHeader)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Native apps (no Origin) - don't set CORS headers (not needed)
  return headers;
}

/**
 * Get client IP for rate limiting
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-client-ip') ||
    'unknown'
  );
}

/**
 * Check rate limit using Postgres backend
 * Returns { allowed: boolean, remaining?: number, retryAfter?: number }
 */
export async function checkRateLimit(
  endpoint: string,
  clientIp: string,
  options: {
    maxTokens?: number;
    refillRate?: number;
    windowSeconds?: number;
  } = {}
): Promise<{ allowed: boolean; remaining?: number; retryAfter?: number }> {
  const {
    maxTokens = 30,
    refillRate = 30,
    windowSeconds = 60
  } = options;

  // Create limiter key (endpoint:ip)
  const limiterKey = `${endpoint}:${clientIp}`;

  try {
    // Use service role to call rate limit check
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_limiter_key: limiterKey,
      p_max_tokens: maxTokens,
      p_refill_rate: refillRate,
      p_window_seconds: windowSeconds
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // On error, allow request (fail open)
      return { allowed: true };
    }

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      retryAfter: data.retry_after_seconds
    };
  } catch (err) {
    console.error('Rate limit check exception:', err);
    // On exception, allow request (fail open)
    return { allowed: true };
  }
}

/**
 * Sanitize logs - never log sensitive data
 */
export function sanitizeLog(data: any): any {
  if (typeof data !== 'object' || data === null) return data;

  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    // Never log these fields (exact match or contains)
    if (
      key === 'token' || // Exact match 'token' field
      lowerKey.includes('token') && !['token_id', 'token_count'].includes(key) ||
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('key') && !['key_id', 'api_key_id'].includes(key) ||
      lowerKey.includes('auth') && key !== 'auth_method'
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

/**
 * Standard error response
 */
export function errorResponse(
  message: string,
  status: number,
  headers: Record<string, string>,
  details?: any
): Response {
  const body: any = { error: message };
  if (details) body.details = sanitizeLog(details);

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' }
    }
  );
}

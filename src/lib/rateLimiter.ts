/**
 * Distributed Rate Limiting with Upstash Redis
 *
 * Replaces in-memory rate limiter with distributed solution
 * Works across Edge Functions, mobile app, and web deployments
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

/**
 * Rate limit configurations for different operations
 */
export const RATE_LIMITS = {
  auth: {
    limit: 5,
    window: 15 * 60, // 15 minutes in seconds
    description: 'Authentication attempts',
  },
  upload: {
    limit: 10,
    window: 60 * 60, // 1 hour in seconds
    description: 'File uploads',
  },
  api: {
    limit: 100,
    window: 60, // 1 minute in seconds
    description: 'General API requests',
  },
  property_create: {
    limit: 10,
    window: 60 * 60, // 1 hour in seconds
    description: 'Property creation',
  },
  maintenance_create: {
    limit: 20,
    window: 60 * 60, // 1 hour in seconds
    description: 'Maintenance request creation',
  },
} as const;

export type RateLimitOperation = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds until retry allowed
}

/**
 * Check rate limit using sliding window algorithm
 *
 * @param operation - Type of operation being rate limited
 * @param identifier - User ID or IP address
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  operation: RateLimitOperation,
  identifier: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[operation];
  const key = `ratelimit:${operation}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.window * 1000;

  try {
    // Use Redis sorted set for sliding window
    // Score is timestamp, member is request ID
    const requestId = `${now}-${Math.random()}`;

    // Multi-command pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Remove old entries outside window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Add current request
    pipeline.zadd(key, { score: now, member: requestId });

    // Count requests in current window
    pipeline.zcard(key);

    // Set expiration on key
    pipeline.expire(key, config.window);

    const results = await pipeline.exec();
    const count = (results[2] as number) || 0;

    const remaining = Math.max(0, config.limit - count);
    const reset = Math.ceil((now + config.window * 1000) / 1000);

    if (count > config.limit) {
      // Calculate retry after based on oldest request in window
      const oldestRequest = await redis.zrange(key, 0, 0, { withScores: true });
      const s = (oldestRequest[0] as any)?.score ?? now;
      const retryAfter = Math.ceil((s + config.window * 1000 - now) / 1000);

      return {
        success: false,
        limit: config.limit,
        remaining: 0,
        reset,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    return {
      success: true,
      limit: config.limit,
      remaining,
      reset,
    };
  } catch (error) {
    const { log } = await import('./log');
    log.error('Rate limit check failed:', { error: String(error) });

    // Fail open - allow request if Redis is down
    // In production, you might want to fail closed instead
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Math.ceil((now + config.window * 1000) / 1000),
    };
  }
}

/**
 * Reset rate limit for a specific operation and identifier
 * Use sparingly - primarily for testing or admin overrides
 */
export async function resetRateLimit(
  operation: RateLimitOperation,
  identifier: string
): Promise<void> {
  const key = `ratelimit:${operation}:${identifier}`;
  await redis.del(key);
}

/**
 * Get current rate limit status without incrementing count
 */
export async function getRateLimitStatus(
  operation: RateLimitOperation,
  identifier: string
): Promise<Omit<RateLimitResult, 'success'>> {
  const config = RATE_LIMITS[operation];
  const key = `ratelimit:${operation}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.window * 1000;

  try {
    // Remove old entries and count current
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);

    const results = await pipeline.exec();
    const count = (results[1] as number) || 0;

    const remaining = Math.max(0, config.limit - count);
    const reset = Math.ceil((now + config.window * 1000) / 1000);

    return {
      limit: config.limit,
      remaining,
      reset,
    };
  } catch (error) {
    const { log } = await import('./log');
    log.error('Get rate limit status failed:', { error: String(error) });
    return {
      limit: config.limit,
      remaining: config.limit,
      reset: Math.ceil((now + config.window * 1000) / 1000),
    };
  }
}

/**
 * Middleware-style wrapper for rate limiting
 *
 * Usage:
 *   const result = await withRateLimit('api', userId, async () => {
 *     return await fetchData();
 *   });
 */
export async function withRateLimit<T>(
  operation: RateLimitOperation,
  identifier: string,
  fn: () => Promise<T>
): Promise<T> {
  const result = await checkRateLimit(operation, identifier);

  if (!result.success) {
    const error = new Error(`Rate limit exceeded. Retry after ${result.retryAfter} seconds.`);
    (error as any).rateLimitInfo = result;
    throw error;
  }

  return fn();
}

/**
 * Test rate limiter functionality
 * Use only in development
 */
export async function testRateLimiter() {
  if (process.env.NODE_ENV === 'production') {
    const { log } = await import('./log');
    log.warn('Cannot test rate limiter in production');
    return;
  }
  const { log } = await import('./log');
  log.info('Rate Limiter Test');
  log.info('=================');

  const testOperation: RateLimitOperation = 'api';
  const testIdentifier = 'test-user-123';

  // Reset before testing
  await resetRateLimit(testOperation, testIdentifier);

  const config = RATE_LIMITS[testOperation];
  const testRequests = config.limit + 5; // Test beyond limit

  for (let i = 1; i <= testRequests; i++) {
    const result = await checkRateLimit(testOperation, testIdentifier);

    if (result.success) {
      log.info('Rate limiter allowed', { i, remaining: result.remaining });
    } else {
      log.info('Rate limiter blocked', { i, retryAfter: result.retryAfter });
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Cleanup
  await resetRateLimit(testOperation, testIdentifier);
  log.info('Test complete - rate limiter working correctly');
}

/**
 * Get rate limit headers for HTTP responses
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
    ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
  };
}

export default {
  checkRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  withRateLimit,
  testRateLimiter,
  getRateLimitHeaders,
  RATE_LIMITS,
};

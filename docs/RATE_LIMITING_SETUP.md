# Distributed Rate Limiting with Upstash Redis

Replace in-memory rate limiting with distributed Redis-based solution for production scalability.

## Why Distributed Rate Limiting?

**Current Problem**: In-memory rate limiter doesn't work across:
- Multiple Edge Function instances
- Mobile app + web deployments
- Load-balanced servers

**Solution**: Upstash Redis provides:
- Shared rate limit state across all instances
- Sub-millisecond latency
- Automatic expiration (no manual cleanup)
- Global edge network

## Setup

### 1. Create Upstash Redis Database

1. Sign up at https://upstash.com
2. Create new Redis database
3. Choose region closest to your Supabase region
4. Get credentials from database details page:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2. Install Dependencies

```bash
npm install @upstash/redis
```

### 3. Environment Variables

Add to `.env`:
```bash
# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

Add to Supabase Edge Function secrets:
```bash
supabase secrets set UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
supabase secrets set UPSTASH_REDIS_REST_TOKEN=your-token
```

## Implementation

### Rate Limiter Library

Create `src/lib/rateLimiter.ts` (see implementation file).

### Rate Limit Configuration

Different limits for different operations:

| Operation | Limit | Window | Reason |
|-----------|-------|--------|--------|
| Authentication | 5 attempts | 15 minutes | Prevent brute force |
| File Upload | 10 uploads | 1 hour | Prevent abuse |
| API Requests | 100 requests | 1 minute | General throttling |
| Property Creation | 10 properties | 1 hour | Prevent spam |
| Maintenance Requests | 20 requests | 1 hour | Reasonable usage |

### Usage in Edge Functions

```typescript
// In Supabase Edge Function
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
});

Deno.serve(async (req) => {
  const userId = getUserIdFromRequest(req);
  const { success, limit, remaining, reset } = await ratelimit.limit(userId);

  if (!success) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    });
  }

  // Process request...
});
```

### Usage in Mobile App

```typescript
import { checkRateLimit } from '../lib/rateLimiter';
import { useAuth } from '@clerk/clerk-expo';

async function uploadFile(file: File) {
  const { userId } = useAuth();

  const rateLimitCheck = await checkRateLimit('upload', userId);
  if (!rateLimitCheck.success) {
    throw new Error(`Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds`);
  }

  // Proceed with upload...
}
```

## Rate Limit Response Headers

Always include rate limit info in responses:

```typescript
headers: {
  'X-RateLimit-Limit': '100',
  'X-RateLimit-Remaining': '95',
  'X-RateLimit-Reset': '1609459200', // Unix timestamp
}
```

## Testing

### Test Rate Limiter

```typescript
import { testRateLimiter } from '../lib/rateLimiter';

// Run in development only
if (__DEV__) {
  await testRateLimiter();
}
```

Expected output:
```
Rate Limiter Test
Request 1: ✅ Allowed (99 remaining)
Request 2: ✅ Allowed (98 remaining)
...
Request 101: ❌ Blocked (rate limit exceeded, retry in 60s)
```

### Load Testing

Use Apache Bench to test limits:

```bash
# Test 100 requests in 1 second (should hit rate limit)
ab -n 100 -c 10 https://your-edge-function.supabase.co/
```

## Migration from In-Memory to Distributed

### Step 1: Deploy Upstash Redis
- Create database
- Add secrets to Supabase

### Step 2: Update Edge Functions
- Replace in-memory limiter with Upstash client
- Deploy updated functions

### Step 3: Monitor
- Check Upstash dashboard for request volume
- Verify rate limits are working via Sentry

### Step 4: Remove In-Memory Code
- Delete old rate limiter implementation
- Clean up unused dependencies

## Monitoring

### Upstash Dashboard

Track:
- **Request Count**: Total rate limit checks
- **Hit Rate**: How often limits are exceeded
- **Latency**: p50, p95, p99 response times

### Sentry Alerts

Create alert for rate limit abuse:

```typescript
if (!rateLimitCheck.success) {
  Sentry.captureMessage('Rate limit exceeded', {
    level: 'warning',
    tags: {
      userId,
      operation,
    },
    extra: {
      limit: rateLimitCheck.limit,
      retryAfter: rateLimitCheck.retryAfter,
    },
  });
}
```

## Advanced: Dynamic Rate Limits

Adjust limits based on user tier:

```typescript
function getRateLimitForUser(userId: string, tier: 'free' | 'pro' | 'enterprise') {
  const limits = {
    free: { requests: 100, window: '1 m' },
    pro: { requests: 1000, window: '1 m' },
    enterprise: { requests: 10000, window: '1 m' },
  };

  const config = limits[tier];
  return Ratelimit.slidingWindow(config.requests, config.window);
}
```

## Cost Estimation

### Upstash Pricing (as of 2025)

**Free Tier**:
- 10,000 commands per day
- 256 MB storage
- Good for development/staging

**Pay As You Go**:
- $0.2 per 100K commands
- Example: 1M daily active users × 10 requests/day = 10M commands/day = **$20/day**

### Optimization Tips

1. **Cache Results**: Don't check rate limit for every single action
2. **Batch Operations**: Group related requests
3. **Use Expiration**: Let Redis auto-expire keys (no manual cleanup)

## Troubleshooting

### Rate Limit Not Working

**Check**:
1. Environment variables set correctly?
2. Upstash database accessible from Supabase region?
3. Redis client initialized properly?

### High Latency

**Solution**:
- Move Upstash database to region closer to Supabase
- Enable Upstash global replication for multi-region deployments

### False Positives

**Issue**: Legitimate users hitting limits too easily

**Solution**:
- Increase limits for specific operations
- Implement user tier-based limits
- Whitelist internal services

## Security Best Practices

1. **Never expose Redis credentials** in client-side code
2. **Always rate limit by user ID**, not IP (shared IPs cause issues)
3. **Log rate limit violations** for abuse detection
4. **Implement exponential backoff** on client side
5. **Use different limits** for different operations

## Resources

- Upstash Docs: https://docs.upstash.com/redis
- Rate Limiting Patterns: https://upstash.com/blog/rate-limiting
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

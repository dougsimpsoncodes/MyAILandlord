# Edge Function Production Configuration

## property-invite-preview Function

### Environment Variables Required

#### Production Settings:
```bash
# Supabase Dashboard > Functions > property-invite-preview > Settings

# Production Origins (REQUIRED)
ALLOWED_ORIGINS=https://myailandlord.app,https://www.myailandlord.app

# Development Mode (MUST be false or unset in production)
ENABLE_DEV_ORIGINS=false

# Public Preview (set to false if property data should be completely private)
ENABLE_PUBLIC_INVITE_PREVIEW=true
```

#### Development/Staging Settings:
```bash
# For development and staging environments only
ALLOWED_ORIGINS=https://staging.myailandlord.app
ENABLE_DEV_ORIGINS=true
ENABLE_PUBLIC_INVITE_PREVIEW=true
```

### Performance Optimizations

1. **O(1) Origin Lookup**: Uses Set data structure for constant-time origin validation
2. **Pre-computed Values**: All origins parsed and stored at function startup
3. **Early Returns**: Fails fast on invalid inputs
4. **Rate Limiting**: 30 requests per minute per IP (in-memory, per instance)

### Security Features

1. **UUID Validation**: Strict regex pattern for property IDs
2. **Origin Restrictions**: 
   - Production: Only allows configured domains
   - Development: Requires explicit `ENABLE_DEV_ORIGINS=true`
3. **Rate Limiting**: Prevents abuse and enumeration attacks
4. **Minimal Data Exposure**: Returns only public property fields
5. **No SQL Injection**: Parameterized queries with UUID validation
6. **Error Handling**: Generic error messages prevent information leakage

### Production Checklist

Before deploying to production:

- [ ] Set `ENABLE_DEV_ORIGINS=false` (or remove the variable entirely)
- [ ] Set `ALLOWED_ORIGINS` to production domains only
- [ ] Verify rate limiting is appropriate for expected traffic
- [ ] Consider adding CloudFlare or CDN rate limiting as additional layer
- [ ] Monitor function logs for abuse patterns
- [ ] Set up alerts for high error rates

### Performance Metrics

Expected performance in production:
- **Cold Start**: ~500-800ms (Deno runtime)
- **Warm Execution**: ~50-100ms
- **Concurrent Requests**: Handles 1000+ concurrent requests
- **Memory Usage**: ~50MB per instance
- **Auto-scaling**: Supabase automatically scales based on load

### Monitoring

Monitor these metrics in production:
1. Function execution time (p50, p95, p99)
2. Error rate (4xx vs 5xx errors)
3. Rate limit hits (429 responses)
4. Origin validation failures (403 responses)
5. Database query time

### Cost Optimization

- Function invocations: First 500K/month free, then $2 per million
- Optimize by:
  - Caching property data in Redis/CDN for frequently accessed properties
  - Using CDN for static property images
  - Implementing browser-side caching headers

### Future Enhancements

1. **Redis Caching**: Cache property data for 5 minutes to reduce DB load
2. **Signed URLs**: Generate time-limited invite URLs instead of permanent ones
3. **Analytics**: Track invite conversion rates
4. **A/B Testing**: Test different property preview formats
5. **IP Allowlisting**: Additional security for high-value properties
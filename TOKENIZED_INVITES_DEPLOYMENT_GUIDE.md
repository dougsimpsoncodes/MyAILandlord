# Tokenized Invites - Production Deployment Guide

## Overview

This guide walks through deploying the tokenized invite system to production with gradual rollout and monitoring.

## Pre-Deployment Checklist

### ✅ 1. Database Migrations

Deploy all FIVE migrations in order:

```bash
# Connect to production database
psql "postgresql://postgres.PROJECT_ID:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Deploy migrations (in exact order - CRITICAL)
\i supabase/migrations/20251221_rate_limiting_backend.sql
\i supabase/migrations/20251221_tokenized_invites_production_ready.sql
\i supabase/migrations/20251221_fix_privilege_boundaries.sql
\i supabase/migrations/20251221_generate_invite_token_rpc.sql  # Token generation
\i supabase/migrations/20251221_security_hardening.sql  # Enumeration resistance + clock skew
```

**Verify migrations:**
```sql
-- Check invite_tokens table exists
SELECT * FROM pg_tables WHERE tablename = 'invite_tokens';

-- Check rate_limits table exists
SELECT * FROM pg_tables WHERE tablename = 'rate_limits';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'invite_tokens';

-- Check function privileges (CRITICAL: include generate_invite_token)
SELECT proname, proacl FROM pg_proc WHERE proname IN ('generate_invite_token', 'validate_invite_token', 'accept_invite_token', 'check_rate_limit');

-- Verify generate_invite_token is accessible to authenticated users
-- Should show: {authenticated=X/...}
SELECT proname, proacl FROM pg_proc WHERE proname = 'generate_invite_token';
```

### ✅ 2. Edge Functions Deployment

Deploy Edge Functions to production:

```bash
# Navigate to project directory
cd /Users/dougsimpson/Projects/MyAILandlord

# Deploy shared CORS module (must deploy first)
supabase functions deploy _shared

# Deploy validation function
supabase functions deploy validate-invite-token

# Deploy acceptance function
supabase functions deploy accept-invite-token

# Verify deployments
supabase functions list
```

### ✅ 3. Set Supabase Secrets

```bash
# CRITICAL: Set production allowed origins
supabase secrets set ALLOWED_ORIGINS="https://myailandlord.app,https://www.myailandlord.app"

# CRITICAL: Remove dev origins in production
supabase secrets unset ENABLE_DEV_ORIGINS

# Verify secrets (safe - doesn't show values)
supabase secrets list
```

### ✅ 4. Update Universal Links Configuration

**iOS (apple-app-site-association):**
1. Get your Apple Team ID from Apple Developer portal
2. Update `public/.well-known/apple-app-site-association`:
   ```json
   "appIDs": ["YOUR_TEAM_ID.com.myailandlord.app"]
   ```
3. Deploy to production web server

**Android (assetlinks.json):**
1. Get SHA256 certificate fingerprint:
   ```bash
   keytool -list -v -keystore release.keystore -alias release
   ```
2. Update `public/.well-known/assetlinks.json`:
   ```json
   "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
   ```
3. Deploy to production web server

**Verify deployment:**
```bash
# iOS
curl https://myailandlord.app/.well-known/apple-app-site-association

# Android
curl https://myailandlord.app/.well-known/assetlinks.json

# IMPORTANT: Verify Content-Type header is application/json
curl -I https://myailandlord.app/.well-known/apple-app-site-association
```

### ✅ 5. Client Environment Variables

Create `.env.production`:

```bash
# Start with feature DISABLED
EXPO_PUBLIC_TOKENIZED_INVITES=false
EXPO_PUBLIC_TOKEN_ROLLOUT_PERCENT=0

# Production Supabase config
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Clerk config
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_KEY
```

## Deployment Steps

### Step 1: Deploy with Feature Disabled (Smoke Test)

```bash
# 1. Set environment to disabled
echo "EXPO_PUBLIC_TOKENIZED_INVITES=false" >> .env.production
echo "EXPO_PUBLIC_TOKEN_ROLLOUT_PERCENT=0" >> .env.production

# 2. Build and deploy
eas build --platform all --profile production
eas submit --platform all

# 3. Verify app works normally with legacy flow
# - Create property as landlord
# - Generate invite link
# - Verify link format: /invite?property=UUID (not /invite?token=...)
```

### Step 2: Enable for 10% of Users (Week 1)

```bash
# 1. Update environment
echo "EXPO_PUBLIC_TOKENIZED_INVITES=true" >> .env.production
echo "EXPO_PUBLIC_TOKEN_ROLLOUT_PERCENT=10" >> .env.production

# 2. Rebuild and deploy
eas build --platform all --profile production

# 3. Monitor for 3-7 days
```

**Week 1 Monitoring:**
- ✅ Check Supabase logs for Edge Function errors
- ✅ Monitor rate limit hits (should be minimal in normal usage)
- ✅ Verify invite acceptance success rate
- ✅ Check for RLS policy violations

```sql
-- Monitor token generation/usage
SELECT
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE used_at IS NOT NULL) as used_tokens,
  COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked_tokens,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_tokens
FROM invite_tokens
WHERE created_at > NOW() - INTERVAL '7 days';

-- Check rate limiting activity
SELECT
  limiter_key,
  tokens,
  last_refill,
  updated_at
FROM rate_limits
ORDER BY updated_at DESC
LIMIT 20;

-- Monitor acceptance errors
SELECT
  created_at,
  level,
  message
FROM logs
WHERE level = 'error'
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### Step 3: Increase to 25% (Week 2)

If Week 1 shows no issues:

```bash
echo "EXPO_PUBLIC_TOKEN_ROLLOUT_PERCENT=25" >> .env.production
eas build --platform all --profile production
```

### Step 4: Increase to 50% (Week 3)

If Week 2 shows no issues:

```bash
echo "EXPO_PUBLIC_TOKEN_ROLLOUT_PERCENT=50" >> .env.production
eas build --platform all --profile production
```

### Step 5: Full Rollout - 100% (Week 4)

If Week 3 shows no issues:

```bash
echo "EXPO_PUBLIC_TOKEN_ROLLOUT_PERCENT=100" >> .env.production
eas build --platform all --profile production
```

### Step 6: Retire Legacy Flow (Week 8+)

After 4 weeks at 100% with no issues:

1. Remove legacy invite code from PropertyInviteAcceptScreen
2. Remove `property` parameter from navigation linking config
3. Remove `acceptLegacyInvite()` function
4. Update documentation

## Staging Validation Tests

Before each rollout increment, run these tests in staging:

### Test 1: Concurrent Acceptance (Race Condition)

```bash
# Two users try to accept the same single-use token simultaneously
TOKEN="abc123def456"

# Terminal 1 (Tenant A)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/accept-invite-token \
  -H "Authorization: Bearer TENANT_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"

# Terminal 2 (Tenant B - run immediately after)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/accept-invite-token \
  -H "Authorization: Bearer TENANT_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"

# Expected: One succeeds, one gets "Token has been used" error
```

### Test 2: Cross-Tab Invite Flow

1. Open invite link in Tab A: `https://myailandlord.app/invite?token=xyz789`
2. Click "Sign Up" (redirects to signup in Tab A)
3. Complete signup in NEW Tab B
4. **Expected:** After signup, automatically redirected to invite acceptance
5. **Verify:** Pending invite persisted via localStorage

### Test 3: CORS Validation

```bash
# Test web origin (should succeed)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/validate-invite-token \
  -H "Origin: https://myailandlord.app" \
  -H "Content-Type: application/json" \
  -d '{"token": "test123"}' \
  -v

# Test unknown origin (should fail with 403)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/validate-invite-token \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"token": "test123"}' \
  -v

# Test native app (no Origin header, should succeed with Authorization)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/validate-invite-token \
  -H "Authorization: Bearer VALID_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"token": "test123"}'
```

### Test 4: Expired/Revoked Tokens

```sql
-- Create expired token
INSERT INTO invite_tokens (token, property_id, created_by, expires_at)
VALUES ('expired123', 'PROPERTY_UUID', 'LANDLORD_UUID', NOW() - INTERVAL '1 day');

-- Create revoked token
INSERT INTO invite_tokens (token, property_id, created_by, revoked_at)
VALUES ('revoked456', 'PROPERTY_UUID', 'LANDLORD_UUID', NOW());
```

```bash
# Test expired token (should fail)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/validate-invite-token \
  -H "Content-Type: application/json" \
  -d '{"token": "expired123"}'

# Expected: {"valid": false, "error": "Token has expired"}

# Test revoked token (should fail)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/validate-invite-token \
  -H "Content-Type: application/json" \
  -d '{"token": "revoked456"}'

# Expected: {"valid": false, "error": "Token has been revoked"}
```

### Test 5: Rate Limiting

```bash
# Send 25 rapid requests (should all succeed - under 30/min limit)
for i in {1..25}; do
  curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/validate-invite-token \
    -H "Content-Type: application/json" \
    -d '{"token": "test123"}'
  sleep 0.1
done

# Send 35 rapid requests (last 5 should fail with 429)
for i in {1..35}; do
  curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/validate-invite-token \
    -H "Content-Type: application/json" \
    -d '{"token": "test123"}' \
    -w "\\nStatus: %{http_code}\\n"
done
```

## Rollback Procedure

If critical issues are discovered:

### Immediate Rollback (Feature Flag)

```bash
# 1. Disable feature immediately
echo "EXPO_PUBLIC_TOKENIZED_INVITES=false" >> .env.production

# 2. Rebuild and deploy emergency update
eas build --platform all --profile production --no-wait

# 3. Users will fall back to legacy invite flow
# 4. Existing tokenized invites will still work (validation continues)
```

### Full Rollback (Database)

If database issues require full rollback:

```sql
-- 1. Disable RPC functions (prevent new token operations)
REVOKE ALL ON FUNCTION public.generate_invite_token FROM authenticated;
REVOKE ALL ON FUNCTION public.validate_invite_token FROM service_role;
REVOKE ALL ON FUNCTION public.accept_invite_token FROM authenticated;

-- 2. Investigate issues
SELECT * FROM invite_tokens WHERE created_at > NOW() - INTERVAL '1 hour';
SELECT * FROM rate_limits ORDER BY updated_at DESC LIMIT 50;

-- 3. Restore functions after fixes
GRANT EXECUTE ON FUNCTION public.generate_invite_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invite_token TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_invite_token TO authenticated;
```

## Monitoring & Metrics

### Key Metrics to Track

1. **Token Generation Rate**
   - Tokens created per day
   - Tokens created per landlord

2. **Token Acceptance Rate**
   - Successful acceptances / Total tokens
   - Time from creation to acceptance

3. **Error Rates**
   - Rate limit hits per day
   - CORS rejections per day
   - Expired token attempts
   - Duplicate acceptance attempts

4. **Performance**
   - Edge Function response times
   - Database query performance (check_rate_limit)

### Monitoring Queries

```sql
-- Daily token stats
SELECT
  DATE(created_at) as date,
  COUNT(*) as tokens_created,
  COUNT(*) FILTER (WHERE used_at IS NOT NULL) as tokens_used,
  ROUND(AVG(EXTRACT(EPOCH FROM (used_at - created_at)) / 3600), 2) as avg_hours_to_use
FROM invite_tokens
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Error rate monitoring
SELECT
  DATE(created_at) as date,
  level,
  COUNT(*) as count
FROM logs
WHERE created_at > NOW() - INTERVAL '7 days'
AND (message LIKE '%invite%' OR message LIKE '%token%')
GROUP BY DATE(created_at), level
ORDER BY date DESC, level;
```

## Success Criteria

Proceed to next rollout stage if ALL criteria are met:

✅ **Error Rate < 1%** - Less than 1% of token operations fail
✅ **No Security Issues** - No unauthorized token access attempts
✅ **No Performance Degradation** - P95 response time < 500ms
✅ **No User Complaints** - Support tickets normal levels
✅ **Rate Limiting Working** - No abuse detected
✅ **CORS Functioning** - No legitimate requests blocked

## Post-Deployment

After 100% rollout and 4 weeks stable:

1. ✅ Update documentation
2. ✅ Remove legacy code (feature flag cleanup)
3. ✅ Archive migration files
4. ✅ Update API documentation
5. ✅ Add monitoring dashboards
6. ✅ Document lessons learned

## Support

If issues arise during deployment:

1. Check Edge Function logs: Supabase Dashboard → Edge Functions → Logs
2. Check database logs: Supabase Dashboard → Logs → Postgres
3. Review rate limiting table: `SELECT * FROM rate_limits ORDER BY updated_at DESC;`
4. Test manually with curl commands from this guide

For rollback, follow the Rollback Procedure section above.

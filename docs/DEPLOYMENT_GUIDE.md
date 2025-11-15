# Deployment Guide - Phase 1 Production Release

Complete step-by-step guide for deploying Phase 1 improvements to production.

## Pre-Deployment Checklist

### 1. Environment Verification ✅

**Staging Environment**:
- [ ] Supabase staging project created
- [ ] Clerk development instance configured
- [ ] Environment variables synced with production
- [ ] Test data loaded

**Production Environment**:
- [ ] Supabase production project ready
- [ ] Clerk production instance configured
- [ ] Environment variables configured
- [ ] Backup system enabled

### 2. Code Review ✅

- [ ] All Phase 1 code merged to `main` branch
- [ ] Type safety improvements reviewed (ClerkSupabaseClient, types/api, helpers)
- [ ] RLS tests passing (19 isolation tests)
- [ ] Unit tests passing (100+ test cases)
- [ ] No TypeScript errors in critical paths

### 3. Documentation ✅

- [ ] PHASE_1_COMPLETE_SUMMARY.md reviewed
- [ ] All setup guides created (Sentry, rate limiting, virus scanning, security headers)
- [ ] Rollback procedures documented
- [ ] Backup/restore procedures documented

---

## Deployment Steps

### Step 1: Deploy Database Migrations (Staging)

**Timeline**: 30 minutes
**Risk**: Low (rollback scripts provided)

```bash
# 1. Connect to staging Supabase project
cd supabase

# 2. Run migrations in order
supabase db push

# Manually verify each migration:
# Migration 1: Critical Indexes
supabase db push supabase/migrations/20250110_add_critical_indexes.sql

# Verify indexes created
psql -h db.staging-project.supabase.co -U postgres -d postgres -c "
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY indexname;
"

# Migration 2: RLS Helper Functions
supabase db push supabase/migrations/20250110_rls_helper_function.sql

# Verify functions created
psql -h db.staging-project.supabase.co -U postgres -d postgres -c "
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE 'get_current%'
OR routine_name LIKE 'is_%';
"

# Migration 3: Virus Scanning Fields
supabase db push supabase/migrations/20250111_add_virus_scan_fields.sql

# Verify columns added
psql -h db.staging-project.supabase.co -U postgres -d postgres -c "
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'storage'
AND table_name = 'objects'
AND column_name LIKE 'virus_%';
"
```

**Validation**:
```bash
# Run RLS tests against staging
npm run test src/__tests__/security/rls/

# Expected: All 19 tests passing
```

---

### Step 2: Configure Monitoring (Production)

**Timeline**: 1 hour
**Risk**: None (monitoring only)

#### A. Sentry Setup

```bash
# 1. Get Sentry DSN from https://sentry.io
# Project Settings → Client Keys (DSN)

# 2. Add to .env.production
echo "EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/7654321" >> .env.production
echo "EXPO_PUBLIC_SENTRY_ENVIRONMENT=production" >> .env.production
echo "EXPO_PUBLIC_SENTRY_RELEASE=1.0.0" >> .env.production

# 3. Configure EAS secrets
eas secret:create --scope project --name SENTRY_DSN --value "https://your-dsn@..."
eas secret:create --scope project --name SENTRY_ORG --value "your-org-slug"
eas secret:create --scope project --name SENTRY_PROJECT --value "your-project-slug"
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "your-auth-token"
```

#### B. Configure Alerts

In Sentry dashboard:

1. **High Error Rate Alert**:
   - Navigate to: Alerts → Create Alert Rule
   - Condition: `Event count > 100 in 1 hour`
   - Environment: `production`
   - Action: Email + Slack

2. **Critical Error Alert**:
   - Condition: `Event count > 10 in 5 minutes`
   - Level: `error` or `fatal`
   - Action: PagerDuty + Slack

3. **Performance Alert**:
   - Condition: `p95(transaction.duration) > 3000ms in 10 minutes`
   - Transaction: `navigation` or `api.call`
   - Action: Email

**Validation**:
```bash
# Test Sentry integration
# Add to App.tsx temporarily:
import { testSentryIntegration } from './src/lib/sentry';

useEffect(() => {
  if (__DEV__) {
    testSentryIntegration();
  }
}, []);

# Run app and check Sentry dashboard for test event
npm start
```

---

### Step 3: Configure Rate Limiting (Production)

**Timeline**: 30 minutes
**Risk**: None (graceful degradation)

#### A. Upstash Redis Setup

```bash
# 1. Create Upstash Redis database at https://upstash.com
# 2. Choose region closest to Supabase

# 3. Add to .env.production
echo "UPSTASH_REDIS_REST_URL=https://your-db.upstash.io" >> .env.production
echo "UPSTASH_REDIS_REST_TOKEN=your-token" >> .env.production

# 4. Add to Supabase Edge Function secrets
supabase secrets set UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
supabase secrets set UPSTASH_REDIS_REST_TOKEN=your-token
```

**Validation**:
```bash
# Test rate limiter
npm run test src/__tests__/lib/rateLimiter.test.ts

# Or test in app:
import { testRateLimiter } from './src/lib/rateLimiter';

if (__DEV__) {
  testRateLimiter();
}
```

---

### Step 4: Deploy to Production

**Timeline**: 2 hours
**Risk**: Medium (full deployment)

#### A. Database Migration (Production)

```bash
# 1. Create production backup FIRST
# Follow docs/BACKUP_RESTORE.md

# 2. Backup verification
# Ensure backup completed successfully

# 3. Run migrations (same as staging)
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.prod-project.supabase.co:5432/postgres"

# 4. Verify migrations (same queries as staging)

# 5. Run RLS tests against production (read-only test data)
EXPO_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co npm run test src/__tests__/security/rls/
```

#### B. Application Deployment

```bash
# 1. Build production app
eas build --platform all --profile production

# 2. Submit to app stores
eas submit --platform ios --latest
eas submit --platform android --latest

# 3. Deploy web (if applicable)
# For Vercel:
vercel --prod

# For Netlify:
netlify deploy --prod
```

#### C. Edge Functions Deployment

```bash
# Deploy Supabase Edge Functions
supabase functions deploy virus-scan
supabase functions deploy property-invite-preview

# Verify deployment
supabase functions list
```

---

### Step 5: Post-Deployment Validation

**Timeline**: 1 hour
**Risk**: None (validation only)

#### A. Smoke Tests

```bash
# 1. Test critical paths
# - User registration → Profile creation
# - Property creation → Verify indexes used
# - Maintenance request → Verify RLS policies
# - File upload → Verify virus scanning queued

# 2. Check monitoring
# Sentry dashboard → Verify events flowing
# Upstash dashboard → Verify rate limit checks

# 3. Performance validation
# Run performance baseline script
node scripts/performance/measure-baseline.js

# Expected:
# - API Response Time: <200ms p95
# - Database Query Time: <100ms p95
# - Screen Load Time: <1s initial
```

#### B. Monitor for Issues

**First 24 Hours**:
- [ ] Monitor Sentry error rate (target: <100 per day)
- [ ] Monitor performance metrics (p95 < 3000ms)
- [ ] Check Upstash usage (no rate limit abuse)
- [ ] Verify backup completed successfully
- [ ] Check database query performance

**First Week**:
- [ ] Review Sentry errors for patterns
- [ ] Optimize slow queries (if any)
- [ ] Adjust rate limits based on usage
- [ ] Test rollback procedures

---

## Rollback Procedures

### If Migration Fails

```bash
# Run rollback migration
supabase db push supabase/migrations/rollback/20250110_rollback_add_critical_indexes.sql
supabase db push supabase/migrations/rollback/20250110_rollback_rls_helper_function.sql

# Restore from backup (if necessary)
# Follow docs/ROLLBACK_PROCEDURES.md
```

### If Application Crashes

```bash
# Rollback to previous EAS build
eas build:list --limit 5
eas update --branch production --message "Rollback to previous version"

# For immediate rollback:
# Revert git commit and redeploy
git revert HEAD
git push origin main
eas build --platform all --profile production
```

---

## Success Metrics

### Day 1
- ✅ Zero critical errors in Sentry
- ✅ All RLS tests passing
- ✅ Performance within baselines
- ✅ Backup completed successfully

### Week 1
- ✅ Error rate <100 per day
- ✅ P95 response time <200ms
- ✅ Zero RLS violations
- ✅ Rate limiting working (no abuse detected)

### Month 1
- ✅ Test coverage maintained at 40%+
- ✅ Zero data breaches
- ✅ Performance stable or improving
- ✅ Monitoring alerting properly

---

## Emergency Contacts

**Database Issues**:
- Supabase Support: support@supabase.io
- Backup restoration: See docs/BACKUP_RESTORE.md

**Monitoring Issues**:
- Sentry Support: support@sentry.io
- Upstash Support: support@upstash.com

**Application Issues**:
- Expo Support: support@expo.dev
- Clerk Support: support@clerk.com

---

## Next Steps After Deployment

1. **Phase 2 Planning**: Begin work on remaining type safety fixes
2. **Test Coverage**: Expand to 80% coverage
3. **Performance Optimization**: Implement query result caching
4. **Feature Development**: Resume feature work with stable foundation

---

**Deployment Sign-off**: [Name] [Date]
**Production Validation**: [Name] [Date]

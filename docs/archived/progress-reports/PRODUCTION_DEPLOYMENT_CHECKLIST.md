# Production Deployment Checklist - Invite System

## Pre-Deployment Verification

### ✅ Manual QA (Required Before Deploy)

#### 1. Landlord Flow
- [ ] Login as landlord@test.com
- [ ] Navigate to property details
- [ ] Click "Invite Tenant"
- [ ] Generate shareable code
- [ ] Verify invite code displays (12 characters, alphanumeric)
- [ ] Verify invite URL displays correctly
- [ ] Copy invite link to clipboard

#### 2. Tenant Acceptance Flow
- [ ] Open incognito/private window
- [ ] Login as tenant@test.com
- [ ] Paste invite URL into browser
- [ ] Verify invite accept screen loads
- [ ] Verify property details display (name, address, landlord)
- [ ] Click "Accept Invite"
- [ ] Verify redirect to tenant dashboard
- [ ] Verify property appears in tenant's property list

#### 3. Idempotency & Security
- [ ] Paste same invite URL again
- [ ] Verify "Invalid or expired invite" message
- [ ] Attempt to modify token in URL
- [ ] Verify generic error (no enumeration)
- [ ] Try expired token (>48 hours old)
- [ ] Verify appropriate error message

#### 4. Database Verification
```sql
-- Check invite was created and accepted
SELECT * FROM public.invites
WHERE property_id = '<TEST_PROPERTY_ID>'
ORDER BY created_at DESC LIMIT 1;

-- Verify columns:
-- - token_hash (not plaintext!)
-- - accepted_at IS NOT NULL
-- - accepted_by = tenant user ID

-- Check tenant-property link created
SELECT * FROM public.tenant_property_links
WHERE tenant_id = (SELECT id FROM profiles WHERE email = 'tenant@test.com')
AND property_id = '<TEST_PROPERTY_ID>';

-- Verify is_active = true
```

## Database Migrations

### ✅ Run Migrations
- [ ] Confirm all migration files applied
- [ ] Verify no pending migrations
- [ ] Check migration logs for errors

```bash
# Check applied migrations
psql $DATABASE_URL -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10;"
```

### ✅ Verify RPC Functions
```sql
-- Confirm search_path includes extensions
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('create_invite', 'validate_invite', 'accept_invite');

-- Should see: SET search_path = public, extensions
```

### ✅ Verify Indexes
```sql
-- Critical indexes for invite performance
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'invites';

-- Required:
-- - idx_invites_token_hash (for fast token lookups)
-- - idx_invites_cleanup (for cleanup queries)
-- - idx_invites_rate_limit (for rate limiting)
```

### ✅ Verify RLS Policies
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'invites';
-- rowsecurity should be 't' (true)

-- Check policies exist
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'invites';

-- Required policies:
-- - landlords_create_own_invites (INSERT)
-- - landlords_view_own_invites (SELECT)
-- - landlords_update_own_invites (UPDATE)
```

## Application Configuration

### ✅ Environment Variables (Production)
- [ ] `EXPO_PUBLIC_SUPABASE_URL` - Production Supabase URL
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Production anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Production service role (secure!)
- [ ] `EXPO_PUBLIC_SIGNUP_AUTOLOGIN=false` - **MUST BE DISABLED IN PROD**
- [ ] `EXPO_PUBLIC_TOKENIZED_INVITES=true` - Enable invite system
- [ ] `EXPO_PUBLIC_TOKEN_ROLLOUT_PERCENT=100` - Full rollout

### ✅ Deep Linking Configuration

#### iOS Associated Domains
```json
// ios/MyAILandlord/MyAILandlord.entitlements
{
  "com.apple.developer.associated-domains": [
    "applinks:myailandlord.app",
    "applinks:www.myailandlord.app"
  ]
}
```

```json
// app.json
{
  "expo": {
    "ios": {
      "associatedDomains": [
        "applinks:myailandlord.app",
        "applinks:www.myailandlord.app"
      ]
    }
  }
}
```

#### Android Intent Filters
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="myailandlord.app" android:pathPrefix="/invite" />
  <data android:scheme="https" android:host="www.myailandlord.app" android:pathPrefix="/invite" />
</intent-filter>
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="myailandlord" android:host="invite" />
</intent-filter>
```

#### Apple App Site Association
```json
// https://myailandlord.app/.well-known/apple-app-site-association
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.myailandlord.app",
        "paths": ["/invite", "/invite/*"]
      }
    ]
  }
}
```

#### Android Asset Links
```json
// https://myailandlord.app/.well-known/assetlinks.json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.myailandlord.app",
    "sha256_cert_fingerprints": ["<YOUR_SHA256_FINGERPRINT>"]
  }
}]
```

## Security & Operations

### ✅ RLS & Auth Verification
```sql
-- Test RLS policies work correctly
-- As postgres superuser:
SET ROLE authenticator;
SET request.jwt.claims.sub TO '<LANDLORD_USER_ID>';

-- Should succeed (landlord creating invite for own property):
SELECT create_invite('<LANDLORD_PROPERTY_ID>', 'code', NULL);

-- Should fail (landlord creating invite for others' property):
SELECT create_invite('<OTHER_LANDLORD_PROPERTY_ID>', 'code', NULL);

RESET ROLE;
```

### ✅ Monitoring & Alerts

#### Supabase Logs
- [ ] Enable logging for `invites` table operations
- [ ] Monitor RPC function calls (`create_invite`, `validate_invite`, `accept_invite`)
- [ ] Set up alerts for error spikes (>5% error rate)

#### Key Metrics to Track
```sql
-- Invite creation rate
SELECT COUNT(*), DATE_TRUNC('hour', created_at) as hour
FROM public.invites
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Acceptance rate
SELECT
  COUNT(*) FILTER (WHERE accepted_at IS NOT NULL) * 100.0 / COUNT(*) as acceptance_rate_pct,
  COUNT(*) as total_invites,
  COUNT(*) FILTER (WHERE accepted_at IS NOT NULL) as accepted,
  COUNT(*) FILTER (WHERE expires_at < NOW() AND accepted_at IS NULL) as expired
FROM public.invites
WHERE created_at > NOW() - INTERVAL '7 days';

-- Rate limiting incidents
SELECT COUNT(*) as rate_limit_hits
FROM public.invites
WHERE last_validation_attempt > NOW() - INTERVAL '1 minute'
GROUP BY property_id
HAVING COUNT(*) > 20;
```

#### Alert Thresholds
- [ ] Error rate > 5% on `create_invite` RPC
- [ ] Error rate > 10% on `validate_invite` RPC
- [ ] Error rate > 5% on `accept_invite` RPC
- [ ] Rate limiting triggered > 10 times/hour
- [ ] Database connection pool exhausted
- [ ] RLS policy violations detected

### ✅ Emergency Procedures

#### Revoke All Active Invites
```sql
-- Emergency: Soft-delete all pending invites for a property
UPDATE public.invites
SET deleted_at = NOW()
WHERE property_id = '<PROPERTY_ID>'
AND accepted_at IS NULL
AND deleted_at IS NULL;
```

#### Revoke Specific Invite
```sql
-- Soft-delete specific invite
UPDATE public.invites
SET deleted_at = NOW()
WHERE id = '<INVITE_ID>';
```

#### Cleanup Old Invites (Maintenance)
```sql
-- Run cleanup function (removes accepted >30 days, expired >7 days)
SELECT cleanup_old_invites();

-- Verify results
SELECT
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as soft_deleted,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active
FROM public.invites;
```

## Rollback Plan

### If Critical Issue Discovered

#### 1. Disable Invite Feature
```bash
# Set environment variable to disable
EXPO_PUBLIC_TOKENIZED_INVITES=false

# Or set rollout to 0%
EXPO_PUBLIC_TOKEN_ROLLOUT_PERCENT=0
```

#### 2. Revert Database Changes (if needed)
```sql
-- Disable RLS temporarily (only if absolutely necessary)
ALTER TABLE public.invites DISABLE ROW LEVEL SECURITY;

-- Re-enable after fix
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
```

#### 3. Revert Code Changes
```bash
# Checkout previous working commit
git log --oneline | grep "invite"
git revert <COMMIT_SHA>

# Or rollback to previous deployment
git checkout <PREVIOUS_TAG>
```

## Post-Deployment Verification

### ✅ Smoke Tests (Production)
- [ ] Create test invite in production
- [ ] Accept invite in production
- [ ] Verify database records created
- [ ] Verify no errors in Supabase logs
- [ ] Verify deep links work on iOS
- [ ] Verify deep links work on Android
- [ ] Verify deep links work on web

### ✅ Performance Monitoring
- [ ] Check API response times (<500ms for `create_invite`)
- [ ] Check database query performance
- [ ] Monitor connection pool usage
- [ ] Check for N+1 query issues

### ✅ User Feedback
- [ ] Monitor support channels for invite-related issues
- [ ] Track invite acceptance rates
- [ ] Collect user feedback on invite UX

## Documentation

### ✅ User Documentation
- [ ] Help Center article: "How to Invite a Tenant"
- [ ] Help Center article: "How to Accept a Property Invite"
- [ ] FAQ: "Invite link not working"
- [ ] FAQ: "Invite expired"

### ✅ Technical Documentation
- [ ] API documentation for invite RPCs
- [ ] Database schema documentation
- [ ] Deep-linking setup guide
- [ ] Troubleshooting guide

## Sign-Off

### Pre-Deployment
- [ ] Manual QA completed successfully
- [ ] Database migrations verified
- [ ] RLS policies tested
- [ ] Deep linking configured
- [ ] Monitoring & alerts configured
- [ ] Emergency procedures documented

### Deployment Approval
- [ ] Engineering Lead: ____________________ Date: ________
- [ ] Product Owner: ____________________ Date: ________
- [ ] QA Lead: ____________________ Date: ________

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Performance metrics acceptable
- [ ] No critical errors in logs
- [ ] User documentation published

---

**Deployment Status**: ⬜ Ready | ⬜ In Progress | ⬜ Complete | ⬜ Rollback

**Notes**:

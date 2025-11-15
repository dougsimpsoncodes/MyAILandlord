# Staging Environment Setup

## Overview
This document outlines the complete setup process for the MyAILandlord staging environment, which mirrors production for safe testing.

## Supabase Staging Project

### Step 1: Create Staging Project
- [ ] Log in to Supabase Dashboard (https://supabase.com)
- [ ] Create new project: `myailandlord-staging`
- [ ] Region: Same as production (US West recommended)
- [ ] Database password: Store in 1Password/secure vault
- [ ] Wait for project provisioning (~2 minutes)

### Step 2: Configure Database Schema
```bash
# Initialize Supabase CLI (if not done)
npx supabase init

# Link to staging project
npx supabase link --project-ref <staging-project-ref>

# Apply all migrations in order
npx supabase db push
```

### Step 3: Set Up Storage Buckets
Create the following buckets in Supabase Dashboard → Storage:

1. **property-images**
   - Public: No
   - File size limit: 10MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

2. **maintenance-images**
   - Public: No
   - File size limit: 10MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

3. **voice-notes**
   - Public: No
   - File size limit: 10MB
   - Allowed MIME types: audio/mp4, audio/m4a, audio/wav

4. **documents**
   - Public: No
   - File size limit: 10MB
   - Allowed MIME types: application/pdf, image/jpeg, image/png

### Step 4: Configure RLS Policies
RLS policies are applied automatically through migrations.

Verify with:
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected: ~30+ policies across all tables

### Step 5: Document Connection Strings
Create `.env.staging` file:
```bash
# Supabase Staging
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>

# Clerk Staging (created in next section)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=<staging-clerk-key>
```

**Security Note:** Never commit `.env.staging` to git. Add to `.gitignore`.

## Clerk Staging Instance

### Step 1: Create Development Instance
- [ ] Log in to Clerk Dashboard (https://clerk.com)
- [ ] Create new application: `MyAILandlord - Staging`
- [ ] Enable OAuth providers:
  - [ ] Google (use test credentials or staging OAuth app)
  - [ ] Email/Password

### Step 2: Configure JWT Template
Navigate to Clerk Dashboard → JWT Templates → Create Template

**Template Name:** supabase-staging

**Claims:**
```json
{
  "aud": "<staging-supabase-project-ref>",
  "exp": "{{user.expirationTime}}",
  "sub": "{{user.id}}",
  "email": "{{user.primaryEmailAddress}}",
  "role": "{{user.publicMetadata.role}}",
  "user_metadata": {
    "full_name": "{{user.fullName}}",
    "avatar_url": "{{user.imageUrl}}"
  }
}
```

### Step 3: Configure Supabase Auth Settings
In Supabase Dashboard → Authentication → Providers → Custom:

1. Enable Custom Authentication
2. JWT Secret: Copy from Clerk Dashboard → JWT Templates → supabase-staging → JWKS Endpoint
3. JWT Audience: `<staging-supabase-project-ref>`
4. JWT Issuer: `https://clerk.<your-staging-domain>.clerk.accounts.dev`

### Step 4: Test Integration
```typescript
// Test file: scripts/test-staging-auth.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function testAuth(clerkToken: string) {
  const { data, error } = await supabase.auth.setSession({
    access_token: clerkToken,
    refresh_token: ''
  });

  console.log('Auth test:', error ? 'FAILED' : 'SUCCESS');
  console.log('User:', data?.user?.id);
}
```

## Environment Parity Verification

### Node.js Version
```bash
node --version  # Should match production: v18+
```

Add to `package.json`:
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### Package Versions
```bash
# Verify all dependencies match
npm list --depth=0
```

Key packages to verify:
- expo: ^53.0.22
- react: 19.0.0
- react-native: 0.79.5
- @supabase/supabase-js: ^2.56.0
- @clerk/clerk-expo: ^2.14.23

### Testing Staging Environment

#### Test 1: Authentication Flow
- [ ] Sign up new user in staging
- [ ] Verify profile created in Supabase
- [ ] Check JWT claims are correct
- [ ] Test sign out and sign back in

#### Test 2: Data Operations (CRUD)
- [ ] Create property as landlord
- [ ] Verify property in database
- [ ] Update property details
- [ ] Delete property (soft delete if applicable)

#### Test 3: File Uploads
- [ ] Upload property image
- [ ] Verify file in storage bucket
- [ ] Generate signed URL
- [ ] Access file via signed URL
- [ ] Delete file

#### Test 4: RLS Policies
- [ ] Create two landlord accounts
- [ ] Each creates a property
- [ ] Verify Landlord A cannot access Landlord B's property
- [ ] Repeat for tenant accounts

### Staging Deployment Process

```bash
# Build for staging
EAS_BUILD_PROFILE=staging npx eas build --platform ios --profile staging

# Or for development builds
EXPO_PUBLIC_ENVIRONMENT=staging npx expo start
```

## Maintenance

### Weekly Tasks
- [ ] Verify backups are running
- [ ] Check error logs in Sentry (staging project)
- [ ] Review database size and performance

### Monthly Tasks
- [ ] Update dependencies to match production
- [ ] Run security audit
- [ ] Test disaster recovery procedure

## Troubleshooting

### Issue: JWT Authentication Fails
**Symptom:** Users can't access data after login

**Solution:**
1. Verify JWT template in Clerk has correct `aud` claim
2. Check Supabase auth settings match Clerk JWKS endpoint
3. Inspect JWT token claims using jwt.io

### Issue: RLS Policy Violations
**Symptom:** "new row violates row-level security policy" errors

**Solution:**
1. Check JWT contains correct `sub` claim (Clerk user ID)
2. Verify profile exists in `profiles` table with matching `clerk_user_id`
3. Run RLS test suite: `npm run test:rls`

### Issue: File Upload Fails
**Symptom:** 403 Forbidden on storage operations

**Solution:**
1. Verify storage bucket exists
2. Check RLS policies on `storage.objects` table
3. Ensure authenticated user has valid token

## Security Checklist

- [ ] .env.staging not in git
- [ ] Service role key stored securely (1Password)
- [ ] RLS enabled on all tables
- [ ] Storage buckets set to private
- [ ] HTTPS enforced for all connections
- [ ] No production data in staging

## Contact Information

**Staging Environment Owners:**
- Primary: [Name] - [Email]
- Secondary: [Name] - [Email]

**Supabase Project:**
- URL: https://<project-ref>.supabase.co
- Dashboard: https://supabase.com/dashboard/project/<project-ref>

**Clerk Instance:**
- Dashboard: https://dashboard.clerk.com/apps/<app-id>

---

**Last Updated:** 2025-01-10
**Next Review:** 2025-02-10

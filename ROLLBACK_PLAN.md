# Rollback Plan - TypeScript Fixes & Clerk to Supabase Auth Migration

**Date Created:** November 15, 2025, 11:18 PM
**Branch:** `migration/clerk-to-supabase-auth`
**Target Merge:** TBD
**Created By:** Claude Code

---

## Executive Summary

This document provides a comprehensive rollback strategy for the TypeScript fixes and Clerk to Supabase Auth migration. Use this guide if you encounter critical issues post-merge and need to revert to a known-good state.

---

## Current State Snapshot

### Branch Information
- **Current Branch:** `migration/clerk-to-supabase-auth`
- **Current Commit:** `1e95af3` (chore: upgrade Playwright to v1.56.1)
- **Parent Commit:** `ff87c93` (refactor: consolidate data layer)
- **Remote:** `origin` (https://github.com/dougsimpsoncodes/MyAILandlord.git)

### Recent Commits on This Branch
```
1e95af3 - chore: upgrade Playwright to v1.56.1 to resolve HIGH severity CVE
849e414 - fix: comprehensive TypeScript error resolution (224 → 0 errors)
f04a747 - feat: generate Supabase TypeScript types from schema
29da870 - docs: add Codex handoff documentation for post-migration work
2f7afb2 - docs: add migration verification report
4c121c5 - fix: remove all remaining Clerk references from codebase
c6c6278 - fix: update validation tests to use userId instead of clerkUserId
e291b9d - feat: migrate from Clerk to Supabase Auth
ff87c93 - refactor: consolidate data layer, add pagination, centralize logging (BASE)
```

### Database Migrations Applied
```
supabase/migrations/20250115_migrate_to_supabase_auth.sql
supabase/migrations/20250115_update_rls_for_supabase_auth.sql
supabase/migrations/20250115_update_property_code_rpcs.sql
```

### Key Dependencies Changed
- `@playwright/test`: 1.54.2 → 1.56.1
- Removed: `@clerk/clerk-expo`, `@clerk/backend`
- Added: `@supabase/supabase-js` (auth client)

---

## Rollback Scenarios & Procedures

### Scenario 1: Critical Production Issue (Immediate Rollback)

**When to use:** Severe bugs, data loss, authentication failures, security vulnerabilities

**Time to rollback:** ~5-10 minutes

#### Steps:

1. **Stop deployments immediately**
   ```bash
   # If using Expo EAS
   eas build:cancel

   # If using other CI/CD, stop the pipeline
   ```

2. **Revert git to last known-good commit**
   ```bash
   # Create a backup branch of current state
   git branch backup/migration-clerk-to-supabase-$(date +%Y%m%d-%H%M%S)

   # Force reset to base commit (before migration)
   git reset --hard ff87c93

   # If already pushed to main, create a revert commit instead
   git revert --no-commit 1e95af3^..1e95af3
   git commit -m "revert: rollback TypeScript fixes and Clerk→Supabase migration"
   ```

3. **Rollback database migrations**
   ```bash
   # Connect to Supabase
   npx supabase db reset --db-url "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

   # Or manually run rollback scripts (see Database Rollback section below)
   ```

4. **Restore dependencies**
   ```bash
   npm install
   ```

5. **Verify rollback**
   ```bash
   # Check TypeScript errors (should see 224 errors - the pre-fix state)
   npx tsc --noEmit

   # Run tests
   npm test

   # Start dev server
   npx expo start
   ```

6. **Deploy rolled-back version**
   ```bash
   # Build and deploy the reverted version
   eas build --platform all
   eas submit --platform all
   ```

---

### Scenario 2: TypeScript Issues Only (Partial Rollback)

**When to use:** TypeScript errors causing build failures, but auth works fine

**Time to rollback:** ~2-3 minutes

#### Steps:

1. **Revert only TypeScript fix commits**
   ```bash
   # Create backup
   git branch backup/typescript-fixes-$(date +%Y%m%d-%H%M%S)

   # Revert the two TypeScript commits
   git revert 1e95af3  # Playwright upgrade
   git revert 849e414  # TypeScript fixes
   ```

2. **Keep auth migration intact**
   - Database migrations remain applied
   - Supabase auth client stays active
   - Only code-level TypeScript changes are reverted

3. **Test**
   ```bash
   npx tsc --noEmit  # Will show 224 errors again
   npm start
   ```

---

### Scenario 3: Playwright Issues (Dependency Rollback)

**When to use:** Playwright upgrade causes test failures or browser issues

**Time to rollback:** ~1 minute

#### Steps:

1. **Downgrade Playwright**
   ```bash
   npm install --save-dev @playwright/test@1.54.2
   ```

2. **Commit the downgrade**
   ```bash
   git add package.json package-lock.json
   git commit -m "revert: downgrade Playwright to v1.54.2"
   ```

3. **Re-run tests**
   ```bash
   npx playwright test
   ```

---

## Database Rollback Scripts

### Manual Rollback for Supabase Migrations

If automated rollback fails, run these SQL scripts manually in Supabase SQL Editor:

#### 1. Rollback RLS Policies (20250115_update_rls_for_supabase_auth.sql)

```sql
-- Rollback: Drop Supabase Auth RLS policies
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
DROP POLICY IF EXISTS messages_select_own ON public.messages;

-- Restore original Clerk-based policies (if they existed)
-- NOTE: You may need to restore original policies from backup
-- Or disable RLS temporarily until you can restore:
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
```

#### 2. Rollback Auth Migration (20250115_migrate_to_supabase_auth.sql)

```sql
-- NOTE: This is destructive! Backs up auth data first
CREATE TABLE IF NOT EXISTS public.profiles_backup_$(date +%Y%m%d) AS
SELECT * FROM public.profiles;

-- Remove Supabase auth references
ALTER TABLE public.profiles DROP COLUMN IF EXISTS auth_provider;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_sign_in_at;

-- Restore Clerk ID column if it was removed
-- ALTER TABLE public.profiles ADD COLUMN clerk_user_id TEXT;
```

#### 3. Rollback Property Code RPCs (20250115_update_property_code_rpcs.sql)

```sql
-- Drop updated functions
DROP FUNCTION IF EXISTS public.verify_property_code_v2(TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_property_by_code_v2(TEXT);

-- Restore original functions (if you have backups)
-- Or temporarily disable property code functionality
```

---

## Data Preservation

### Before Any Rollback

**CRITICAL:** Always backup data before rolling back database changes!

```bash
# Backup Supabase database
npx supabase db dump --db-url "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup profiles table specifically
psql "$DATABASE_URL" -c "COPY (SELECT * FROM public.profiles) TO STDOUT WITH CSV HEADER" > profiles-backup-$(date +%Y%m%d-%H%M%S).csv
```

---

## Verification Checklist (Post-Rollback)

After rolling back, verify these critical paths:

### Application Level
- [ ] App builds successfully (`npm run build` or `eas build`)
- [ ] TypeScript compiles (expect 224 errors if rolling back TS fixes)
- [ ] Dev server starts (`npx expo start`)
- [ ] No runtime JavaScript errors in console

### Authentication
- [ ] Users can sign up
- [ ] Users can sign in
- [ ] Sessions persist correctly
- [ ] Logout works
- [ ] Password reset works (if applicable)

### Database
- [ ] Profiles table accessible
- [ ] RLS policies working (users see only their own data)
- [ ] No orphaned records
- [ ] Property codes work (if using property code flow)

### Testing
- [ ] Unit tests pass (`npm test`)
- [ ] E2E tests pass (`npx playwright test`)
- [ ] Manual testing of critical flows

---

## Contact & Escalation

If rollback fails or you encounter issues:

1. **Check Git Backup Branches**
   ```bash
   git branch --list 'backup/*'
   ```

2. **Restore from Backup Branch**
   ```bash
   git checkout backup/migration-clerk-to-supabase-YYYYMMDD-HHMMSS
   git checkout -b recovery/$(date +%Y%m%d)
   ```

3. **Database Recovery**
   - Restore from SQL dump:
     ```bash
     psql "$DATABASE_URL" < backup-YYYYMMDD-HHMMSS.sql
     ```

---

## Rollback Decision Matrix

| Issue Type | Severity | Recommended Action | ETA |
|------------|----------|-------------------|-----|
| Auth completely broken | CRITICAL | Scenario 1: Full rollback | 5-10 min |
| Data loss | CRITICAL | Scenario 1 + Database restore | 10-15 min |
| TypeScript build errors | HIGH | Scenario 2: Partial rollback | 2-3 min |
| Test failures only | MEDIUM | Investigate, may not need rollback | - |
| Playwright issues | LOW | Scenario 3: Dependency rollback | 1 min |
| Performance degradation | MEDIUM | Monitor, rollback if worsens | - |

---

## Post-Rollback Actions

After successful rollback:

1. **Document the issue**
   - Create GitHub issue with:
     - What went wrong
     - When it happened
     - Impact on users
     - Rollback procedure used
     - Verification results

2. **Investigate root cause**
   - Review logs
   - Check error reports
   - Analyze what changed

3. **Plan fix**
   - Create new branch from rolled-back state
   - Fix the issue
   - Test thoroughly
   - Re-apply migration with fixes

4. **Communicate**
   - Notify team
   - Update stakeholders
   - Document lessons learned

---

## Safe Re-deployment Checklist

Before attempting to re-deploy after a rollback:

- [ ] Root cause identified and fixed
- [ ] All tests pass locally
- [ ] Peer review completed
- [ ] Staging environment tested
- [ ] Rollback plan updated with new learnings
- [ ] Database backup taken
- [ ] Monitoring/alerting configured
- [ ] Team notified of deployment window

---

## Notes

- This rollback plan assumes you have Supabase CLI access
- Database rollback requires appropriate permissions
- Always test rollback in staging/development first if possible
- Keep this document updated with each major migration

**Last Updated:** November 15, 2025, 11:18 PM

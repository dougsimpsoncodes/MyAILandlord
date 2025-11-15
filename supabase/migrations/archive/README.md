# Archived Migrations

This directory contains migration files that have been superseded by later consolidated migrations or were one-off fixes that are no longer needed.

## Archived Files

### fix_clerk_integration.sql
**Date Archived:** 2025-01-10
**Original Purpose:** Fixed Clerk authentication integration
**Reason for Archive:** Functionality merged into 20250904_consolidate_rls.sql
**Safe to Delete:** Yes, after verification in production

### fix_clerk_rls.sql
**Date Archived:** 2025-01-10
**Original Purpose:** Fixed RLS policies for Clerk JWT integration
**Reason for Archive:** Superseded by 20250904_consolidate_rls.sql which uses standardized auth.jwt()->>'sub' pattern
**Safe to Delete:** Yes, after verification in production

### fix_security_warnings.sql
**Date Archived:** 2025-01-10
**Original Purpose:** Addressed security warnings in RLS policies
**Reason for Archive:** Security improvements incorporated into later migrations
**Safe to Delete:** Yes, after verification in production

### hardened_schema_migration.sql
**Date Archived:** 2025-01-10
**Original Purpose:** One-off schema hardening (7.8KB)
**Reason for Archive:** Hardening measures incorporated into standard migrations
**Safe to Delete:** Yes, after verification in production

### optimized_rls_policies.sql
**Date Archived:** 2025-01-10
**Original Purpose:** RLS policy optimization attempt
**Reason for Archive:** Superseded by 20250904_consolidate_rls.sql and upcoming RLS helper function migration
**Safe to Delete:** Yes, after verification in production

### supabase_compatible_migration.sql
**Date Archived:** 2025-01-10
**Original Purpose:** Compatibility fixes for Supabase CLI
**Reason for Archive:** Compatibility issues resolved in later migrations
**Safe to Delete:** Yes, after verification in production

## Archive Policy

**Retention:** Keep archived migrations for 90 days after archival
**Deletion:** After 90 days and verification in production, these files can be safely deleted
**Documentation:** Before deletion, ensure all functionality is documented in MIGRATION_HISTORY.md

## Restoration

If an archived migration needs to be referenced:
1. Review the archived file
2. Extract needed SQL
3. Create new migration with proper naming: 20YYMMDD_descriptive_name.sql
4. Do NOT restore archived files to active migrations directory

---

**Archive Date:** 2025-01-10
**Next Review:** 2025-04-10 (90 days)

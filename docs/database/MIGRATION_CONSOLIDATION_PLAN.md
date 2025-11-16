# Migration Consolidation Plan

## Current State Analysis

**Total Migration Files:** 17
**Dated Migrations:** 11 files (20250814_*.sql format)
**Legacy Fix Files:** 6 files (fix_*.sql, *_migration.sql format)

### File Inventory

**Active Migrations (Keep):**
1. 20250814063552_remote_schema.sql - Supabase CLI initialization
2. 20250816_fix_property_schema.sql - Property schema structure
3. 20250818_add_property_codes.sql - Property code generation
4. 20250818_add_set_user_context_function.sql - User context helper
5. 20250823_enforce_rls.sql - RLS enablement
6. 20250831192235_fix_maintenance_rls_policy.sql - Maintenance RLS fixes
7. 20250902_fix_invite_link_flow.sql - Tenant invite flow
8. 20250903192432_create_public_property_invite_view.sql - Public view for invites
9. 20250904_consolidate_rls.sql - RLS policy consolidation (15KB, comprehensive)
10. 20250904_create_public_property_view.sql - Public property view
11. 20250904_fix_rls_standardize.sql - RLS standardization (10KB)

**Legacy Migrations (Archive):**
1. fix_clerk_integration.sql - Merged into later migrations
2. fix_clerk_rls.sql - Superseded by consolidate_rls.sql
3. fix_security_warnings.sql - Incorporated into later migrations
4. hardened_schema_migration.sql - One-off hardening (7.8KB)
5. optimized_rls_policies.sql - Superseded by consolidate_rls.sql
6. supabase_compatible_migration.sql - Compatibility fixes merged

## Consolidation Strategy: Additive Approach

### Rationale
We use the **Additive Approach** rather than squashing because:
1. Preserves audit trail of database evolution
2. Safer for existing staging/test environments
3. Maintains compatibility with applied migrations
4. Allows incremental improvements without breaking history

### Phase 1: Organization (Completed)
✅ Created `supabase/migrations/archive/` directory
✅ Created `supabase/migrations/rollback/` directory
✅ Identified files to archive

### Phase 2: Archive Legacy Files

**Files to Move:**
```bash
mv supabase/migrations/fix_clerk_integration.sql supabase/migrations/archive/
mv supabase/migrations/fix_clerk_rls.sql supabase/migrations/archive/
mv supabase/migrations/fix_security_warnings.sql supabase/migrations/archive/
mv supabase/migrations/hardened_schema_migration.sql supabase/migrations/archive/
mv supabase/migrations/optimized_rls_policies.sql supabase/migrations/archive/
mv supabase/migrations/supabase_compatible_migration.sql supabase/migrations/archive/
```

**Archive README:**
Create `supabase/migrations/archive/README.md` documenting why each file was archived.

### Phase 3: Add Missing Enhancements

**New Migration:** `20250110_add_critical_indexes.sql`

**Purpose:**
- Add performance indexes identified during analysis
- Optimize query patterns for pagination
- Improve RLS policy performance

**Content:**
- 15+ indexes on key columns
- Partial indexes for filtered queries
- Composite indexes for join optimization

**New Migration:** `20250110_rls_helper_function.sql`

**Purpose:**
- Create helper function to reduce RLS sub-select overhead
- Improve query performance at scale

### Phase 4: Documentation

**Create:** `supabase/migrations/MIGRATION_HISTORY.md`

**Content:**
- Complete history of all migrations
- Purpose and impact of each
- Dependencies between migrations
- Archive notes for legacy files

## Migration Naming Convention

**Format:** `YYYYMMDD_descriptive_name.sql`

**Guidelines:**
- Use date prefix for ordering: YYYYMMDD (e.g., 20250110)
- Use underscores for spaces
- Be descriptive but concise
- Prefix with type if helpful: `add_`, `fix_`, `create_`, `update_`

**Examples:**
- ✅ 20250110_add_critical_indexes.sql
- ✅ 20250110_create_rls_helper_function.sql
- ✅ 20250111_update_maintenance_schema.sql
- ❌ migration_1.sql
- ❌ fixes.sql
- ❌ 2025-01-10-indexes.sql (wrong date format)

## Migration Development Workflow

### Step 1: Create Migration
```bash
# Create dated migration file
touch supabase/migrations/$(date +%Y%m%d)_description.sql

# Edit file
code supabase/migrations/YYYYMMDD_description.sql
```

### Step 2: Create Rollback Script
```bash
# Create corresponding rollback
touch supabase/migrations/rollback/$(date +%Y%m%d)_rollback_description.sql

# Rollback should reverse all changes
# Example:
# Migration: CREATE INDEX idx_test ON table(column);
# Rollback:  DROP INDEX IF EXISTS idx_test;
```

### Step 3: Test in Staging
```bash
# Apply migration to staging
npx supabase db push --db-url $STAGING_URL

# Verify changes
psql $STAGING_URL -c "\d table_name"

# Test rollback
psql $STAGING_URL < rollback/YYYYMMDD_rollback_description.sql

# Verify rollback successful
psql $STAGING_URL -c "\d table_name"
```

### Step 4: Document
Add entry to `MIGRATION_HISTORY.md` with:
- Migration name
- Date created
- Purpose
- Impact (tables/columns affected)
- Dependencies (if any)

### Step 5: Apply to Production
```bash
# After staging verification
npx supabase db push --db-url $PRODUCTION_URL

# Monitor for errors
# Keep rollback script ready for 48 hours
```

## Index Strategy

### Principles
1. Index foreign keys used in JOINs
2. Index columns used in WHERE clauses
3. Index columns used in ORDER BY
4. Use partial indexes for common filters
5. Use composite indexes for multi-column queries

### Planned Indexes

**Profile Indexes:**
- clerk_user_id (identity lookup)

**Property Indexes:**
- landlord_id (ownership queries)
- created_at DESC (sorting)

**Tenant-Property Links:**
- (tenant_id, property_id, is_active) (composite)
- property_id WHERE is_active = true (partial)

**Maintenance Requests:**
- property_id (landlord queries)
- tenant_id (tenant queries)
- status (filtering)
- created_at DESC (sorting)
- property_id WHERE status = 'open' (partial)

**Messages:**
- (sender_id, created_at DESC)
- (recipient_id, created_at DESC)
- (sender_id, recipient_id, created_at DESC) (composite for threads)

### Index Monitoring
```sql
-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public'
AND indexname NOT LIKE 'pg_toast%';
```

## RLS Optimization Strategy

### Current Issue
RLS policies use sub-selects for every query:
```sql
WHERE landlord_id IN (
  SELECT id FROM profiles WHERE clerk_user_id = auth.jwt()->>'sub'
)
```

This executes the sub-select for every row checked.

### Solution: Helper Function
```sql
CREATE FUNCTION get_current_user_profile_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result UUID;
BEGIN
  SELECT id INTO result
  FROM public.profiles
  WHERE clerk_user_id = auth.jwt()->>'sub'
  LIMIT 1;

  RETURN result;
END;
$$;
```

### Refactored Policy Example
```sql
-- Before
CREATE POLICY properties_select_own ON properties
FOR SELECT USING (
  landlord_id IN (
    SELECT id FROM profiles WHERE clerk_user_id = auth.jwt()->>'sub'
  )
);

-- After
CREATE POLICY properties_select_own ON properties
FOR SELECT USING (
  landlord_id = get_current_user_profile_id()
);
```

### Performance Impact
- **Before:** Sub-select executed per row
- **After:** Function result cached per transaction
- **Expected Improvement:** 50-70% faster for queries scanning many rows

## Testing Strategy

### Pre-Migration Testing
1. Backup current database
2. Apply migration to isolated test instance
3. Run RLS test suite
4. Run integration tests
5. Verify no breaking changes

### Post-Migration Verification
1. Check all tables exist
2. Check all indexes created
3. Check RLS policies active
4. Run smoke tests
5. Monitor error logs for 1 hour

### Rollback Testing
1. Apply migration
2. Verify application works
3. Apply rollback
4. Verify application still works
5. Document rollback time

## Migration Checklist Template

```markdown
## Migration Checklist: YYYYMMDD_description

### Pre-Migration
- [ ] Migration file created
- [ ] Rollback file created
- [ ] Both tested in local dev
- [ ] Documented in MIGRATION_HISTORY.md
- [ ] Peer reviewed
- [ ] Staging backup created

### Staging Deployment
- [ ] Applied to staging
- [ ] RLS tests pass
- [ ] Integration tests pass
- [ ] No errors in logs
- [ ] Rollback tested

### Production Deployment
- [ ] Production backup created
- [ ] Rollback script ready
- [ ] Applied to production
- [ ] Verification queries run
- [ ] No errors in logs (1 hour)
- [ ] Performance metrics normal

### Post-Deployment
- [ ] Document actual deployment time
- [ ] Update monitoring dashboards
- [ ] Archive old backups
- [ ] Close deployment ticket
```

## Future Improvements

### Automation Opportunities
1. **Automated Testing:** Run RLS tests on every migration
2. **Automated Backups:** Before every production migration
3. **Automated Rollback:** If errors detected immediately after deploy
4. **Migration Linting:** Check for common issues before apply

### Schema Management
1. **Schema Versioning:** Track schema version in database
2. **Migration Dependencies:** Explicit dependency tracking
3. **Data Migrations:** Separate from schema migrations
4. **Seed Data:** Versioned seed data for testing

---

**Plan Status:** Ready for execution
**Next Step:** Archive legacy migrations
**Timeline:** Ready to begin immediately

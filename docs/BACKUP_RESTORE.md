\n<!-- Consolidated from RUNBOOK_BACKUP_RESTORE.md (root) on 2025-11-15 -->\n
Backup and Restore Runbook

Scope: Supabase Postgres, Storage Buckets

1) Backups
- Daily full backups via Supabase project settings (Server > Backups): enable and verify schedule
- Retain: 7 daily, 4 weekly, 3 monthly (adjust to business RPO)
- Storage: use `supabase storage list` to enumerate buckets; periodically export critical buckets (tar + versioned)

2) Validations
- Monthly restore rehearsal on staging project:
  - Create new staging database
  - Restore latest backup
  - Run migrations forward to current schema
  - Verify RLS policies, read/write smoke, e2e flow

3) Point-in-Time Recovery (PITR)
- In case of accidental writes, use Supabase PITR (if enabled) to restore to timestamp
- Run data diff and re-apply only intended changes

4) Storage Restore
- Maintain signed URL re-issuance
- Use bucket export/import tools to sync required objects; invalidate stale URLs

5) Post-Restore Steps
- Rotate keys/secrets
- Re-run RLS test suite
- Run e2e smoke

Contacts: DBA on-call, App Owner

# Backup & Restore Procedures

## Automated Backups
- Schedule: Daily at 2 AM UTC
- Retention: 30 days
- Location: Supabase managed
- Type: Full database snapshot + PITR (Point-in-Time Recovery)

## Manual Backup

### Create Immediate Backup
```bash
# Using Supabase CLI
npx supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Or using pg_dump directly
pg_dump $SUPABASE_DB_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Backup Verification
```bash
# Check backup file size
ls -lh backup_*.sql

# Verify SQL syntax
head -100 backup_*.sql
```

## Restore from Backup

### Restore to Staging (Test First)
```bash
# Reset staging database
npx supabase db reset --db-url $STAGING_DB_URL

# Restore from backup file
psql $STAGING_DB_URL < backup_20250110_143022.sql

# Verify data integrity
psql $STAGING_DB_URL -c "SELECT COUNT(*) FROM profiles;"
psql $STAGING_DB_URL -c "SELECT COUNT(*) FROM properties;"
```

### Restore to Production (After Staging Verification)
```bash
# CAUTION: This will overwrite production data
# Ensure you have a recent backup before proceeding

# Create safety backup first
pg_dump $PRODUCTION_DB_URL > safety_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql $PRODUCTION_DB_URL < backup_20250110_143022.sql

# Verify
psql $PRODUCTION_DB_URL -c "SELECT COUNT(*) FROM profiles;"
```

## Point-in-Time Recovery (PITR)

### Restore to Specific Timestamp
Available in Supabase Dashboard → Database → Backups

1. Navigate to backups section
2. Select "Point-in-Time Recovery"
3. Choose timestamp (within retention period)
4. Confirm recovery
5. Wait for completion (~5-15 minutes depending on size)

### PITR via CLI
```bash
# Restore to specific point in time
npx supabase db restore --timestamp "2025-01-10 14:30:00+00"
```

## Monthly Restore Test

**Schedule:** First Monday of each month

**Procedure:**
1. Create fresh backup
2. Restore to isolated test environment
3. Verify data integrity
4. Document restore time (RTO measurement)
5. Document any issues encountered

**Success Criteria:**
- Restore completes in <4 hours (RTO target)
- All data integrity checks pass
- Application functions normally with restored data

## Disaster Recovery Scenarios

### Scenario 1: Accidental Data Deletion
**Detection:** User reports missing data

**Response:**
1. Identify deletion timestamp
2. Use PITR to restore to moment before deletion
3. Export affected records
4. Merge into current database

### Scenario 2: Database Corruption
**Detection:** Errors during queries, data inconsistencies

**Response:**
1. Take immediate backup of corrupted state (for analysis)
2. Restore from most recent clean backup
3. Verify data integrity
4. Investigate corruption cause

### Scenario 3: Complete Data Center Failure
**Detection:** Total Supabase unavailability

**Response:**
1. Activate disaster recovery plan
2. Provision new Supabase instance in different region
3. Restore from most recent backup
4. Update DNS/environment variables
5. Verify application functionality

### Scenario 4: RLS Policy Violation
**Detection:** Users seeing other users' data

**Response:**
1. Immediately disable affected functionality
2. Identify policy bug
3. Roll back to last known good migration
4. Fix policy, test in staging
5. Redeploy with fixed policy

## Recovery Time Objective (RTO)

**Target:** 4 hours from incident detection to full service restoration

**Breakdown:**
- Detection and assessment: 30 minutes
- Backup retrieval: 15 minutes
- Database restoration: 2 hours
- Verification and testing: 1 hour
- DNS/config updates: 15 minutes

## Recovery Point Objective (RPO)

**Target:** Maximum 24 hours of data loss acceptable

**Current:** ~1 hour (PITR granularity)

**Actual:** Daily backups + PITR means typically <1 hour of data loss

## Backup Storage

### Locations
1. **Primary:** Supabase managed storage (encrypted at rest)
2. **Secondary:** Manual backups in AWS S3 (optional, for compliance)
3. **Tertiary:** Local encrypted backups (for critical data)

### Retention Policy
- Daily backups: 30 days
- Weekly backups: 90 days
- Monthly backups: 1 year
- Yearly backups: 7 years (compliance requirement)

## Backup Monitoring

### Automated Checks
- Backup completion status (daily)
- Backup file size validation (should be within expected range)
- Backup integrity verification (monthly restore test)

### Alerts
```bash
# Example monitoring script
#!/bin/bash
# scripts/monitoring/check-backup-status.sh

LATEST_BACKUP=$(ls -t backup_*.sql 2>/dev/null | head -1)
BACKUP_AGE_HOURS=$(find "$LATEST_BACKUP" -mmin +1440 -print 2>/dev/null)

if [ -n "$BACKUP_AGE_HOURS" ]; then
  echo "ALERT: Latest backup is >24 hours old"
  # Send alert to monitoring system
fi
```

## Data Integrity Verification

### Post-Restore Checks
```sql
-- Verify row counts match expected ranges
SELECT
  'profiles' as table_name,
  COUNT(*) as row_count
FROM profiles
UNION ALL
SELECT 'properties', COUNT(*) FROM properties
UNION ALL
SELECT 'maintenance_requests', COUNT(*) FROM maintenance_requests;

-- Verify referential integrity
SELECT COUNT(*) FROM properties
WHERE landlord_id NOT IN (SELECT id FROM profiles);
-- Should return 0

-- Verify RLS policies active
SELECT COUNT(*) FROM pg_policies
WHERE schemaname = 'public';
-- Should return ~30+

-- Verify indexes exist
SELECT COUNT(*) FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';
-- Should return 15+
```

## Emergency Contacts

**Database Issues:**
- Primary DBA: [Name] - [Email] - [Phone]
- Supabase Support: support@supabase.io

**Disaster Recovery Team:**
- Incident Commander: [Name]
- Technical Lead: [Name]
- Communications: [Name]

## Compliance Notes

**GDPR Requirements:**
- User data deletion requests: Remove from all backups >30 days old
- Data export requests: Can extract from most recent backup

**SOC 2 Requirements:**
- Encrypted backups at rest and in transit
- Access logging for all backup operations
- Regular restore testing documentation

## Backup Security

### Encryption
- At rest: AES-256 (Supabase managed)
- In transit: TLS 1.3
- Manual backups: GPG encryption recommended

```bash
# Encrypt manual backup
gpg --symmetric --cipher-algo AES256 backup_20250110.sql
# Creates: backup_20250110.sql.gpg

# Decrypt when needed
gpg --decrypt backup_20250110.sql.gpg > backup_20250110.sql
```

### Access Control
- Backup access: Service account only
- Restore permissions: Admin role required
- Audit logging: All backup/restore operations logged

---

**Last Updated:** 2025-01-10
**Next Review:** 2025-02-10
**Tested:** Never (schedule first test)

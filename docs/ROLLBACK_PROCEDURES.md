# Rollback Procedures

## Overview
This document defines rollback procedures for all deployment types in the MyAILandlord application.

## Database Migration Rollback

### Preparation (Before Every Migration)

**1. Create Rollback Script**
```bash
# Navigate to rollback directory
cd supabase/migrations/rollback

# Copy and modify migration
cp ../20250110_add_indexes.sql 20250110_rollback_add_indexes.sql

# Edit to reverse changes (example)
# Original: CREATE INDEX idx_profiles_clerk_user_id ON profiles(clerk_user_id);
# Rollback: DROP INDEX IF EXISTS idx_profiles_clerk_user_id;
```

**2. Test Rollback in Staging**
```bash
# Apply original migration to staging
npx supabase db push --db-url $STAGING_DB_URL

# Test application functionality

# If issues found, test rollback
psql $STAGING_DB_URL < rollback/20250110_rollback_add_indexes.sql

# Verify application still works after rollback
```

### Execution (If Rollback Needed)

**Step 1: Assess Situation**
- Determine severity (critical, high, medium)
- Identify affected users/functionality
- Document what went wrong

**Step 2: Execute Rollback**
```bash
# Create safety backup first
pg_dump $PRODUCTION_DB_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# Apply rollback migration
psql $PRODUCTION_DB_URL < rollback/20250110_rollback_add_indexes.sql

# Verify success
psql $PRODUCTION_DB_URL -c "\d profiles"  # Check indexes removed
```

**Step 3: Verify Application**
- Test critical user flows
- Check error logs
- Monitor metrics for 30 minutes

**Step 4: Document Incident**
- Create post-mortem document
- Identify root cause
- Plan fix for next deployment

### Rollback Decision Criteria

**Immediate Rollback Required:**
- Data loss detected (any amount)
- Data corruption detected
- Authentication system complete failure
- Database connection failures
- Error rate >5% for >5 minutes
- Security vulnerability exposed

**Consider Rollback:**
- Error rate 2-5% sustained for >15 minutes
- Performance degradation >50% sustained for >10 minutes
- User-reported critical bugs >10 in 1 hour
- Key functionality not working (property creation, maintenance requests)

**Monitor But Don't Rollback:**
- Error rate <2%
- Performance degradation <25%
- Minor UI issues
- Non-critical feature failures

## Application Rollback

### Expo/EAS Rollback

**Check Previous Builds:**
```bash
# List recent builds
npx eas build:list --platform all --limit 10

# Example output:
# ID: abc123 - Version: 1.2.3 - Status: finished
# ID: def456 - Version: 1.2.2 - Status: finished  <- Rollback target
```

**Rollback to Previous Build:**
```bash
# Create new update pointing to previous build
npx eas update --branch production --message "Rollback to v1.2.2 - Build def456"

# Verify rollback
npx eas update:view --branch production
```

**Force Immediate Rollback:**
```bash
# For critical issues, force all users to update immediately
npx eas update --branch production --message "Emergency rollback" --auto
```

### Edge Function Rollback

**Method 1: Deploy Previous Version**
```bash
# Checkout previous version from git
git checkout <previous-commit-hash> -- supabase/functions/<function-name>

# Deploy old version
npx supabase functions deploy <function-name>

# Verify
curl -X POST https://<project-ref>.functions.supabase.co/<function-name> \
  -H "Authorization: Bearer $ANON_KEY"
```

**Method 2: Route Traffic (Supabase Dashboard)**
1. Navigate to Edge Functions in Supabase Dashboard
2. Select function
3. View "Versions" tab
4. Click "Set as Active" on previous version
5. Verify traffic routing

### Web Application Rollback

**Vercel/Netlify:**
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>

# Or use dashboard to promote previous deployment
```

## Code Rollback

### Git Revert Strategy

**For Specific Commit:**
```bash
# Revert specific commit (creates new commit undoing changes)
git revert <commit-hash>
git push origin main

# For merge commit
git revert -m 1 <merge-commit-hash>
git push origin main
```

**For Multiple Commits:**
```bash
# Revert range of commits
git revert --no-commit HEAD~3..HEAD
git commit -m "Rollback: revert last 3 commits due to [issue]"
git push origin main
```

**Hard Reset (Use with Caution):**
```bash
# Only for branches not yet deployed to production
git reset --hard <previous-commit-hash>
git push --force origin feature/branch-name

# NEVER use --force on main/production branches
```

## Feature Flag Rollback

### Disable Feature Instantly

**In Code:**
```typescript
// src/utils/featureFlags.ts
export const FEATURE_FLAGS = {
  NEW_MAINTENANCE_FLOW: false,  // Set to false to disable
  ADVANCED_SEARCH: false,
  PAYMENT_INTEGRATION: false,
};
```

**Environment Variable:**
```bash
# .env.production
FEATURE_NEW_MAINTENANCE_FLOW=false

# Redeploy with new env var
npx eas update --branch production
```

### Gradual Rollback
```typescript
// Reduce rollout percentage
export function isFeatureEnabled(featureName: string, userId: string): boolean {
  const rolloutPercentage = {
    NEW_MAINTENANCE_FLOW: 0,  // 0% = fully disabled
    // Was: 50 (50% rollout)
  };

  const hash = hashUserId(userId);
  return hash % 100 < rolloutPercentage[featureName];
}
```

## Configuration Rollback

### Environment Variables

**Rollback Process:**
```bash
# 1. Identify previous working configuration
git log .env.example  # Find previous version

# 2. Update environment variables
# In Expo: Update in app.json or eas.json
# In Supabase: Dashboard → Settings → API

# 3. Redeploy
npx eas update --branch production
```

### API Keys Rotation Rollback

**If New Key Causes Issues:**
```bash
# Temporarily revert to old key
export EXPO_PUBLIC_SUPABASE_ANON_KEY=<old-key>

# Update in deployment platform
# Supabase: Dashboard → Settings → API → Revert changes

# Redeploy with old key
npx eas update --branch production

# Note: If old key was compromised, this is not safe
# Must fix issue and rotate to new key ASAP
```

## Monitoring During Rollback

### Key Metrics to Watch

**Error Rate:**
```bash
# Monitor in Sentry
# Should decrease after successful rollback
```

**Response Time:**
```bash
# Monitor API response times
# Should return to baseline after rollback
```

**User Activity:**
```bash
# Check active users
# Should remain stable or increase after rollback
```

### Health Checks Post-Rollback

```bash
# API health
curl https://api.myailandlord.app/health

# Database connectivity
psql $PRODUCTION_DB_URL -c "SELECT 1;"

# Edge functions
curl https://<project-ref>.functions.supabase.co/<function>/health

# Clerk authentication
curl https://api.clerk.com/v1/health
```

## Communication Plan

### Internal Communication

**Immediate Notification (Slack/Email):**
```
🚨 ROLLBACK IN PROGRESS

Issue: [Brief description]
Affected: [Users/functionality]
Action: Rolling back [component] to [version]
ETA: [Expected completion time]
Status: [In progress/Complete]

Updates will be posted every 15 minutes.
```

**Completion Notification:**
```
✅ ROLLBACK COMPLETE

Issue: [Brief description]
Rollback: [Component] to [version]
Status: System stable
Monitoring: Ongoing for next 2 hours

Post-mortem scheduled for [date/time].
```

### User Communication

**For Major Outages:**
```
We're currently experiencing technical difficulties and are working to restore service.
We apologize for the inconvenience and expect to have everything back to normal within [timeframe].

Updates: status.myailandlord.app
```

**For Feature Rollbacks:**
```
We've temporarily disabled [feature] while we address some issues.
Your data is safe and all other features continue to work normally.
We'll notify you when [feature] is available again.
```

## 48-Hour Rollback Window Policy

### Policy
- Keep previous version active for 48 hours after any production deployment
- All rollback procedures must complete within 2 hours of decision to rollback
- Test rollback in staging before every production deployment

### Implementation

**For Database Migrations:**
- Maintain rollback scripts alongside migrations
- Test both migration and rollback in staging

**For Application Deployments:**
- Keep previous build available in EAS
- Keep previous Edge Function version active (but not routing traffic)

**For Configuration Changes:**
- Document previous configuration in git commit message
- Keep backup of previous .env values

## Rollback Testing

### Pre-Deployment Rollback Test

**Checklist:**
- [ ] Rollback script created
- [ ] Rollback tested in staging
- [ ] Rollback documented
- [ ] Rollback time measured (should be <30 minutes)
- [ ] Health checks pass after rollback

### Quarterly Disaster Recovery Drill

**Procedure:**
1. Schedule drill (non-business hours preferred)
2. Simulate critical failure scenario
3. Execute rollback procedures
4. Measure time to recovery
5. Document lessons learned
6. Update procedures based on findings

## Rollback Checklist Template

```markdown
## Rollback Execution Checklist

Date: _______________
Issue: _______________
Component: _______________

### Pre-Rollback
- [ ] Severity assessed
- [ ] Decision to rollback approved by: _______________
- [ ] Safety backup created
- [ ] Rollback script identified
- [ ] Team notified

### During Rollback
- [ ] Rollback script executed
- [ ] Errors encountered: _______________
- [ ] Time to complete: _______________

### Post-Rollback
- [ ] Health checks passed
- [ ] Metrics returned to normal
- [ ] Users notified (if applicable)
- [ ] Post-mortem scheduled
- [ ] Incident documented

### Follow-Up
- [ ] Root cause identified
- [ ] Fix planned
- [ ] Fix tested in staging
- [ ] Safe to redeploy: Yes / No
```

## Emergency Contacts

**On-Call Rotation:**
- Primary: [Name] - [Phone] - [Email]
- Backup: [Name] - [Phone] - [Email]

**Escalation:**
- Technical Lead: [Name]
- Engineering Manager: [Name]
- CTO: [Name]

**External Support:**
- Supabase Support: support@supabase.io
- Clerk Support: support@clerk.com
- Expo Support: support@expo.dev

---

**Last Updated:** 2025-01-10
**Next Drill:** TBD (schedule quarterly)
**Last Tested:** Never (schedule first drill)

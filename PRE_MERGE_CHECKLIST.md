# Pre-Merge Deployment Checklist

**Branch:** `migration/clerk-to-supabase-auth`
**Target:** `main` (or your production branch)
**Date:** November 15, 2025

---

## Overview

Use this checklist before merging the TypeScript fixes and Clerk → Supabase Auth migration to production. Complete ALL items before proceeding.

---

## 1. Code Quality & Testing

### TypeScript
- [ ] Run `npx tsc --noEmit` - confirms 0 TypeScript errors
- [ ] All files compile successfully
- [ ] No `any` types introduced (except where explicitly needed)
- [ ] Type definitions are accurate and complete

### Unit Tests
- [ ] Run `npm test` - all tests pass
- [ ] No skipped tests without justification
- [ ] Code coverage meets minimum threshold
- [ ] New code has corresponding tests

### E2E Tests
- [ ] Run `npx playwright test` - critical tests pass
- [ ] PropertyManagement screen loads and functions
- [ ] InviteTenant navigation works
- [ ] Responsive layouts work on mobile/tablet/desktop
- [ ] No console errors during test execution

### Manual Testing
- [ ] Test signup flow (create new account)
- [ ] Test login flow (existing account)
- [ ] Test logout
- [ ] Test session persistence (refresh page while logged in)
- [ ] Test property creation flow end-to-end
- [ ] Test tenant invite flow
- [ ] Test maintenance request creation (if applicable)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile device (iOS or Android)

---

## 2. Security Audit

### Secrets & Credentials
- [ ] Run `gitleaks detect --source . --verbose` - 0 leaks found
- [ ] No API keys, passwords, or tokens in code
- [ ] `.env` files are in `.gitignore`
- [ ] No hardcoded URLs with credentials

### Dependencies
- [ ] Run `npm audit` - 0 CRITICAL, 0 HIGH vulnerabilities
- [ ] All dependencies up to date (or documented why not)
- [ ] No deprecated packages with known security issues
- [ ] Playwright upgraded to v1.56.1+ (fixes CVE)

### Authentication & Authorization
- [ ] Supabase RLS policies active and tested
- [ ] Users can only access their own data
- [ ] No data leakage between users
- [ ] Session tokens expire correctly
- [ ] Password reset flow works (if using email/password)

### Input Validation
- [ ] All user inputs validated (email, passwords, text fields)
- [ ] SQL injection protection via query builder (no raw SQL)
- [ ] XSS prevention (no `dangerouslySetInnerHTML`)
- [ ] File upload security (if applicable)

---

## 3. Database Migrations

### Pre-Migration Backup
- [ ] **CRITICAL:** Database backup created
  ```bash
  npx supabase db dump --db-url "$DATABASE_URL" > backup-pre-merge-$(date +%Y%m%d-%H%M%S).sql
  ```
- [ ] Backup verified (can restore if needed)
- [ ] Backup stored securely (off-server)

### Migration Testing
- [ ] Migrations run successfully in development
- [ ] Migrations run successfully in staging (if available)
- [ ] RLS policies work after migration
- [ ] No orphaned data
- [ ] No data loss

### Rollback Plan
- [ ] Reviewed `ROLLBACK_PLAN.md`
- [ ] Rollback procedure tested (see test branch validation)
- [ ] Team knows how to execute rollback
- [ ] Database rollback scripts ready

---

## 4. Performance & Monitoring

### Performance
- [ ] App loads in under 3 seconds on 4G
- [ ] No memory leaks detected
- [ ] No infinite loops or excessive re-renders
- [ ] Database queries optimized (no N+1 queries)
- [ ] Images optimized

### Monitoring
- [ ] Error tracking configured (Sentry or similar)
- [ ] Logging configured
- [ ] Database monitoring enabled (Supabase dashboard)
- [ ] Alerts configured for critical failures

---

## 5. Documentation

### Code Documentation
- [ ] Complex functions have comments
- [ ] Type definitions are documented
- [ ] README updated with new setup instructions
- [ ] CHANGELOG updated with migration notes

### Migration Documentation
- [ ] `CODEX_HANDOFF.md` reviewed
- [ ] `ROLLBACK_PLAN.md` created and reviewed
- [ ] Team aware of breaking changes (if any)
- [ ] User-facing changes documented

---

## 6. Git & Version Control

### Branch Status
- [ ] All changes committed
- [ ] No uncommitted files (run `git status`)
- [ ] Commit messages are clear and descriptive
- [ ] Branch is up to date with base branch

### Code Review
- [ ] Self-review completed
- [ ] Peer review completed (if applicable)
- [ ] All comments addressed
- [ ] No "TODO" or "FIXME" comments in critical paths

### Backup Safety Net
- [ ] Backup branch created:
  ```bash
  git branch backup/pre-merge-$(date +%Y%m%d-%H%M%S)
  ```
- [ ] Can recover to this point if needed

---

## 7. Deployment Strategy

### Pre-Deployment
- [ ] Maintenance window scheduled (if needed)
- [ ] Users notified of maintenance (if needed)
- [ ] Team available for support
- [ ] Rollback plan reviewed with team

### Deployment Steps
1. [ ] Merge to main/production branch
2. [ ] Verify CI/CD pipeline passes
3. [ ] Deploy to staging first (if available)
4. [ ] Test critical paths in staging
5. [ ] Deploy to production
6. [ ] Monitor logs for errors (first 30 minutes)
7. [ ] Test critical paths in production

### Post-Deployment Monitoring
- [ ] Check error rates (should be stable or decreasing)
- [ ] Check database performance
- [ ] Check user authentication success rate
- [ ] Verify no spike in failed requests
- [ ] Monitor for 1-2 hours post-deploy

---

## 8. Communication

### Pre-Deployment
- [ ] Team notified of deployment window
- [ ] Stakeholders informed of changes
- [ ] Support team briefed on new features/changes

### Post-Deployment
- [ ] Team notified of successful deployment
- [ ] Users notified if there are user-facing changes
- [ ] Documentation updated (if public-facing)

---

## 9. Rollback Readiness

### Verification
- [ ] `ROLLBACK_PLAN.md` exists and is complete
- [ ] Rollback tested successfully (test branch validation ✅)
- [ ] Database backup available
- [ ] Team trained on rollback procedure

### Quick Rollback Command Reference
```bash
# If critical issue occurs:
git branch backup/emergency-$(date +%Y%m%d-%H%M%S)
git reset --hard ff87c93  # rollback to pre-migration
npm install
# Restore database from backup
psql "$DATABASE_URL" < backup-pre-merge-YYYYMMDD-HHMMSS.sql
```

---

## 10. Final Checks

### Pre-Merge Final Validation
- [ ] All checklist items above completed
- [ ] No outstanding critical bugs
- [ ] Tests pass locally one final time
- [ ] Confident in the changes
- [ ] Ready to merge

### The Merge
- [ ] Create pull request (if using PR workflow)
- [ ] Final approval from reviewer
- [ ] Merge to main/production
- [ ] Tag release (optional):
  ```bash
  git tag -a v1.0.0-typescript-fixes -m "TypeScript fixes and Supabase Auth migration"
  git push --tags
  ```

---

## 11. Post-Merge Validation

### Immediate (0-30 minutes)
- [ ] Deployment successful
- [ ] No errors in logs
- [ ] App loads correctly
- [ ] Authentication works
- [ ] Database queries executing

### Short-term (1-24 hours)
- [ ] Error rates stable
- [ ] Performance metrics stable
- [ ] No user complaints
- [ ] Database performance normal

### Long-term (1-7 days)
- [ ] Monitor trends
- [ ] Collect user feedback
- [ ] Address any issues
- [ ] Document lessons learned

---

## Emergency Contacts

**If something goes wrong:**
1. Check logs immediately
2. Consult `ROLLBACK_PLAN.md`
3. Execute rollback if critical
4. Document the issue
5. Notify team

---

## Sign-off

**Completed by:** _________________
**Date:** _________________
**Time:** _________________

**Reviewed by:** _________________
**Date:** _________________

---

## Notes

- This is a living document - update as needed
- All items must be checked before merge
- If unsure about any item, DO NOT MERGE
- When in doubt, ask for help

**Remember:** It's better to delay a deployment than to rush and cause issues.

---

**Last Updated:** November 15, 2025

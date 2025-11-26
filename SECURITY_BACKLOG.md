# Security Backlog - Fix Before Scaling

**Status:** MVP Approved with Known Issues
**Created:** 2025-11-25
**Current Users:** 5
**Security Audit:** CONDITIONAL PASS

---

## 🚨 Fix Before Scaling (10+ Users)

### 1. Password Complexity Validation
- **Priority:** HIGH
- **Effort:** 15 minutes
- **Location:** `src/screens/SignUpScreen.tsx`
- **Fix:**
  ```typescript
  // Add before signup:
  if (password.length < APP_CONSTANTS.MIN_PASSWORD_LENGTH) {
    Alert.alert('Error', 'Password must be at least 12 characters');
    return;
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    Alert.alert('Error', 'Password must contain uppercase, lowercase, and number');
    return;
  }
  ```

### 2. Documents Bucket RLS Policy
- **Priority:** HIGH
- **Effort:** 10 minutes
- **Location:** Supabase Dashboard → Storage → documents bucket
- **Fix:** Update SELECT policy to restrict to document owner:
  ```sql
  create policy storage_documents_select on storage.objects
    for select using (
      bucket_id = 'documents'
      and (storage.foldername(name))[1] in (
        select id::text from public.profiles
        where clerk_user_id = auth.jwt() ->> 'sub'
      )
    );
  ```

### 3. Run RLS Test Suite
- **Priority:** HIGH
- **Effort:** 5 minutes
- **Command:** `npm run test:rls`
- **Verify:** All tenant isolation tests pass

### 4. Remove Unused Redis Config
- **Priority:** MEDIUM
- **Effort:** 5 minutes
- **Location:** `src/lib/rateLimiter.ts` (lines 12-13)
- **Fix:** Either remove entirely OR move to Edge Function if implementing rate limiting

### 5. Update npm Dependencies
- **Priority:** MEDIUM
- **Effort:** 10 minutes
- **Command:** `npm audit fix`
- **Packages:** glob, js-yaml

---

## 📋 Recommended Improvements (Post-MVP)

### 6. Improve XSS Sanitization
- **Priority:** MEDIUM
- **Effort:** 20 minutes
- **Install:** `npm install isomorphic-dompurify`
- **Location:** `src/utils/helpers.ts`

### 7. OAuth Redirect URL Configuration
- **Priority:** LOW
- **Effort:** 5 minutes
- **Location:** Supabase Dashboard → Authentication → URL Configuration

### 8. Replace console.log with Logger
- **Priority:** LOW
- **Effort:** 1 hour
- **Files:** ~50 console statements in src/
- **Use:** `src/lib/log.ts` instead

### 9. Integrate Rate Limiting
- **Priority:** LOW
- **Effort:** 30 minutes
- **Endpoints:** Auth, file upload, API requests

---

## ✅ Security Strengths (Already Implemented)

- ✅ No exposed secrets in git history
- ✅ Supabase Auth properly configured
- ✅ RLS policies for tenant isolation
- ✅ SQL injection prevention (parameterized queries)
- ✅ File upload validation (type, size)
- ✅ Error logging with sensitive data redaction
- ✅ TypeScript strict mode
- ✅ Input validation and sanitization

---

## 🎯 Trigger Points for Security Review

Fix backlog items when you hit ANY of these milestones:

1. **More than 10 users**
2. **First user you don't personally know**
3. **Before public launch or marketing**
4. **Before raising funding**
5. **Before App Store submission**
6. **If you handle payment information**

---

## 📊 Current Security Posture

| Category | Status | Notes |
|----------|--------|-------|
| Authentication | ✅ STRONG | Supabase Auth, session management |
| Authorization | ⚠️ GOOD | RLS enabled, needs testing |
| Data Encryption | ✅ STRONG | HTTPS, Supabase encryption |
| Input Validation | ✅ GOOD | Validation layer in place |
| Secrets Management | ✅ STRONG | No exposed credentials |
| Dependencies | ⚠️ ACCEPTABLE | 2 low-risk vulnerabilities |
| Error Handling | ✅ STRONG | No sensitive data leaks |

**Overall:** APPROVED FOR MVP (5 users)

---

## 📝 Monitoring Checklist

Weekly checks for MVP phase:

- [ ] Check Supabase auth logs for suspicious activity
- [ ] Review Sentry error reports
- [ ] Verify no new npm vulnerabilities (`npm audit`)
- [ ] Check user feedback for auth/security issues
- [ ] Ensure .env file remains gitignored

---

**Last Updated:** 2025-11-25
**Next Review:** When user count > 10 or before public launch

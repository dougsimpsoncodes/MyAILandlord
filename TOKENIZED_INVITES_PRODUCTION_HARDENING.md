# Tokenized Invites - Production Hardening Plan

**Date:** 2025-12-23
**Status:** 🟡 Implementation Complete, Hardening Required
**Priority:** Address Critical items before production release

---

## Executive Summary

The tokenized invite flow is functionally complete with dual-flow support (tokenized + legacy), server-side validation, authenticated acceptance, and RLS enforcement. However, **12 critical edge cases and hardening items** must be addressed before production deployment.

**Current State:**
- ✅ Core flow implemented (landlord generation → tenant acceptance)
- ✅ Backend security hardened (Edge Functions, RLS, token validation)
- ✅ Backward compatibility maintained (legacy propertyId invites)
- 🔴 Edge cases not handled (wrong account, offline, mid-session revocation)
- 🔴 Resilience gaps (no retry/backoff, double-submit possible)
- 🔴 Missing instrumentation (no analytics, correlation IDs)

**Recommendation:** Address Critical and High priority items (1-2 weeks) before real-user trials.

---

## Critical Edge Cases (MUST FIX)

### 🔴 1. Wrong Account Signed In

**Problem:** User clicks invite intended for `tenant@example.com`, but is signed in as `other@example.com`. Current flow accepts invite under wrong account.

**Impact:** Data leakage, tenant linked to wrong property, confused users.

**Solution:**
1. Extract intended email from token metadata (add to `invite_tokens` table)
2. In `PropertyInviteAcceptScreen.validateTokenAndFetchProperty()`:
   ```typescript
   const result = await validateTokenEdgeFunction(token);
   const currentUserEmail = user?.email;
   const intendedEmail = result.intended_email;

   if (intendedEmail && currentUserEmail !== intendedEmail) {
     setError({
       type: 'wrong_account',
       message: `This invite was sent to ${intendedEmail}.`,
       actions: [
         { label: 'Switch Account', onPress: () => signOut() },
         { label: 'Continue Anyway', onPress: () => acceptWithWarning() }
       ]
     });
     return;
   }
   ```

3. Add `intended_email` column to `invite_tokens` table:
   ```sql
   ALTER TABLE invite_tokens ADD COLUMN intended_email TEXT;
   ```

4. Update `generate_invite_token` RPC to accept optional email:
   ```sql
   CREATE OR REPLACE FUNCTION generate_invite_token(
     p_property_id UUID,
     p_max_uses INT DEFAULT 1,
     p_expires_in_days INT DEFAULT 7,
     p_intended_email TEXT DEFAULT NULL
   )
   ```

**Files to Modify:**
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx`
- `src/screens/onboarding/LandlordTenantInviteScreen.tsx` (capture tenant email)
- `supabase/migrations/YYYYMMDD_add_intended_email.sql`

**Priority:** 🔥 **CRITICAL** - Security and UX issue

---

### 🔴 2. Already Linked to Another Property

**Problem:** Tenant clicks invite for Property B, but is already linked to Property A. Current flow may create duplicate link or fail silently.

**Impact:** Confusion, data integrity issues, unexpected behavior.

**Solution:**
1. Check existing links in `PropertyInviteAcceptScreen`:
   ```typescript
   const existingLinks = await apiClient.getTenantProperties();

   if (existingLinks.length > 0) {
     const existingProperty = existingLinks[0];
     Alert.alert(
       'Already Connected',
       `You're already connected to ${existingProperty.name}. Do you want to switch to ${property.name} instead?`,
       [
         { text: 'Cancel', style: 'cancel' },
         {
           text: 'Switch Properties',
           onPress: async () => {
             await apiClient.unlinkTenantFromProperty(existingProperty.id);
             await acceptTokenizedInvite();
           }
         }
       ]
     );
     return;
   }
   ```

2. Update backend to support unlinking (if not already exists):
   ```typescript
   async unlinkTenantFromProperty(propertyId: string) {
     const { error } = await this.supabase
       .from('tenant_property_links')
       .delete()
       .eq('property_id', propertyId)
       .eq('tenant_id', this.userId);

     if (error) throw error;
   }
   ```

**Files to Modify:**
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx`
- `src/services/api/client.ts`

**Priority:** 🟡 **HIGH** - Data integrity

---

### 🔴 3. Multi-Use Token Capacity Reached

**Problem:** Token with `max_uses=5` has been used 5 times. 6th tenant clicks link, sees generic "invalid token" error.

**Impact:** Poor UX, confused users, support burden.

**Solution:**
1. Add specific error code in `validate-invite-token` Edge Function:
   ```typescript
   if (tokenData.use_count >= tokenData.max_uses) {
     return new Response(JSON.stringify({
       valid: false,
       error: 'capacity_reached',
       message: 'This invite has reached its maximum number of uses.',
       max_uses: tokenData.max_uses,
       use_count: tokenData.use_count
     }), { status: 200 });
   }
   ```

2. Handle in `PropertyInviteAcceptScreen`:
   ```typescript
   if (result.error === 'capacity_reached') {
     setError({
       type: 'capacity_reached',
       message: `This invite link has been used ${result.use_count} times (maximum: ${result.max_uses}).`,
       actions: [
         { label: 'Request New Invite', onPress: () => navigation.navigate('ContactSupport') }
       ]
     });
   }
   ```

**Files to Modify:**
- `supabase/functions/validate-invite-token/index.ts`
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx`

**Priority:** 🟡 **HIGH** - UX quality

---

### 🔴 4. Token Revoked/Expired Mid-Session

**Problem:** Token is valid during `validate` call, but landlord revokes it before tenant clicks "Accept". Accept call fails with confusing error.

**Impact:** Poor UX, potential race conditions.

**Solution:**
1. Add re-validation before acceptance:
   ```typescript
   const acceptTokenizedInvite = async () => {
     // Re-validate token immediately before acceptance
     const revalidation = await validateTokenEdgeFunction(token);
     if (!revalidation.valid) {
       setError({
         type: 'token_changed',
         message: 'This invite is no longer valid. Please request a new invite link.',
         reason: revalidation.error
       });
       return;
     }

     // Proceed with acceptance
     await callAcceptEdgeFunction(token);
   };
   ```

2. Make `accept-invite-token` Edge Function return specific error codes:
   ```typescript
   if (tokenData.revoked_at) {
     return new Response(JSON.stringify({
       success: false,
       error: 'revoked',
       message: 'This invite has been revoked by the landlord.',
       revoked_at: tokenData.revoked_at
     }), { status: 200 });
   }
   ```

**Files to Modify:**
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx`
- `supabase/functions/accept-invite-token/index.ts`

**Priority:** 🟡 **HIGH** - Race condition handling

---

### 🔴 5. Offline State Handling

**Problem:** User opens invite link while offline. App shows blank screen or generic network error.

**Impact:** Poor mobile UX, lost conversions.

**Solution:**
1. Cache token validation response:
   ```typescript
   const [cachedPropertyData, setCachedPropertyData] = useState(null);

   useEffect(() => {
     const loadCachedData = async () => {
       const cached = await AsyncStorage.getItem(`@invite_cache:${token}`);
       if (cached) {
         setCachedPropertyData(JSON.parse(cached));
         setOfflineMode(true);
       }
     };
     loadCachedData();
   }, [token]);

   const validateTokenAndFetchProperty = async () => {
     try {
       const result = await validateTokenEdgeFunction(token);
       // Cache successful validation
       await AsyncStorage.setItem(`@invite_cache:${token}`, JSON.stringify(result.property));
     } catch (error) {
       if (cachedPropertyData) {
         setProperty(cachedPropertyData);
         setOfflineMode(true);
       } else {
         throw error;
       }
     }
   };
   ```

2. Add offline banner and retry:
   ```typescript
   {offlineMode && (
     <View style={styles.offlineBanner}>
       <Text>Viewing cached data. Connect to accept invite.</Text>
       <Button title="Retry" onPress={validateTokenAndFetchProperty} />
     </View>
   )}
   ```

**Files to Modify:**
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx`
- `src/services/storage/InviteCacheService.ts` (new file)

**Priority:** 🟡 **HIGH** - Mobile UX

---

## Resilience & UX Improvements

### 🔴 6. Loading States & Double-Submit Guard

**Problem:** No visual feedback during validation/acceptance. User can tap "Accept" multiple times.

**Impact:** Poor UX, potential duplicate requests.

**Solution:**
1. Add loading state with ref guard:
   ```typescript
   const [isValidating, setIsValidating] = useState(false);
   const [isAccepting, setIsAccepting] = useState(false);
   const acceptingRef = useRef(false);

   const handleAccept = async () => {
     if (acceptingRef.current) return; // Guard against double-submit
     acceptingRef.current = true;
     setIsAccepting(true);

     try {
       await acceptTokenizedInvite();
     } finally {
       acceptingRef.current = false;
       setIsAccepting(false);
     }
   };
   ```

2. Update UI:
   ```typescript
   <Button
     title={isAccepting ? 'Accepting...' : 'Accept Invite'}
     onPress={handleAccept}
     disabled={isAccepting || isValidating}
     loading={isAccepting}
   />
   ```

**Files to Modify:**
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx`

**Priority:** 🟡 **HIGH** - UX quality

---

### 🔴 7. Retry with Exponential Backoff

**Problem:** Edge Function returns 5xx or 429 (rate limit). App shows generic error with no retry.

**Impact:** Poor UX during transient failures.

**Solution:**
1. Create retry utility:
   ```typescript
   // src/utils/retryWithBackoff.ts
   export async function retryWithBackoff<T>(
     fn: () => Promise<T>,
     maxRetries = 3,
     baseDelay = 1000
   ): Promise<T> {
     for (let attempt = 0; attempt < maxRetries; attempt++) {
       try {
         return await fn();
       } catch (error) {
         const isRetriable = error.status >= 500 || error.status === 429;
         const isLastAttempt = attempt === maxRetries - 1;

         if (!isRetriable || isLastAttempt) {
           throw error;
         }

         const delay = baseDelay * Math.pow(2, attempt);
         await new Promise(resolve => setTimeout(resolve, delay));
       }
     }
   }
   ```

2. Use in Edge Function calls:
   ```typescript
   const validateTokenAndFetchProperty = async () => {
     try {
       const result = await retryWithBackoff(() => validateTokenEdgeFunction(token));
       // ... handle result
     } catch (error) {
       if (error.status === 429) {
         setError('Please wait a moment and try again.');
       } else {
         setError('Unable to validate invite. Please try again.');
       }
     }
   };
   ```

**Files to Modify:**
- `src/utils/retryWithBackoff.ts` (new file)
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx`

**Priority:** 🟡 **HIGH** - Reliability

---

### 🟢 8. Accessible Names & TestIDs

**Problem:** No TestIDs for E2E tests, poor screen reader support.

**Impact:** Testing difficulty, accessibility gaps.

**Solution:**
1. Add TestIDs:
   ```typescript
   <Button
     testID="invite-accept-button"
     accessibilityLabel="Accept property invite"
     title="Accept Invite"
     onPress={handleAccept}
   />

   <Text testID="property-name" accessibilityRole="header">
     {property.name}
   </Text>
   ```

2. Add to E2E tests:
   ```typescript
   test('should accept tokenized invite', async ({ page }) => {
     await page.goto(inviteUrl);
     await expect(page.getByTestId('property-name')).toBeVisible();
     await page.getByTestId('invite-accept-button').click();
   });
   ```

**Files to Modify:**
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx`
- `e2e/flows/tenant-invite-acceptance.spec.ts`

**Priority:** 🟢 **MEDIUM** - Testing & a11y

---

## Instrumentation & Observability

### 🔴 9. Analytics Events

**Problem:** No visibility into invite funnel (views, accepts, failures).

**Impact:** Cannot measure conversion, diagnose issues, optimize flow.

**Solution:**
1. Add analytics events:
   ```typescript
   // In PropertyInviteAcceptScreen

   useEffect(() => {
     analytics.track('invite_view', {
       token_id: inviteData?.value,
       type: inviteData?.type,
       property_id: property?.id
     });
   }, [inviteData]);

   const acceptTokenizedInvite = async () => {
     try {
       await callAcceptEdgeFunction(token);
       analytics.track('invite_accept_success', {
         token_id: token,
         property_id: property.id,
         duration_ms: Date.now() - startTime
       });
     } catch (error) {
       analytics.track('invite_accept_failure', {
         token_id: token,
         error: error.code,
         reason: error.message
       });
       throw error;
     }
   };
   ```

2. Track validation:
   ```typescript
   const validateTokenAndFetchProperty = async () => {
     try {
       const result = await validateTokenEdgeFunction(token);
       analytics.track('invite_validate_success', { token_id: token });
     } catch (error) {
       analytics.track('invite_validate_failure', {
         token_id: token,
         error: error.code
       });
     }
   };
   ```

**Files to Modify:**
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx`
- `src/lib/analytics.ts` (create if not exists)

**Priority:** 🟡 **HIGH** - Product visibility

---

### 🔴 10. X-Correlation-ID

**Problem:** Cannot trace requests from app → Edge Function → database.

**Impact:** Difficult to debug production issues, no request tracing.

**Solution:**
1. Generate correlation ID:
   ```typescript
   import { v4 as uuidv4 } from 'uuid';

   const validateTokenAndFetchProperty = async () => {
     const correlationId = `invite-${uuidv4()}`;

     const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-token`, {
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
         'X-Correlation-ID': correlationId
       },
       body: JSON.stringify({ token })
     });

     log.info('Invite validation', { correlationId, token_id: token });
   };
   ```

2. Update Edge Functions to log correlation ID:
   ```typescript
   // supabase/functions/validate-invite-token/index.ts
   serve(async (req) => {
     const correlationId = req.headers.get('X-Correlation-ID') || 'unknown';
     console.log(JSON.stringify({
       correlationId,
       timestamp: new Date().toISOString(),
       event: 'validate_start'
     }));

     // ... validation logic
   });
   ```

**Files to Modify:**
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx`
- `supabase/functions/validate-invite-token/index.ts`
- `supabase/functions/accept-invite-token/index.ts`

**Priority:** 🟡 **HIGH** - Debuggability

---

### 🟢 11. Sanitize Token Values in Logs

**Problem:** Full token values logged, potential security leak.

**Impact:** Token exposure in logs, CloudWatch, Sentry.

**Solution:**
1. Create sanitization utility:
   ```typescript
   // src/utils/sanitize.ts
   export function sanitizeToken(token: string): string {
     if (!token || token.length < 8) return 'REDACTED';
     return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
   }
   ```

2. Update logging:
   ```typescript
   log.info('Validating invite token', {
     token_preview: sanitizeToken(token),
     // Never log full token value
   });

   analytics.track('invite_view', {
     token_preview: sanitizeToken(token),
     // Use token_id from validation response instead
   });
   ```

**Files to Modify:**
- `src/utils/sanitize.ts` (new file)
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx`
- `src/screens/onboarding/LandlordTenantInviteScreen.tsx`

**Priority:** 🟡 **HIGH** - Security hygiene

---

## Testing Additions

### 🔴 12. E2E Tests for Edge Cases

**Problem:** Only happy path tested. Edge cases (wrong account, offline, etc.) untested.

**Impact:** Bugs will reach production.

**Solution:**
1. Create comprehensive E2E test suite:
   ```typescript
   // e2e/flows/tenant-invite-edge-cases.spec.ts

   test('should handle wrong account gracefully', async ({ page }) => {
     // Sign in as different user
     await authHelper.signIn('other@example.com', 'password');

     // Open invite for tenant@example.com
     await page.goto(inviteUrl);

     // Should show wrong account warning
     await expect(page.getByText(/This invite was sent to/)).toBeVisible();
     await expect(page.getByText('Switch Account')).toBeVisible();
   });

   test('should handle already linked to another property', async ({ page }) => {
     // Link tenant to Property A
     await apiClient.linkTenantToPropertyById(propertyA.id);

     // Open invite for Property B
     await page.goto(inviteUrlB);

     // Should show switch confirmation
     await expect(page.getByText(/already connected to/)).toBeVisible();
   });

   test('should handle offline state', async ({ page, context }) => {
     // Go offline
     await context.setOffline(true);

     // Open invite
     await page.goto(inviteUrl);

     // Should show cached data if available
     await expect(page.getByText(/cached data/)).toBeVisible();

     // Go online
     await context.setOffline(false);

     // Should retry and succeed
     await page.getByText('Retry').click();
     await expect(page.getByTestId('invite-accept-button')).toBeEnabled();
   });

   test('should handle token revoked mid-session', async ({ page }) => {
     await page.goto(inviteUrl);

     // Validate token (success)
     await expect(page.getByTestId('property-name')).toBeVisible();

     // Revoke token server-side
     await dbHelper.revokeToken(token);

     // Try to accept
     await page.getByTestId('invite-accept-button').click();

     // Should show revoked error
     await expect(page.getByText(/no longer valid/)).toBeVisible();
   });

   test('should handle multi-use capacity reached', async ({ page }) => {
     // Create token with max_uses=2
     const token = await dbHelper.generateToken(propertyId, { max_uses: 2 });

     // Accept twice
     await acceptInvite(token, 'tenant1@example.com');
     await acceptInvite(token, 'tenant2@example.com');

     // Third attempt should fail
     await page.goto(getInviteUrl(token));
     await expect(page.getByText(/reached its maximum/)).toBeVisible();
   });
   ```

**Files to Create:**
- `e2e/flows/tenant-invite-edge-cases.spec.ts`
- `e2e/helpers/db-helper.ts` (token revocation methods)

**Priority:** 🔥 **CRITICAL** - Quality assurance

---

## Go-Live Checklist

Before deploying tokenized invites to production:

### Pre-Deployment (1-2 Weeks)
- [ ] **Critical edge cases addressed** (items 1-5)
- [ ] **Resilience improvements** (items 6-7)
- [ ] **Instrumentation added** (items 9-11)
- [ ] **E2E tests green** (item 12)
- [ ] **Universal/App Links validated** on real iOS/Android devices
- [ ] **Staging smoke tests** pass (valid/expired/revoked/wrong-account)
- [ ] **Feature flag implemented** for controlled rollout
- [ ] **Ops runbook written** (revoking tokens, interpreting metrics)

### Deployment
- [ ] **Deploy Edge Functions** to production
- [ ] **Run database migrations** (add `intended_email` column)
- [ ] **Enable feature flag** at 10% rollout
- [ ] **Monitor dashboards** for errors, conversion rate
- [ ] **Run nightly CI** with E2E tests

### Post-Deployment (Week 1)
- [ ] **Monitor conversion funnel** (invite_view → validate → accept)
- [ ] **Check error distribution** (revoked, expired, capacity, wrong_account)
- [ ] **Review correlation IDs** in logs for failed requests
- [ ] **Gather user feedback** from initial 10%
- [ ] **Scale to 50%** if metrics healthy
- [ ] **Scale to 100%** after 1 week if stable

### Rollback Plan
If critical issues detected:
1. Set feature flag to 0% (instant rollback)
2. Notify affected users via email
3. Reissue invites using legacy flow
4. Root cause analysis with correlation IDs
5. Fix, test, redeploy

---

## Implementation Timeline

### Week 1 (Critical Items)
**Days 1-2:**
- [ ] Wrong account detection (#1)
- [ ] Already linked handling (#2)
- [ ] Loading states & double-submit guard (#6)

**Days 3-4:**
- [ ] Multi-use capacity errors (#3)
- [ ] Mid-session revocation handling (#4)
- [ ] Retry with backoff (#7)

**Days 5-7:**
- [ ] Analytics events (#9)
- [ ] X-Correlation-ID (#10)
- [ ] Token sanitization (#11)

### Week 2 (Testing & Polish)
**Days 1-3:**
- [ ] E2E edge case tests (#12)
- [ ] Offline state handling (#5)
- [ ] TestIDs & a11y (#8)

**Days 4-5:**
- [ ] Staging smoke tests
- [ ] Feature flag implementation
- [ ] Ops runbook documentation

### Week 3 (Validation)
- [ ] Real device testing (Universal/App Links)
- [ ] Load testing (100 concurrent invites)
- [ ] Security review
- [ ] Final go/no-go decision

---

## Metrics to Monitor (Post-Launch)

### Conversion Funnel
```
invite_view (100%)
  ↓
validate_success (95% target)
  ↓
accept_attempt (80% target)
  ↓
accept_success (95% target)
```

### Error Distribution (Target: <5% of attempts)
- `wrong_account`: Should be <1% (good targeting)
- `expired`: Should be <2% (7-day expiry reasonable)
- `revoked`: Should be <0.5% (rare landlord action)
- `capacity_reached`: Should be <1% (most tokens single-use)
- `network_error`: Should be <2% (transient failures)

### Performance (p95)
- Invite preview load: <2s
- Token validation: <500ms
- Token acceptance: <1s

### Security Alerts
- Token enumeration attempts: 0 (constant-time comparison)
- Token value leaks in logs: 0 (sanitization)
- Wrong account acceptances: 0 (detection working)

---

## Documentation Needs

### User-Facing
1. **Help Center Article:** "How Property Invites Work"
   - What is an invite link?
   - How long are they valid?
   - What if I'm signed into the wrong account?
   - What if the link expired?

2. **Tenant Onboarding:** "Accepting Your Invite"
   - Step-by-step screenshots
   - Troubleshooting common issues

### Internal
1. **Ops Runbook:** "Managing Invite Tokens"
   - Revoking tokens
   - Reissuing invites
   - Tracing with correlation IDs
   - Interpreting error codes
   - Handling support tickets

2. **Architecture Docs:** "Invite System Design"
   - Flow diagrams
   - Security model
   - Database schema
   - Edge Function contracts

---

## Bottom Line

**Current Status:** ✅ Functionally complete, 🔴 Production-hardening required

**Critical Path:**
1. Week 1: Address 7 critical edge cases + resilience
2. Week 2: Add instrumentation + comprehensive E2E tests
3. Week 3: Real device validation + staging smoke tests
4. Week 4: Controlled rollout (10% → 50% → 100%)

**Confidence Level:**
- Current: 🟡 **70%** (core flow works, edge cases untested)
- After hardening: ✅ **95%** (production-ready with full coverage)

**Recommendation:** Do NOT deploy to real users until Critical items (1-5, 9-12) are addressed. The core flow is solid, but edge cases will cause user frustration and support burden.

---

**Assessment Date:** 2025-12-23
**Next Review:** After Week 1 critical items complete
**Prepared By:** Production Readiness Review

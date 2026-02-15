# Test Execution Summary — February 14, 2026

## Scope
Automated real-world interaction tests were run headless (no visible full-screen browser impact) across landlord and tenant flows in both Chromium and Firefox.

## Final Status
- Chromium: 15/15 passed
- Firefox: 15/15 passed

## Commands Used
```bash
PW_HEADLESS=1 npx playwright test tests/e2e --browser=chromium --reporter=list
PW_HEADLESS=1 npx playwright test tests/e2e --browser=firefox --reporter=list
```

## Key Fixes Applied During This Run
1. Profile persistence bug fix
- File: `src/context/UnifiedAuthContext.tsx`
- `updateProfile` now writes name updates to `public.profiles` (the table the app actually reads), not only auth metadata.
- Auth metadata update remains best-effort and retried, but profile-table persistence is now enforced.

2. Invite email bounce prevention in automation
- Files:
  - `tests/e2e/manual-parity-landlord-tenant.spec.ts`
  - `tests/e2e/mvp-request-message-lifecycle.spec.ts`
- Invite automation uses code generation mode only (`invite-mode-code`), avoiding outbound test email sends that caused Resend/Supabase bounce alerts.

3. Shared settings test hardening for web/browser variance
- File: `tests/e2e/phase8-shared-settings.spec.ts`
- Added reliable input-fill assertions for Contact Support subject/body fields.
- Reduced brittle dependency on password-reset feedback rendering in web UI.
- Updated profile name test values to valid alpha-only names for onboarding/profile validators.

## Covered Flows
- Landlord auth/login routing and sign out
- Tenant auth/login routing and sign out
- Landlord property setup with room and asset media upload persistence
- Landlord invite generation and tenant invite acceptance
- Tenant maintenance request creation and lifecycle transitions
- Tenant/landlord messaging lifecycle
- Shared profile/settings/help/support surfaces
- Security resilience checks (invalid token, token reuse prevention, property mismatch rejection, RLS isolation)
- Legacy route smoke checks

## Notes
- Automated invite tests intentionally avoid sending external emails to prevent provider throttling/privilege warnings.
- Artifacts (screenshots/videos/traces) are available under `artifacts/playwright/test-results/`.

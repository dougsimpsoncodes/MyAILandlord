# MVP Test Program Runbook

## Purpose
Define the release test program for My AI Landlord so landlord and tenant core flows are verified end-to-end with clear, enforceable gates.

## Scope
MVP user journeys (release-blocking):
1. Landlord signs up/logs in.
2. Landlord sets up property.
3. Landlord invites tenant.
4. Tenant opens invite link, signs up/logs in, and links to the invited property.
5. Tenant creates maintenance requests and messages landlord.
6. Landlord replies, updates request status, and tenant sees updates.

Legacy flows (non-blocking smoke):
- `PropertyPhotos`, `RoomSelection`, `RoomPhotography`, `AssetScanning`, `AssetDetails`, `AssetPhotos`, `ReviewSubmit`.

## Platform Gating Policy
Release-blocking now:
- Web: Firefox and Chrome must both pass all MVP blocking phases.

Nightly-gated now:
- iOS and Android run full MVP suites nightly.

Promotion policy for mobile:
- Promote iOS + Android to release-blocking after all are true:
1. 14 consecutive days of nightly runs.
2. Pass rate above 95% on mobile MVP suites.
3. No open Sev1/Sev2 mobile defects.

## Test Environments
Required environments:
1. Local web at `http://localhost:8081`.
2. Linked Supabase test project (non-production).
3. Isolated deterministic test data (seeded users/properties/invites).

Environment rules:
- Do not run release validation against production data.
- Use deterministic seed/reset scripts before full regression.
- Record app commit hash and migration state in every test report.

## Phase Plan

### Phase 0: Baseline and Data Control
Goal:
- Ensure stable environment and deterministic data.

Coverage:
- Server health, auth bootstrap, Supabase connectivity, seed/reset behavior.

Exit criteria:
- 3 consecutive clean startup runs with no bootstrap errors.

Blocking:
- Yes (all platforms in their current gate tier).

### Phase 1: Auth and Role Routing
Goal:
- Validate signup/login/logout and routing for landlord vs tenant.

Coverage:
- `Welcome`, `AuthForm`, `AuthCallback`, role-based navigation, session restore.
- Negative cases: invalid credentials, duplicate signup, expired session.

Exit criteria:
- 100% pass on critical auth paths; expected errors rendered for negatives.

Blocking:
- Yes.

### Phase 2: Landlord Property Setup (MVP)
Goal:
- Validate property creation and persistence through the active MVP flow.

Coverage:
- `PropertyBasics` (including address lookup), `PropertyAttributes`, `PropertyAreas`, `PropertyAssets`, `PropertyReview`.
- Reload/reopen/edit persistence checks.

Exit criteria:
- Property create/edit persists; no stuck loading or partial-save dead ends.

Blocking:
- Yes.

### Phase 3: Invite Generation (MVP)
Goal:
- Validate landlord invite generation reliability.

Coverage:
- `InviteTenant` email mode, code mode, fallback/manual link path, create another invite.
- Invite URL correctness and property binding.

Exit criteria:
- Invite token/link created reliably and always usable for acceptance flow.

Blocking:
- Yes.

### Phase 4: Tenant Invite Acceptance and Linking (MVP)
Goal:
- Ensure tenant lands in tenant flow and links to the exact invited property.

Coverage:
- Invite landing page, signup-and-accept, existing-user accept, invalid/expired token handling.
- Post-accept tenant home state and property linkage.

Exit criteria:
- Every pass links tenant to the invited property (UI + DB verification).

Blocking:
- Yes.

### Phase 5: Tenant Request Lifecycle (MVP)
Goal:
- Validate tenant request submission and tracking.

Coverage:
- `ReportIssue` → `ReviewIssue` → `ConfirmSubmission` → `SubmissionSuccess`.
- `MaintenanceStatus`, `FollowUp`, persistence on refresh/relogin.

Exit criteria:
- Requests persist with correct status and display in tenant views.

Blocking:
- Yes.

### Phase 6: Landlord Request Operations (MVP)
Goal:
- Validate landlord processing and status transitions.

Coverage:
- Dashboard/requests list, `CaseDetail`, status updates, landlord responses.
- Tenant-side reflection of updates.

Exit criteria:
- Status transition matrix passes; tenant sees accurate updates.

Blocking:
- Yes.

### Phase 7: Messaging Lifecycle (MVP)
Goal:
- Validate bidirectional tenant-landlord communications.

Coverage:
- Tenant `CommunicationHub`, landlord communication/chat screens.
- Thread continuity, unread/read, refresh/relogin persistence.

Exit criteria:
- Messages are synchronized and persistent for both roles.

Blocking:
- Yes.

### Phase 8: Shared Profile/Settings/Support
Goal:
- Validate shared account/settings surfaces.

Coverage:
- `Profile`, `EditProfile`, `Security`, `Notifications`, `HelpCenter`, `ContactSupport`.

Exit criteria:
- No blockers or navigation dead ends in shared surfaces.

Blocking:
- Yes.

### Phase 9: Security and Resilience
Goal:
- Validate enforcement and robustness under failure conditions.

Coverage:
- RLS/role isolation checks, invite token misuse cases, retry/idempotency, upload resilience.

Exit criteria:
- Zero open Sev1/Sev2 security or data-isolation defects.

Blocking:
- Yes.

### Phase 10: Legacy Smoke (Non-Blocking)
Goal:
- Monitor old paths still present in code.

Coverage:
- Legacy landlord setup/asset flows listed in Scope.

Exit criteria:
- Smoke report generated; failures triaged into backlog.

Blocking:
- No, unless defect impacts MVP paths.

## Execution Cadence
Per PR:
1. Web Firefox + Chrome MVP critical subset (Phases 1-4 minimum).

Nightly:
1. Web full MVP phases (1-9).
2. iOS and Android full MVP phases (1-9).
3. Legacy smoke phase (10).

Pre-release:
1. Full green web MVP (Firefox + Chrome).
2. Mobile policy check against promotion criteria.
3. No open Sev1/Sev2 defects in MVP scope.

## Tooling and Artifacts
Automation approach:
1. Real-world UI automation (click, type, scroll, link navigation, form submission).
2. DB assertions for critical linkage/state correctness.
3. Manual exploratory sessions for newly changed risky areas.

Artifacts required for failed runs:
- Screenshot, video, trace, failing URL, user role, test data IDs, DB assertion output.

Artifacts required for release signoff:
- Phase-by-phase pass report and defect summary by severity.

## Defect Severity and Release Rules
Severity model:
- Sev1: data loss/corruption, security breach, complete blocker in MVP critical path.
- Sev2: major feature break in MVP path without workaround.
- Sev3: partial degradation with workaround.
- Sev4: cosmetic/minor UX issue.

Release rules:
1. Any open Sev1 blocks release.
2. Any open Sev2 in MVP scope blocks release.
3. Sev3/Sev4 allowed only with documented waiver and owner/date.

## Ownership and Governance
Owner:
- Product owner approves scope and release decisions.

Execution owner:
- QA automation owner maintains suites, runbooks, and test data utilities.

Change control:
- Any change to blocking phases or platform policy requires PR update to this runbook.

## Immediate Next Implementation Steps
1. Build/expand automated suites to map each MVP phase to explicit test cases.
2. Add browser matrix enforcement for Firefox + Chrome in CI.
3. Add nightly mobile runs with pass-rate tracking dashboard.
4. Maintain phase-to-test-case traceability table.

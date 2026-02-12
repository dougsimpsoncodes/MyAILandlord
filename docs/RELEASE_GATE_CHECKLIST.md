# Release Gate Checklist

Use this checklist before merging code to `main`.

## Automated Gates

- [ ] `Typecheck` job is green
- [ ] `Lint (New Lines)` job is green
- [ ] `Unit Tests (Fast)` job is green
- [ ] `RLS Smoke` job is green (or marked N/A per change scope)
- [ ] `gitleaks` workflow is green

## Manual Gates

- [ ] Real-device smoke test passed: `./scripts/claude-test-invite-on-iphone.sh --clean`
- [ ] Staged rollout plan documented in PR
- [ ] Rollback plan documented in PR
- [ ] Critical user-flow impact reviewed (auth/onboarding/invite)

## Critical Flows to Verify

- [ ] App launch -> auth -> first-time landlord onboarding -> property created
- [ ] Property details -> invite generated -> post-send status visible
- [ ] Invite acceptance path still works

## Sign-Off

- [ ] Reviewer approved
- [ ] CODEOWNERS approval obtained for critical files (if touched)

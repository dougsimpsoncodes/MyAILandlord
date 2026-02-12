# Stability Program

This repository uses a phased, enforceable stability model focused on reducing regressions in auth, onboarding, and invite flows.

## Goals

- Catch regressions before merge.
- Keep gates strict enough to protect production, but realistic given existing lint debt.
- Require explicit rollout and rollback planning for non-docs changes.

## Enforced CI Gates

The `Quality Gates` workflow enforces:

1. `Typecheck`: `npm run typecheck`
2. `Lint (New Lines)`: `npm run lint:new-lines`
3. `Unit Tests (Fast)`: `npm run test:unit:ci`
4. `RLS Smoke`: `npm run test:rls` (required for internal PRs when secrets are configured)

Notes:
- Lint is enforced on newly changed lines only to avoid blocking on legacy lint debt unrelated to the PR.
- RLS smoke is executed when required Supabase/JWT secrets are available.

## PR Checklist Gate

The `PR Stability Checklist` workflow enforces required confirmations in PR body for non-docs PRs:

- Typecheck done
- Unit tests done
- RLS done (or explicitly N/A)
- Device smoke done (or explicitly N/A)
- Rollout plan documented
- Rollback plan documented

## Local Pre-PR Command

Run this before opening or updating a PR:

```bash
npm run stability:gate
```

This runs:
- typecheck
- fast unit tests
- lint on changed lines
- optional RLS smoke when env vars are present

## Required Manual Validation

For runtime behavior changes (auth/onboarding/invite/navigation), run:

```bash
./scripts/claude-test-invite-on-iphone.sh --clean
```

Record outcome in the PR checklist.

## Staged Rollout Standard

For production-facing changes:

1. Deploy to a small cohort first.
2. Monitor for at least 24 hours.
3. Expand only after no significant regressions.

Monitor at minimum:
- auth failure rate
- onboarding completion drop-off
- invite generation/send error rate
- crash-free sessions

## Rollback Standard

Every non-docs PR must include:

1. rollback trigger criteria
2. exact rollback command/path
3. owner for execution

Reference: `docs/ROLLBACK_PROCEDURES.md`

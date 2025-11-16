# Contributing to My AI Landlord

Thanks for helping improve My AI Landlord! This guide keeps contributions simple, safe, and consistent.

## Quick Workflow
- Plan: Write a short checklist of tasks you’ll do.
- Small changes: Keep PRs focused and minimal.
- Tests (if touching code): Run unit tests locally; add or update tests where it makes sense.
- Summary: In your PR description, list what changed and why.

## Getting Started
- Node 18+, npm, and Expo CLI installed (`npm i -g @expo/cli`).
- Copy `.env.example` to `.env` and fill in local keys as needed.
- Start dev server: `npx expo start`.

## Branching & PRs
- Branch name: `feat/<topic>`, `fix/<bug>`, or `docs/<area>`.
- Commits: Use clear, imperative messages (e.g., `fix: align RLS doc links`).
- PR checklist:
  - Purpose: What problem it solves (1–3 lines).
  - Scope: What’s included/excluded.
  - Testing: How you verified it (screenshots/logs if UI).
  - Risk: Any migrations or breaking changes.

## Code Style (for code changes)
- TypeScript strict: keep types tight; avoid `any`.
- Linting: `eslint . --ext .ts,.tsx` (no direct `console.*` — use `src/lib/log.ts`).
- Structure: Follow existing folder patterns in `src/`.

## Tests (when applicable)
- Unit tests: `npm test` (see existing patterns in `src/__tests__`).
- RLS smoke tests exist; do not modify DB tests unless necessary.
- If tests are flaky on your machine, note it in the PR and keep scope small.

## Security
- Run `./scripts/security-audit.sh` before PRs that touch auth, storage, or network.
- Don’t commit secrets; use `.env` with documented env vars.
- Follow RLS rules and avoid bypassing validation in new code.

## Documentation
- Update relevant docs in `docs/` when you change behavior or flows.
- Keep high-level docs concise; move long reports to `docs/archive/`.
- Add links in `DOCUMENTATION_INDEX.md` if you create new key docs.

## Communication
- Be concise and specific. If you’re unsure, propose your plan first.
- Prefer incremental PRs over one big change.

Thanks for contributing! 🎉

# Agent Collaboration Guidelines

This repository may be edited by multiple agents. To minimize conflicts and regressions, follow these rules.

## Ownership

Primary owner: @dougsimpson

Critical areas (see .github/CODEOWNERS):
- Navigation/linking: `src/AppNavigator.tsx`, `src/navigation/**`
- Contexts: `src/context/**`
- Push notifications: `src/hooks/usePushNotifications.ts`, `src/services/push/**`
- Top-level wiring: `App.tsx`

Do not change these areas without a PR reviewed by the owner.

## Feature Flags

- `EXPO_PUBLIC_IOS_MVP` (0|1): Enables iOS‑first MVP behavior (e.g., push hook, banner).
- `EXPO_PUBLIC_LINKING_REFACTOR` (0|1): Toggles centralized deep‑link handling (Option B‑lite). Default OFF to avoid surprises.
- `EXPO_PUBLIC_EXPERIMENTAL_APP` (0|1): Renders the clean experimental app entry (see `src/clean/`). Default OFF.

## Branching

Use a dedicated branch for iOS MVP work: `ios-mvp`. Merge to `main` via PRs only after passing `typecheck` and lint on touched areas.

## Testing

Local device testing: `./scripts/claude-test-invite-on-iphone.sh --clean`

Deep‑linking guidance: Use Tunnel mode in DevTools; for physical devices, paste Tunnel URL or direct IP in Expo Go. See `docs/QUICK_TEST_GUIDE.md`.

## Experimental Clean App

An optional clean entry can be developed under `src/clean/` and enabled via `EXPO_PUBLIC_EXPERIMENTAL_APP=1`. Keep it self‑contained and avoid altering legacy paths.


# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` (feature folders: `components/`, `screens/`, `services/`, `hooks/`, `lib/`, `navigation/`, `utils/`, `context/`, `theme/`, `types/`, `models/`, `data/`).
- Tests: colocated under `__tests__/` (e.g., `src/services/storage/__tests__`).
- E2E: `e2e/` with Playwright config in `playwright.config.ts`.
- Assets: `assets/`. Platform folders: `ios/`, `android/`. Scripts: `scripts/`. Supabase artifacts: `supabase/`, `sql/`, `migrations/`.

## Build, Test, and Development Commands
- `npm start`: Launch Expo dev server (Metro). Variants: `npm run web`, `npm run ios`, `npm run android`.
- `npm run typecheck`: TypeScript checks with no emit.
- `npm run lint` / `npm run lint:fix`: Lint code; auto-fix where safe.
- `npm test`: Run Jest tests. `npm run test:unit` adds coverage. `npm run test:watch` for TDD.
- `npm run test:e2e`: Run Playwright E2E via Expo Web. Ensure no dev server is already using port `8082`.
- `npm run security:audit` and `npm run scan:secrets`: Security scans (npm, gitleaks).

## Coding Style & Naming Conventions
- TypeScript, 2-space indent, single quotes, semicolons, `printWidth: 100` (see `.prettierrc.json`).
- ESLint enforced; `no-console` except in tests/logging files. Prefer hooks in `hooks/` with `useX` naming; components in `PascalCase`.
- File naming: feature-oriented folders; tests use `*.test.ts`/`*.test.tsx` inside `__tests__/`.

## Testing Guidelines
- Unit/Component: Jest + Testing Library (`jest-expo` preset). Match: `**/__tests__/**/*.test.(ts|tsx|js)`.
- E2E: Playwright. Starts Expo Web on `:8082`. Typical run: `npm run test:e2e`.
- Aim for meaningful coverage on services and critical screens. Keep tests deterministic; avoid network where possible.

## Commit & Pull Request Guidelines
- Conventional prefixes: `feat:`, `fix:`, `chore:`, `security:`, etc. Example: `fix: resolve EAS build peer dependency conflicts`.
- PRs: concise description, linked issue, screenshots/GIFs for UI, and notes on security/db changes.
- Must pass: `typecheck`, `lint`, `test`, and security scans. Do not commit secrets or `.env` values.

## Security & Configuration Tips
- Required envs for Supabase use `EXPO_PUBLIC_*` on client. Validate via `npm run validate:env`.
- Use `scan:secrets` before pushing. Keep RLS tests available via `npm run test:rls`.


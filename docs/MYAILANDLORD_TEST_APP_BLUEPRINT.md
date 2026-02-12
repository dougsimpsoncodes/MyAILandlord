# MyAILandlord Test-App Blueprint

Date: 2026-02-12
Owner: @dougsimpson
Status: Draft for approval

## 1) Goal

Create a deterministic, contract-driven mobile test system for MyAILandlord that:
- runs real UI flows (button taps + text entry) on iOS simulator/device,
- captures evidence artifacts for each feature run,
- fails fast with actionable reasons (not vague hangs),
- supports growth from smoke checks to matrix reliability checks.

This blueprint is intentionally implementation-ready and based on observed lessons from Press Play's `tools/test-app` system.

## 2) Primary Problem To Solve

Current testing in this repo is useful but fragmented:
- backend integration scripts validate data behavior (`scripts/real-world-test.js`),
- invite scripts support semi-manual validation (`scripts/test-invite-flow-fresh.sh`, `scripts/claude-test-invite-on-iphone.sh`),
- CI currently gates typecheck/lint/unit/RLS only (`.github/workflows/ci.yml`).

What is missing is one contract runner that can say:
- which critical user flows were tested,
- what exact evidence exists for pass/fail,
- whether release gates are green per profile/device.

## 3) Scope (Phase 1)

Phase 1 scope is intentionally narrow:
- iOS simulator first,
- landlord first-time flow from app launch through property creation and tenant invite send,
- deterministic smoke suite with strict artifacts and simple gates.

Out of scope for Phase 1:
- full permutation coverage,
- exhaustive tenant flow matrix,
- Android parity.

## 4) Proposed Structure

Create a new test system under:

- `tools/test-app/.test-app.json`
- `tools/test-app/README.md`
- `tools/test-app/config/feature_contracts.yaml`
- `tools/test-app/config/selectors.yaml`
- `tools/test-app/config/oracles.yaml`
- `tools/test-app/config/advanced_gates.yaml`
- `tools/test-app/config/feature_inventory_map.yaml`
- `tools/test-app/schemas/events.schema.json`
- `tools/test-app/scripts/check-prerequisites.sh`
- `tools/test-app/scripts/reset-and-seed.sh`
- `tools/test-app/scripts/test-app.sh`
- `tools/test-app/scripts/test-app-matrix.sh`
- `tools/test-app/scripts/evaluate-oracles.sh`
- `tools/test-app/scripts/enforce-state-graph.sh`
- `tools/test-app/scripts/collect-watchdog.sh`
- `tools/test-app/scripts/build-feature-inventory.sh`
- `tools/test-app/scripts/enforce-feature-inventory.sh`
- `tools/test-app/scripts/enforce-accessibility-contract.sh`
- `tools/test-app/flows/*.yaml`
- `test-app-reports/` (artifact output root, gitignored)

## 5) Runner Model

Single-profile run (`test-app.sh`):
1. Validate prerequisites.
2. Resolve feature list from contract by mode and profile.
3. Deterministic reset + seed.
4. Execute each feature flow with timeout.
5. Save per-feature logs/screenshots/runtime-state.
6. Evaluate gates.
7. Emit `coverage.json`, `score.json`, `executive-summary.md`, `report.md`.
8. Exit code:
- `0`: pass,
- `2`: gate failure,
- `3`: config/prereq failure.

Matrix run (`test-app-matrix.sh`):
1. Enumerate profiles/devices/repetitions.
2. Run `test-app.sh` for each tuple.
3. Compute pass rate and matrix score.
4. Output matrix report artifacts.

## 6) Determinism Requirements

Hard requirement: each run starts from known state.

Profiles for Phase 1:
- `fresh-install`: uninstall/reinstall or clear-state reset.
- `returning-landlord`: seeded profile with one existing property.
- `warm-launch`: app restart without data clear.

Do not start with privacy-denied profile in Phase 1; add in Phase 2.

## 7) Initial Feature Contract (Smoke)

Mode `smoke` should include exactly these critical features:

1. `home-launch-to-welcome`
- app launches,
- expected welcome/auth entry visible.

2. `auth-landlord-signin-or-signup`
- landlord auth completes,
- lands on landlord home/dashboard.

3. `landlord-create-property-core`
- starts property creation,
- fills required address/details,
- saves property.

4. `landlord-open-property-management`
- navigates to created property,
- property summary/management screen loads.

5. `landlord-send-tenant-invite`
- enters tenant email,
- triggers invite send,
- success confirmation visible.

These match your requested real path: app launch to property creation to invite send.

## 8) Flow Design Rules (Important)

To avoid "stuck" behavior:
- Use small composable subflows (`_setup-auth.yaml`, `_create-property.yaml`, `_send-invite.yaml`).
- After every major action, assert one stable marker before proceeding.
- Use resilient transition steps for modal/sheet exits.
- Add bounded retries for known flaky transitions only.
- Keep feature flow timeout explicit per feature in contract.

## 9) Selector Strategy

`selectors.yaml` should use this order:
1. accessibility ID,
2. text fallback (with regex only when required),
3. index as last resort.

Policy:
- New critical controls must have stable IDs.
- Gate should fail when unmapped critical IDs appear.

## 10) Oracle Strategy (Phase 1)

Each passed feature must provide all of:
- before and after screenshots,
- feature log file,
- at least one assert marker in flow.

Keep Phase 1 oracles minimal and real:
- app alive/no crash,
- no blocking alert at end of feature,
- expected screen marker reached.

Do not include placeholder always-pass oracles.

## 11) Runtime Telemetry Hooks (Phase 1.5)

Add lightweight app test hooks (env-gated) to emit:
- current route/screen,
- key flow state (auth role, property draft state, invite status),
- timestamped events.

Artifacts:
- `testhooks-state.json`,
- `testhooks-events.jsonl`.

This enables state-graph and oracle checks to validate real runtime behavior, not just UI text.

## 12) Gate Set (Phased)

Phase 1 required gates:
- all resolved smoke features executed,
- all resolved smoke features passed,
- screenshot/log presence per feature,
- no critical watchdog patterns in logs,
- minimum smoke coverage 100% (for resolved set).

Phase 2 gates:
- feature inventory mapping,
- accessibility contract,
- runtime state-graph coverage.

Phase 3 gates:
- matrix reliability pass-rate threshold,
- permutation/combination contract for high-risk paths.

Important policy:
- Do not enforce permutation contract on smoke mode.
- Restrict permutation gate to full/nightly matrix.

## 13) CI Integration Plan

Add new workflow: `.github/workflows/test-app.yml`

Jobs:
1. `e2e-smoke-contract` (PR and push)
- run `tools/test-app/scripts/test-app.sh --mode smoke --env-profile fresh-install`.
- upload `test-app-reports` artifacts.

2. `e2e-matrix-nightly` (scheduled)
- run matrix mode with repetitions and optional multi-device config.

Keep existing quality gates in `.github/workflows/ci.yml` unchanged initially.

## 14) Artifact Contract

Per run directory:
- `manifest.json`
- `events.jsonl`
- `feature-results.jsonl`
- `coverage.json`
- `score.json`
- `executive-summary.md`
- `report.md`
- `logs/`
- `screenshots/`

Per matrix directory:
- `runs.jsonl`
- `matrix.json`
- `score.json`
- `executive-summary.md`
- `report.md`

## 15) Anti-Stuck Controls

Implement these controls from day one:
- Hard timeout wrapper for each flow process group.
- Max retry count default `1` for feature retries.
- Per-feature timeout values in contract (no implicit global only).
- Runner emits event at each stage for observability.
- Watchdog catches timeout-heavy runs and marks gate failure.

## 16) Rollout Plan

Step 1
- Scaffold `tools/test-app` config, runner scripts, and smoke flows.

Step 2
- Implement only the 5 smoke features listed above.

Step 3
- Add smoke CI job and artifact upload.

Step 4
- Run daily for one week and fix flake hotspots.

Step 5
- Add returning-landlord + warm-launch profiles.

Step 6
- Add runtime hook-based state graph and stronger oracles.

Step 7
- Expand to full mode and matrix reliability.

## 17) Success Criteria

Phase 1 is complete when all are true:
- smoke run passes locally and in CI with deterministic artifacts,
- landlord first-time flow to invite send is fully automated,
- failures identify exact feature + step + evidence path,
- no manual log tailing is needed to diagnose basic failures.

## 18) First Build Checklist (Implementation Order)

1. Create `tools/test-app` scaffold files.
2. Add smoke contract with 5 features.
3. Implement flows with stable selectors.
4. Implement runner + timeout + artifact output.
5. Add basic gates (coverage, feature pass, watchdog, evidence).
6. Add CI smoke workflow.

## 19) Decision Log

Decisions locked for this blueprint:
- Maestro is the Phase 1 UI driver.
- Smoke is strict and small.
- Permutation gate is deferred from smoke.
- Deterministic reset is mandatory.
- Evidence-first artifacts are mandatory.


# Handoff: Asset Not Showing on "Rooms & Inventory" (PropertyAssets / Step 3)

## Context
- App: MyAILandlord (Expo / React Native Web)
- Backend: Supabase hosted project `zxqhxjuwmkxevhkpqfzf` (`https://zxqhxjuwmkxevhkpqfzf.supabase.co`)
- Symptom seen on web at `http://localhost:8081`

## User-Reported Symptom
On **Landlord -> Property -> Rooms & Inventory (Step 3 / `PropertyAssets`)**:
- Room photos render correctly under each room.
- Assets & Inventory shows **0 assets / 0 asset photos**, even though the user says they:
  - added an asset, and
  - uploaded an asset photo.

## What I Verified (Not Guessing)
I queried the remote Supabase DB for the specific property where this happened:
- `propertyId = 48d22f83-4a25-4ffd-bf9c-c410c7e9762d` (label shown in UI as "MB Vista")

Results:
- `public.property_areas`: **14 rows** exist for this property (room records exist; some with photos).
- `public.property_assets`: **0 rows** exist for this property.

Conclusion:
- For this property, the "missing asset" is **not in the DB**.
- The UI isn't rendering it because `PropertyAssets` for existing properties loads assets from `public.property_assets`.

Note: I did **not** paste any API keys in logs or chat. DB inspection was done using PostgREST with a service-role key obtained via `npx supabase projects api-keys` (key not shared).

## Strong Clue From UI Evidence
Earlier, the Add Asset screen showed a diagnostic banner containing:
- `Property: NO_PROPERTY_ID`
- plus `Draft: draft_...`

That indicates the asset-creation flow was running in **draft mode** (no `propertyId` available), not in "existing property" mode.

## Code-Path Analysis (Why This Produces the Symptom)
`AddAssetScreen` has two persistence modes:

1) Existing property mode (DB-backed)
- Requires `propertyId`.
- Inserts a row into `public.property_assets` (via `propertyAreasService.addAsset(...)`).
- Uploads photos to storage and links them.

2) Draft-only mode (AsyncStorage-backed)
- Happens when `propertyId` is missing but `draftId` exists.
- Saves a pending asset locally (AsyncStorage key like `pending_asset_${draftId}`).
- Does **not** insert into `public.property_assets`.

If the user enters Add Asset with `propertyId` missing, they can "successfully" add an asset in the UI, but it never hits the DB. When they later view the property in existing-property mode, the assets list is empty because the DB is empty.

## Relevant Files
- `src/screens/landlord/AddAssetScreen.tsx`
  - The branch that chooses DB insert vs AsyncStorage draft save.
- `src/services/supabase/propertyAreasService.ts`
  - `addAsset(...)`, `getAreasWithAssets(...)`.
- `src/screens/landlord/PropertyAssetsListScreen.tsx`
  - Loads areas+assets from DB for `propertyId` paths.
  - Also contains draft-merge logic for draft flows.
- `src/screens/landlord/PropertyDetailsScreen.tsx`
  - Navigates into `PropertyAssets` with `{ propertyId: property.id }` (expected).

## What We Tried / Attempted Solution So Far
- Verified the DB state for the property (assets table empty).
- Identified the likely failure mode: `AddAssetScreen` did not receive `propertyId` and silently fell back to draft-only save.
- Sketched the correct fix direction (below), but **have not yet implemented** the final behavioral change.

## Concrete Next Steps (To Actually Fix)
1) Prove whether the asset got written under a different `property_id`
- Query `public.property_assets` ordered by `created_at desc` (limit 50) and inspect `property_id`.
- If rows exist, the bug might be "wrong property_id passed".

2) Trace how `propertyId` gets lost on web
- Confirm the navigation route to `AddAsset` always includes `propertyId` when launched from an existing property.
- Confirm web refresh / URL query parsing behavior:
  - Some screens recover IDs from `window.location.search` when route params disappear.
  - `AddAssetScreen` might need the same recovery approach if route params are unreliable on web.

3) Stop "silent draft save" when editing an existing property
Pick one:
- Hard fail: if `propertyId` is missing, show a blocking error and do not allow save.
- Robust recovery: parse `propertyId` from URL query string (and/or require it in route params) so the DB-backed insert always occurs.

4) Add a regression test
- Playwright "real world" test:
  - Create property -> go to Rooms & Inventory -> add asset + photo -> refresh page -> verify asset still renders.
  - Optionally verify via PostgREST that a `public.property_assets` row exists for that `propertyId`.

## What I Need From Another LLM (If You're Handing Off)
Please focus on:
- Why `propertyId` is missing in `AddAssetScreen` on web in this flow.
- The safest fix that preserves draft flows while guaranteeing existing-property flows always persist to DB.
- A minimal Playwright test that catches regressions (asset present after refresh).

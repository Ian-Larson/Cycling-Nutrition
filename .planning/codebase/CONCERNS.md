# Codebase Concerns

**Analysis Date:** 2026-04-30

## Tech Debt

**Stale `vite.config.ts` base path after rename to Domestique:**
- Issue: `base` is hard-coded to `'/Cycling-Nutrition/'` for production builds (`base: command === 'build' ? '/Cycling-Nutrition/' : '/'`).
- Files: `vite.config.ts:7`
- Impact: All built asset URLs and the React Router `basename` (`import.meta.env.BASE_URL` in `src/App.tsx:19`) are nested under the old project name. If the GitHub Pages site is renamed/served at a different path, every link breaks. Also leaks the previous project identity in the deployed bundle paths.
- Fix approach: Rename to `'/Domestique/'` (or whatever the GitHub Pages repo slug becomes) and verify the deployed URL in `.github/workflows/deploy.yml` still resolves. Coordinate with the actual GitHub Pages repo name.

**Zombie `serviceEntries` state in store:**
- Issue: `state.serviceEntries: ServiceEntry[]` is declared, persisted, and has full CRUD (`addServiceEntry`, `updateServiceEntry`, `deleteServiceEntry`), but every normalization path (persist `merge`, `replaceAppData`, `initializeDefaults`, `getAppDataFromState`, `normalizeAppData`) hard-resets it to `[]`. No component, page, or hook outside the store reads or writes it.
- Files: `src/store/index.ts:80, 105, 526, 541, 584, 669, 784, 858-896, 1351, 1375, 1432`; `src/lib/cloud/app-state.ts:28, 55`; `src/lib/cloud/sync.ts:48`
- Impact: ~70 lines of dead reducers, dead type surface, dead serialized fields shipped to Supabase. Confusing for future work — looks like a feature when it is a stub. Newer Gear Hub features use `gearServiceEvents`/`gearInstallRecords` instead.
- Fix approach: Delete the field, the three actions, and the related `ServiceEntry` type once Gear Hub fully replaces the legacy service tracker. Add a one-shot store migration to drop persisted `serviceEntries` keys so they stop riding the cloud snapshot.

**Co-existing v2 (legacy) and v3 (new) fueling engines with `engineVersion` toggle:**
- Issue: `Settings.engineVersion: 'v2' | 'v3'` switches between two parallel implementations (`src/lib/calculator/` and `src/lib/fueling/`) with their own result components (`fuel-result.tsx` 424 lines vs `fuel-result-v3.tsx` 662 lines).
- Files: `src/store/index.ts:56, 219-227, 302-304`; `src/hooks/use-fueling-engine.ts`; `src/lib/fueling/migration/v2-to-v3.ts`; `src/components/planner/fuel-result.tsx`; `src/components/planner/fuel-result-v3.tsx`; `src/pages/planner.tsx`
- Impact: Doubles bundle size for fueling logic, doubles maintenance cost, branches every planner test path. Default is still `v2` (`DEFAULT_SETTINGS.engineVersion: 'v2'`), so the v3 work mostly ships unused.
- Fix approach: Pick a cutover plan. Either flip default to v3 + ship migration on first launch, or delete v3 if it has stalled. Track this as its own phase; don't merge new features into both.

**Oversized React components past comprehension threshold:**
- Issue: Several components exceed 500-900 lines of mixed JSX, hooks, parsers, and inline helpers.
- Files: `src/store/index.ts` (1455 lines), `src/components/planner/ride-form.tsx` (939), `src/pages/planner.tsx` (927), `src/components/gear/add-part-sheet.tsx` (774), `src/pages/power-meter-analyzer.tsx` (699), `src/lib/power-meter-analyzer/parsers.ts` (675), `src/components/planner/fuel-result-v3.tsx` (662), `src/components/gear/gear-inventory.tsx` (601), `src/pages/athlete.tsx` (562)
- Impact: `src/pages/planner.tsx` alone has 32 hook call sites; reasoning about render correctness is hard. Files this size break code review and make merge conflicts likely with multi-feature work.
- Fix approach: Split `src/store/index.ts` into per-domain slices (bottle, products, fuel-plans, bikes, gear) re-composed in one root file. Extract the form-derived state in `ride-form.tsx` into a `useRideForm` hook. Move heavy `<FuelResultV3>` sections (timeline, debug, totals) into sibling components.

**No `vite-env.d.ts` for `ImportMetaEnv`:**
- Issue: `src/lib/supabase/client.ts:11` uses `keyof ImportMetaEnv`, but no `src/vite-env.d.ts` (or equivalent) declares the project's env keys. Only the default Vite types apply, so `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_AUTH_REDIRECT_URL`, `VITE_STRAVA_CLIENT_ID`, `VITE_STRAVA_REDIRECT_URI` are typed as plain `string | undefined`.
- Files: `src/lib/supabase/client.ts:11`; `src/lib/auth/strava-provider.ts:9, 11`
- Impact: Misspelled env variable names compile fine. No surfaced contract for ops/CI.
- Fix approach: Add `src/vite-env.d.ts` with `interface ImportMetaEnv { readonly VITE_SUPABASE_URL: string; ... }` and `interface ImportMeta { readonly env: ImportMetaEnv; }`. Marks required vs optional explicitly.

**Unused/uncommitted root files:**
- Issue: Working tree contains untracked `PRODUCT.md` and a deleted `.impeccable.md` from the old tooling.
- Files: `PRODUCT.md`, `.impeccable.md`
- Impact: Status pollution, future confusion about whether `PRODUCT.md` is canonical.
- Fix approach: Either commit `PRODUCT.md` intentionally (if it's the new product brief) or move/delete it. Finalize the `.impeccable.md` deletion in a commit.

## Known Bugs

**Bottle inventory normalizer drops legacy `Bottle.isAvailable === false`:**
- Symptoms: Old persisted snapshots stored bottles as `Array<Bottle>`. The migration in `normalizeBottleCounts` skips entries with `isAvailable === false` and never surfaces a UI hint that bottles were dropped.
- Files: `src/store/index.ts:372-403` (the `if (incoming.isAvailable === false) continue;` branch)
- Trigger: User upgrading from a pre-`BottleInventory` schema with hidden bottles.
- Workaround: Manually re-add bottles in `Inventory`. Consider treating "unavailable" as "still in inventory but disabled" if any historical user actually needs them — but inventory is now a count, not flags, so this is mostly fine — flag for confirmation.

**`upsertBikesFromStrava` only claims primary on first-ever import:**
- Symptoms: When syncing from Strava, a bike marked `isPrimary` upstream becomes primary in the local store **only** when `state.bikes.length === 0`. If the user added a non-Strava bike first or re-syncs after adding more, the Strava-primary flag is silently ignored.
- Files: `src/store/index.ts:804-842` (`canClaimPrimary` guard)
- Trigger: Connect Strava after adding a manual bike, or run a second sync.
- Workaround: User must manually call `setPrimaryBike` after sync.

**Strava OAuth state stored in `sessionStorage` only:**
- Symptoms: If the user opens the Strava authorize URL in a different tab/window than where they clicked Connect, `sessionStorage` is empty in the callback tab and `validateStravaAuthState` returns false ("Strava state validation failed"). Same failure mode if browser blocks the storage or cleans it during redirect.
- Files: `src/lib/auth/strava-provider.ts:5, 22-31`; `src/pages/strava-callback.tsx:37-41`
- Trigger: Strava redirect lands in a new browser session/tab; private-mode browsers sometimes treat the redirect tab as a new context.
- Workaround: Tell user to retry. Long-term: also persist the state to `localStorage` keyed by a short-lived TTL, or send it through Supabase as the OAuth state value.

**Cloud sync race on rapid logout/login:**
- Symptoms: `signOut` flushes the writer (`src/lib/auth/auth-provider.tsx:311`), but the auth-state listener immediately clears `user` and the next sign-in's `runInitialSync` fires while `applyingCloudSnapshotRef` is set asynchronously via `queueMicrotask`. The store-subscribe path early-returns on `applyingCloudSnapshotRef.current`, but if a local write lands in the gap before the microtask, it can be uploaded with a `clientUpdatedAt` slightly newer than the cloud copy and overwrite legitimate cloud state.
- Files: `src/lib/auth/auth-provider.tsx:74-78, 187-192, 226-267`
- Trigger: Sign out → sign in fast cycles, or multi-tab usage.
- Workaround: Manual sync. Long-term: gate writer.schedule() on a synchronous "applying" flag set before `replaceAppData` runs.

**Cloud sync has no conflict resolution despite a `'conflict'` status:**
- Symptoms: `CloudSyncStatus` includes `'conflict'`, but no code path ever sets it. `initializeUserCloudState` always overwrites local with cloud (`replaceAppData(parsed.snapshot.data)`) and then takes a backup. Concurrent edits on two devices silently lose data on whichever device syncs second.
- Files: `src/lib/cloud/sync.ts:10-16, 104-143`; `src/lib/auth/auth-provider.tsx:63-64`
- Trigger: Edit on device A, sign in on device B before A's debounced (`1200ms`) write lands.
- Workaround: Manual sync, or sign out/in. Backup is saved under `cycling-nutrition-cloud-backup:<userId>:<iso>` (`src/lib/cloud/sync.ts:145-165`) so data is recoverable from `localStorage` but not exposed in the UI.

## Security Considerations

**Supabase Edge Functions accept `Authorization` header without validating audience/issuer beyond `auth.getUser()`:**
- Risk: `strava-token-exchange` and `strava-disconnect` rely solely on `userClient.auth.getUser()` succeeding. There's no IP/Origin validation; if a malicious page on another origin can steal a Supabase JWT, it can call these functions. CORS is `Access-Control-Allow-Origin: '*'` (`supabase/functions/_shared/cors.ts:2`).
- Files: `supabase/functions/strava-token-exchange/index.ts:42-64`; `supabase/functions/strava-disconnect/index.ts:21-37`; `supabase/functions/_shared/cors.ts:1-6`
- Current mitigation: Auth is verified via Supabase JWT; service-role writes use `SUPABASE_SERVICE_ROLE_KEY` (correct). RLS policies in `supabase/migrations/20260416000000_auth_cloud_sync.sql` lock down direct table access.
- Recommendations: Tighten CORS to the deployed origin (e.g., `https://<user>.github.io`) for production. Reject obviously malformed `code` (length cap, charset) before calling Strava. Add rate limiting on token-exchange.

**Strava `client_secret` lives in Supabase env — verify rotation policy:**
- Risk: `STRAVA_CLIENT_SECRET` is read from Deno env and used directly in the token exchange. Lost or leaked secrets give full re-issuing power for anyone with stolen `code` values.
- Files: `supabase/functions/strava-token-exchange/index.ts:55-75`
- Current mitigation: Secret is server-side only; the browser never sees it.
- Recommendations: Document rotation in `docs/`. Add monitoring for failed token exchanges.

**Strava OAuth `state` is generated client-side with `nanoid` and not bound to the Supabase user:**
- Risk: An attacker could trick a logged-in user into completing an OAuth flow against the attacker's Strava account, attaching the attacker's athlete to the victim's Domestique account.
- Files: `src/lib/auth/strava-provider.ts:20-31`; `supabase/functions/strava-token-exchange/index.ts:47-114`
- Current mitigation: `state` validation in the callback page and Supabase auth header on the edge function (so the `user_id` writing the row is the logged-in user). The OAuth `state` itself is not revalidated server-side.
- Recommendations: Generate `state` server-side (Edge Function pre-step) or sign it with the user's JWT and verify on the token-exchange call.

**`user_state.app_state` jsonb is unbounded:**
- Risk: Persistence column has no size cap. A malicious or malformed snapshot could blow up the cloud row size and slow queries.
- Files: `supabase/migrations/20260416000000_auth_cloud_sync.sql:1-6`
- Current mitigation: Schema is validated client-side in `parseSerializedAppState`, but the server only enforces `schema_version >= 1`.
- Recommendations: Add a CHECK constraint on payload size (e.g., `octet_length(app_state::text) < 1_000_000`) and matching client-side guard before upsert.

**`localStorage` cloud backups accumulate forever:**
- Risk: `saveCloudRestoreBackup` writes one snapshot per cloud restore keyed by ISO timestamp (`cycling-nutrition-cloud-backup:<userId>:<iso>`) and never prunes. Eventually fills the localStorage quota; new writes silently fail (`catch {}`).
- Files: `src/lib/cloud/sync.ts:145-165`
- Current mitigation: Try/catch swallows quota errors.
- Recommendations: Cap to N most-recent backups, prune older ones on each save.

## Performance Bottlenecks

**Single 760 kB JS bundle (no code splitting):**
- Problem: `npm run build` outputs `dist/assets/index-*.js` at **760.25 kB** (gzip 216 kB) and emits the Rollup chunk-size warning. Everything ships in one file: planner, gear, power-meter analyzer (`src/lib/power-meter-analyzer/parsers.ts` is 675 lines and contains GPX/TCX/CSV/FIT parsing), athlete, account.
- Files: `vite.config.ts:1-14` (no `manualChunks`); all routes in `src/App.tsx:31-71` are statically imported
- Cause: No `React.lazy` / dynamic `import()` boundaries; no `manualChunks`; the FIT parser and DOMParser-based TCX/GPX parsers load on every page.
- Improvement path:
  1. Lazy-load route components via `React.lazy(() => import('./pages/...'))` — easy 30-50% main-bundle drop because power-meter-analyzer and gear pages are large and orthogonal.
  2. Configure `build.rollupOptions.output.manualChunks` to split `@supabase/supabase-js` and the analyzer parsers.
  3. Consider lazy-loading the v3 fueling engine until `engineVersion === 'v3'` is selected.

**`replaceAppData` and `normalizeAppData` clone the entire snapshot on every cloud sync:**
- Problem: `serializeAppState` does a `JSON.parse(JSON.stringify(...))` deep clone (`src/lib/cloud/app-state.ts:42`), then the writer schedules a full snapshot every time *any* store key changes (`src/lib/auth/auth-provider.tsx:235-249` subscribes with no selector).
- Files: `src/lib/cloud/app-state.ts:42, 72-81`; `src/lib/auth/auth-provider.tsx:226-267`
- Cause: Subscriber fires for every `set()`. Even unrelated changes (toggling a UI tab if it ever lived in store) trigger a clone + Supabase upsert.
- Improvement path: Use a Zustand selector that returns only the persisted slice and a custom equality check (shallow). Use `structuredClone` instead of JSON round-trip when supported.

**XML parsing is on the main thread for analyzer files:**
- Problem: `parseXml` uses `DOMParser` synchronously on TCX/GPX files which can be megabytes. Every trackpoint walk uses `Array.from(doc.getElementsByTagName('*')).filter(...)`, which is O(N) over all elements.
- Files: `src/lib/power-meter-analyzer/parsers.ts:126-188`
- Cause: No streaming, no Web Worker, full-document scan.
- Improvement path: Run parsing in a Web Worker for large files, or at least scope to specific tag selectors (`getElementsByTagNameNS`) instead of scanning every element.

## Fragile Areas

**Dual schema-version strategy: persisted `cycling-nutrition-storage` and cloud `APP_STATE_SCHEMA_VERSION = 2`:**
- Files: `src/store/index.ts:1406-1453`; `src/lib/cloud/app-state.ts:8`; `src/lib/cloud/sync.ts`
- Why fragile: The Zustand `persist` middleware uses no `version`/`migrate` config, while the cloud snapshot has its own `schemaVersion`. Migrations live entirely in normalizer functions (`normalizeProducts`, `normalizeFuelPlans`, etc.) that silently coerce. A breaking change can pass schema-version `=== 2` but be incompatible.
- Safe modification: Add a `version` + `migrate` to the `persist` config and reserve `APP_STATE_SCHEMA_VERSION` bumps for actual breaking changes. Write integration tests for old payloads.
- Test coverage: `src/lib/cloud/app-state.test.ts` exists; no test covers persist-layer migration.

**Complex `useEffect` chains in `AuthProvider`:**
- Files: `src/lib/auth/auth-provider.tsx:126-271` (4 sequential effects, refs for "applying" / "initializing" guards, debounced writer in a third effect)
- Why fragile: Effect ordering between Supabase `onAuthStateChange`, initial sync, and store subscription is not deterministic across React 19 StrictMode double-mounts. Refs (`applyingCloudSnapshotRef`, `initializingCloudRef`) are the only thing preventing feedback loops.
- Safe modification: Add tests with a mocked Supabase client that exercises StrictMode double-mount and rapid sign-out/sign-in. Consider extracting cloud-sync orchestration into a non-React module that emits events.
- Test coverage: `src/lib/cloud/sync.test.ts` covers the pure functions but not the provider effects.

**`vite.config.ts` `base` couples deployed URL to repo name:**
- Files: `vite.config.ts:7`; `src/App.tsx:19`; `src/lib/supabase/client.ts:16-24`
- Why fragile: `BASE_URL` flows into router basename, Supabase auth redirect URL, and Strava redirect URL fallback. A single string change cascades everywhere; mismatched values produce silent OAuth-callback failures (callback runs at the wrong URL, no session is found).
- Safe modification: Centralize the base path in one constant; keep the GitHub Pages workflow secrets (`VITE_SUPABASE_AUTH_REDIRECT_URL`, `VITE_STRAVA_REDIRECT_URI`) in sync with `vite.config.ts` `base`.

## Missing Features / Gaps

**No app-level `ErrorBoundary`:**
- Problem: `src/App.tsx` mounts `BrowserRouter > AuthProvider > Routes` with no error boundary. Any unhandled render error in a page (e.g., a broken FIT file kills the analyzer page mount) blanks the entire app.
- Files: `src/App.tsx:1-77`; no `ErrorBoundary` or `componentDidCatch` exists in the repo (`grep` confirms).
- Blocks: Graceful recovery from page-level failures, especially analyzer parsing.
- Recommendation: Add a top-level boundary with a fallback that suggests reloading and links back to home; consider per-route boundaries around analyzer and gear pages.

**No structured logging or error reporting:**
- Problem: There are zero `console.*` calls and no Sentry / observability integration. Errors are surfaced only as `setSyncMessage(...)` strings.
- Files: confirmed via `grep -rn "console\."` returning empty for `src/`
- Blocks: Triaging production failures (cloud sync, Strava OAuth, analyzer parsing) — ops would have to ask the user for screenshots.
- Recommendation: Add a minimal logger module with dev-only `console` and a hook for an external sink (Sentry, Logflare).

**No conflict UI for cloud sync:**
- Problem: Status `'conflict'` exists but is never produced; users have no way to resolve a multi-device divergence.
- Files: `src/lib/cloud/sync.ts:10-16`
- Recommendation: Detect divergence by comparing `clientUpdatedAt` to a stored "last-known cloud" timestamp; show a modal letting user pick local or cloud.

**Multi-tab sync is not handled:**
- Problem: Two open tabs both subscribe to the store and both upload snapshots. There's no `BroadcastChannel`/storage-event listener to keep tabs in sync.
- Files: `src/lib/auth/auth-provider.tsx:226-267`
- Recommendation: Subscribe to `storage` events on the Zustand persist key and reconcile in-memory state.

## Test Coverage Gaps

**Component, page, and hook layers are nearly untested:**
- What's not tested: 67 component files in `src/components/` ship with **only one** test (`src/components/layout/navigation.test.ts`). Zero tests in `src/pages/` (10 pages) and zero tests in `src/hooks/` (`use-fueling-engine.ts`, `use-strava-gear.ts`).
- Files: see `find src/components -name "*.test.*"` returning a single file
- Risk: Page-level regressions (planner step navigation, OAuth callbacks, gear edit flows) ship undetected. The big files (`src/pages/planner.tsx` 927 lines, `src/components/planner/ride-form.tsx` 939 lines) have no UI tests.
- Priority: High — especially for the planner step machine, the cloud-sync hooks in `AuthProvider`, and the OAuth callback pages.

**`AuthProvider` (cloud sync orchestration) has no test:**
- What's not tested: The 400-line provider that wires Supabase auth ↔ Zustand store ↔ Strava connection.
- Files: `src/lib/auth/auth-provider.tsx`; only `src/lib/auth/strava-provider.test.ts` exists for that whole directory.
- Risk: Race conditions and effect-ordering bugs (see Fragile Areas) cannot be verified.
- Priority: High.

**Supabase Edge Functions are untested:**
- What's not tested: `supabase/functions/strava-token-exchange/index.ts`, `supabase/functions/strava-disconnect/index.ts`, `supabase/functions/strava-gear-list/`.
- Files: no `.test.ts` files under `supabase/functions/`.
- Risk: Auth/permission regressions in the only server code in the repo go undetected. Strava token storage is sensitive.
- Priority: High.

**Power-meter analyzer parsers have a test, but real-world fixtures are limited:**
- What's not tested: Edge cases in the FIT parser (developer fields, custom message types) and large GPX/TCX files.
- Files: `src/lib/power-meter-analyzer/parsers.test.ts` (435 lines, but mostly synthetic).
- Risk: Real Garmin/Wahoo files crash the analyzer page (no error boundary).
- Priority: Medium.

**Persist-layer migration is uncovered:**
- What's not tested: `src/store/index.ts:1407-1452` (`merge` callback). No test loads an old persisted snapshot and asserts the migrated shape.
- Files: `src/store/index.test.ts` (412 lines) covers actions but not persist.
- Risk: A schema change silently corrupts existing user data on next load.
- Priority: High.

**Index-based React keys in render-mapped lists:**
- What's not tested / what's wrong: `key={i}` and `key={index}` patterns in fuel-result render lists cause incorrect reconciliation when items reorder.
- Files: `src/components/planner/fuel-result.tsx:119, 232`; `src/components/planner/fuel-result-v3.tsx:276, 541`
- Risk: Subtle UI bugs (focus loss, animation glitches, stale checkbox state) when notes/timeline items are reordered.
- Priority: Low (cosmetic now, can grow into bugs as features are added).

---

*Concerns audit: 2026-04-30*

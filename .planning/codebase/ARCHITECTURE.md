<!-- refreshed: 2026-04-30 -->
# Architecture

**Analysis Date:** 2026-04-30

## System Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                          UI Layer                                │
│  Pages (src/pages/*.tsx)         Components (src/components/*)   │
│  - planner.tsx                   - planner/  - gear/             │
│  - athlete.tsx                   - products/ - analyzer/         │
│  - inventory.tsx                 - layout/   - ui/ (primitives)  │
│  - history.tsx                                                   │
│  - gear.tsx, gear-inventory.tsx                                  │
│  - account.tsx, athlete.tsx                                      │
│  - power-meter-analyzer.tsx                                      │
│  - auth-callback.tsx, strava-callback.tsx                        │
└──────────────────┬──────────────────┬───────────────────────────┘
                   │                  │
        useStore selectors      buildPrescription / calculateFuelPlan
                   │                  │
                   ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Domain Logic Layer (src/lib)                    │
│   calculator/    fueling/      gear/         planner/            │
│   (v2 engine)    (v3 engine)   (lifecycle)   (drafts/summaries)  │
│   athlete/       auth/         cloud/        power-meter-        │
│   (units)        (Supabase+    (sync)        analyzer/           │
│                   Strava)                                        │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              State Layer (Zustand + persist + immer)             │
│              `src/store/index.ts`  — single root store           │
└──────────────────┬──────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌─────────────────┐   ┌──────────────────────────────────────────┐
│ localStorage    │   │  Supabase (cloud)                         │
│ key: "cycling-  │   │  - auth (magic-link OTP)                  │
│ nutrition-      │   │  - user_state table (full snapshot)       │
│ storage"        │   │  - strava_connections table               │
└─────────────────┘   │  - edge function: strava-token-exchange   │
                      └──────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App shell + routing | Mounts BrowserRouter, AuthProvider, primes defaults | `src/App.tsx` |
| Root entry | Mounts React StrictMode tree | `src/main.tsx` |
| Zustand root store | Single source of truth for all client state, with immer + persist middleware | `src/store/index.ts` |
| AuthProvider | Supabase session, cloud sync orchestration, Strava connection | `src/lib/auth/auth-provider.tsx` |
| AuthContext | Exposes auth/sync/strava state to consumers | `src/lib/auth/auth-context.ts` |
| Cloud sync repository | Reads/writes `user_state` rows in Supabase | `src/lib/cloud/sync.ts` |
| Cloud snapshot codec | Serialize/parse `AppDataSnapshot` ↔ `SerializedAppState` | `src/lib/cloud/app-state.ts` |
| v2 calculator engine | Carb / hydration / bottle / solid allocation (legacy) | `src/lib/calculator/index.ts` |
| v3 fueling engine | Layered, science-cited prescription builder | `src/lib/fueling/index.ts` |
| Engine router hook | Selects v2 vs v3 path from settings | `src/hooks/use-fueling-engine.ts` |
| Gear lifecycle/derivers | Active setup, life bar, due dates, normalizers | `src/lib/gear/` |
| Planner draft helpers | Build/restore planner drafts + summaries | `src/lib/planner/` |
| Power meter analyzer | FIT/CSV parsing + analysis | `src/lib/power-meter-analyzer/` |
| Supabase client | Cached singleton + env config | `src/lib/supabase/client.ts` |
| Primary navigation | Header + mobile bottom nav, route matching | `src/components/layout/` |
| UI primitives | Reusable Button, Card, Dialog, Tabs, etc. | `src/components/ui/` |

## Pattern Overview

**Overall:** Local-first, single-page React SPA with a centralized Zustand store, layered pure-function domain libraries, and an optional Supabase-backed cloud-sync layer.

**Key Characteristics:**
- **Local-first persistence** — `zustand/middleware/persist` writes the entire app state to `localStorage` under key `"cycling-nutrition-storage"`. The app is fully usable in guest mode without any backend.
- **Single root store** — `useStore` in `src/store/index.ts` exposes all state slices (bottles, products, fuel plans, settings, planner draft, bikes, gear catalog/instances/install records/service events) plus all mutator actions in one create() call.
- **Pure domain libraries** — Logic under `src/lib/calculator/`, `src/lib/fueling/`, `src/lib/gear/`, `src/lib/planner/` is side-effect-free and does not import from the store. Pages compose store reads with library calls.
- **Layered v3 fueling engine** — `src/lib/fueling/` follows a strict dependency chain: `constants → types → context → targets → inventory → timeline → validation → migration` (see `src/lib/fueling/README.md`).
- **Two engines side-by-side** — v2 (`src/lib/calculator/`) and v3 (`src/lib/fueling/`) coexist; switching is via `settings.engineVersion` ('v2' | 'v3') routed through `useFuelingEngine`.
- **Path alias** — `@/` resolves to `src/` (Vite alias in `vite.config.ts`, mirrored in `tsconfig.json`).
- **Strict normalization at boundaries** — Persisted/imported state passes through `normalizeProducts`, `normalizeBottleCounts`, `normalizeFuelPlans`, `normalizePlannerDraft`, `normalizeSettings`, and gear normalizers in the store's persist `merge` and `replaceAppData`.

## Layers

**UI Layer (Pages + Components):**
- Purpose: Render UI, capture input, dispatch store actions, and call domain libraries to compute derived values.
- Location: `src/pages/`, `src/components/`
- Contains: Route components, feature components (planner, gear, products, analyzer), layout chrome, UI primitives.
- Depends on: `src/store`, `src/lib/*`, `src/hooks/*`, `src/types`.
- Used by: `src/App.tsx` router.

**Domain Logic Layer (`src/lib/`):**
- Purpose: Pure computation — fuel calculation, gear lifecycle derivation, planner draft building, FIT parsing, normalization, auth/sync orchestration.
- Location: `src/lib/`
- Contains: Sub-libraries by feature (`calculator/`, `fueling/`, `gear/`, `planner/`, `power-meter-analyzer/`, `athlete/`, `auth/`, `cloud/`, `supabase/`).
- Depends on: `src/types`, occasionally each other (e.g. `fueling/adapters/from-v2-inputs.ts` reads v2 types).
- Used by: Pages, hooks, the store's normalizer chain, and the cloud sync layer.

**State Layer (`src/store/`):**
- Purpose: Hold all mutable client state; mediate persistence and cloud sync.
- Location: `src/store/index.ts`
- Contains: `useStore` (Zustand+immer+persist), `AppState` interface, action implementations, normalizers, `getAppDataFromState`, `normalizeAppData`, `getReadinessFromState`, `DEFAULT_SETTINGS`.
- Depends on: `src/types`, `src/lib/defaults` (`DEFAULT_BOTTLE_COUNTS`, `DEFAULT_PRODUCTS`), `src/lib/athlete/anthropometrics`, `src/lib/gear/normalizers`, `src/lib/gear/constants`.
- Used by: Every page and most components via `useStore` selectors; `AuthProvider` calls `useStore.getState()` and subscribes to changes for cloud sync.

**Persistence Layer:**
- Purpose: Persist `AppDataSnapshot` locally and (when authed) to the cloud.
- Local: `localStorage` via `zustand/middleware/persist` — key `"cycling-nutrition-storage"`. `persist.merge` re-runs all normalizers on every load.
- Cloud: Supabase `user_state` table, written by `SupabaseCloudStateRepository.upsertUserState` in `src/lib/cloud/sync.ts`. Schema is versioned (`APP_STATE_SCHEMA_VERSION = 2` in `src/lib/cloud/app-state.ts`).
- Backups: `saveCloudRestoreBackup` writes `cycling-nutrition-cloud-backup:{userId}:{ISO}` snapshots to localStorage before restoring cloud state.

## Data Flow

### Primary Request Path — Building a Fuel Plan

1. User opens `/` (planner). `App.tsx` (`src/App.tsx:33`) routes to `PlannerPage` (`src/pages/planner.tsx:1`).
2. `PlannerPage` reads `bottleCounts`, `products`, `settings`, `plannerDraft` from `useStore` and renders `RideForm` + `SetupCard` + `InventoryRailPanel`.
3. `RideForm` (`src/components/planner/ride-form.tsx`) collects ride characteristics and calls `setPlannerDraft` actions on the store.
4. On submit, page composes a `CalculatorInput` and calls either:
   - `calculateFuelPlan(input)` from `src/lib/calculator/index.ts:56` (v2), or
   - `useFuelingEngine().buildV3(...)` (`src/hooks/use-fueling-engine.ts:53`) which calls `buildPrescription` (`src/lib/fueling/index.ts:51`) (v3).
5. Result rendered by `FuelResult` (`src/components/planner/fuel-result.tsx`) or `FuelResultV3` (`src/components/planner/fuel-result-v3.tsx`).
6. On save, `useStore.saveFuelPlan(...)` (`src/store/index.ts:718`) appends to `state.fuelPlans` (immer mutation).
7. `persist` middleware writes to `localStorage`. If authenticated, `AuthProvider`'s `useStore.subscribe` listener (`src/lib/auth/auth-provider.tsx:235`) schedules a debounced (1200ms) cloud upsert.

### Cloud Sync Flow (signed-in users)

1. `AuthProvider` mounts; calls `supabase.auth.getSession()` and `onAuthStateChange`.
2. On user resolved, runs `initializeUserCloudState` (`src/lib/cloud/sync.ts:104`):
   - If no cloud row → uploads local snapshot (`uploaded-local`).
   - If cloud row exists → calls `parseSerializedAppState` and `replaceAppData` to overwrite local state, after first persisting a localStorage backup via `saveCloudRestoreBackup`.
3. After init, subscribes to `useStore` changes → `createDebouncedCloudWriter` schedules `upsertUserState`.
4. `online`/`beforeunload` handlers re-schedule and flush the debounced writer.
5. `cloudSyncStatus` ('idle' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error') is exposed on `AuthContext` and shown via `SyncStatusBadge`.

### Strava OAuth Flow

1. User clicks "Connect Strava" on `/account` (`src/pages/account.tsx`).
2. `AuthProvider.connectStrava` builds an authorize URL via `createStravaProvider` (`src/lib/auth/strava-provider.ts`) using `VITE_STRAVA_CLIENT_ID` and redirects.
3. Strava redirects to `/auth/strava/callback` → `StravaCallbackPage` (`src/pages/strava-callback.tsx`).
4. Page calls `exchangeStravaCode` (`src/lib/auth/strava-service.ts:48`) which invokes the `strava-token-exchange` Supabase Edge Function (`supabase/functions/`).
5. The function persists tokens server-side and returns a `StravaConnection`. `AuthProvider.refreshStravaConnection` reloads it.
6. `useStravaGear` hook (`src/hooks/use-strava-gear.ts`) fetches bikes and the gear page calls `upsertBikesFromStrava` (`src/store/index.ts:804`).

**State Management:**
- All shared state lives in the Zustand root store. Pages read with selectors (`useStore((s) => s.x)`); local UI state uses `useState`/`useReducer`. The store uses `immer` so mutations are written as `state.products.push(...)` rather than spreads.

## Key Abstractions

**`AppState` / `AppDataSnapshot`:**
- Purpose: The shape of all client-persisted data plus mutator action signatures.
- Examples: `src/store/index.ts:73` (`AppDataSnapshot`), `src/store/index.ts:98` (`AppState`).
- Pattern: Single big interface with embedded actions; `AppDataSnapshot` is the persisted/serialized subset (no methods, no `_initialized`).

**`FuelPlan` / `FuelingPrescription`:**
- Purpose: Output of v2 vs v3 engine respectively.
- Examples: `src/types/fuel-plan.ts:36`, `src/lib/fueling/types/prescription.ts`.
- Pattern: v2 emits `FuelPlan` with `bottles`, `solids`, `consumptionGuide`, `summary`. v3 emits `FuelingPrescription` with `pre`, `during`, `post`, `daily`, `packList`, `timeline`, `confidence`, `engineVersion: 'v3'`.

**`CalculatorInput` / `FuelingInput`:**
- Purpose: Pure inputs to the engines; constructed by the planner page and the v2→v3 adapter.
- Examples: `src/lib/calculator/index.ts:16`, `src/lib/fueling/index.ts:36`, `src/lib/fueling/adapters/from-v2-inputs.ts`.
- Pattern: Plain data; engines never read from the store.

**`Bike` / `GearPartCatalogItem` / `GearPartInstance` / `GearInstallRecord` / `GearServiceEvent`:**
- Purpose: Gear Hub model. Catalog (definitions) → Instances (physical parts) → Install records (lifecycle on a bike slot) → Service events.
- Examples: `src/types/gear.ts:1` and following.
- Pattern: Records connected by IDs and lifecycle status; derivers in `src/lib/gear/derive-active-setup.ts` and `src/lib/gear/derive-gear-due.ts` produce read-only views.

**`SerializedAppState`:**
- Purpose: Versioned envelope for cloud snapshots: `{ schemaVersion, clientUpdatedAt, data }`.
- Examples: `src/lib/cloud/app-state.ts:10`.
- Pattern: Always normalized through `parseSerializedAppState` on read; never trusted as-is.

**`PlannerDraft`:**
- Purpose: In-progress planner inputs persisted across navigation.
- Examples: `src/store/index.ts:64`, `src/lib/planner/saved-plan-draft.ts`.
- Pattern: `setPlannerDraft` writes; `consumePlannerDraft` reads-and-clears.

**v3 Fueling layered modules:**
- `constants/science.ts` — Citable numbers with JSDoc paper references (single source).
- `types/` — Domain types, no behavior.
- `context/build-context.ts` — Resolves rider/session/environment/purpose into `Context`.
- `targets/` — Independent calculators: `carb-target`, `hydration-target`, `sodium-target`, `caffeine-target`, `pre-ride-target`, `post-ride-target`, `daily-target`, `carb-load`, `bottle-constraints`.
- `inventory/` — `select-bottles`, `allocate-mix`, `allocate-solids`.
- `timeline/` — `pre-ride-timeline`, `during-timeline`, `post-ride-timeline`, `merge`.
- `validation/` — `validate.ts` (`validatePrescription`), `confidence.ts`.
- `migration/v2-to-v3.ts` — One-way translation from legacy v2 inputs.

## Entry Points

**Browser entry:**
- Location: `src/main.tsx`
- Triggers: Loaded by `index.html` (`<script type="module" src="/src/main.tsx">`).
- Responsibilities: Imports `index.css` (Tailwind v4 + IBM Plex font), creates root, mounts `<App />` in `<StrictMode>`.

**App shell:**
- Location: `src/App.tsx`
- Triggers: Mounted by `main.tsx`.
- Responsibilities: Sets up `BrowserRouter` with Vite `BASE_URL` basename, wraps tree in `AuthProvider`, renders `<Header />`, the `<Routes>` table, and `<MobileNav />`. Calls `useStore.initializeDefaults()` once on mount.

**Routes table (`src/App.tsx:32-59`):**

| Path | Page Component | File |
|------|---------------|------|
| `/` | `PlannerPage` | `src/pages/planner.tsx` |
| `/athlete` | `AthletePage` | `src/pages/athlete.tsx` |
| `/inventory` | `InventoryPage` | `src/pages/inventory.tsx` |
| `/history` | `HistoryPage` | `src/pages/history.tsx` |
| `/gear` | `GearPage` | `src/pages/gear.tsx` |
| `/gear/inventory` | `GearInventoryPage` | `src/pages/gear-inventory.tsx` |
| `/account` | `AccountPage` | `src/pages/account.tsx` |
| `/power-meter-analyzer` | `PowerMeterAnalyzerPage` | `src/pages/power-meter-analyzer.tsx` |
| `/auth/callback` | `AuthCallbackPage` | `src/pages/auth-callback.tsx` |
| `/auth/strava/callback` | `StravaCallbackPage` | `src/pages/strava-callback.tsx` |

Legacy paths (`/nutrition-plan`, `/bottles`, `/products`, `/labs`, `/settings`) all `<Navigate replace>` to current routes.

**Build entry:**
- Location: `vite.config.ts`
- Triggers: `npm run build` / `npm run dev`.
- Responsibilities: Configures React + Tailwind plugins, sets `base: '/Cycling-Nutrition/'` in build (GitHub Pages path), `'/'` in dev. Defines `@` → `./src` alias.

## Architectural Constraints

- **Threading:** Single-threaded browser main thread. No web workers. Cloud writes are debounced (1200ms) but not queued across tabs — last writer wins. The pre-existing v3 README forbids `Date.now()`/`new Date()`/random inside the engine; callers inject timestamps.
- **Global state:** Zustand `useStore` is a module-level singleton. `AuthProvider` calls `useStore.getState()` and `useStore.subscribe(...)` from inside React effects. The Supabase client is also a module-level cached singleton (`cachedClient` in `src/lib/supabase/client.ts:9`).
- **No SSR:** Pure SPA — `getDefaultAuthRedirectUrl` and storage helpers guard `typeof window === 'undefined'` for tests, but no server runtime exists. Build emits `dist/` and copies `index.html` to `dist/404.html` for GitHub Pages SPA fallback (see `package.json` `build` script).
- **Single Supabase project per environment:** Configured by `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_SUPABASE_AUTH_REDIRECT_URL`. When absent, the app silently falls back to guest mode (no cloud sync).
- **GitHub Pages basename:** `vite.config.ts` hardcodes `base: '/Cycling-Nutrition/'` for production builds. Routing uses `import.meta.env.BASE_URL` for `BrowserRouter`.
- **v2/v3 dual engines:** v3 (`src/lib/fueling/`) must not import from v2 (`src/lib/calculator/`). The only allowed bridge is `src/lib/fueling/adapters/from-v2-inputs.ts`. v2 still owns the planner page's primary code path; v3 runs only when `settings.engineVersion === 'v3'` and rider mass is present.
- **Schema-versioned cloud snapshots:** `APP_STATE_SCHEMA_VERSION = 2`. Older snapshots must round-trip through `parseSerializedAppState` which falls back to local snapshot on parse failure.

## Anti-Patterns

### Reaching into the store from inside engine code

**What happens:** A library under `src/lib/calculator/`, `src/lib/fueling/`, or `src/lib/gear/` imports `useStore`.
**Why it's wrong:** Breaks purity, blocks unit tests, and couples computation to UI state. The whole engine layer is designed as pure functions of inputs.
**Do this instead:** Pass the data the function needs as arguments. See how the planner page composes a `CalculatorInput` and passes it to `calculateFuelPlan` (`src/pages/planner.tsx` → `src/lib/calculator/index.ts:56`), or how `useFuelingEngine.buildV3` builds a `FuelingInput` from props and store-read values (`src/hooks/use-fueling-engine.ts:53`).

### Inlining magic numbers in the v3 engine

**What happens:** A literal carb/sodium/heat threshold is added directly inside a `targets/` or `inventory/` module.
**Why it's wrong:** v3's contract (see `src/lib/fueling/README.md`) is "single source of citable numbers." Inline numbers cannot be audited and silently drift from the cited science.
**Do this instead:** Add the number to `src/lib/fueling/constants/science.ts` with a JSDoc citation, export it, and import from `@/lib/fueling/constants/science`.

### Mutating persisted state without going through normalizers

**What happens:** Code reads or writes `localStorage` directly, or imports raw cloud JSON without parsing it.
**Why it's wrong:** State has evolved (legacy `bottles` array → keyed `bottleCounts`, legacy `gutTrained` boolean → `gutTrainingTargetGph` number, etc.). The normalizers in `src/store/index.ts` (`normalizeProducts`, `normalizeBottleCounts`, `normalizeFuelPlans`, `normalizeSettings`, `normalizePlannerDraft`) and the gear normalizers in `src/lib/gear/normalizers.ts` are the contract.
**Do this instead:** Use `useStore.replaceAppData(snapshot)` (which calls `normalizeAppData`) for full restores, or `parseSerializedAppState(...)` (`src/lib/cloud/app-state.ts`) for cloud payloads.

### Adding a new persisted field without updating the snapshot path

**What happens:** A new top-level field is added to `AppState` but not added to `AppDataSnapshot`, `getAppDataFromState`, `normalizeAppData`, the persist `merge` function, or `serializeAppState`'s input type.
**Why it's wrong:** The field will not survive page reloads (persist `merge`) or cloud round-trips (`SerializedAppState`).
**Do this instead:** Update all five call sites: `AppState`, `AppDataSnapshot` (`src/store/index.ts:73`), `getAppDataFromState` (`src/store/index.ts:517`), `normalizeAppData` (`src/store/index.ts:550`), and the `persist.merge` block (`src/store/index.ts:1407`). Also update `withGearHubStateDefaults`/`SerializeAppStateInput` in `src/lib/cloud/app-state.ts` if the new data should sync.

### Bypassing `useFuelingEngine` to call v3 directly

**What happens:** A page imports `buildPrescription` and runs it without checking `engineVersion`/rider readiness.
**Why it's wrong:** v3 throws on missing rider mass. The `useFuelingEngine` hook centralizes the "is v3 selected and ready?" check.
**Do this instead:** Use `useFuelingEngine().buildV3(...)` and respect its `null` return as "fall back to v2." See `src/pages/planner.tsx` for the canonical pattern.

## Error Handling

**Strategy:** Defensive normalization at every persistence boundary; user-visible failure modes surfaced through React state and `<Alert>` / `<Toast>` UI primitives.

**Patterns:**
- **Engine warnings**, not throws: v2 `calculateFuelPlan` and v3 `buildPrescription` both return a `warnings: FuelPlanWarning[]` array. Throwing is reserved for true contract violations (`installGearPart` impossible installs, etc.) and surfaced to the UI via the calling action.
- **Cloud sync errors** are stored on `AuthContext` (`syncMessage`, `cloudSyncStatus: 'error'`) and rendered by `SyncStatusBadge` / `Alert`. `parseSerializedAppState` failures are non-fatal — they prevent overwrite and surface a message instead.
- **Auth errors** (`signInWithEmail`, `signOut`) set `authStatus: 'error'` and `authMessage`.
- **Guest mode fallback:** `getSupabaseClient()` returns `null` when env vars are missing; `AuthProvider` switches to `authStatus: 'guest'` with a message and no cloud sync runs.

## Cross-Cutting Concerns

**Logging:** No central logger. `console.warn` / `console.error` are used sparingly; user-visible state is favored over logs.

**Validation:**
- v3: `src/lib/fueling/validation/validate.ts` (`validatePrescription`) runs at the end of `buildPrescription` and merges per-target warnings.
- Store: Field-level normalizers (`normalizePositiveNumber`, `normalizeAge`, `normalizeGutTrainingTarget`, `clampCount`) gate every persisted write path.
- Forms: Local component-level checks; `zod` is a dep but not yet pervasive.

**Authentication:** Magic-link OTP via `supabase.auth.signInWithOtp`. Session is fetched on mount and tracked via `onAuthStateChange`. Strava is a secondary identity stored in `strava_connections`.

**Styling:** Tailwind CSS v4 via `@tailwindcss/vite` plugin. Theme variables defined in `src/index.css` (`@theme { ... }`). Class composition uses `clsx` + `tailwind-merge`. UI primitives in `src/components/ui/` are intended as the only sanctioned styling surface.

---

*Architecture analysis: 2026-04-30*

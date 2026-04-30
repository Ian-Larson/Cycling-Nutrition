# Codebase Structure

**Analysis Date:** 2026-04-30

## Directory Layout

```
Domestique/
├── index.html              # Vite SPA host page (mounts /src/main.tsx)
├── package.json            # Scripts: dev / build / preview / lint / test
├── vite.config.ts          # Vite + React + Tailwind plugin; "@" alias; GH Pages basename
├── tsconfig.json           # Project references → tsconfig.app.json + tsconfig.node.json
├── tsconfig.app.json       # App-side TS config (strict, bundler resolution)
├── tsconfig.node.json      # Node-side TS config (vite.config.ts)
├── eslint.config.js        # ESLint flat config (typescript-eslint + react-hooks + react-refresh)
├── CLAUDE.md               # Project instructions for Claude Code
├── README.md               # Public README
├── PRODUCT.md              # Product notes
├── public/                 # Static assets served as-is (vite.svg)
├── src/                    # Application source (see below)
├── supabase/               # Backend artifacts
│   ├── functions/          # Edge functions (e.g. strava-token-exchange)
│   └── migrations/         # SQL migrations (user_state, strava_connections)
├── Plans/                  # Approved planning docs (one .md per major effort)
├── docs/                   # Long-form docs (Overview, deep-research-report, superpowers/)
├── dist/                   # Build output (vite build → dist/, index.html copied to 404.html)
└── .planning/              # GSD planning artifacts (codebase maps live here)
    └── codebase/
```

```
src/
├── main.tsx                # Browser entry — createRoot → <StrictMode><App/></StrictMode>
├── App.tsx                 # BrowserRouter + AuthProvider + Routes table + Header/MobileNav
├── index.css               # Tailwind v4 import + @theme tokens (brand/shell/ink colors, fonts)
├── assets/                 # Source-tree static assets (react.svg)
├── components/             # React components grouped by feature
│   ├── ui/                 # Reusable primitives (Button, Card, Dialog, Tabs, ...)
│   ├── layout/             # App chrome: Header, MobileNav, PageIntro, SectionNav, navigation table
│   ├── planner/            # Fuel-plan UI: RideForm, SetupCard, FuelResult/V3, NutritionRail, ...
│   ├── products/           # Product card/form
│   ├── gear/               # Gear Hub: bike-pill-row, bike-system-card, install/remove sheets, ...
│   └── analyzer/           # Charts for power-meter analyzer (mean-max, scatter, time-series)
├── pages/                  # Route-level page components (one per route)
├── hooks/                  # Cross-page React hooks (use-fueling-engine, use-strava-gear)
├── lib/                    # Pure domain logic (no React, no store imports)
│   ├── calculator/         # v2 fuel calculator (carbs, bottles, solids, timing)
│   ├── fueling/            # v3 layered fueling engine (constants/types/context/targets/...)
│   ├── gear/               # Gear lifecycle: catalog-upsert, derive-active-setup, life-bar, ...
│   ├── planner/            # Planner draft + summary helpers
│   ├── power-meter-analyzer/ # FIT/CSV parsing + analysis
│   ├── athlete/            # Anthropometrics unit conversions
│   ├── auth/               # AuthProvider, AuthContext, Strava provider/service
│   ├── cloud/              # Cloud sync (Supabase repository + serialization + debounce)
│   └── supabase/           # Cached Supabase client + env config
├── store/                  # Zustand root store + persist + immer (single file)
│   ├── index.ts            # useStore, AppState, normalizers, DEFAULT_SETTINGS
│   ├── index.test.ts
│   └── gear-crud.test.ts
└── types/                  # Domain types (re-exported via index.ts)
    ├── index.ts            # Barrel: bottle + product + ride + fuel-plan + gear
    ├── bottle.ts           # BottleSize / BottleInventory + helpers
    ├── product.ts          # Product / NutritionInfo / ConcentrationRange
    ├── ride.ts             # RideCharacteristics / IntensityLevel / HeatFactor / AutoMetrics
    ├── fuel-plan.ts        # FuelPlan / BottleAllocation / SolidAllocation / ConsumptionGuideItem
    └── gear.ts             # Bike / GearPartCatalogItem / GearPartInstance / install/service records
```

## Directory Purposes

**`src/components/ui/`:**
- Purpose: Design-system primitives. Every page should reuse from here rather than styling ad hoc.
- Contains: `Alert`, `Badge`, `Button`, `Card`/`CardHeader`/`CardContent`, `Checkbox`, `Collapsible`, `Dialog`, `DividedRowList`, `IconButton`, `Input`, `PresetButtons`, `SegmentedControl`, `Select`, `SpecRow`, `Stepper`, `Tabs`/`TabList`/`Tab`/`TabPanel`, `Toast`, `Toggle`.
- Key files: `src/components/ui/index.ts` (barrel), individual `*.tsx` files per primitive.

**`src/components/layout/`:**
- Purpose: Page chrome + nav.
- Contains: `Header` (desktop), `MobileNav` (bottom dock), `PageIntro`, `SectionNav`, `SyncStatusBadge`, `CallbackCard`, plus a single source-of-truth nav table.
- Key files: `src/components/layout/header.tsx`, `src/components/layout/mobile-nav.tsx`, `src/components/layout/navigation.ts`, `src/components/layout/index.ts`.

**`src/components/planner/`:**
- Purpose: Fuel-plan UI feature.
- Key files: `ride-form.tsx`, `setup-card.tsx`, `nutrition-workspace-layout.tsx`, `nutrition-rail.tsx`, `inventory-rail-panel.tsx`, `saved-plans-rail-panel.tsx`, `planning-step-panel.tsx`, `step-navigation.tsx`, `drink-mix-selector.tsx`, `solid-fuel-selector.tsx`, `fuel-options-card.tsx`, `needs-intensity-bar.tsx`, `fuel-result.tsx` (v2), `fuel-result-v3.tsx` (v3), `debug-copy-button.tsx`.

**`src/components/gear/`:**
- Purpose: Gear Hub feature.
- Key files: `bike-pill-row.tsx`, `bike-system-card.tsx`, `gear-tabs.tsx`, `gear-sub-nav.tsx`, `gear-tab-ids.ts`, `active-setup-list.tsx`, `gear-due-list.tsx`, `gear-due-preview-band.tsx`, `gear-history-table.tsx`, `gear-life-bar.tsx`, `gear-inventory.tsx`, `add-part-sheet.tsx`, `install-part-sheet.tsx`, `remove-part-sheet.tsx`, `log-gear-service-sheet.tsx`, `edit-service-event-sheet.tsx`, `edit-bike-name-dialog.tsx`, `edit-bike-weight-dialog.tsx`, `overflow-menu.tsx`.

**`src/components/products/`:**
- Purpose: Product inventory cards + edit form.
- Key files: `product-card.tsx`, `product-form.tsx`.

**`src/components/analyzer/`:**
- Purpose: Visualizations for the power-meter labs page.
- Key files: `mean-max-chart.tsx`, `power-time-series-chart.tsx`, `scatter-chart.tsx`.

**`src/pages/`:**
- Purpose: Route entry points. One file per route in `App.tsx`.
- Key files: `planner.tsx`, `athlete.tsx`, `inventory.tsx`, `history.tsx`, `gear.tsx`, `gear-inventory.tsx`, `account.tsx`, `power-meter-analyzer.tsx`, `auth-callback.tsx`, `strava-callback.tsx`.

**`src/hooks/`:**
- Purpose: Cross-cutting React hooks that need store + library composition.
- Key files: `use-fueling-engine.ts` (v2/v3 router), `use-strava-gear.ts` (Strava bike fetch).

**`src/lib/calculator/` (v2 engine):**
- Purpose: Original carb-target / hydration / bottle / solid allocation engine.
- Key files: `index.ts` (`calculateFuelPlan`, `recalculatePlan`), `carbs.ts`, `bottles.ts` (`selectBottlesForHydration`, `allocateMixToBottles`, `BottleSlot`), `solids.ts` (`recommendSolids`), `timing.ts` (`generateConsumptionGuide`), `auto-target.ts`, `constants.ts`.

**`src/lib/fueling/` (v3 engine):**
- Purpose: Science-backed prescription engine. **Strict layering — see `src/lib/fueling/README.md`.**
- Subdirs (in dependency order, each may only import from layers above):
  - `constants/science.ts` — Citable numbers with JSDoc paper refs (single source).
  - `types/` — `rider`, `session`, `environment`, `purpose`, `prescription`.
  - `context/` — `build-context.ts`, `resolve-rider`, `resolve-session`, `resolve-environment`, `resolve-purpose`.
  - `targets/` — `carb-target`, `hydration-target`, `sodium-target`, `caffeine-target`, `pre-ride-target`, `post-ride-target`, `daily-target`, `carb-load`, `bottle-constraints`.
  - `inventory/` — `select-bottles`, `allocate-mix`, `allocate-solids`.
  - `timeline/` — `pre-ride-timeline`, `during-timeline`, `post-ride-timeline`, `merge`.
  - `validation/` — `validate.ts`, `confidence.ts`.
  - `migration/v2-to-v3.ts`, `adapters/from-v2-inputs.ts` — bridges from legacy state.
- Key files: `src/lib/fueling/index.ts` (`buildPrescription`, `FuelingInput`), `src/lib/fueling/format.ts`.

**`src/lib/gear/`:**
- Purpose: Gear lifecycle derivers + normalizers.
- Key files: `bike-system.ts`, `catalog-upsert.ts`, `constants.ts` (`isPartCategoryCompatibleWithSlot`), `derive-active-setup.ts`, `derive-gear-due.ts`, `life-bar.ts`, `lifecycle.ts`, `normalizers.ts` (`normalizeGearPartCatalog`/`...Instances`/`...InstallRecords`/`...ServiceEvents`), `part-mileage.ts`, `strava-gear.ts`.

**`src/lib/planner/`:**
- Purpose: Planner draft + plan summary helpers.
- Key files: `saved-plan-draft.ts`, `planner-summaries.ts` (`formatRideSummary`, `formatSetupSummary`, `getPlanTitleSuggestion`, `isRideSnapshotEquivalentToRide`).

**`src/lib/cloud/`:**
- Purpose: Cloud-sync glue.
- Key files: `app-state.ts` (`SerializedAppState`, `serializeAppState`, `parseSerializedAppState`, `APP_STATE_SCHEMA_VERSION`), `sync.ts` (`SupabaseCloudStateRepository`, `initializeUserCloudState`, `createDebouncedCloudWriter`, `saveCloudRestoreBackup`).

**`src/lib/auth/`:**
- Purpose: Auth + Strava integration.
- Key files: `auth-provider.tsx`, `auth-context.ts`, `strava-provider.ts` (authorize URL builder), `strava-service.ts` (Supabase RPC + edge-function calls), `types.ts`.

**`src/lib/supabase/`:**
- Purpose: Supabase singleton.
- Key files: `client.ts` (`getSupabaseClient`, `getSupabaseConfig`, `isSupabaseConfigured`).

**`src/lib/athlete/`:**
- Purpose: Anthropometric unit conversions / normalization.
- Key files: `anthropometrics.ts`.

**`src/lib/power-meter-analyzer/`:**
- Purpose: Power-meter ride file parsing (.fit / .csv) and stats.
- Key files: `parsers.ts`, `analysis.ts`, `types.ts`.

**`src/store/`:**
- Purpose: Single Zustand root store with persist + immer middleware.
- Key files: `src/store/index.ts` (the entire store + normalizers + helpers).

**`src/types/`:**
- Purpose: Domain types. Imported via `@/types` barrel.
- Key files: `index.ts`, `bottle.ts`, `product.ts`, `ride.ts`, `fuel-plan.ts`, `gear.ts`.

## Key File Locations

**Entry Points:**
- `index.html`: Vite SPA host page; loads `/src/main.tsx`.
- `src/main.tsx`: Mounts React tree, imports `index.css`.
- `src/App.tsx`: Router, AuthProvider, Header/MobileNav, default-priming via `useStore.initializeDefaults()`.

**Configuration:**
- `vite.config.ts`: Plugins (React, Tailwind), `@` alias → `src/`, GitHub Pages base path `/Cycling-Nutrition/` for builds.
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: TS project references; strict mode app-side.
- `eslint.config.js`: Flat config (typescript-eslint, react-hooks, react-refresh).
- `package.json`: Scripts and deps — `dev`, `build` (`tsc -b && vite build && cp dist/index.html dist/404.html`), `preview`, `lint`, `test` (vitest), `test:watch`.

**Core Logic:**
- `src/store/index.ts`: All client state + actions + normalizers.
- `src/lib/calculator/index.ts`: v2 engine entry (`calculateFuelPlan`, `recalculatePlan`).
- `src/lib/fueling/index.ts`: v3 engine entry (`buildPrescription`, `FuelingInput`).
- `src/hooks/use-fueling-engine.ts`: v2/v3 router hook.
- `src/lib/auth/auth-provider.tsx`: Auth + cloud sync orchestration.
- `src/lib/cloud/sync.ts`, `src/lib/cloud/app-state.ts`: Cloud sync repo + serialization.
- `src/components/layout/navigation.ts`: Single source of truth for primary + section nav routing.

**Testing:**
- Co-located `*.test.ts` files alongside source (e.g. `src/lib/calculator/index.test.ts`).
- Some libraries use a `__tests__/` directory: `src/lib/fueling/__tests__/`, plus per-layer `__tests__/` dirs under `src/lib/fueling/{constants,context,inventory,migration,targets,timeline,types,validation}/`.
- Runner: `vitest` (config inferred from defaults — no explicit `vitest.config.*` at repo root).

## Naming Conventions

**Files:**
- React components: `kebab-case.tsx` (e.g. `ride-form.tsx`, `bike-system-card.tsx`, `fuel-result-v3.tsx`).
- TS modules: `kebab-case.ts` (e.g. `derive-active-setup.ts`, `auto-target.ts`).
- Tests: `*.test.ts` / `*.test.tsx`, co-located or in a `__tests__/` directory.
- Barrel files: `index.ts` (and `src/components/ui/index.ts`, `src/components/layout/index.ts`).
- React entry retains uppercase: `App.tsx`, `main.tsx`.

**Directories:**
- `kebab-case` for feature folders (`gear/`, `planner/`, `power-meter-analyzer/`).
- Test folders use `__tests__/` (Jest/Vitest convention).

**Components / Types / Functions:**
- React components: `PascalCase` exports (`PlannerPage`, `BikeSystemCard`, `Card`).
- Types/interfaces: `PascalCase` (`AppState`, `FuelPlan`, `RideCharacteristics`).
- Functions: `camelCase` (`buildPrescription`, `calculateFuelPlan`, `selectBottlesForHydration`).
- Constants: `SCREAMING_SNAKE_CASE` (`BOTTLE_SIZES`, `EMPTY_BOTTLE_INVENTORY`, `APP_STATE_SCHEMA_VERSION`, `DEFAULT_SETTINGS`).
- Hooks: `useXxx` (`useStore`, `useFuelingEngine`, `useStravaGear`).

**Imports:**
- Always prefer `@/` alias over relative deep paths. Examples: `import { useStore } from '@/store';`, `import type { Product } from '@/types';`, `import { Card } from '@/components/ui';`.

## Where to Add New Code

**New page / route:**
- Create `src/pages/<slug>.tsx` exporting a `PascalCase` component.
- Register in `src/App.tsx` `<Routes>` table.
- If it appears in primary nav, add to `primaryNavItems` in `src/components/layout/navigation.ts`. If it's a sub-section, add under the corresponding `sectionNavItems` key.

**New feature component:**
- Pick the right feature folder under `src/components/<feature>/`. If it's a one-off for a page, keep it there; if reusable across features, consider promoting to `src/components/ui/`.
- Compose existing primitives from `src/components/ui` rather than restyling.

**New UI primitive:**
- Add `src/components/ui/<name>.tsx`.
- Re-export from `src/components/ui/index.ts`.

**New domain type:**
- Add to `src/types/<feature>.ts`.
- Re-export from `src/types/index.ts`.

**New v2 calculator helper:**
- Add to `src/lib/calculator/<topic>.ts` and re-export from `src/lib/calculator/index.ts` if it should be public.
- Keep it pure — no `useStore`, no `Date.now()` inside the callable.

**New v3 fueling number / target / module:**
- Numerical constant → `src/lib/fueling/constants/science.ts` with JSDoc citation. Never inline.
- New target calculator → `src/lib/fueling/targets/<name>.ts`, exported from `src/lib/fueling/targets/index.ts`. Take `Context` (from `context/build-context.ts`) as input.
- New inventory step → `src/lib/fueling/inventory/<name>.ts`, exported from `src/lib/fueling/inventory/index.ts`.
- New timeline source → `src/lib/fueling/timeline/<name>.ts`, then merge in `mergeTimelines`.
- Wire it into `buildPrescription` (`src/lib/fueling/index.ts`) and add layered tests under the matching `__tests__/` dir.

**New persisted state field:**
- Add to `AppState` and `AppDataSnapshot` in `src/store/index.ts`.
- Initialize in the `create()(immer((set,get)=>({ ... })))` initial-values block.
- Read it in `getAppDataFromState` (`src/store/index.ts:517`).
- Normalize it in `normalizeAppData` (`src/store/index.ts:550`).
- Read+normalize in the `persist.merge` block (`src/store/index.ts:1407`).
- If it should sync to cloud, update `SerializeAppStateInput` and `withGearHubStateDefaults` in `src/lib/cloud/app-state.ts`.
- Add tests in `src/store/index.test.ts` (or `gear-crud.test.ts` for gear).

**New gear lifecycle deriver:**
- Add to `src/lib/gear/derive-<name>.ts` as a pure function over the gear slices (catalog, instances, install records, service events).
- Test in `src/lib/gear/derive-<name>.test.ts`.

**New planner draft helper:**
- Add to `src/lib/planner/<name>.ts` (alongside `planner-summaries.ts`, `saved-plan-draft.ts`) and test co-located.

**New Strava / Supabase integration:**
- Auth/connection flows → extend `src/lib/auth/strava-service.ts` or `auth-provider.tsx`.
- Edge function → add under `supabase/functions/<name>/`. Migration → `supabase/migrations/`.

**Utility / shared helper:**
- If domain-tied, place under the right `src/lib/<feature>/`. If genuinely cross-cutting (e.g. number formatting), introduce `src/lib/util/` rather than dropping in `src/lib/`.

## Special Directories

**`Plans/`:**
- Purpose: Approved planning docs, one Markdown file per significant effort. Project rule (CLAUDE.md): every approved plan is named and placed here.
- Generated: No — written manually.
- Committed: Yes.

**`docs/`:**
- Purpose: Long-form product/research documentation (`Overview.md`, `deep-research-report.md`, `superpowers/`).
- Generated: No.
- Committed: Yes.

**`.planning/`:**
- Purpose: GSD planning workflow scratchpad. The `codebase/` subdir holds the maps generated by `/gsd:map-codebase`.
- Generated: Yes (by GSD commands).
- Committed: Mixed (this directory is the canonical store for GSD outputs).

**`supabase/`:**
- Purpose: Backend artifacts that ship with the repo.
- Contents: `functions/` (deployable edge functions, including `strava-token-exchange`), `migrations/` (SQL).
- Generated: No.
- Committed: Yes.

**`dist/`:**
- Purpose: Build output from `npm run build`. The build script copies `dist/index.html` to `dist/404.html` for GitHub Pages SPA fallback.
- Generated: Yes.
- Committed: Should be ignored (typical pattern; `.gitignore` not inspected here).

**`public/`:**
- Purpose: Vite static assets served at the site root (e.g. `vite.svg` referenced from `index.html`).
- Generated: No.
- Committed: Yes.

**`node_modules/`:**
- Purpose: npm install output.
- Generated: Yes.
- Committed: No.

---

*Structure analysis: 2026-04-30*

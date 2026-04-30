# Coding Conventions

**Analysis Date:** 2026-04-30

## Naming Patterns

**Files:**
- All TS/TSX files use **kebab-case**: `ride-form.tsx`, `auto-target.ts`, `setup-card.tsx`, `gear-inventory.tsx`
- Test files mirror source with `.test.ts` / `.test.tsx` suffix: `bottles.ts` → `bottles.test.ts`
- Some folders use `__tests__/` collocated dirs (e.g. `src/lib/fueling/__tests__/`, `src/lib/fueling/context/__tests__/`)
- Page components live in `src/pages/` and are also kebab-case: `power-meter-analyzer.tsx`, `auth-callback.tsx`
- Special root files preserve their conventional capitalization: `App.tsx`, `main.tsx`

**Functions:**
- **camelCase** throughout: `calculateFuelPlan`, `selectBottlesForHydration`, `allocateMixToBottles`, `formatDuration`, `getReadinessFromState`
- React components use **PascalCase**: `Button`, `Card`, `RideForm`, `SetupCard`, `NeedsIntensityBar`
- Custom hooks prefixed with `use`: `useFuelingEngine` (`src/hooks/use-fueling-engine.ts`), `useStravaGear` (`src/hooks/use-strava-gear.ts`), `useStore` (`src/store/index.ts`)

**Variables:**
- **camelCase** for locals and props: `bottleCounts`, `selectedDrinkMixId`, `totalCarbsNeeded`
- **SCREAMING_SNAKE_CASE** for module constants: `MIN_DURATION_MINUTES`, `MAX_OVERRIDE_CARBS_GPH`, `HYDRATION_FALLBACK_ML_PER_HOUR`, `BOTTLE_SIZES`, `DEFAULT_PRODUCTS` (see `src/lib/calculator/auto-target.ts`, `src/types/bottle.ts`)

**Types:**
- **PascalCase** for `interface` and `type` declarations: `AppState`, `RideCharacteristics`, `BottleSlot`, `FuelingPrescription`, `AthleteProfile`
- Prop types named `<Component>Props`: `ButtonProps`, `CardProps`, `SetupCardProps`, `RideFormProps`
- Discriminated unions use string literal members (e.g. `CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error'` in `src/lib/cloud/sync.ts`)

## Code Style

**Formatting:**
- No Prettier config detected (`.prettierrc*` absent). No `.editorconfig` either.
- Codebase consistently uses **single quotes** for strings, **2-space indentation**, semicolons, and trailing commas in multi-line literals.
- JSX uses double quotes for attribute values where Tailwind class strings appear.

**Linting:**
- Tool: **ESLint v9 (flat config)** at `eslint.config.js`
- Rule sets:
  - `@eslint/js` recommended
  - `typescript-eslint` recommended
  - `eslint-plugin-react-hooks` flat recommended
  - `eslint-plugin-react-refresh` (Vite preset)
- Globally ignored paths: `dist`, `.claude`
- `npm run lint` runs `eslint .` over the whole repo

**TypeScript Compiler:**
- `tsconfig.app.json` enables strict-mode workhorse flags:
  - `strict: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noFallthroughCasesInSwitch: true`
  - `noUncheckedSideEffectImports: true`
  - `verbatimModuleSyntax: true` (forces `import type` for type-only imports)
  - `erasableSyntaxOnly: true`
- Target: `ES2022`, JSX: `react-jsx`, module resolution: `bundler`

## Import Organization

**Order observed in source files (e.g. `src/components/planner/ride-form.tsx`, `src/store/index.ts`):**
1. React core and React-namespaced types: `import { useState, useCallback, type ChangeEvent } from 'react'`
2. Third-party packages: `react-router-dom`, `clsx`, `zustand`, `nanoid`, `@supabase/supabase-js`
3. Aliased internal modules using `@/`: `@/components/ui`, `@/lib/calculator/...`, `@/store`, `@/types`
4. Relative siblings last: `./needs-intensity-bar`, `./carbs`, `./bottles`

**Type-only imports:**
- Use `import type { ... }` for type-only references (driven by `verbatimModuleSyntax`).
- Inline `type` keyword used inside multi-import blocks: `import { useState, type ChangeEvent } from 'react'`.

**Path Aliases:**
- `@/*` → `./src/*` (declared in `tsconfig.app.json` and `vite.config.ts`)
- Used pervasively; relative imports only for siblings within the same feature folder.

## Error Handling

**Patterns:**
- Synchronous validation throws standard `Error` with descriptive messages (e.g. `src/lib/calculator/auto-target.ts:87` — `throw new Error(\`${fieldName} must be a positive number.\`)`).
- Service-layer Supabase wrappers re-throw upstream messages: `throw new Error(error.message)` (`src/lib/cloud/sync.ts:70,99`, `src/lib/auth/strava-service.ts:33,57,80`).
- React context guards throw when used outside their provider: `useAuth must be used within AuthProvider.` (`src/lib/auth/auth-context.ts:32`), and similar guards in `src/components/ui/tabs.tsx`, `src/components/ui/collapsible.tsx`.
- UI/event handlers wrap async work in `try { ... } catch (error) { ... }` with local error state + user-facing messages (`src/components/planner/ride-form.tsx:313`, `src/components/gear/gear-inventory.tsx:324`, `src/lib/auth/auth-provider.tsx:93`, `src/pages/strava-callback.tsx:58`).
- Validation/parse helpers return `{ ok: false, error }`-style results in cloud serialization (see `parseSerializedAppState` usage in `src/lib/cloud/sync.ts:133`) — prefer Result-like objects over throwing for parser code paths.

**Validation:**
- `zod` is a runtime dependency (`package.json`) — used for parsing serialized cloud state schemas.
- Domain helpers also do manual range checks and throw on failure (`auto-target.ts`).

## Logging

**Framework:** None. No `console.*` calls in `src/` (intentional — UI surfaces errors via `Alert`/`Toast`).

**Patterns:**
- User-visible errors are surfaced through `Alert` (`src/components/ui/alert.tsx`) and `Toast` (`src/components/ui/toast.tsx`) components rather than logged.
- Cloud sync exposes `CloudSyncStatus` state for UI consumption rather than logging.

## Comments

**When to Comment:**
- JSDoc blocks document non-obvious public APIs and hook contracts (e.g. `src/hooks/use-fueling-engine.ts` — `Router hook between the v2 calculator ... and the v3 fueling engine.`).
- Inline `//` comments mark numbered algorithm steps in calculation code (`src/lib/calculator/index.ts` — `// 1. Select bottles for hydration`, `// 2. Concentration → ideal drink carbs`, `// 3. Remainder → solids`).
- No file-level boilerplate headers; no license banners.

**JSDoc/TSDoc:**
- Used selectively on exported functions, hooks, and interface fields where the contract is non-obvious (e.g. `BuildV3Args.solidOverrides`, `UseFuelingEngineResult.v3Ready`).
- Not enforced; many simple exports are uncommented.

## Function Design

**Size:** Pure helpers in `src/lib/calculator/` and `src/lib/fueling/` are typically small (10–40 lines) and single-purpose. Larger orchestration functions like `calculateFuelPlan` (`src/lib/calculator/index.ts`) compose those helpers.

**Parameters:**
- Multi-arg functions take a single options object with a typed interface, e.g. `calculateFuelPlan(input: CalculatorInput)`, `useFuelingEngine` builders take `BuildV3Args`.
- Two-or-three-arg helpers use positional args: `allocateMixToBottles(bottles, carbs, mix)` (`src/lib/calculator/bottles.ts`).

**Return Values:**
- Pure functions return new objects/arrays — no mutation of inputs.
- Domain types frequently use `Omit<...>` to strip persistence fields: `Omit<FuelPlan, 'id' | 'createdAt'>` is the calculator return type.

## Module Design

**Exports:**
- Named exports only — no default exports across `src/` (`export function`, `export const`, `export type`).
- Components export their `Props` interface alongside the component when consumers need it (e.g. `RideFormSnapshot` from `src/components/planner/ride-form.tsx`).

**Barrel Files:**
- `src/components/ui/index.ts` — single entry point for UI primitives (`Button`, `Card`, `Alert`, `Input`, etc.).
- `src/types/index.ts` — re-exports domain types (`bottle`, `product`, `ride`, `fuel-plan`, `gear`).
- Feature folders (`planner/`, `gear/`, `fueling/`) do **not** use barrels — consumers import from specific files.

## React / Component Conventions

- Functional components only; no class components.
- Components extend native HTML attribute types via `HTMLAttributes<...>` or `ButtonHTMLAttributes<...>` and forward `...props` after Tailwind class merging.
- Class composition uses `clsx` (and `tailwind-merge` for conflict resolution) — see `src/components/ui/button.tsx`, `src/components/ui/card.tsx`.
- Variant systems use string-literal union props (`variant?: 'primary' | 'secondary' | 'ghost' | 'danger'`) with conditional class objects passed to `clsx`.
- Tailwind v4 with custom CSS variables: `bg-[var(--surface-panel)]`, `border-[color:var(--border-soft)]`.

## State Management Conventions

- **Zustand** with `persist` + `immer` middleware in `src/store/index.ts`.
- Selectors: prefer per-field subscriptions — `useStore((s) => s.settings.engineVersion)` (see `src/hooks/use-fueling-engine.ts`).
- IDs generated via `nanoid` (`src/store/index.ts:4`).
- Snapshot/draft types are explicitly declared (`AppDataSnapshot`, `PlannerDraft`) and used as shared contracts with cloud sync.

---

*Convention analysis: 2026-04-30*

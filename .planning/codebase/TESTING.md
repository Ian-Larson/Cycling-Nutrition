# Testing Patterns

**Analysis Date:** 2026-04-30

## Test Framework

**Runner:**
- **Vitest 4.0.x** (declared in `package.json` devDependencies).
- No standalone `vitest.config.*` file — Vitest reuses `vite.config.ts` for resolution (so the `@/*` alias works in tests).

**Assertion Library:**
- Vitest's built-in `expect` (Jest-compatible API).

**Run Commands:**
```bash
npm run test         # Single-pass run (vitest run)
npm run test:watch   # Watch mode (vitest)
```

(See `package.json` scripts.)

## Test File Organization

**Location:**
- **Co-located** with source files in nearly all cases: `src/lib/calculator/bottles.ts` ↔ `src/lib/calculator/bottles.test.ts`, `src/store/index.ts` ↔ `src/store/index.test.ts`.
- The newer `src/lib/fueling/` feature uses **`__tests__/` subdirectories** instead of co-location: `src/lib/fueling/__tests__/build-prescription.test.ts`, `src/lib/fueling/context/__tests__/resolve-rider.test.ts`.

**Naming:**
- `.test.ts` suffix mirrors the implementation file's name (no `.spec.*` files).
- One test file per module under test.

**Test Inventory (48 test files in `src/`):**
- `src/store/` — `index.test.ts`, `gear-crud.test.ts`
- `src/components/layout/navigation.test.ts` (logic-only, no rendering)
- `src/lib/calculator/` — `index`, `bottles`, `solids`, `auto-target`
- `src/lib/auth/strava-provider.test.ts`
- `src/lib/planner/` — `saved-plan-draft`, `planner-summaries`
- `src/lib/gear/` — `derive-active-setup`, `bike-system`, `life-bar`, `catalog-upsert`, `strava-gear`, `constants`, `normalizers`, `lifecycle`, `derive-gear-due`
- `src/lib/cloud/` — `sync`, `app-state`
- `src/lib/power-meter-analyzer/` — `analysis`, `parsers`
- `src/lib/athlete/anthropometrics.test.ts`
- `src/lib/fueling/__tests__/` — `format`, `build-prescription`, plus per-subfolder `__tests__/` dirs (`context/`, `targets/`, `constants/`, `inventory/`, `timeline/`, `migration/`, `validation/`, `types/`)

**Structure:**
```
src/
├── lib/calculator/
│   ├── bottles.ts
│   └── bottles.test.ts            # Co-located
├── lib/fueling/
│   ├── __tests__/
│   │   └── build-prescription.test.ts
│   └── context/
│       └── __tests__/
│           └── resolve-rider.test.ts
├── store/
│   ├── index.ts
│   └── index.test.ts
└── components/layout/
    └── navigation.test.ts          # Pure logic helper
```

## Test Structure

**Suite Organization (from `src/lib/calculator/index.test.ts`):**
```typescript
import { describe, expect, it } from 'vitest';
import { calculateFuelPlan } from './index';
import type { Product, RideCharacteristics } from '@/types';

const baseBottles: BottleSlot[] = [
  { capacityMl: 750 },
  { capacityMl: 950 },
];

describe('calculateFuelPlan summary behavior', () => {
  it('keeps manual mode summary unchanged (no sodium fields)', () => {
    const ride: RideCharacteristics = { /* ... */ };
    const plan = calculateFuelPlan({ ride, availableBottles: baseBottles, drinkMix, availableSolids: [] });
    expect(plan.summary.hydrationMl).toBe(1000);
    expect(plan.summary.sodiumMgPerHour).toBeUndefined();
  });
});
```

**Patterns:**
- **Imports:** Always `import { describe, expect, it } from 'vitest'` (and `vi`/`beforeEach`/`afterEach` when needed). No global Vitest API enabled — explicit imports in every file.
- **Module-level fixtures:** Shared test data declared as top-level `const` (e.g. `baseBottles`, `drinkMix`, `bottles`, `mix`) and reused across `it` blocks.
- **`describe` per function or behavior cluster:** e.g. `describe('resolveRideMetrics', ...)`, `describe('allocateMixToBottles', ...)`.
- **Behavior-oriented `it` names:** Descriptive sentences like `'derives TSS from duration + IF'`, `'clamps solid timing interval to at least 1 minute for short rides'`, `'uploads local state when no cloud row exists'`.
- **Table-driven cases** with `it.each` for parameterized navigation/routing assertions (`src/components/layout/navigation.test.ts:18`).
- **Story-style tests** in fueling: `it('story 1: 45 min recovery -> no during-ride carbs, minimal output', ...)` (`src/lib/fueling/__tests__/build-prescription.test.ts:50`).

## Mocking

**Framework:** Vitest's built-in `vi` (used sparingly).

**Patterns:**

Spy/restore on globals (`src/lib/gear/normalizers.test.ts`):
```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('gear normalizers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('trims catalog fields and defaults missing timestamps', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456);
    // ...
  });
});
```

Function spies for callback assertions (`src/lib/cloud/sync.test.ts`):
```typescript
const replaceAppData = vi.fn();
const saveBackup = vi.fn();
// ... act ...
expect(replaceAppData).toHaveBeenCalledWith(expectedSnapshot);
```

Hand-rolled fakes implementing the production interface (`src/lib/cloud/sync.test.ts:45`):
```typescript
class FakeRepository implements CloudStateRepository {
  public fetched: CloudUserStateRecord | null = null;
  public upserts: Array<{ userId: string; snapshot: SerializedAppState }> = [];
  async fetchUserState() { return this.fetched; }
  async upsertUserState(userId, snapshot) { this.upserts.push({ userId, snapshot }); }
}
```

Inline mocked Supabase client (`src/lib/gear/strava-gear.test.ts:8`):
```typescript
const supabase = { invoke: vi.fn().mockResolvedValue({ data: response, error }) };
```

**What to Mock:**
- External boundaries: Supabase client (`functions.invoke`), `Date.now()`, time-dependent helpers.
- Side-effecting callbacks passed into pure orchestrators (`replaceAppData`, `saveBackup`, `now`).
- Use **dependency injection** — production code accepts a repository/client via parameters (`CloudStateRepository`, `now?: () => Date`) so tests pass fakes rather than mocking modules.

**What NOT to Mock:**
- Pure calculation helpers (`carbs`, `bottles`, `timing`, `solids`) — call them directly with literal fixtures.
- Internal modules — no `vi.mock('@/...')` calls observed in any test file.
- React components — there is no component-rendering test infrastructure.

## Fixtures and Factories

**Test Data:**

Inline literal fixtures at module scope (`src/lib/calculator/bottles.test.ts:7`):
```typescript
const bottles: BottleSlot[] = [
  { capacityMl: 550 },
  { capacityMl: 750 },
];

const mix: Product = {
  id: 'mix',
  name: 'PF 60',
  type: 'drink_mix',
  isAvailable: true,
  nutrition: { carbsGrams: 60, calories: 240 },
  serving: { servingSizeGrams: 60, scoopSizeGrams: 30 },
  createdAt: 0,
  updatedAt: 0,
};
```

Factory helpers when many similar objects are needed (`src/lib/cloud/sync.test.ts:11`):
```typescript
function makeAppData(bottleCount: number): AppDataSnapshot {
  return {
    bottleCounts: { 550: 0, 750: bottleCount, 950: 0 },
    products: [],
    fuelPlans: [],
    settings: DEFAULT_SETTINGS,
    plannerDraft: null,
    bikes: [],
    serviceEntries: [],
    // ... full snapshot
  };
}
```

**Location:**
- All fixtures are local to the test file. There is **no shared `fixtures/`** or `test-utils/` directory.
- Domain defaults like `DEFAULT_SETTINGS` are imported from production code (`@/store`) and reused.

## Coverage

**Requirements:** None enforced. No coverage threshold or CI gate detected.

**View Coverage:**
- Not configured. Vitest can produce coverage via `vitest run --coverage`, but no script wires it up and `@vitest/coverage-*` is not installed.

## Test Types

**Unit Tests:**
- Dominant style. Pure-function tests over `src/lib/calculator/`, `src/lib/fueling/`, `src/lib/gear/`, `src/lib/athlete/`, `src/lib/planner/`, `src/lib/power-meter-analyzer/`.
- Approach: import the function, build literal fixtures, assert output shape and values.

**Integration Tests:**
- A handful of orchestration tests:
  - `src/lib/cloud/sync.test.ts` exercises `initializeUserCloudState` end-to-end with a fake repository and spies for callbacks.
  - `src/lib/fueling/__tests__/build-prescription.test.ts` runs the full v3 prescription pipeline (`buildPrescription`) with realistic rider/session inputs.
  - `src/store/index.test.ts` exercises store helpers like `normalizeProducts` and `getReadinessFromState` together.

**Component / UI Tests:**
- **None.** No `@testing-library/react`, no `jsdom` config, no `.test.tsx` files in `src/`. Component behavior is exercised only indirectly through helper modules (e.g. `src/components/layout/navigation.test.ts` covers the navigation grouping helpers — a `.ts` file, not a rendering test).

**E2E Tests:**
- None. No Playwright, Cypress, or Puppeteer dependencies.

## Common Patterns

**Async Testing:**
```typescript
it('uploads local state when no cloud row exists', async () => {
  const repo = new FakeRepository();
  const result = await initializeUserCloudState({
    userId: 'user-1',
    repository: repo,
    getLocalState: () => makeAppState(localData),
    replaceAppData: vi.fn(),
    now: () => new Date('2026-04-16T12:00:00Z'),
  });
  expect(result.kind).toBe('uploaded-local');
});
```
(`src/lib/cloud/sync.test.ts:62`)

**Approximate / Numeric Assertions:**
```typescript
expect(result.tss).toBeCloseTo(128, 1);
expect(Math.abs(smallConcentration - largeConcentration)).toBeLessThanOrEqual(0.01);
```
Use `toBeCloseTo` for derived floats; explicit tolerance subtraction when comparing two computed values.

**Negative / Boundary Cases:**
```typescript
expect(normalizeGearPartCatalog(null)).toEqual([]);
expect(normalizeGearPartInstances({})).toEqual([]);
expect(normalizeGearInstallRecords('nope')).toEqual([]);
```
Normalizer tests routinely assert graceful handling of `null`, `undefined`, wrong types, and malformed shapes (`src/lib/gear/normalizers.test.ts:14`).

**Parameterized Cases:**
```typescript
it.each([
  ['/', 'Fuel Plan'],
  ['/inventory', 'Fuel Plan'],
  ['/gear', 'Gear'],
])('marks %s under %s', (pathname, expectedLabel) => {
  expect(getActivePrimaryNavItem(pathname)?.label).toBe(expectedLabel);
});
```
(`src/components/layout/navigation.test.ts:18`)

**Determinism:**
- Mock `Date.now()` via `vi.spyOn(Date, 'now').mockReturnValue(...)` and restore with `afterEach(() => vi.restoreAllMocks())`.
- Inject `now: () => Date` into orchestrators rather than relying on the system clock.

## Coverage Gaps

- **No React component tests.** All `.tsx` components in `src/components/` and `src/pages/` are untested at the rendering level. This includes high-traffic surfaces: `RideForm`, `SetupCard`, `FuelResult`, `GearInventory`, all `pages/*`.
- **No hook tests.** `src/hooks/use-fueling-engine.ts` and `src/hooks/use-strava-gear.ts` have no dedicated tests; their underlying pure helpers are tested instead.
- **No coverage reporting** — gaps are not visible in CI.
- **Auth flows partial** — `src/lib/auth/strava-provider.test.ts` exists, but `auth-provider.tsx`, `auth-context.ts`, and the `*-callback.tsx` pages are untested.

---

*Testing analysis: 2026-04-30*

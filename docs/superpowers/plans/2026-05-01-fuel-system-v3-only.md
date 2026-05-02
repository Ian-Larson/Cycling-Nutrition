# Fuel System v3-Only Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the planner to a single fueling engine (v3), give the rider a freely-editable per-day bottle pool that the engine plans around, retire the standalone `/inventory` page, and trim three settings rows.

**Architecture:** The v3 engine becomes the only path. `useFuelingEngine` is replaced by `useFuelPrescription` exposing `{ build, weightReady }`. The store drops `bottleCounts`, `engineVersion`, and `sweatRateLph`; saved plans pivot from the v2 `FuelPlan` shape (allocations + guide) to a v3 wrapper (`FuelingPrescription` + inputs). The planner page hard-gates on `weightKg`. Bottle selection happens inside the engine via the existing `selectBottles` helper, which already returns the smallest-≤2-bottle subset of any pool.

**Tech Stack:** React 19 + TypeScript + Vite + Zustand (with `persist` middleware) + Tailwind CSS v4 + Vitest + Testing Library. Hand-rolled UI primitives in `src/components/ui/`.

**Spec:** `docs/superpowers/specs/2026-05-01-fuel-system-v3-only-design.md`

---

## File structure (after the change)

**Created**
- `src/lib/planner/auto-target.ts` (moved from `src/lib/calculator/auto-target.ts`)
- `src/lib/planner/auto-target.test.ts` (moved from `src/lib/calculator/auto-target.test.ts`)
- `src/lib/format/time.ts` (moved from `src/lib/calculator/timing.ts`, content trimmed to `formatTime` only)
- `src/hooks/use-fuel-prescription.ts` (replaces `src/hooks/use-fueling-engine.ts`)

**Modified**
- `src/types/bottle.ts` — gain `BottleSlot` interface
- `src/types/fuel-plan.ts` — replace `FuelPlan` shape with v3 wrapper
- `src/store/index.ts` — drop `bottleCounts` slice, `engineVersion`, `sweatRateLph`; bump persisted `version`; wipe `fuelPlans` on migration
- `src/components/planner/setup-card.tsx` — drop `bottleCounts` prop, drop `max` cap, drop `max N` subtext, drop `/inventory` link
- `src/components/planner/saved-plans-rail-panel.tsx` — render via `<FuelResultV3>`
- `src/components/planner/fuel-result-v3.tsx` — switch `formatTime` import path
- `src/components/planner/debug-copy-button.tsx` — switch `formatTime` import path
- `src/components/planner/ride-form.tsx` — switch `calculateAutoTarget` import path; drop `sweatRateLph` field passes (always undefined now)
- `src/components/account/settings.tsx` — drop Sweat rate row, Gut-target helper text, Fueling-engine row
- `src/pages/planner.tsx` — delete v2 fork, add weight gate, rename `selectedBottleCounts` → `bottlePool`, drop inventory clamp, persist new shape
- `src/pages/history.tsx` — render via `<FuelResultV3>`
- `src/lib/planner/saved-plan-draft.ts` — read new shape
- `src/lib/planner/planner-summaries.ts` — drop `getFuelResultPlan` (no longer needed)
- `src/lib/cloud/app-state.ts` — drop `bottleCounts` from snapshot
- `src/lib/cloud/sync.ts` — drop `bottleCounts` from sync schema
- `src/lib/fueling/index.ts` — switch `BottleSlot` import to `@/types/bottle`
- `src/lib/fueling/inventory/allocate-mix.ts` — switch `BottleSlot` import
- `src/lib/fueling/inventory/select-bottles.ts` — switch `BottleSlot` import
- `src/components/layout/navigation.ts` — drop `/inventory` and `/bottles` from `matchPaths`
- `src/components/layout/navigation.test.ts` — drop the `/inventory` test row
- `src/App.tsx` — drop `/inventory` and `/bottles` routes (replace with redirects to `/`)
- `src/lib/defaults.ts` — drop `DEFAULT_BOTTLE_COUNTS`

**Deleted**
- `src/components/planner/fuel-result.tsx`
- `src/lib/calculator/index.ts` and `index.test.ts`
- `src/lib/calculator/bottles.ts` and `bottles.test.ts`
- `src/lib/calculator/carbs.ts`
- `src/lib/calculator/constants.ts` (only used by the deleted v2 chain — verify in Task 14)
- `src/lib/calculator/auto-target.ts` and `auto-target.test.ts` (replaced by moves above)
- `src/lib/calculator/timing.ts` (replaced by move above)
- `src/lib/calculator/` directory (empty after the moves and deletions)
- `src/lib/fueling/migration/v2-to-v3.ts` and `__tests__/migration.test.ts`
- `src/lib/fueling/migration/` directory
- `src/lib/fueling/adapters/from-v2-inputs.ts`
- `src/lib/fueling/adapters/` directory
- `src/hooks/use-fueling-engine.ts`
- `src/pages/inventory.tsx`

---

## Task 1: Move `auto-target.ts` to `src/lib/planner/`

**Files:**
- Create: `src/lib/planner/auto-target.ts` (copy from `src/lib/calculator/auto-target.ts`, no content changes)
- Create: `src/lib/planner/auto-target.test.ts` (copy from `src/lib/calculator/auto-target.test.ts`, no content changes)
- Modify: `src/components/planner/ride-form.tsx` (import update)

- [ ] **Step 1: Copy the files**

```bash
git mv src/lib/calculator/auto-target.ts src/lib/planner/auto-target.ts
git mv src/lib/calculator/auto-target.test.ts src/lib/planner/auto-target.test.ts
```

- [ ] **Step 2: Update the consumer's import**

In `src/components/planner/ride-form.tsx`, find:

```ts
import { calculateAutoTarget } from '@/lib/calculator/auto-target';
```

Replace with:

```ts
import { calculateAutoTarget } from '@/lib/planner/auto-target';
```

- [ ] **Step 3: Run unit tests**

Run: `npm run lint && npx vitest run src/lib/planner/auto-target.test.ts`

Expected: all tests pass; lint clean.

- [ ] **Step 4: Run full test suite to confirm nothing else broke**

Run: `npx vitest run`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(planner): move auto-target out of legacy calculator dir"
```

---

## Task 2: Move `timing.ts` to `src/lib/format/time.ts`

The only export still used is `formatTime`. `generateConsumptionGuide` is v2-only and gets dropped on the move.

**Files:**
- Create: `src/lib/format/time.ts` (only `formatTime`; v2-only helpers and `generateConsumptionGuide` left behind)
- Modify: `src/components/planner/fuel-result-v3.tsx`
- Modify: `src/components/planner/debug-copy-button.tsx`
- Delete: `src/lib/calculator/timing.ts` (in Task 13 with the rest of `src/lib/calculator/`)

- [ ] **Step 1: Create the new file**

`src/lib/format/time.ts`:

```ts
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}
```

- [ ] **Step 2: Update `fuel-result-v3.tsx`**

Find:

```ts
import { formatTime } from '@/lib/calculator/timing';
```

Replace with:

```ts
import { formatTime } from '@/lib/format/time';
```

- [ ] **Step 3: Update `debug-copy-button.tsx`**

Same import swap as Step 2.

- [ ] **Step 4: Run lint + full tests**

Run: `npm run lint && npx vitest run`

Expected: all pass. (`src/lib/calculator/timing.ts` is still on disk and still exports `formatTime` — it'll be deleted in Task 13.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/format/time.ts src/components/planner/fuel-result-v3.tsx src/components/planner/debug-copy-button.tsx
git commit -m "refactor(format): extract formatTime to src/lib/format/time.ts"
```

---

## Task 3: Move `BottleSlot` interface to `src/types/bottle.ts`

**Files:**
- Modify: `src/types/bottle.ts` (gain `BottleSlot`)
- Modify: `src/lib/fueling/index.ts` (import update)
- Modify: `src/lib/fueling/inventory/allocate-mix.ts` (import update)
- Modify: `src/lib/fueling/inventory/select-bottles.ts` (import update)
- Modify: `src/hooks/use-fueling-engine.ts` (import update — this hook is replaced in Task 7, but the interim build needs to stay green)
- Modify: `src/lib/fueling/adapters/from-v2-inputs.ts` (import update — file deleted in Task 7)

- [ ] **Step 1: Add `BottleSlot` to `src/types/bottle.ts`**

Append after the existing exports:

```ts
export interface BottleSlot {
  capacityMl: number;
}
```

- [ ] **Step 2: Update each import site**

For each file in the Files list (except `src/types/bottle.ts`), replace:

```ts
import type { BottleSlot } from '@/lib/calculator/bottles';
```

with:

```ts
import type { BottleSlot } from '@/types/bottle';
```

Use grep to find any stragglers:

```bash
grep -rn "from '@/lib/calculator/bottles'" src/
```

Expected: no results after the swap.

- [ ] **Step 3: Run lint + full tests**

Run: `npm run lint && npx vitest run`

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(types): move BottleSlot interface to src/types/bottle.ts"
```

---

## Task 4: Add a failing test for the bottle-pool 950ml regression

**Files:**
- Create: `src/components/planner/__tests__/setup-card.test.tsx`

- [ ] **Step 1: Check if a test file already exists**

```bash
ls src/components/planner/__tests__/setup-card.test.tsx 2>/dev/null || echo "absent"
```

If absent, create the file. If present, append the new test cases.

- [ ] **Step 2: Write the failing test**

`src/components/planner/__tests__/setup-card.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SetupCard } from '@/components/planner/setup-card';

describe('SetupCard bottle pool', () => {
  it('lets the rider increment a 950ml bottle past 1 with no inventory cap', () => {
    const onBottleCountChange = vi.fn();
    render(
      <SetupCard
        variant="embedded"
        bottleCounts={{ 550: 0, 750: 0, 950: 1 }}
        selectedBottleCounts={{ 550: 0, 750: 0, 950: 1 }}
        drinkMixes={[]}
        solidProducts={[]}
        selectedDrinkMixId={null}
        selectedSolidIds={[]}
        onBottleCountChange={onBottleCountChange}
        onDrinkMixChange={vi.fn()}
        onSolidChange={vi.fn()}
      />,
    );

    const addButton = screen.getByRole('button', {
      name: /Add one 950ml bottle/i,
    });
    fireEvent.click(addButton);

    expect(addButton).not.toBeDisabled();
    expect(onBottleCountChange).toHaveBeenCalledWith(950, 2);
  });

  it('clamps decrement at zero', () => {
    const onBottleCountChange = vi.fn();
    render(
      <SetupCard
        variant="embedded"
        bottleCounts={{ 550: 0, 750: 0, 950: 0 }}
        selectedBottleCounts={{ 550: 0, 750: 0, 950: 0 }}
        drinkMixes={[]}
        solidProducts={[]}
        selectedDrinkMixId={null}
        selectedSolidIds={[]}
        onBottleCountChange={onBottleCountChange}
        onDrinkMixChange={vi.fn()}
        onSolidChange={vi.fn()}
      />,
    );

    const removeButton = screen.getByRole('button', {
      name: /Remove one 950ml bottle/i,
    });
    expect(removeButton).toBeDisabled();
  });
});
```

Note: this test calls `<SetupCard>` without the `bottleCounts` prop — that prop will be removed in Task 16. The test will compile-fail today because `bottleCounts` is required, and at runtime it will fail because the `+` button disables when `count >= max` (max = 0). Both fail modes are expected.

- [ ] **Step 3: Run the test to confirm it fails**

Run: `npx vitest run src/components/planner/__tests__/setup-card.test.tsx`

Expected: test fails. The TypeScript error or the disabled-button assertion both count as the failing pre-condition.

- [ ] **Step 4: Commit the failing test**

```bash
git add src/components/planner/__tests__/setup-card.test.tsx
git commit -m "test(planner): add failing pool tests for 950ml regression and zero-clamp"
```

---

## Task 5: Add a failing test for the planner weight gate

**Files:**
- Create: `src/pages/__tests__/planner-weight-gate.test.tsx`

- [ ] **Step 1: Check existing planner test file**

```bash
ls src/pages/__tests__/ 2>/dev/null
```

If a `planner.test.tsx` already exists, append the new tests. Otherwise create the new file.

- [ ] **Step 2: Write the failing test**

`src/pages/__tests__/planner-weight-gate.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, beforeEach } from 'vitest';
import { PlannerPage } from '@/pages/planner';
import { useStore } from '@/store';
import { AuthProvider } from '@/lib/auth/auth-provider';

function renderPlanner() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <PlannerPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('PlannerPage weight gate', () => {
  beforeEach(() => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: {
          ...state.settings.athleteProfile,
          weightKg: undefined,
        },
      },
    }));
  });

  it('renders the gate empty state when weightKg is missing', () => {
    renderPlanner();
    expect(
      screen.getByRole('heading', { name: /Set your weight to plan/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Set weight in Account/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Setup/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the steps when weightKg is set', () => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: {
          ...state.settings.athleteProfile,
          weightKg: 70,
        },
      },
    }));

    renderPlanner();
    expect(
      screen.queryByRole('heading', { name: /Set your weight to plan/i }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to confirm it fails**

Run: `npx vitest run src/pages/__tests__/planner-weight-gate.test.tsx`

Expected: fails with no matching heading (planner currently never gates).

- [ ] **Step 4: Commit the failing test**

```bash
git add src/pages/__tests__/planner-weight-gate.test.tsx
git commit -m "test(planner): add failing weight-gate test"
```

---

## Task 6: Pivot the `FuelPlan` type

**Files:**
- Modify: `src/types/fuel-plan.ts`

- [ ] **Step 1: Replace the `FuelPlan` interface**

Replace the existing `FuelPlan` interface (lines 36–53) with:

```ts
import type { FuelingPrescription } from '@/lib/fueling/types';
import type { BottleInventory } from './bottle';

export interface FuelPlan {
  id: string;
  createdAt: number;
  title?: string;
  ride: RideCharacteristics;
  bottlePool: BottleInventory;
  selectedDrinkMixId: string | null;
  selectedSolidIds: string[];
  solidOverrides?: Record<string, number>;
  prescription: FuelingPrescription;
}
```

Keep the existing `BottleAllocation`, `SolidAllocation`, `ConsumptionGuideItem`, `FuelPlanWarning`, `FuelPlanWarningType` exports — `BottleAllocation` and `SolidAllocation` are referenced by `src/lib/fueling/types/prescription.ts`. Verify with:

```bash
grep -rn "BottleAllocation\|SolidAllocation\|ConsumptionGuideItem" src/ --include="*.ts" --include="*.tsx" | grep -v "\.test\."
```

If any of those types is no longer referenced after this plan completes, delete it in Task 24.

- [ ] **Step 2: Run the type-checker — expect cascading errors**

Run: `npx tsc --noEmit`

Expected: many errors in `planner.tsx`, `history.tsx`, `saved-plans-rail-panel.tsx`, `saved-plan-draft.ts`, `planner-summaries.ts`, store. We fix them in subsequent tasks. **Do not commit yet.**

- [ ] **Step 3: Mark `WIP` — do not commit**

The cascade fix lives across Tasks 7–13. Move on; commit once `tsc --noEmit` is clean.

---

## Task 7: Rewrite `useFuelingEngine` → `useFuelPrescription`

The new hook takes the planner inputs and the rider profile and produces a prescription directly. It absorbs the logic from `from-v2-inputs.ts`.

**Files:**
- Create: `src/hooks/use-fuel-prescription.ts`
- Delete: `src/hooks/use-fueling-engine.ts` (after Task 11)
- Delete: `src/lib/fueling/adapters/from-v2-inputs.ts` (after Task 11)

- [ ] **Step 1: Create the new hook**

`src/hooks/use-fuel-prescription.ts`:

```ts
import { useMemo } from 'react';
import type { Product, RideCharacteristics, HeatFactor, IntensityLevel } from '@/types';
import type { BottleSlot } from '@/types/bottle';
import { useStore } from '@/store';
import { buildPrescription, type FuelingPrescription } from '@/lib/fueling';
import type {
  RiderProfile,
  SessionPlan,
  Environment,
  SessionPurpose,
  TrainingLoad,
} from '@/lib/fueling/types';

const INTENSITY_TO_IF: Record<IntensityLevel, number> = {
  recovery: 0.55,
  endurance: 0.7,
  tempo: 0.85,
  threshold: 0.92,
  race: 1.0,
};

const INTENSITY_TO_PURPOSE: Record<IntensityLevel, SessionPurpose> = {
  recovery: 'recovery',
  endurance: 'endurance',
  tempo: 'tempo',
  threshold: 'threshold',
  race: 'race',
};

const HEAT_TO_DRY_BULB_C: Record<HeatFactor, number> = {
  cool: 12,
  moderate: 20,
  warm: 28,
  hot: 34,
};

function inferTrainingLoadFromMinutes(minutes: number): TrainingLoad {
  if (minutes < 60) return 'light';
  if (minutes < 120) return 'moderate';
  if (minutes < 180) return 'high';
  return 'veryHigh';
}

export interface BuildFuelPrescriptionArgs {
  ride: RideCharacteristics;
  bottles: BottleSlot[];
  drinkMix: Product | null;
  solids: Product[];
  solidOverrides?: Record<string, number>;
}

export interface UseFuelPrescriptionResult {
  weightReady: boolean;
  build: (args: BuildFuelPrescriptionArgs) => FuelingPrescription | null;
}

export function useFuelPrescription(): UseFuelPrescriptionResult {
  const athleteProfile = useStore((s) => s.settings.athleteProfile);

  const massKg = athleteProfile.weightKg;
  const weightReady =
    typeof massKg === 'number' && Number.isFinite(massKg) && massKg > 0;

  const build = useMemo(() => {
    return (args: BuildFuelPrescriptionArgs): FuelingPrescription | null => {
      if (!weightReady || typeof massKg !== 'number') return null;

      const rider: RiderProfile = {
        name: athleteProfile.name,
        sex: 'unspecified',
        age: athleteProfile.age,
        massKg,
        ftpWatts: athleteProfile.ftpWatts,
        trainingLoad: inferTrainingLoadFromMinutes(args.ride.durationMinutes),
        doesConcurrentStrength: false,
        heavySweater: athleteProfile.heavySweater,
        currentGutCeilingGph: athleteProfile.gutTrainingTargetGph ?? 65,
        caffeineSensitive: false,
        dietaryFlags: [],
        anthropometricsUnit: athleteProfile.anthropometricsUnit ?? 'metric',
      };

      const measuredIf =
        args.ride.autoMetrics?.intensityFactor &&
        Number.isFinite(args.ride.autoMetrics.intensityFactor)
          ? args.ride.autoMetrics.intensityFactor
          : undefined;

      const intensityFactor = measuredIf ?? INTENSITY_TO_IF[args.ride.intensity];

      const refuelStops = args.ride.refuelStops ?? 0;
      const refuelStopOffsets =
        refuelStops > 0
          ? Array.from({ length: refuelStops }, (_, i) =>
              Math.round((args.ride.durationMinutes * (i + 1)) / (refuelStops + 1)),
            )
          : [];

      const carbsGPerHourOverride =
        typeof args.ride.carbTargetGramsPerHour === 'number' &&
        Number.isFinite(args.ride.carbTargetGramsPerHour) &&
        args.ride.carbTargetGramsPerHour > 0
          ? args.ride.carbTargetGramsPerHour
          : undefined;

      const session: SessionPlan = {
        id: 'planner-session',
        inputMode: {
          kind: 'duration_if',
          durationMinutes: args.ride.durationMinutes,
          intensityFactor,
        },
        purposeOverride: INTENSITY_TO_PURPOSE[args.ride.intensity],
        refuelStopOffsets,
        carbsGPerHourOverride,
      };

      const environment: Environment = {
        dryBulbCelsius: HEAT_TO_DRY_BULB_C[args.ride.heatFactor],
      };

      const markAvailable = <T extends { isAvailable?: boolean }>(item: T): T => ({
        ...item,
        isAvailable: true,
      });

      const productsForEngine: Product[] = [];
      if (args.drinkMix) productsForEngine.push(markAvailable(args.drinkMix));
      for (const solid of args.solids) productsForEngine.push(markAvailable(solid));

      return buildPrescription({
        rider,
        session,
        environment,
        bottles: args.bottles,
        products: productsForEngine,
        todaysTotalSessionMinutes: args.ride.durationMinutes,
        solidOverrides: args.solidOverrides,
      });
    };
  }, [athleteProfile, massKg, weightReady]);

  return { weightReady, build };
}
```

Note the `sweatRateLph` field is intentionally omitted from `rider` — when the field is removed from `AthleteProfile` in Task 9, this hook compiles cleanly. Leaving it out now means `RiderProfile.sweatRateLph` is `undefined`, and `resolveRider` falls through to `DEFAULT_SWEAT_RATE_LPH_BY_HEAT[heat]` per `src/lib/fueling/context/resolve-rider.ts:38–40`. This is the intended post-cleanup behavior.

- [ ] **Step 2: Run lint to confirm the new hook compiles**

Run: `npm run lint`

Expected: no new errors from the new file. Existing errors from the cascading `FuelPlan`-shape change are still present and OK.

- [ ] **Step 3: Commit the new hook**

```bash
git add src/hooks/use-fuel-prescription.ts
git commit -m "feat(hooks): add useFuelPrescription, replacing two-engine router"
```

---

## Task 8: Switch the planner page to the new hook + new save shape, drop v2

This is the largest task — it replaces the v2 fork in `planner.tsx` with the v3-only path and persists the new `FuelPlan` shape. The pre-conditional weight gate is added in Task 12.

**Files:**
- Modify: `src/pages/planner.tsx`

- [ ] **Step 1: Replace the imports block**

In `src/pages/planner.tsx`, replace lines 16–38 (the import block from `Card` through the type imports). Final state:

```ts
import {
  Alert,
  Button,
  Card,
  CardContent,
  Input,
  Tab,
  TabList,
  Tabs,
  Toast,
} from '@/components/ui';
import { PageIntro } from '@/components/layout/page-intro';
import { DebugCopyButton } from '@/components/planner/debug-copy-button';
import { FuelResultV3 } from '@/components/planner/fuel-result-v3';
import { InventoryRailPanel } from '@/components/planner/inventory-rail-panel';
import { NutritionRail } from '@/components/planner/nutrition-rail';
import { NutritionWorkspaceLayout } from '@/components/planner/nutrition-workspace-layout';
import { PlanningStepPanel } from '@/components/planner/planning-step-panel';
import { RideForm, type RideFormSnapshot } from '@/components/planner/ride-form';
import { SavedPlansRailPanel } from '@/components/planner/saved-plans-rail-panel';
import { SetupCard } from '@/components/planner/setup-card';
import { useFuelPrescription } from '@/hooks/use-fuel-prescription';
import type { FuelingPrescription } from '@/lib/fueling';
import { buildPlannerDraftFromSavedPlan } from '@/lib/planner/saved-plan-draft';
import {
  formatRideSummary,
  formatSetupSummary,
  getPlanTitleSuggestion,
  isRideSnapshotEquivalentToRide,
} from '@/lib/planner/planner-summaries';
import { useStore } from '@/store';
import { BOTTLE_SIZES, totalBottleCount, cloneBottleInventory } from '@/types/bottle';
import type { BottleInventory, BottleSize } from '@/types/bottle';
import type { FuelPlan, Product, RideCharacteristics } from '@/types';
import type { PlannerDraft } from '@/store';
```

- [ ] **Step 2: Remove the v2 calculator imports + helpers**

Delete the `import { calculateFuelPlan, recalculatePlan, type CalculatorInput } from '@/lib/calculator';` line if present. Delete `lastInputRef` and the `useFuelingEngine`/`isV3` reads.

- [ ] **Step 3: Replace `initSelectedBottleCounts` to drop the inventory cap**

Replace the function body. The pool starts empty when there's no draft:

```ts
function initBottlePool(draft: PlannerDraft | null): BottleInventory {
  if (draft?.selectedBottleCounts) {
    return BOTTLE_SIZES.reduce(
      (acc, size) => {
        acc[size] = Math.max(0, draft.selectedBottleCounts![size] ?? 0);
        return acc;
      },
      { 550: 0, 750: 0, 950: 0 } as BottleInventory,
    );
  }
  return { 550: 0, 750: 0, 950: 0 };
}
```

(The function and the local state variable change name from `selectedBottleCounts` to `bottlePool` — see Step 4.)

- [ ] **Step 4: Rewrite the page body's state + handlers**

Inside `PlannerPage()`:

- Remove `const bottleCounts = useStore((s) => s.bottleCounts);`.
- Replace `const [selectedBottleCounts, setSelectedBottleCounts] = useState(...)` with:

```ts
const [bottlePool, setBottlePool] = useState<BottleInventory>(() =>
  initBottlePool(initialDraft),
);
```

- Replace `handleBottleCountChange`:

```ts
const handleBottleCountChange = (size: BottleSize, count: number) => {
  markPlanStale();
  setBottlePool((prev) => ({ ...prev, [size]: Math.max(0, count) }));
};
```

(No inventory clamp.)

- Replace `selectedBottleSlots` to read from `bottlePool`:

```ts
const selectedBottleSlots = useMemo(
  () =>
    BOTTLE_SIZES.flatMap((size) =>
      Array.from({ length: bottlePool[size] }, () => ({ capacityMl: size })),
    ),
  [bottlePool],
);
```

- Replace `useFuelingEngine` with the new hook:

```ts
const fuelEngine = useFuelPrescription();
```

- Replace the `[plan, setPlan]` and `[v3Prescription, setV3Prescription]` state with a single `[prescription, setPrescription]`:

```ts
const [prescription, setPrescription] = useState<FuelingPrescription | null>(null);
```

- Replace `canCalculate` to keep its meaning:

```ts
const canCalculate =
  totalBottleCount(bottlePool) > 0 &&
  Boolean(selectedDrinkMix) &&
  fuelEngine.weightReady;
```

- Replace `handleCalculate` to single-path through the new hook and persist to a `pendingPlan` shape:

```ts
const handleCalculate = (ride: RideCharacteristics) => {
  if (!canCalculate || !selectedDrinkMix) return;

  const availableSolids = solidOptions.filter((product) =>
    effectiveSelectedSolidIds.includes(product.id),
  );

  const next = fuelEngine.build({
    ride,
    bottles: selectedBottleSlots,
    drinkMix: selectedDrinkMix,
    solids: availableSolids,
  });

  if (!next) return;

  setPrescription(next);
  setPersistedRide(ride);
  setPlanTitle((current) => current || getPlanTitleSuggestion(ride));
  setPlanIsStale(false);
  setActiveStep(3);
  setResultTab('pack');
};
```

- Replace `handleSolidQuantityChange`:

```ts
const handleSolidQuantityChange = (productId: string, quantity: number) => {
  if (!prescription || !persistedRide || !selectedDrinkMix) return;

  const overridesByProductId = new Map<string, number>();
  prescription.packList.solids.forEach((solid) => {
    overridesByProductId.set(solid.productId, solid.quantity);
  });
  overridesByProductId.set(productId, quantity);
  const solidOverrides = Object.fromEntries(overridesByProductId);

  const availableSolids = solidOptions.filter((product) =>
    effectiveSelectedSolidIds.includes(product.id),
  );

  const rebuilt = fuelEngine.build({
    ride: persistedRide,
    bottles: selectedBottleSlots,
    drinkMix: selectedDrinkMix,
    solids: availableSolids,
    solidOverrides,
  });

  if (rebuilt) setPrescription(rebuilt);
};
```

- Replace `handleSavePlan` to persist the new shape:

```ts
const handleSavePlan = () => {
  if (!prescription || !persistedRide) return;

  saveFuelPlan({
    title: planTitle.trim() || undefined,
    ride: persistedRide,
    bottlePool,
    selectedDrinkMixId: effectiveSelectedDrinkMixId,
    selectedSolidIds: effectiveSelectedSolidIds,
    prescription,
  });
  setToastMessage('Plan saved to history.');
};
```

- Replace `handleResetPlan` to clear the new state:

```ts
const handleResetPlan = () => {
  setPrescription(null);
  setPlanTitle('');
  setResultTab('pack');
  setPlanIsStale(false);
  setActiveStep(1);
  setRideFormInitialSnapshot(rideFormSnapshot);
  setRideFormInstanceKey((current) => current + 1);
};
```

- Replace `handleReuseSavedPlan` to read from the new shape:

```ts
const handleReuseSavedPlan = (savedPlan: FuelPlan) => {
  const draft = buildPlannerDraftFromSavedPlan(savedPlan, products);
  setPlannerDraft(draft);
  setBottlePool(initBottlePool(draft));
  setSelectedDrinkMixId(draft.selectedDrinkMixId ?? null);
  setSelectedSolidIds(draft.selectedSolidIds ?? []);
  setPersistedRide(draft.ride);
  setRideFormInitialSnapshot(
    draft.ride ? getRideFormSnapshotFromRide(draft.ride) : undefined,
  );
  setRideFormInstanceKey((current) => current + 1);
  setPrescription(savedPlan.prescription);
  setPlanIsStale(false);
  setPlanTitle(draft.title ?? '');
  setResultTab('pack');
  setActiveStep(2);
  setToastMessage('Saved plan loaded. Review ride data, then rebuild.');
};
```

- [ ] **Step 5: Replace the result-pane render**

In the JSX for step 3 (the `<PlanningStepPanel step={3}>` block), replace the conditional `plan ? ... : ...` block. Replace any `plan` reference outside the result render with `prescription`. Inside the result panel, replace the v2/v3 fork:

```tsx
{prescription ? (
  <FuelResultV3
    section={resultTab}
    prescription={prescription}
    products={products}
    availableSolids={selectedSolidProducts}
    onSolidQuantityChange={handleSolidQuantityChange}
  />
) : null}
```

Drop the `plan` variable entirely. Drop `fuelBreakdown` (it was computed off `plan.bottles` / `plan.solids`); the v3 view shows the same numbers from `prescription.during` and `prescription.packList`. The fuel-breakdown table block (the entire `{fuelBreakdown && (...)}` JSX) is removed; v3 already presents these in `<FuelResultV3>`'s metrics tab.

Remove the `{isV3 && !v3Prescription && (...)}` warning card (replaced by the page-level gate in Task 12).

- [ ] **Step 6: Update the `setupSummary` call**

```ts
const setupSummary = formatSetupSummary({
  selectedBottleCounts: bottlePool,
  selectedDrinkMix,
  selectedSolidIds: effectiveSelectedSolidIds,
});
```

(`formatSetupSummary` keeps its existing `selectedBottleCounts` parameter name; this is a property-rename only at the call site.)

- [ ] **Step 7: Update the `<SetupCard>` props and loosen its prop type**

In `planner.tsx`, drop the `bottleCounts={bottleCounts}` prop on `<SetupCard>`. Pass `selectedBottleCounts={bottlePool}` (the prop name fully renames in Task 14; for now reuse the existing `selectedBottleCounts` slot).

Then open `src/components/planner/setup-card.tsx` and make `bottleCounts` optional in the prop type — a one-line edit to keep the build green until Task 14's full trim:

```ts
interface SetupCardProps {
  bottleCounts?: BottleInventory;  // optional now; removed entirely in Task 14
  selectedBottleCounts: BottleInventory;
  // ...rest unchanged
}
```

Inside `<SetupCard>`, replace `const inventoryTotal = totalBottleCount(bottleCounts);` with `const inventoryTotal = bottleCounts ? totalBottleCount(bottleCounts) : 0;` so the existing inventory-empty branch still compiles. Don't trim further — the rest of the inventory branch removal lands in Task 14.

Inside `<BottleSizeCounter>` invocations, replace `max={bottleCounts[size]}` with `max={bottleCounts?.[size] ?? Infinity}` so the cap effectively lifts when the prop isn't passed. The rest of the `<BottleSizeCounter>` rewrite (drop the prop entirely, drop the `max N` subtext) lands in Task 14.

- [ ] **Step 8: Update planner-draft persistence effect**

```ts
useEffect(() => {
  setPlannerDraft({
    ride: persistedRide,
    selectedBottleCounts: bottlePool,
    selectedDrinkMixId,
    selectedSolidIds,
    title: planTitle || undefined,
  });
  ...
}, [persistedRide, bottlePool, selectedDrinkMixId, selectedSolidIds, planTitle, setPlannerDraft]);
```

- [ ] **Step 9: Update `<DebugCopyButton>` props**

Pass `selectedBottleCounts={bottlePool}` (it already accepts `BottleInventory`). The `plan` prop the debug button currently expects no longer exists. Update `<DebugCopyButton>`:

In `src/components/planner/debug-copy-button.tsx`, replace the `plan: FuelPlan` prop with `prescription: FuelingPrescription | null` and rewrite the inside body to print `JSON.stringify(prescription, null, 2)`. If unsure, the simplest correct change is to make it accept `prescription` and let it print the serialized object. Concrete signature:

```ts
interface DebugCopyButtonProps {
  prescription: FuelingPrescription | null;
  products: Product[];
  selectedBottleCounts: BottleInventory;
  selectedDrinkMixId: string | null;
  selectedSolidIds: string[];
}
```

The body becomes:

```tsx
const debugPayload = JSON.stringify({
  prescription,
  products,
  selectedBottleCounts,
  selectedDrinkMixId,
  selectedSolidIds,
}, null, 2);
```

Drop the `formatTime`-based ride-guide rendering inside the component.

In `planner.tsx`, pass `prescription={prescription}`.

- [ ] **Step 10: Run lint + typecheck**

Run: `npm run lint && npx tsc --noEmit`

Expected: lint passes; tsc surfaces remaining errors only in `history.tsx`, `saved-plans-rail-panel.tsx`, `saved-plan-draft.ts`, `planner-summaries.ts`, and the store. Those are fixed in Tasks 9–13.

- [ ] **Step 11: Do not commit yet**

The build is still red. Commit lands at the end of Task 13.

---

## Task 9: Update `saveFuelPlan` action + drop legacy slices in the store

**Files:**
- Modify: `src/store/index.ts`

- [ ] **Step 1: Drop `bottleCounts` from `AppState` and `AppDataSnapshot`**

In `AppState` (around line 99), remove the `bottleCounts: BottleInventory;` field and any associated action types (e.g., `setBottleCount`, `replaceBottleInventory`).

In `AppDataSnapshot` (line 73–86), remove `bottleCounts: BottleInventory;`.

In `Settings` (line 54–58), remove `engineVersion: 'v2' | 'v3';`. Update `DEFAULT_SETTINGS` (line 219–227) to drop `engineVersion`.

In `AthleteProfile` (line 42–52), remove `sweatRateLph?: number;`.

In `getReadiness` and `getReadinessFromState`, replace any `bottleCounts` checks with checks against the planner draft's pool, OR drop the bottle readiness check entirely (the planner already gates on `weightReady` and pool-total > 0). The simplest correct choice: drop `hasAvailableBottle` from `AppReadiness`. Check usage:

```bash
grep -rn "hasAvailableBottle" src/
```

If no consumers outside the store remain, drop the field. If any consumer remains, leave the field as `false` and refactor in a later task.

- [ ] **Step 2: Update `normalizeSettings`**

Replace lines 294–322 with:

```ts
export function normalizeSettings(value: unknown): Settings {
  const incoming = value as Partial<Settings> | undefined;
  const incomingProfile = incoming?.athleteProfile as
    | (Partial<AthleteProfile> & { gutTrained?: boolean })
    | undefined;

  return {
    temperatureUnit:
      incoming?.temperatureUnit === 'fahrenheit' ? 'fahrenheit' : 'celsius',
    athleteProfile: {
      name: normalizeOptionalText(incomingProfile?.name),
      ftpWatts: normalizePositiveNumber(incomingProfile?.ftpWatts),
      heightCm: normalizePositiveNumber(incomingProfile?.heightCm),
      weightKg: normalizePositiveNumber(incomingProfile?.weightKg),
      anthropometricsUnit: normalizeAnthropometricsUnit(
        incomingProfile?.anthropometricsUnit,
      ),
      age: normalizeAge(incomingProfile?.age),
      heavySweater: incomingProfile?.heavySweater ?? false,
      gutTrainingTargetGph: normalizeGutTrainingTarget(
        incomingProfile?.gutTrainingTargetGph,
        incomingProfile?.gutTrained,
      ),
    },
  };
}
```

(`engineVersion` and `sweatRateLph` removed.)

- [ ] **Step 2b: Drop the `bottleCounts` state slice**

Remove `bottleCounts: cloneBottleInventory(DEFAULT_BOTTLE_COUNTS),` from the initial state. Remove any setter actions for it (search `setBottleCount`, `incrementBottle`, `decrementBottle`, `replaceBottleCounts` — drop their type entries, action implementations, and exports).

Run:

```bash
grep -rn "setBottleCount\|incrementBottle\|decrementBottle\|replaceBottleCounts" src/
```

Update or delete every consumer.

- [ ] **Step 3: Rewrite the `merge` function (around line 1407)**

Replace the merge body with:

```ts
merge: (persistedState, currentState) => {
  const incoming =
    (persistedState as Partial<AppState> & {
      bottleCounts?: unknown;
      bottles?: unknown;
    }) || {};
  const products = normalizeProducts(incoming.products, currentState.products);

  return {
    ...currentState,
    ...incoming,
    products,
    fuelPlans: normalizeFuelPlans(
      incoming.fuelPlans,
      currentState.fuelPlans,
      products,
    ),
    settings: normalizeSettings(incoming.settings),
    plannerDraft: normalizePlannerDraft(incoming.plannerDraft),
    bikes: Array.isArray(incoming.bikes) ? incoming.bikes : currentState.bikes,
    serviceEntries: [],
    gearPartCatalog: normalizeGearPartCatalog(
      incoming.gearPartCatalog ?? currentState.gearPartCatalog,
    ),
    gearPartInstances: normalizeGearPartInstances(
      incoming.gearPartInstances ?? currentState.gearPartInstances,
    ),
    gearInstallRecords: normalizeGearInstallRecords(
      incoming.gearInstallRecords ?? currentState.gearInstallRecords,
    ),
    gearServiceEvents: normalizeGearServiceEvents(
      incoming.gearServiceEvents ?? currentState.gearServiceEvents,
    ),
    gearSelectedBikeId:
      typeof incoming.gearSelectedBikeId === 'string'
        ? incoming.gearSelectedBikeId
        : incoming.gearSelectedBikeId === null
          ? null
          : currentState.gearSelectedBikeId,
  };
},
```

Note `bottleCounts` no longer flows. The `incoming.bottleCounts` and `incoming.bottles` keys are intentionally tolerated in the type for back-compat read but ignored for write.

- [ ] **Step 4: Add a `version` + `migrate` to the persist config**

After the `merge` function, add:

```ts
version: 2,
migrate: (persistedState, version) => {
  if (!persistedState || typeof persistedState !== 'object') {
    return persistedState;
  }
  if (version < 2) {
    const { bottleCounts: _b, ...rest } = persistedState as Record<string, unknown> & {
      bottleCounts?: unknown;
    };
    return { ...rest, fuelPlans: [] };
  }
  return persistedState;
},
```

(Underscored variable to avoid an unused-binding warning.) The migration drops the legacy `bottleCounts` slice and wipes `fuelPlans` (which used the old shape).

- [ ] **Step 5: Rewrite `normalizeFuelPlans` to read the new shape and refuse the old**

Find the existing `normalizeFuelPlans` (search for `function normalizeFuelPlans`). Replace its body to:

```ts
function normalizeFuelPlans(
  value: unknown,
  fallback: FuelPlan[],
  _products: Product[],
): FuelPlan[] {
  if (!Array.isArray(value)) return fallback;
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as Partial<FuelPlan>;
    if (!candidate.id || !candidate.prescription || !candidate.ride) return [];
    return [candidate as FuelPlan];
  });
}
```

The old shape (with `rideCharacteristics`, `bottles[]`, `solids[]`) is silently dropped. With migration in place this branch should rarely fire.

- [ ] **Step 6: Run lint + typecheck**

Run: `npm run lint && npx tsc --noEmit`

Expected: build red only in `saved-plans-rail-panel.tsx`, `history.tsx`, `saved-plan-draft.ts`, `planner-summaries.ts`, `cloud/app-state.ts`, `cloud/sync.ts`, store tests, ride-form, settings.tsx. We fix them next.

- [ ] **Step 7: No commit yet — the build is red.**

---

## Task 10: Update the cloud sync schema

**Files:**
- Modify: `src/lib/cloud/app-state.ts`
- Modify: `src/lib/cloud/sync.ts`
- Modify: `src/lib/cloud/app-state.test.ts`
- Modify: `src/lib/cloud/sync.test.ts`

- [ ] **Step 1: Drop `bottleCounts` from the snapshot type and serializer**

In `app-state.ts`, remove `'bottleCounts'` from any field-list union types and from the snapshot construction. The snapshot writer drops the field.

- [ ] **Step 2: Drop `bottleCounts` from the sync schema**

In `sync.ts`, remove `'bottleCounts'` from any field-list unions or schema arrays.

- [ ] **Step 3: Update tests**

In `app-state.test.ts` and `sync.test.ts`:

- Remove fixtures that pre-populate `bottleCounts` (e.g., `bottleCounts: { 550: 0, 750: 1, 950: 0 }`).
- Remove assertions that check `snapshot.data.bottleCounts`.
- Remove `'bottleCounts'` from any field-list union literals used in tests.

Search for all references:

```bash
grep -rn "bottleCounts" src/lib/cloud/
```

Remove every line.

- [ ] **Step 4: Run cloud tests**

Run: `npx vitest run src/lib/cloud/`

Expected: all pass.

- [ ] **Step 5: No commit — build still red elsewhere.**

---

## Task 11: Update saved-plan helpers and rendering

**Files:**
- Modify: `src/lib/planner/saved-plan-draft.ts`
- Modify: `src/lib/planner/planner-summaries.ts`
- Modify: `src/components/planner/saved-plans-rail-panel.tsx`
- Modify: `src/pages/history.tsx`

- [ ] **Step 1: Update `buildPlannerDraftFromSavedPlan`**

Open `src/lib/planner/saved-plan-draft.ts`. Replace the function so it reads from the new `FuelPlan` shape:

```ts
import type { Product, FuelPlan } from '@/types';
import type { PlannerDraft } from '@/store';

export function buildPlannerDraftFromSavedPlan(
  plan: FuelPlan,
  products: Product[],
): PlannerDraft {
  return {
    ride: plan.ride,
    selectedBottleCounts: plan.bottlePool,
    selectedDrinkMixId: plan.selectedDrinkMixId,
    selectedSolidIds: plan.selectedSolidIds.filter((id) =>
      products.some((p) => p.id === id),
    ),
    title: plan.title,
  };
}
```

If the file has tests (`saved-plan-draft.test.ts`), update fixtures to the new shape.

- [ ] **Step 2: Drop `getFuelResultPlan` from `planner-summaries.ts`**

Remove the `getFuelResultPlan` function entirely. Update consumers (`saved-plans-rail-panel.tsx`, `history.tsx`) in the next steps.

If `planner-summaries.ts` has tests for `getFuelResultPlan`, delete those test cases.

- [ ] **Step 3: Update `saved-plans-rail-panel.tsx` to render via `<FuelResultV3>`**

Replace the file content. Key changes:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { FuelResultV3 } from '@/components/planner/fuel-result-v3';
import { formatDateTime, formatDuration } from '@/lib/planner/planner-summaries';
import type { FuelPlan, Product } from '@/types';
import { NutritionRailPanel } from './nutrition-rail';
```

In the rendered card body, replace the summary line that read from `plan.summary` with values from `plan.prescription.during`:

```tsx
<p className="text-xs leading-5 text-ink-600">
  {plan.prescription.during.totalCarbsGrams}g carbs ·{' '}
  {plan.prescription.during.totalHydrationMl}ml
</p>
```

(The kcal value isn't part of the v3 prescription. Drop it from the rail summary — keep the rail compact.)

In the title fallback:

```tsx
<h3 className="truncate text-sm font-semibold text-ink-900">
  {plan.title ||
    `${formatDuration(plan.ride.durationMinutes)} ${plan.ride.intensity} plan`}
</h3>
```

Replace the expanded-detail block:

```tsx
{isExpanded ? (
  <div className="border-t border-[color:var(--border-soft)] p-3">
    <FuelResultV3
      section="all"
      prescription={plan.prescription}
      products={products}
    />
  </div>
) : null}
```

Note: `<FuelResultV3>`'s `section` prop accepts `'all' | 'pack' | 'guide' | 'metrics'`. `'all'` renders every section.

- [ ] **Step 4: Update `history.tsx` to render via `<FuelResultV3>`**

In `src/pages/history.tsx`:

- Swap the import: `import { FuelResultV3 } from '@/components/planner/fuel-result-v3';` (drop `FuelResult` and `getFuelResultPlan`).
- Replace any `plan.bottles`, `plan.solids`, `plan.summary`, `plan.rideCharacteristics`, `plan.consumptionGuide` reads with the equivalent fields under `plan.prescription` and `plan.ride`.
- The list-card summary line (currently `${plan.summary.totalCarbsPlanned}g carbs · ...`) becomes:

```tsx
<p>
  {plan.prescription.during.totalCarbsGrams}g carbs ·{' '}
  {plan.prescription.during.totalHydrationMl}ml fluid ·{' '}
  {formatDuration(plan.ride.durationMinutes)} {plan.ride.intensity}
</p>
```

- The expanded detail block:

```tsx
<FuelResultV3
  section="all"
  prescription={plan.prescription}
  products={products}
/>
```

- Drop the bottle-name string built from `plan.bottles.map(...)` — it was a v2-only flourish.

- [ ] **Step 5: Run lint + typecheck**

Run: `npm run lint && npx tsc --noEmit`

Expected: errors should now be limited to `ride-form.tsx` (still passing `sweatRateLph`), `account/settings.tsx` (still references `engineVersion` and the sweat-rate row), planner test files referring to old fields, and the legacy `inventory.tsx` page.

- [ ] **Step 6: No commit yet — keep going to Task 13.**

---

## Task 12: Add the planner weight gate

**Files:**
- Modify: `src/pages/planner.tsx`

- [ ] **Step 1: Add the gate render**

Inside `PlannerPage()`, just after the `useFuelPrescription()` call and before the existing JSX `return`, compose the gated body. Add this inside the existing return, replacing the `<NutritionWorkspaceLayout main={...}>` content's `main` slot conditionally.

Concrete change: introduce `weightReady` from the hook. Replace the contents of `<NutritionWorkspaceLayout main={...}>` with:

```tsx
main={
  fuelEngine.weightReady ? (
    <>
      <PlanningStepPanel ... />  /* existing 3-step body */
      ...
    </>
  ) : (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 py-8 text-center md:py-10">
        <h2 className="text-lg font-semibold text-ink-900">
          Set your weight to plan
        </h2>
        <p className="mx-auto max-w-prose text-sm leading-6 text-ink-600">
          The fueling engine sizes your carbs, fluid, and sodium against rider mass. Set it once on Account.
        </p>
        <div className="pt-1">
          <Button
            asChild
            size="sm"
          >
            <Link to="/account#preferences">Set weight in Account</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

If `<Button asChild>` isn't supported in the project's `Button` primitive, use:

```tsx
<Link
  to="/account#preferences"
  className="inline-flex h-9 items-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-[var(--shadow-brand-glow-md)] hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
>
  Set weight in Account
</Link>
```

Add `import { Link } from 'react-router-dom';` if not already imported.

- [ ] **Step 2: Run the gate test**

Run: `npx vitest run src/pages/__tests__/planner-weight-gate.test.tsx`

Expected: both tests pass.

- [ ] **Step 3: No commit yet.**

---

## Task 13: Trim Settings + ride-form, delete legacy files, ship the green build

This is the second-largest task — every cleanup that makes the build green lands here.

**Files:**
- Modify: `src/components/account/settings.tsx`
- Modify: `src/components/planner/ride-form.tsx`
- Delete: `src/hooks/use-fueling-engine.ts`
- Delete: `src/lib/fueling/adapters/from-v2-inputs.ts`
- Delete: `src/lib/fueling/adapters/` (empty directory)
- Delete: `src/lib/fueling/migration/v2-to-v3.ts`
- Delete: `src/lib/fueling/migration/__tests__/migration.test.ts`
- Delete: `src/lib/fueling/migration/__tests__/` and `src/lib/fueling/migration/` (empty directories)
- Delete: `src/components/planner/fuel-result.tsx`
- Delete: `src/lib/calculator/index.ts`, `index.test.ts`
- Delete: `src/lib/calculator/bottles.ts`, `bottles.test.ts`
- Delete: `src/lib/calculator/carbs.ts`
- Delete: `src/lib/calculator/constants.ts`
- Delete: `src/lib/calculator/timing.ts`
- Delete: `src/lib/calculator/` (empty)

- [ ] **Step 1: Trim `src/components/account/settings.tsx`**

Remove:
- The `getGutTargetTone` helper (lines ~19–23).
- The `parseDraftNumber` helper if only used by sweat rate.
- The `sweatRateDraft`, `sweatError`, `commitSweatRate`, `blurOnEnter` state and handlers tied to sweat rate.
- The Sweat rate `<Row>` (lines ~134–154).
- The `helper` prop on the Gut target row (drop the line `helper={...}`).
- The Fueling engine `<Row>` (lines ~200–216).
- Any unused imports left behind (e.g., `Input`, `formatNumberInputValue` if no other Row uses them).

Keep:
- The Gut target Stepper row (without helper).
- The Heavy sweater Toggle row.
- The Display section (Units + Temperature).
- The Connections section (unchanged).

After the cut, the Fuel `<Section>` should contain exactly two rows: Gut target, Heavy sweater. The Display section should contain exactly two rows: Units, Temperature.

- [ ] **Step 2: Trim `src/components/planner/ride-form.tsx`**

In the `useMemo` block that builds the auto-target input (around lines 320–326), remove the `sweatRateLph` field. The line `sweatRateLph: athleteProfile.sweatRateLph,` deletes; the `heavySweater: athleteProfile.heavySweater,` line stays.

In the dependency array (lines 341–343), remove `athleteProfile.sweatRateLph`.

- [ ] **Step 3: Delete legacy hook + adapter + migration**

```bash
rm src/hooks/use-fueling-engine.ts
rm src/lib/fueling/adapters/from-v2-inputs.ts
rmdir src/lib/fueling/adapters
rm src/lib/fueling/migration/v2-to-v3.ts
rm src/lib/fueling/migration/__tests__/migration.test.ts
rmdir src/lib/fueling/migration/__tests__
rmdir src/lib/fueling/migration
```

- [ ] **Step 4: Delete `<FuelResult>` and the v2 calculator tree**

```bash
rm src/components/planner/fuel-result.tsx
rm src/lib/calculator/index.ts src/lib/calculator/index.test.ts
rm src/lib/calculator/bottles.ts src/lib/calculator/bottles.test.ts
rm src/lib/calculator/carbs.ts
rm src/lib/calculator/constants.ts
rm src/lib/calculator/timing.ts
rmdir src/lib/calculator
```

If any of those files don't exist (e.g., `index.test.ts`), `rm` will error harmlessly — that's fine. Verify:

```bash
ls src/lib/calculator 2>&1 | head
```

Expected: `No such file or directory`.

- [ ] **Step 5: Verify no lingering imports**

```bash
grep -rn "@/lib/calculator\|@/hooks/use-fueling-engine\|fuel-result['\"]" src/ --include="*.ts" --include="*.tsx"
```

Expected: no results. If any pop up, fix the import or delete the consumer.

- [ ] **Step 6: Run lint + typecheck (no full vitest yet)**

Run: `npm run lint && npx tsc --noEmit`

Expected: lint clean, tsc clean.

Skip `npx vitest run` here — the bottle-pool test from Task 4 still fails until Task 14 trims `<SetupCard>`. Run vitest scoped to non-setup-card tests if you want a confidence check:

```bash
npx vitest run --exclude 'src/components/planner/__tests__/setup-card.test.tsx'
```

Expected: green (the new weight-gate test passes here).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(fueling): collapse to v3-only engine; new FuelPlan shape

Drops the v2 calculator, the engine-version Settings toggle, and the
sweat-rate / progressive-tolerance copy. Saved plans now persist
FuelingPrescription and render via FuelResultV3. Planner page hard-gates
when rider weight is missing.

Bottle-pool UX still has the old (capped) cell; Task 14 trims it."
```

---

## Task 14: Trim `<SetupCard>` (drop inventory cap and `/inventory` link)

**Files:**
- Modify: `src/components/planner/setup-card.tsx`
- Modify: `src/pages/planner.tsx` (prop name)

- [ ] **Step 1: Rename `selectedBottleCounts` to `bottlePool` in `<SetupCard>`**

In `setup-card.tsx`:

```ts
interface SetupCardProps {
  bottlePool: BottleInventory;
  drinkMixes: Product[];
  solidProducts: Product[];
  selectedDrinkMixId: string | null;
  selectedSolidIds: string[];
  onBottleCountChange: (size: BottleSize, count: number) => void;
  onDrinkMixChange: (id: string | null) => void;
  onSolidChange: (ids: string[]) => void;
  variant?: 'card' | 'embedded';
}
```

(The `bottleCounts` prop is gone.) Inside the function body, replace `selectedBottleCounts` references with `bottlePool` and `selectedCount` derives from `totalBottleCount(bottlePool)`. Remove the `inventoryTotal` variable and the `inventoryTotal === 0` branch.

- [ ] **Step 2: Trim `<BottleSizeCounter>`**

Replace the component with:

```tsx
function BottleSizeCounter({
  size,
  count,
  onChange,
}: {
  size: BottleSize;
  count: number;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center gap-2 rounded-xl border px-3 py-3 transition-colors',
        count > 0
          ? 'border-brand-300 bg-brand-50/60'
          : 'border-[color:var(--border-soft)] bg-white',
      )}
    >
      <p className="font-semibold text-ink-900">{size}ml</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={count <= 0}
          onClick={() => onChange(count - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white text-ink-700 transition-colors hover:bg-shell-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Remove one ${size}ml bottle`}
        >
          −
        </button>
        <span className="w-4 text-center font-semibold tabular-nums text-ink-900">
          {count}
        </span>
        <button
          type="button"
          onClick={() => onChange(count + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white text-ink-700 transition-colors hover:bg-shell-100"
          aria-label={`Add one ${size}ml bottle`}
        >
          +
        </button>
      </div>
    </div>
  );
}
```

(`max` prop and the `max N` paragraph are gone. The `disabled` cell variant is gone — every cell is interactive.)

Update the `<BottleSizeCounter>` invocation in `<SetupCard>`:

```tsx
{BOTTLE_SIZES.map((size) => (
  <BottleSizeCounter
    key={size}
    size={size}
    count={bottlePool[size]}
    onChange={(value) => onBottleCountChange(size, value)}
  />
))}
```

- [ ] **Step 3: Drop the `/inventory` link branch**

Replace the `inventoryTotal === 0 ? (...)` block with the always-on grid (the second branch of the existing ternary). The "No bottles in inventory. Add bottles" copy goes away.

Drop the `import { Link } from 'react-router-dom';` if it isn't otherwise used in `setup-card.tsx`.

- [ ] **Step 4: Update the `setup-card` summary copy**

Replace `'Select bottles'` and `${selectedCount} selected` lines with cleaner copy:

```tsx
<p className="mt-1 text-sm leading-5 text-brand-800">
  {selectedCount === 0 ? 'Add bottles' : `${selectedCount} in pool`}
</p>
```

- [ ] **Step 5: Update `planner.tsx` to pass the new prop name**

In `planner.tsx`:

```tsx
<SetupCard
  variant="embedded"
  bottlePool={bottlePool}
  drinkMixes={drinkMixOptions}
  solidProducts={solidOptions}
  selectedDrinkMixId={effectiveSelectedDrinkMixId}
  selectedSolidIds={effectiveSelectedSolidIds}
  onBottleCountChange={handleBottleCountChange}
  onDrinkMixChange={handleDrinkMixChange}
  onSolidChange={handleSolidSelectionChange}
/>
```

- [ ] **Step 6: Update and run the bottle-pool test added in Task 4**

The Task 4 test currently passes `bottleCounts={...}` and `selectedBottleCounts={...}`. After this task's prop rename, neither key matches. Update the test to pass `bottlePool={...}`:

In `src/components/planner/__tests__/setup-card.test.tsx`, in both `render(...)` calls:

- Delete the `bottleCounts={...}` line.
- Rename the `selectedBottleCounts={...}` line to `bottlePool={...}` (same value object).

Run: `npx vitest run src/components/planner/__tests__/setup-card.test.tsx`

Expected: both tests pass.

- [ ] **Step 7: Run full tests**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(planner): make bottle pool freely editable (drops inventory cap)"
```

---

## Task 15: Retire `/inventory` and `/bottles` routes; delete the inventory page

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/navigation.ts`
- Modify: `src/components/layout/navigation.test.ts`
- Delete: `src/pages/inventory.tsx`

- [ ] **Step 1: Replace `/inventory` and `/bottles` routes with redirects**

In `src/App.tsx`:

- Delete the line `import { InventoryPage } from '@/pages/inventory';`.
- Replace:

```tsx
<Route path="/inventory" element={<InventoryPage />} />
<Route path="/bottles" element={<Navigate to="/inventory" replace />} />
```

with:

```tsx
<Route path="/inventory" element={<Navigate to="/" replace />} />
<Route path="/bottles" element={<Navigate to="/" replace />} />
```

- [ ] **Step 2: Drop `/inventory` and `/bottles` from the navigation match list**

In `src/components/layout/navigation.ts`, line 20:

```ts
matchPaths: ['/', '/nutrition-plan', '/products', '/history'],
```

(`/inventory` and `/bottles` removed.)

- [ ] **Step 3: Update `navigation.test.ts`**

Find:

```ts
['/inventory', 'Fuel plan'],
```

Delete that row. Re-run the test:

Run: `npx vitest run src/components/layout/navigation.test.ts`

Expected: pass.

- [ ] **Step 4: Delete the inventory page**

```bash
rm src/pages/inventory.tsx
```

- [ ] **Step 5: Verify no stragglers**

```bash
grep -rn "InventoryPage\|@/pages/inventory" src/
```

Expected: no results.

- [ ] **Step 6: Run lint + typecheck + tests**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(planner): retire /inventory page, redirect /inventory and /bottles to /"
```

---

## Task 16: Drop `DEFAULT_BOTTLE_COUNTS` and clean up `defaults.ts`

**Files:**
- Modify: `src/lib/defaults.ts`

- [ ] **Step 1: Confirm `DEFAULT_BOTTLE_COUNTS` is unused**

```bash
grep -rn "DEFAULT_BOTTLE_COUNTS" src/
```

Expected: only the export site in `src/lib/defaults.ts` remains.

- [ ] **Step 2: Delete the export**

Open `src/lib/defaults.ts` and remove the `DEFAULT_BOTTLE_COUNTS` constant and its associated import (likely `EMPTY_BOTTLE_INVENTORY` if no longer used elsewhere).

- [ ] **Step 3: Run lint + tests**

Run: `npm run lint && npx vitest run`

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/defaults.ts
git commit -m "chore(defaults): drop DEFAULT_BOTTLE_COUNTS"
```

---

## Task 17: Add an integration test for engine smallest-subset behavior

**Files:**
- Create: `src/hooks/__tests__/use-fuel-prescription.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFuelPrescription } from '@/hooks/use-fuel-prescription';
import { useStore } from '@/store';
import type { Product, RideCharacteristics } from '@/types';

const ride: RideCharacteristics = {
  durationMinutes: 60,
  carbTargetGramsPerHour: 60,
  intensity: 'endurance',
  heatFactor: 'moderate',
  refuelStops: 0,
  planningMode: 'manual',
};

const drinkMix: Product = {
  id: 'mix',
  name: 'Test mix',
  type: 'drink_mix',
  isAvailable: true,
  nutrition: { carbsGrams: 30, calories: 120, sodiumMg: 100 },
  serving: { servingSizeGrams: 40, scoopSizeGrams: 40 },
  createdAt: 0,
  updatedAt: 0,
};

describe('useFuelPrescription', () => {
  beforeEach(() => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: {
          ...state.settings.athleteProfile,
          weightKg: 70,
        },
      },
    }));
  });

  it('returns null when weight is missing', () => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: {
          ...state.settings.athleteProfile,
          weightKg: undefined,
        },
      },
    }));

    const { result } = renderHook(() => useFuelPrescription());
    expect(result.current.weightReady).toBe(false);
    const out = result.current.build({
      ride,
      bottles: [{ capacityMl: 750 }],
      drinkMix,
      solids: [],
    });
    expect(out).toBeNull();
  });

  it('uses one bottle when one is enough for the fluid target', () => {
    const { result } = renderHook(() => useFuelPrescription());
    const out = result.current.build({
      ride,
      bottles: [
        { capacityMl: 550 },
        { capacityMl: 750 },
        { capacityMl: 950 },
      ],
      drinkMix,
      solids: [],
    });
    expect(out).not.toBeNull();
    // 60-minute moderate-heat endurance ride needs <950ml; one bottle suffices.
    expect(out!.packList.bottles.length).toBe(1);
    expect(out!.packList.fluidShortfallMl).toBe(0);
  });

  it('reports fluid shortfall when the pool cannot cover the target', () => {
    const longRide: RideCharacteristics = {
      ...ride,
      durationMinutes: 240,
      heatFactor: 'hot',
      refuelStops: 0,
    };

    const { result } = renderHook(() => useFuelPrescription());
    const out = result.current.build({
      ride: longRide,
      bottles: [{ capacityMl: 550 }],
      drinkMix,
      solids: [],
    });
    expect(out).not.toBeNull();
    expect(out!.packList.fluidShortfallMl).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/hooks/__tests__/use-fuel-prescription.test.ts`

Expected: all three tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/__tests__/use-fuel-prescription.test.ts
git commit -m "test(hooks): cover useFuelPrescription gate, smallest-subset, shortfall"
```

---

## Task 18: Add a Settings render test

**Files:**
- Create or update: `src/components/account/__tests__/settings.test.tsx`

- [ ] **Step 1: Check for an existing test file**

```bash
ls src/components/account/__tests__/settings.test.tsx 2>/dev/null || echo absent
```

If absent, create. If present, append.

- [ ] **Step 2: Write the test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Settings } from '@/components/account/settings';
import { AuthProvider } from '@/lib/auth/auth-provider';

function renderSettings() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Settings />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Settings', () => {
  it('renders Gut target and Heavy sweater rows in the Fuel section', () => {
    renderSettings();
    expect(screen.getByText('Gut target')).toBeInTheDocument();
    expect(screen.getByText('Heavy sweater')).toBeInTheDocument();
  });

  it('does not render the Sweat rate row', () => {
    renderSettings();
    expect(screen.queryByText('Sweat rate')).not.toBeInTheDocument();
  });

  it('does not render the Fueling engine row', () => {
    renderSettings();
    expect(screen.queryByText('Fueling engine')).not.toBeInTheDocument();
  });

  it('does not render the Progressive tolerance helper text', () => {
    renderSettings();
    expect(screen.queryByText(/Progressive tolerance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Conservative tolerance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aggressive tolerance/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/components/account/__tests__/settings.test.tsx`

Expected: all four tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/account/__tests__/settings.test.tsx
git commit -m "test(settings): cover Fuel section rows after v3-only cleanup"
```

---

## Task 19: Final verification pass

- [ ] **Step 1: Search for stragglers**

```bash
grep -rn "engineVersion\|sweatRateLph\|bottleCounts\|@/lib/calculator\|use-fueling-engine\|FuelResult['\"]\|getFuelResultPlan\|generateConsumptionGuide\|/inventory\|InventoryPage" src/ --include="*.ts" --include="*.tsx"
```

Expected: only the `/inventory` redirect routes in `src/App.tsx` and possibly the `bottleCounts` mention in the store-migration `omit` (an underscored variable). Anything else is a leftover — remove it.

- [ ] **Step 2: Lint + typecheck + tests + build**

```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
```

Expected: all four pass.

- [ ] **Step 3: Manual smoke check**

Start the dev server:

```bash
npm run dev
```

Click through:

1. Open `http://localhost:5173/`. With weight unset, the gate card shows; clicking the button lands on `/account#preferences`.
2. Set weight on Account, return to the planner. Setup step shows the bottle pool grid.
3. Tap `+` on 950ml twice. Counter goes from 0 → 1 → 2.
4. Add 1×750ml. Pick a drink mix. Continue to ride data, enter a 60-min endurance ride. Build plan.
5. Result view shows pack list with one bottle (engine picked the smallest subset).
6. Save plan. Reload page. Saved plans rail shows the entry.
7. Click "Reuse" on the saved plan. Pool repopulates.
8. Visit `http://localhost:5173/inventory`. Redirects to `/`.
9. Open Account / Settings. Confirm Fuel section has two rows; Display section has Units + Temperature only.

- [ ] **Step 4: Commit any final tweaks**

If the manual smoke surfaced any small issue (typo, wrong tone, missing import), fix it inline and commit:

```bash
git add -A
git commit -m "polish(fueling): smoke-test fixes after v3-only cleanup"
```

If nothing surfaced, this step is a no-op.

---

## Self-review notes (for the implementer)

After Task 19, the spec's acceptance check (in the design doc, §"Acceptance check") should pass cleanly. If anything in that list fails, do not proceed to merge — file a follow-up task and fix it.

Two judgment calls left for the implementer:

- **`<DebugCopyButton>` content (Task 8 Step 9):** the simple JSON-dump approach is the minimal correct change. If you want it to remain useful in dev (e.g., a markdown summary), keep its layout but read fields from `prescription` instead of `plan`. Do not let polish on the debug button block landing the rest.
- **`hasAvailableBottle` field on `AppReadiness` (Task 9 Step 1):** if a consumer outside the store still reads it, leaving it as `false` and chasing the reference in a follow-up commit is acceptable.

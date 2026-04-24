# Nutrition One-Page Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the fuel planner into a single nutrition workspace with a progressive three-step accordion and a compact inventory/saved-plans rail.

**Architecture:** Keep the calculator and store unchanged. Extract planner summary and saved-plan reuse helpers first, add focused layout/rail components, then refactor `PlannerPage` so all three steps render inline instead of replacing the page. Existing `/inventory` and `/history` routes remain as full management pages.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Vitest. No new dependencies.

---

## Worktree Notes

The repository currently has unrelated staged and untracked files. Do not revert them. When committing tasks from this plan, use pathspec commits so unrelated staged files are not included.

Before each commit, run:

```bash
git status --short
```

Commit only the files listed in that task.

---

## File Structure

### Create

```text
src/lib/planner/planner-summaries.ts
src/lib/planner/planner-summaries.test.ts
src/lib/planner/saved-plan-draft.ts
src/lib/planner/saved-plan-draft.test.ts
src/components/planner/nutrition-workspace-layout.tsx
src/components/planner/planning-step-panel.tsx
src/components/planner/nutrition-rail.tsx
src/components/planner/inventory-rail-panel.tsx
src/components/planner/saved-plans-rail-panel.tsx
```

### Modify

```text
src/pages/planner.tsx
src/pages/history.tsx
src/components/planner/setup-card.tsx
```

### Responsibility Boundaries

- `planner-summaries.ts`: Pure formatting and readiness helpers for setup, ride, and fuel plan display.
- `saved-plan-draft.ts`: Pure conversion from saved `FuelPlan` to `PlannerDraft`.
- `nutrition-workspace-layout.tsx`: Responsive main-plus-rail layout only.
- `planning-step-panel.tsx`: Accordion panel chrome only.
- `nutrition-rail.tsx`: Rail container and shared collapsible rail section.
- `inventory-rail-panel.tsx`: Compact inventory readout and availability toggles.
- `saved-plans-rail-panel.tsx`: Compact saved-plan list, details disclosure, reuse, and delete confirmation.
- `setup-card.tsx`: Existing setup behavior, with a `variant` prop so it can render without outer `Card` chrome inside the accordion.
- `planner.tsx`: Orchestrates state, calculation, stale-plan behavior, and composition.
- `history.tsx`: Uses shared saved-plan helper to avoid duplicate reuse logic.

---

## Task 1: Planner Summary And Saved-Plan Helpers

**Files:**
- Create: `src/lib/planner/planner-summaries.ts`
- Create: `src/lib/planner/planner-summaries.test.ts`
- Create: `src/lib/planner/saved-plan-draft.ts`
- Create: `src/lib/planner/saved-plan-draft.test.ts`

- [ ] **Step 1: Write failing tests for planner summaries**

Create `src/lib/planner/planner-summaries.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  formatDuration,
  formatRideSummary,
  formatSetupSummary,
  getFuelResultPlan,
  getPlanTitleSuggestion,
  isRideSnapshotEquivalentToRide,
} from './planner-summaries';
import type { BottleInventory } from '@/types/bottle';
import type { FuelPlan, Product, RideCharacteristics } from '@/types';
import type { RideFormSnapshot } from '@/components/planner/ride-form';

const bottles: BottleInventory = { 550: 1, 750: 1, 950: 0 };

const drinkMix: Product = {
  id: 'mix-1',
  name: 'Tailwind',
  brand: 'Tailwind',
  type: 'drink_mix',
  isAvailable: true,
  nutrition: { carbsGrams: 25, calories: 100 },
  serving: {},
  createdAt: 1,
  updatedAt: 1,
};

const ride: RideCharacteristics = {
  durationMinutes: 135,
  intensity: 'tempo',
  heatFactor: 'warm',
  carbTargetGramsPerHour: 80,
  planningMode: 'manual',
  refuelStops: 1,
};

describe('planner summaries', () => {
  it('formats durations for minutes and hours', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(135)).toBe('2h 15m');
    expect(formatDuration(120)).toBe('2h 0m');
  });

  it('summarizes a valid setup', () => {
    expect(formatSetupSummary({
      selectedBottleCounts: bottles,
      selectedDrinkMix: drinkMix,
      selectedSolidIds: ['gel-1', 'bar-1'],
    })).toBe('2 bottles - Tailwind - 2 solids');
  });

  it('summarizes an incomplete setup', () => {
    expect(formatSetupSummary({
      selectedBottleCounts: { 550: 0, 750: 0, 950: 0 },
      selectedDrinkMix: null,
      selectedSolidIds: [],
    })).toBe('Select bottles and drink mix');
  });

  it('summarizes ride data', () => {
    expect(formatRideSummary(ride)).toBe('2h 15m - tempo - warm - 80g/h');
  });

  it('suggests a saved plan title from ride details', () => {
    expect(getPlanTitleSuggestion(ride)).toBe('2h 15m Tempo Plan');
  });

  it('compares ride snapshots against calculated ride data', () => {
    const snapshot: RideFormSnapshot = {
      planningMode: 'manual',
      durationMinutes: 135,
      intensity: 'tempo',
      heatFactor: 'warm',
      carbTarget: 80,
      refuelStops: 1,
      autoInputPair: 'duration_if',
      autoDurationInput: '135',
      autoIfInput: '0.8',
      autoTssInput: '120',
      autoCarbOverrideInput: '',
    };

    expect(isRideSnapshotEquivalentToRide(snapshot, ride)).toBe(true);
    expect(
      isRideSnapshotEquivalentToRide(
        { ...snapshot, heatFactor: 'hot' },
        ride
      )
    ).toBe(false);
  });

  it('strips persistence fields from a saved plan for result rendering', () => {
    const plan: FuelPlan = {
      id: 'plan-1',
      createdAt: 100,
      title: 'Saved',
      rideCharacteristics: ride,
      bottles: [],
      solids: [],
      consumptionGuide: [],
      summary: {
        totalCarbsPlanned: 180,
        totalCaloriesPlanned: 720,
        totalCarbsNeeded: 180,
        hydrationMl: 1500,
      },
    };

    expect(getFuelResultPlan(plan)).toEqual({
      title: 'Saved',
      rideCharacteristics: ride,
      bottles: [],
      solids: [],
      consumptionGuide: [],
      summary: plan.summary,
    });
  });

  it('formats saved-plan dates with stable options', () => {
    expect(formatDateTime(new Date('2026-04-24T14:05:00Z').getTime())).toContain(
      'Apr'
    );
  });
});
```

- [ ] **Step 2: Write failing tests for saved-plan draft conversion**

Create `src/lib/planner/saved-plan-draft.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildPlannerDraftFromSavedPlan } from './saved-plan-draft';
import type { FuelPlan, Product } from '@/types';

const mix: Product = {
  id: 'mix-1',
  name: 'Mix',
  type: 'drink_mix',
  isAvailable: true,
  nutrition: { carbsGrams: 30, calories: 120 },
  serving: {},
  createdAt: 1,
  updatedAt: 1,
};

const unavailableGel: Product = {
  id: 'gel-1',
  name: 'Gel',
  type: 'gel',
  isAvailable: false,
  nutrition: { carbsGrams: 22, calories: 100 },
  serving: {},
  createdAt: 1,
  updatedAt: 1,
};

const plan: FuelPlan = {
  id: 'plan-1',
  createdAt: 100,
  title: 'Race plan',
  rideCharacteristics: {
    durationMinutes: 180,
    intensity: 'race',
    heatFactor: 'hot',
    carbTargetGramsPerHour: 90,
    planningMode: 'manual',
  },
  bottles: [
    {
      capacityMl: 550,
      productId: 'mix-1',
      mixGrams: 60,
      carbsTotal: 60,
    },
    {
      capacityMl: 750,
      productId: 'mix-1',
      mixGrams: 70,
      carbsTotal: 70,
    },
  ],
  solids: [
    {
      productId: 'gel-1',
      quantity: 2,
      carbsTotal: 44,
      timingIntervalMinutes: 45,
    },
  ],
  consumptionGuide: [],
  summary: {
    totalCarbsPlanned: 174,
    totalCaloriesPlanned: 696,
    totalCarbsNeeded: 270,
    hydrationMl: 1300,
  },
};

describe('buildPlannerDraftFromSavedPlan', () => {
  it('derives selected bottles, mix, solids, and title', () => {
    expect(buildPlannerDraftFromSavedPlan(plan, [mix])).toEqual({
      ride: plan.rideCharacteristics,
      selectedBottleCounts: { 550: 1, 750: 1, 950: 0 },
      selectedDrinkMixId: 'mix-1',
      selectedSolidIds: ['gel-1'],
      includeUnavailableProducts: false,
      title: 'Race plan',
    });
  });

  it('flags unavailable products used by the saved plan', () => {
    expect(
      buildPlannerDraftFromSavedPlan(plan, [mix, unavailableGel])
        .includeUnavailableProducts
    ).toBe(true);
  });

  it('handles water-only bottles without selecting a mix', () => {
    const waterOnly = {
      ...plan,
      bottles: [
        {
          capacityMl: 950,
          productId: '',
          mixGrams: 0,
          carbsTotal: 0,
          isWaterOnly: true,
        },
      ],
      solids: [],
      title: undefined,
    };

    expect(buildPlannerDraftFromSavedPlan(waterOnly, [])).toMatchObject({
      selectedBottleCounts: { 550: 0, 750: 0, 950: 1 },
      selectedDrinkMixId: null,
      selectedSolidIds: [],
      includeUnavailableProducts: false,
      title: undefined,
    });
  });
});
```

- [ ] **Step 3: Run helper tests and verify they fail**

Run:

```bash
npm run test -- src/lib/planner/planner-summaries.test.ts src/lib/planner/saved-plan-draft.test.ts
```

Expected: fail because the helper modules do not exist.

- [ ] **Step 4: Implement planner summaries**

Create `src/lib/planner/planner-summaries.ts`:

```ts
import type { RideFormSnapshot } from '@/components/planner/ride-form';
import type { BottleInventory } from '@/types/bottle';
import { totalBottleCount } from '@/types/bottle';
import type { FuelPlan, Product, RideCharacteristics } from '@/types';

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getPlanTitleSuggestion(ride: RideCharacteristics): string {
  const intensity = `${ride.intensity[0].toUpperCase()}${ride.intensity.slice(1)}`;
  return `${formatDuration(ride.durationMinutes)} ${intensity} Plan`;
}

export function formatSetupSummary({
  selectedBottleCounts,
  selectedDrinkMix,
  selectedSolidIds,
}: {
  selectedBottleCounts: BottleInventory;
  selectedDrinkMix: Product | null;
  selectedSolidIds: readonly string[];
}): string {
  const bottleCount = totalBottleCount(selectedBottleCounts);

  if (bottleCount === 0 && !selectedDrinkMix) {
    return 'Select bottles and drink mix';
  }
  if (bottleCount === 0) return 'Select bottles';
  if (!selectedDrinkMix) return 'Select drink mix';

  const parts = [
    `${bottleCount} bottle${bottleCount === 1 ? '' : 's'}`,
    selectedDrinkMix.name,
  ];

  if (selectedSolidIds.length > 0) {
    parts.push(
      `${selectedSolidIds.length} solid${selectedSolidIds.length === 1 ? '' : 's'}`
    );
  }

  return parts.join(' - ');
}

export function formatRideSummary(ride: RideCharacteristics | undefined): string {
  if (!ride) return 'Enter ride data';

  return [
    formatDuration(ride.durationMinutes),
    ride.intensity,
    ride.heatFactor,
    `${ride.carbTargetGramsPerHour}g/h`,
  ].join(' - ');
}

export function isRideSnapshotEquivalentToRide(
  snapshot: RideFormSnapshot | undefined,
  ride: RideCharacteristics | undefined
): boolean {
  if (!snapshot || !ride) return false;

  return (
    snapshot.durationMinutes === ride.durationMinutes &&
    snapshot.intensity === ride.intensity &&
    snapshot.heatFactor === ride.heatFactor &&
    snapshot.carbTarget === ride.carbTargetGramsPerHour &&
    snapshot.planningMode === (ride.planningMode ?? 'manual') &&
    (snapshot.refuelStops ?? 0) === (ride.refuelStops ?? 0)
  );
}

export function getFuelResultPlan(
  plan: FuelPlan
): Omit<FuelPlan, 'id' | 'createdAt'> {
  const { id, createdAt, ...rest } = plan;
  void id;
  void createdAt;
  return rest;
}
```

- [ ] **Step 5: Implement saved-plan draft conversion**

Create `src/lib/planner/saved-plan-draft.ts`:

```ts
import type { PlannerDraft } from '@/store';
import type { BottleInventory, BottleSize } from '@/types/bottle';
import { BOTTLE_SIZES, isBottleSize } from '@/types/bottle';
import type { FuelPlan, Product } from '@/types';

function emptyBottleCounts(): BottleInventory {
  return { 550: 0, 750: 0, 950: 0 };
}

export function buildPlannerDraftFromSavedPlan(
  plan: FuelPlan,
  products: readonly Product[]
): PlannerDraft {
  const selectedBottleCounts = emptyBottleCounts();

  for (const allocation of plan.bottles) {
    const capacity = allocation.capacityMl as BottleSize;
    if (isBottleSize(capacity)) {
      selectedBottleCounts[capacity] += 1;
    }
  }

  const selectedDrinkMixId =
    plan.bottles.find((allocation) => !allocation.isWaterOnly)?.productId ?? null;
  const selectedSolidIds = plan.solids.map((solid) => solid.productId);

  const usedProductIds = [
    ...(selectedDrinkMixId ? [selectedDrinkMixId] : []),
    ...selectedSolidIds,
  ];
  const includeUnavailableProducts = usedProductIds.some((productId) => {
    const product = products.find((candidate) => candidate.id === productId);
    return product ? !product.isAvailable : false;
  });

  return {
    ride: plan.rideCharacteristics,
    selectedBottleCounts: BOTTLE_SIZES.reduce((acc, size) => {
      acc[size] = selectedBottleCounts[size];
      return acc;
    }, emptyBottleCounts()),
    selectedDrinkMixId,
    selectedSolidIds,
    includeUnavailableProducts,
    title: plan.title,
  };
}
```

- [ ] **Step 6: Run helper tests and verify they pass**

Run:

```bash
npm run test -- src/lib/planner/planner-summaries.test.ts src/lib/planner/saved-plan-draft.test.ts
```

Expected: both test files pass.

- [ ] **Step 7: Commit helper extraction**

Run:

```bash
git add src/lib/planner/planner-summaries.ts src/lib/planner/planner-summaries.test.ts src/lib/planner/saved-plan-draft.ts src/lib/planner/saved-plan-draft.test.ts
git commit -m "feat(planner): add nutrition workspace helpers" -- src/lib/planner/planner-summaries.ts src/lib/planner/planner-summaries.test.ts src/lib/planner/saved-plan-draft.ts src/lib/planner/saved-plan-draft.test.ts
```

---

## Task 2: Workspace Layout And Accordion Primitives

**Files:**
- Create: `src/components/planner/nutrition-workspace-layout.tsx`
- Create: `src/components/planner/planning-step-panel.tsx`
- Create: `src/components/planner/nutrition-rail.tsx`

- [ ] **Step 1: Create the workspace layout**

Create `src/components/planner/nutrition-workspace-layout.tsx`:

```tsx
import type { ReactNode } from 'react';

interface NutritionWorkspaceLayoutProps {
  main: ReactNode;
  rail: ReactNode;
}

export function NutritionWorkspaceLayout({
  main,
  rail,
}: NutritionWorkspaceLayoutProps) {
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start lg:gap-5 lg:space-y-0 xl:gap-6">
      <div className="min-w-0 space-y-3 md:space-y-4">{main}</div>
      <aside className="min-w-0 lg:sticky lg:top-[5.25rem]">{rail}</aside>
    </div>
  );
}
```

- [ ] **Step 2: Create the planning step panel**

Create `src/components/planner/planning-step-panel.tsx`:

```tsx
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui';

interface PlanningStepPanelProps {
  step: number;
  title: string;
  summary: string;
  active: boolean;
  complete: boolean;
  disabled?: boolean;
  disabledReason?: string;
  stale?: boolean;
  children: ReactNode;
  onToggle: () => void;
}

export function PlanningStepPanel({
  step,
  title,
  summary,
  active,
  complete,
  disabled,
  disabledReason,
  stale,
  children,
  onToggle,
}: PlanningStepPanelProps) {
  return (
    <Card
      className={clsx(
        'overflow-hidden transition-[border-color,box-shadow] duration-200',
        active && 'border-brand-200 shadow-[var(--shadow-float)]',
        disabled && 'opacity-70'
      )}
    >
      <button
        type="button"
        disabled={disabled}
        aria-expanded={active}
        onClick={onToggle}
        className={clsx(
          'flex min-h-[4.75rem] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-inset md:px-5',
          active ? 'bg-brand-50/70' : 'bg-white hover:bg-shell-50',
          disabled && 'cursor-not-allowed hover:bg-white'
        )}
      >
        <span className="flex min-w-0 items-start gap-3">
          <span
            className={clsx(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
              active || complete
                ? 'border-brand-300 bg-brand-100 text-brand-800'
                : 'border-[color:var(--border-soft)] bg-shell-50 text-ink-600'
            )}
          >
            {step}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="section-title text-base">{title}</span>
              {stale ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.68rem] font-semibold text-amber-800">
                  Needs rebuild
                </span>
              ) : null}
            </span>
            <span className="mt-1 block text-sm leading-5 text-ink-600">
              {disabled && disabledReason ? disabledReason : summary}
            </span>
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          className={clsx(
            'h-4 w-4 shrink-0 text-ink-500 transition-transform',
            active && 'rotate-180'
          )}
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {active ? (
        <CardContent className="border-t border-[color:var(--border-soft)]">
          {children}
        </CardContent>
      ) : null}
    </Card>
  );
}
```

- [ ] **Step 3: Create rail primitives**

Create `src/components/planner/nutrition-rail.tsx`:

```tsx
import type { ReactNode } from 'react';
import {
  Card,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui';

interface NutritionRailProps {
  children: ReactNode;
}

interface NutritionRailPanelProps {
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function NutritionRail({ children }: NutritionRailProps) {
  return <div className="space-y-3 md:space-y-4">{children}</div>;
}

export function NutritionRailPanel({
  title,
  summary,
  defaultOpen,
  children,
}: NutritionRailPanelProps) {
  return (
    <Card className="overflow-hidden">
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="rounded-none px-4 py-3.5 md:px-4 md:py-3.5">
          <span className="min-w-0">
            <span className="section-title block text-base">{title}</span>
            <span className="mt-1 block truncate text-sm leading-5 text-ink-600">
              {summary}
            </span>
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-[color:var(--border-soft)] px-4 py-3.5">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
```

- [ ] **Step 4: Run TypeScript check for new primitives**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors from the new files.

- [ ] **Step 5: Commit layout primitives**

Run:

```bash
git add src/components/planner/nutrition-workspace-layout.tsx src/components/planner/planning-step-panel.tsx src/components/planner/nutrition-rail.tsx
git commit -m "feat(planner): add nutrition workspace layout primitives" -- src/components/planner/nutrition-workspace-layout.tsx src/components/planner/planning-step-panel.tsx src/components/planner/nutrition-rail.tsx
```

---

## Task 3: Refit SetupCard For Accordion Use

**Files:**
- Modify: `src/components/planner/setup-card.tsx`

- [ ] **Step 1: Add a variant prop**

In `src/components/planner/setup-card.tsx`, update the props interface:

```tsx
interface SetupCardProps {
  bottleCounts: BottleInventory;
  selectedBottleCounts: BottleInventory;
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

Update the function signature:

```tsx
export function SetupCard({
  bottleCounts,
  selectedBottleCounts,
  drinkMixes,
  solidProducts,
  selectedDrinkMixId,
  selectedSolidIds,
  onBottleCountChange,
  onDrinkMixChange,
  onSolidChange,
  variant = 'card',
}: SetupCardProps) {
```

- [ ] **Step 2: Extract existing content into `content`**

Inside `SetupCard`, keep all current state and helper logic. Replace the current `return (` opening with:

```tsx
  const content = (
    <div className="space-y-3 md:space-y-4">
      <Collapsible
        open={bottlesOpen}
        onOpenChange={setBottlesOpen}
        className="overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-[color:color-mix(in_srgb,var(--color-shell-100)_82%,white)]"
      >
```

Then keep the existing Bottles and Fuel collapsible JSX inside `content`.

Close `content` with:

```tsx
    </div>
  );
```

- [ ] **Step 3: Return embedded or card chrome**

After `content`, return:

```tsx
  if (variant === 'embedded') {
    return content;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-1.5 bg-[var(--surface-soft)]">
        <h2 className="section-title">Setup</h2>
        <p className="section-copy">Choose bottles and fuel.</p>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
```

Remove the old outer `Card`, `CardHeader`, and `CardContent` wrapper from the original return. Keep the imports because the default `card` variant still uses them.

- [ ] **Step 4: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit SetupCard variant**

Run:

```bash
git add src/components/planner/setup-card.tsx
git commit -m "refactor(planner): support embedded setup card" -- src/components/planner/setup-card.tsx
```

---

## Task 4: Inventory And Saved Plans Rail Panels

**Files:**
- Create: `src/components/planner/inventory-rail-panel.tsx`
- Create: `src/components/planner/saved-plans-rail-panel.tsx`

- [ ] **Step 1: Create inventory rail panel**

Create `src/components/planner/inventory-rail-panel.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { Toggle } from '@/components/ui';
import { NutritionRailPanel } from './nutrition-rail';
import { BOTTLE_SIZES, totalBottleCount } from '@/types/bottle';
import type { BottleInventory } from '@/types/bottle';
import type { Product } from '@/types';

const PRODUCT_TYPE_LABELS: Record<Product['type'], string> = {
  drink_mix: 'Drink mix',
  gel: 'Gel',
  chews: 'Chews',
  bar: 'Bar',
  other: 'Other',
};

interface InventoryRailPanelProps {
  bottleCounts: BottleInventory;
  products: Product[];
  onToggleProductAvailability: (productId: string, isAvailable: boolean) => void;
}

export function InventoryRailPanel({
  bottleCounts,
  products,
  onToggleProductAvailability,
}: InventoryRailPanelProps) {
  const bottleTotal = totalBottleCount(bottleCounts);
  const availableProducts = products.filter((product) => product.isAvailable);
  const drinkMixCount = products.filter((product) => product.type === 'drink_mix').length;
  const solidCount = products.filter((product) => product.type !== 'drink_mix').length;

  return (
    <NutritionRailPanel
      title="Inventory"
      summary={`${bottleTotal} bottles - ${availableProducts.length} fuel available`}
      defaultOpen
    >
      <div className="space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-900">Bottles</h3>
            <span className="text-sm text-ink-600">{bottleTotal} total</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {BOTTLE_SIZES.map((size) => (
              <div
                key={size}
                className="rounded-xl border border-[color:var(--border-soft)] bg-shell-50 px-2 py-2 text-center"
              >
                <p className="text-[0.7rem] font-semibold text-ink-500">{size}ml</p>
                <p className="mt-1 font-sans text-lg font-semibold tabular-nums text-ink-900">
                  {bottleCounts[size]}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-900">Fuel</h3>
            <span className="text-sm text-ink-600">
              {drinkMixCount} mix - {solidCount} solids
            </span>
          </div>

          {products.length === 0 ? (
            <p className="rounded-xl border border-[color:var(--border-soft)] bg-shell-50 px-3 py-3 text-sm leading-5 text-ink-600">
              No fuel saved yet.
            </p>
          ) : (
            <div className="max-h-[22rem] divide-y divide-[color:var(--border-soft)] overflow-y-auto rounded-xl border border-[color:var(--border-soft)] bg-white">
              {products.slice(0, 8).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {product.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs leading-5 text-ink-600">
                      {PRODUCT_TYPE_LABELS[product.type]} - {product.nutrition.carbsGrams}g carbs
                    </p>
                  </div>
                  <Toggle
                    checked={product.isAvailable}
                    onChange={(checked) =>
                      onToggleProductAvailability(product.id, checked)
                    }
                    label={`Use ${product.name} in planning`}
                  />
                </div>
              ))}
            </div>
          )}

          {products.length > 8 ? (
            <p className="text-xs leading-5 text-ink-500">
              Showing 8 of {products.length}. Open inventory for the full list.
            </p>
          ) : null}
        </section>

        <Link
          to="/inventory"
          className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition-colors hover:bg-shell-50"
        >
          Manage inventory
        </Link>
      </div>
    </NutritionRailPanel>
  );
}
```

- [ ] **Step 2: Create saved plans rail panel**

Create `src/components/planner/saved-plans-rail-panel.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { FuelResult } from '@/components/planner/fuel-result';
import { NutritionRailPanel } from './nutrition-rail';
import {
  formatDateTime,
  formatDuration,
  getFuelResultPlan,
} from '@/lib/planner/planner-summaries';
import type { FuelPlan, Product } from '@/types';

interface SavedPlansRailPanelProps {
  plans: FuelPlan[];
  products: Product[];
  onReusePlan: (plan: FuelPlan) => void;
  onDeletePlan: (planId: string) => void;
}

export function SavedPlansRailPanel({
  plans,
  products,
  onReusePlan,
  onDeletePlan,
}: SavedPlansRailPanelProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    [plans]
  );

  useEffect(() => {
    if (!confirmingDeleteId) return;
    const timer = window.setTimeout(() => setConfirmingDeleteId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmingDeleteId]);

  return (
    <NutritionRailPanel
      title="Saved plans"
      summary={plans.length === 0 ? 'No saved plans' : `${plans.length} saved`}
    >
      {sortedPlans.length === 0 ? (
        <p className="rounded-xl border border-[color:var(--border-soft)] bg-shell-50 px-3 py-3 text-sm leading-5 text-ink-600">
          Saved plans will appear here after you build and save one.
        </p>
      ) : (
        <div className="space-y-2.5">
          {sortedPlans.map((plan) => {
            const isConfirming = confirmingDeleteId === plan.id;
            const isExpanded = expandedPlanId === plan.id;
            const totalCalories =
              plan.summary.totalCaloriesPlanned ??
              Math.round(plan.summary.totalCarbsPlanned * 4);

            return (
              <article
                key={plan.id}
                className="overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-white"
              >
                <div className="space-y-2 px-3 py-3">
                  <div className="space-y-1">
                    <p className="section-kicker text-[0.66rem] text-ink-500">
                      {formatDateTime(plan.createdAt)}
                    </p>
                    <h3 className="truncate text-sm font-semibold text-ink-900">
                      {plan.title ||
                        `${formatDuration(plan.rideCharacteristics.durationMinutes)} ${plan.rideCharacteristics.intensity} plan`}
                    </h3>
                    <p className="text-xs leading-5 text-ink-600">
                      {plan.summary.totalCarbsPlanned}g carbs - {totalCalories} kcal - {plan.summary.hydrationMl}ml
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      onClick={() => onReusePlan(plan)}
                    >
                      Reuse
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedPlanId((current) =>
                          current === plan.id ? null : plan.id
                        )
                      }
                    >
                      {isExpanded ? 'Hide' : 'Details'}
                    </Button>
                    {isConfirming ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="col-span-2 w-full"
                        onClick={() => onDeletePlan(plan.id)}
                      >
                        Confirm delete
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="col-span-2 w-full"
                        onClick={() => setConfirmingDeleteId(plan.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded ? (
                  <div className="border-t border-[color:var(--border-soft)] p-3">
                    <FuelResult plan={getFuelResultPlan(plan)} products={products} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </NutritionRailPanel>
  );
}
```

- [ ] **Step 3: Type-check rail panels**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit rail panels**

Run:

```bash
git add src/components/planner/inventory-rail-panel.tsx src/components/planner/saved-plans-rail-panel.tsx
git commit -m "feat(planner): add nutrition workspace rail panels" -- src/components/planner/inventory-rail-panel.tsx src/components/planner/saved-plans-rail-panel.tsx
```

---

## Task 5: Refactor PlannerPage Into One Workspace

**Files:**
- Modify: `src/pages/planner.tsx`

- [ ] **Step 1: Update imports**

In `src/pages/planner.tsx`, remove `CardHeader` from the UI import and remove local `formatDuration` and `getPlanTitleSuggestion` after importing shared helpers.

Add imports:

```tsx
import { InventoryRailPanel } from '@/components/planner/inventory-rail-panel';
import { NutritionRail } from '@/components/planner/nutrition-rail';
import { NutritionWorkspaceLayout } from '@/components/planner/nutrition-workspace-layout';
import { PlanningStepPanel } from '@/components/planner/planning-step-panel';
import { SavedPlansRailPanel } from '@/components/planner/saved-plans-rail-panel';
import {
  formatRideSummary,
  formatSetupSummary,
  getPlanTitleSuggestion,
  isRideSnapshotEquivalentToRide,
} from '@/lib/planner/planner-summaries';
import { buildPlannerDraftFromSavedPlan } from '@/lib/planner/saved-plan-draft';
```

Add store selectors:

```tsx
  const fuelPlans = useStore((s) => s.fuelPlans);
  const deleteFuelPlan = useStore((s) => s.deleteFuelPlan);
  const updateProduct = useStore((s) => s.updateProduct);
```

- [ ] **Step 2: Replace `step` state with active accordion state**

Replace:

```tsx
  const [step, setStep] = useState<PlannerStep>(
    initialDraft?.ride ? 2 : parseInitialStep(searchParams.get('step'))
  );
```

with:

```tsx
  const [activeStep, setActiveStep] = useState<PlannerStep>(
    initialDraft?.ride ? 2 : parseInitialStep(searchParams.get('step'))
  );
  const [planIsStale, setPlanIsStale] = useState(false);
```

- [ ] **Step 3: Add stale-plan marker helpers**

Inside `PlannerPage`, after `lastInputRef`, add:

```tsx
  const markPlanStale = useCallback(() => {
    setPlanIsStale((current) => (plan ? true : current));
  }, [plan]);

  const handleRideSnapshotChange = useCallback(
    (snapshot: RideFormSnapshot) => {
      setRideFormSnapshot(snapshot);
      if (
        plan &&
        !isRideSnapshotEquivalentToRide(snapshot, plan.rideCharacteristics)
      ) {
        setPlanIsStale(true);
      }
    },
    [plan]
  );
```

The callback intentionally depends on `plan` because stale state should only be set when a result exists.

- [ ] **Step 4: Mark plan stale when setup changes**

Update `handleBottleCountChange`:

```tsx
  const handleBottleCountChange = (size: BottleSize, count: number) => {
    markPlanStale();
    setSelectedBottleCounts((prev) => ({
      ...prev,
      [size]: Math.max(0, Math.min(count, bottleCounts[size])),
    }));
  };
```

Create wrappers before render:

```tsx
  const handleDrinkMixChange = (id: string | null) => {
    markPlanStale();
    setSelectedDrinkMixId(id);
  };

  const handleSolidSelectionChange = (ids: string[]) => {
    markPlanStale();
    setSelectedSolidIds(ids);
  };
```

- [ ] **Step 5: Clear stale state after calculation**

In `handleCalculate`, replace:

```tsx
    setStep(3);
```

with:

```tsx
    setPlanIsStale(false);
    setActiveStep(3);
```

In `handleResetPlan`, replace:

```tsx
    setStep(1);
```

with:

```tsx
    setPlanIsStale(false);
    setActiveStep(1);
```

- [ ] **Step 6: Add saved-plan reuse handler**

Add inside `PlannerPage`:

```tsx
  const handleReuseSavedPlan = (savedPlan: FuelPlan) => {
    const draft = buildPlannerDraftFromSavedPlan(savedPlan, products);
    setPlannerDraft(draft);
    setSelectedBottleCounts(
      draft.selectedBottleCounts ?? cloneBottleInventory(bottleCounts)
    );
    setSelectedDrinkMixId(draft.selectedDrinkMixId ?? null);
    setSelectedSolidIds(draft.selectedSolidIds ?? []);
    setPersistedRide(draft.ride);
    setRideFormInitialSnapshot(
      draft.ride ? getRideFormSnapshotFromRide(draft.ride) : undefined
    );
    setRideFormInstanceKey((current) => current + 1);
    setPlan(null);
    setV3Prescription(null);
    setPlanIsStale(false);
    setPlanTitle(draft.title ?? '');
    setResultTab('pack');
    setActiveStep(2);
    setToastMessage('Saved plan loaded. Review ride data, then rebuild.');
  };
```

- [ ] **Step 7: Replace step navigation helpers**

Replace `handleStepSelect` and `canOpenStep` with:

```tsx
  const canOpenStep = (targetStep: PlannerStep) => {
    if (targetStep === 1) return true;
    if (targetStep === 2) return canCalculate;
    if (targetStep === 3) {
      return Boolean(plan) || (canCalculate && rideFormCanCalculate);
    }
    return false;
  };

  const handleStepSelect = (targetStep: PlannerStep) => {
    if (!canOpenStep(targetStep)) return;
    setActiveStep((current) => (current === targetStep ? current : targetStep));
  };

  const handleBuildPlanRequest = () => {
    if (canCalculate && rideFormCanCalculate) {
      setActiveStep(3);
      setRideFormSubmitTrigger((current) => current + 1);
    }
  };
```

- [ ] **Step 8: Create computed summaries**

Before `return`, add:

```tsx
  const setupSummary = formatSetupSummary({
    selectedBottleCounts,
    selectedDrinkMix,
    selectedSolidIds: effectiveSelectedSolidIds,
  });
  const rideSummary = formatRideSummary(persistedRide);
  const setupComplete = canCalculate;
  const rideComplete = Boolean(persistedRide) && rideFormCanCalculate;
  const canOpenPlan = canOpenStep(3);
```

- [ ] **Step 9: Replace top-level stepper and conditional rendering**

Replace the `STEP_LABELS` button section and the three `{step === N && ...}` blocks with a `NutritionWorkspaceLayout`.

Use this structure:

```tsx
        <NutritionWorkspaceLayout
          main={
            <>
              <PlanningStepPanel
                step={1}
                title="Setup"
                summary={setupSummary}
                active={activeStep === 1}
                complete={setupComplete}
                onToggle={() => handleStepSelect(1)}
              >
                <SetupCard
                  variant="embedded"
                  bottleCounts={bottleCounts}
                  selectedBottleCounts={selectedBottleCounts}
                  drinkMixes={drinkMixOptions}
                  solidProducts={solidOptions}
                  selectedDrinkMixId={effectiveSelectedDrinkMixId}
                  selectedSolidIds={effectiveSelectedSolidIds}
                  onBottleCountChange={handleBottleCountChange}
                  onDrinkMixChange={handleDrinkMixChange}
                  onSolidChange={handleSolidSelectionChange}
                />
                {canCalculate ? (
                  <div className="mt-4 flex justify-end">
                    <Button type="button" size="sm" onClick={() => handleStepSelect(2)}>
                      Continue to ride data
                    </Button>
                  </div>
                ) : null}
              </PlanningStepPanel>

              <PlanningStepPanel
                step={2}
                title="Ride data"
                summary={rideSummary}
                active={activeStep === 2}
                complete={rideComplete}
                disabled={!canCalculate}
                disabledReason="Select bottles and drink mix first."
                onToggle={() => handleStepSelect(2)}
              >
                <section className="space-y-4 md:space-y-5">
                  <RideForm
                    key={rideFormInstanceKey}
                    initialSnapshot={rideFormInitialSnapshot}
                    onCalculate={handleCalculate}
                    onSnapshotChange={handleRideSnapshotChange}
                    onCanCalculateChange={setRideFormCanCalculate}
                    showCalculateButton={false}
                    submitTrigger={rideFormSubmitTrigger}
                    disabled={!canCalculate}
                  />
                  {canCalculate && rideFormCanCalculate ? (
                    <div className="flex justify-end">
                      <Button type="button" size="sm" onClick={handleBuildPlanRequest}>
                        Build plan
                      </Button>
                    </div>
                  ) : null}
                </section>
              </PlanningStepPanel>

              <PlanningStepPanel
                step={3}
                title="Plan"
                summary={plan ? (planIsStale ? 'Review old result or rebuild' : 'Plan ready') : 'Build from ride data'}
                active={activeStep === 3}
                complete={Boolean(plan) && !planIsStale}
                stale={planIsStale}
                disabled={!canOpenPlan}
                disabledReason="Enter valid ride data first."
                onToggle={() => handleStepSelect(3)}
              >
                {planIsStale ? (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                    This result uses previous inputs. Rebuild to use the current setup and ride data.
                  </div>
                ) : null}

                {plan ? (
                  <div className="space-y-4">
                    <Card className="overflow-hidden">
                      <CardContent className="space-y-3 md:space-y-4">
                        <Input
                          id="plan-title"
                          label="Plan name"
                          value={planTitle}
                          onChange={(event) => setPlanTitle(event.target.value)}
                          placeholder="Optional"
                        />
                        <div className="grid gap-2 sm:flex sm:flex-wrap">
                          <Button
                            type="button"
                            className="w-full sm:w-auto"
                            onClick={planIsStale ? handleBuildPlanRequest : handleSavePlan}
                          >
                            {planIsStale ? 'Rebuild plan' : 'Save plan'}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={handleResetPlan}
                          >
                            Reset
                          </Button>
                        </div>
                        {fuelBreakdown && (
                          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:color-mix(in_srgb,var(--color-shell-100)_90%,white)] p-3 md:p-4">
                            {/* Move the current fuel breakdown table markup here. */}
                          </div>
                        )}
                        {/* Move the current Pack, Ride guide, and Stats tab button group here. */}
                      </CardContent>
                    </Card>
                    {/* Move the current FuelResultV3, FuelResult, v3 fallback card, and DebugCopyButton rendering here. */}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="space-y-3 py-8 text-center">
                      <p className="text-ink-600">Build a plan from the current ride data.</p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleBuildPlanRequest}
                        disabled={!canCalculate || !rideFormCanCalculate}
                      >
                        Build plan
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </PlanningStepPanel>
            </>
          }
          rail={
            <NutritionRail>
              <InventoryRailPanel
                bottleCounts={bottleCounts}
                products={products}
                onToggleProductAvailability={(productId, isAvailable) =>
                  updateProduct(productId, { isAvailable })
                }
              />
              <SavedPlansRailPanel
                plans={fuelPlans}
                products={products}
                onReusePlan={handleReuseSavedPlan}
                onDeletePlan={deleteFuelPlan}
              />
            </NutritionRail>
          }
        />
```

Move the current fuel breakdown table, result tab buttons, `FuelResultV3`, `FuelResult`, v3 fallback card, and `DebugCopyButton` into the indicated Plan panel positions. Preserve their current props and calculations.

- [ ] **Step 10: Remove unused code**

Remove:

```tsx
const STEP_LABELS: Array<{ step: PlannerStep; label: string }> = [
  { step: 1, label: 'Setup' },
  { step: 2, label: 'Ride data' },
  { step: 3, label: 'Plan' },
];
```

Remove now-unused local `formatDuration` and `getPlanTitleSuggestion` definitions from `planner.tsx`.

- [ ] **Step 11: Type-check planner refactor**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 12: Commit planner workspace refactor**

Run:

```bash
git add src/pages/planner.tsx
git commit -m "feat(planner): render nutrition flow as one workspace" -- src/pages/planner.tsx
```

---

## Task 6: Reuse Shared Saved-Plan Helper In HistoryPage

**Files:**
- Modify: `src/pages/history.tsx`

- [ ] **Step 1: Update imports**

In `src/pages/history.tsx`, add:

```tsx
import {
  formatDateTime,
  formatDuration,
  getFuelResultPlan,
} from '@/lib/planner/planner-summaries';
import { buildPlannerDraftFromSavedPlan } from '@/lib/planner/saved-plan-draft';
```

Remove the local `getFuelResultPlan`, `formatDuration`, and `formatDate` functions.

- [ ] **Step 2: Replace reuse derivation**

Replace the body of `handleReusePlan` with:

```tsx
  const handleReusePlan = (plan: FuelPlan) => {
    setPlannerDraft(buildPlannerDraftFromSavedPlan(plan, products));
    navigate('/?step=2');
  };
```

- [ ] **Step 3: Replace date formatter calls**

Replace:

```tsx
{formatDate(plan.createdAt)}
```

with:

```tsx
{formatDateTime(plan.createdAt)}
```

Leave `formatDuration(...)` call sites in place; they now use the imported helper.

- [ ] **Step 4: Run tests for helper behavior**

Run:

```bash
npm run test -- src/lib/planner/planner-summaries.test.ts src/lib/planner/saved-plan-draft.test.ts
```

Expected: pass.

- [ ] **Step 5: Type-check history refactor**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit history reuse refactor**

Run:

```bash
git add src/pages/history.tsx
git commit -m "refactor(history): reuse saved plan draft helper" -- src/pages/history.tsx
```

---

## Task 7: Full Verification And Runtime Check

**Files:**
- No planned source edits unless verification finds defects.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm run test -- src/lib/planner/planner-summaries.test.ts src/lib/planner/saved-plan-draft.test.ts
```

Expected: pass.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm run test
```

Expected: pass.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: no lint errors.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: TypeScript build and Vite build complete successfully.

- [ ] **Step 5: Start the dev server for browser review**

Run:

```bash
npm run dev
```

Expected: Vite reports a local URL, usually `http://localhost:5173/`.

- [ ] **Step 6: Manual browser verification**

Open the Vite URL, not the local `file://` URL, and verify:

- The planner renders as one page.
- Setup, Ride data, and Plan appear as accordion panels.
- Setup starts open for a fresh draft.
- Ride data unlocks after selecting at least one bottle and one drink mix.
- Build plan renders the result in the Plan panel.
- Editing Setup after a result marks Plan as needing rebuild.
- Editing Ride data after a result marks Plan as needing rebuild.
- Rebuild replaces the stale result.
- Inventory rail toggles availability and the setup selectors react.
- Saved plan reuse loads the draft and expands Ride data.
- Mobile width stacks rail panels below the planning flow.
- `/inventory` and `/history` still load.

- [ ] **Step 7: Final status**

Run:

```bash
git status --short
```

Expected: only unrelated pre-existing files remain staged/untracked, or the workspace is clean if those were handled separately.

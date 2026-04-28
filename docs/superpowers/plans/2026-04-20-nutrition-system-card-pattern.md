# Nutrition System-Card Pattern Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the "system card" design patterns from gear (SpecRow with dotted leader, hairline-divided row list) into shared UI primitives, then apply them to the v3 fueling Pack/Ride Guide/Stats UI so the planner feels as tight and consistent as the gear hub.

**Architecture:** Two phases.
- **Phase A** promotes two gear-local components (`SystemSpecRow`, the `<ul>` row list used in `ActiveSetupList`) into shared `src/components/ui/` primitives and refits the gear consumers, without changing gear visuals.
- **Phase B** redesigns each subcomponent of `FuelResultV3` to use those primitives, collapsing the six "card per statsbox" grids and the three "card per pack item" lists into unified, hairline-divided cards. v2 `FuelResult` is left in place for the history page fallback — no changes there.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Vitest, Zustand. No new dependencies.

---

## File Structure

### New files

```
src/components/ui/spec-row.tsx              # SpecRow primitive (promoted from gear/system-spec-row)
src/components/ui/divided-row-list.tsx      # <Card>-wrapped divided <ul> primitive
src/lib/fueling/format.ts                   # Small formatters used by v3 UI
src/lib/fueling/__tests__/format.test.ts    # Unit tests for formatters
```

### Deleted files

```
src/components/gear/system-spec-row.tsx     # Replaced by src/components/ui/spec-row.tsx
```

### Modified files

```
src/components/ui/index.ts                  # Export SpecRow, DividedRowList
src/components/gear/bike-system-card.tsx    # Import SpecRow from ui
src/components/gear/active-setup-list.tsx   # Consume DividedRowList primitive
src/components/planner/fuel-result-v3.tsx   # Every subcomponent touched (see Phase B tasks)
```

### Responsibility boundaries

- **`SpecRow`** — single-line `label … value` row with dotted leader and optional edit affordance. Used inside any Card that wants a stats list. Stateless, styling only.
- **`DividedRowList`** — Card-wrapped `<ul>` with `divide-y` hairlines and consistent internal padding. Takes a render-prop or `children`. Callers pass row content with their own click/hover state.
- **`format.ts`** — tiny pure formatters (`formatGrams`, `formatMl`, `formatMgPerHour`, etc.) that encapsulate the consistent styling of units. Keeps FuelResultV3 free of inline `${x} g/h` template literals so every screen formats the same way.
- **`FuelResultV3`** — unchanged top-level export; each subcomponent (`ContextCard`, `PreRideCard`, `DuringCard`, `PostRideCard`, `DailyCard`, `TimelineCard`, `WarningsCard`) is internally rewritten to use SpecRow/DividedRowList.

---

## Task 1: Promote SystemSpecRow to a shared SpecRow primitive

**Files:**
- Create: `src/components/ui/spec-row.tsx`
- Delete: `src/components/gear/system-spec-row.tsx`
- Modify: `src/components/ui/index.ts`
- Modify: `src/components/gear/bike-system-card.tsx:3` (import path only)

- [ ] **Step 1: Create the shared SpecRow file**

Write `src/components/ui/spec-row.tsx`:

```tsx
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface SpecRowProps {
  label: string;
  value: ReactNode;
  /** When true, the value is rendered dimmer (for "—" placeholders). */
  muted?: boolean;
  /**
   * When provided, the value becomes a button that invokes onEdit on click.
   * Used for inline-edit affordances without pushing the value off its axis.
   */
  onEdit?: () => void;
  /** Accessible label describing the edit action (required when onEdit is set). */
  editAriaLabel?: string;
  /** Optional accent on the value (e.g., for hero stats). */
  accent?: boolean;
}

export function SpecRow({
  label,
  value,
  muted,
  onEdit,
  editAriaLabel,
  accent,
}: SpecRowProps) {
  const valueClasses = clsx(
    'shrink-0 font-medium tabular-nums',
    muted ? 'text-ink-400' : accent ? 'text-brand-700' : 'text-ink-900'
  );

  return (
    <div className="flex items-baseline gap-2 text-sm leading-6">
      <span className="shrink-0 text-ink-600">{label}</span>
      <span
        aria-hidden
        className="mx-1 min-w-[1.5rem] flex-1 translate-y-[-0.22em] border-b border-dotted border-[color:var(--border-soft)]"
      />
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={editAriaLabel}
          className={clsx(
            valueClasses,
            'rounded-md px-1.5 py-0 -my-0.5 transition-colors hover:bg-shell-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200'
          )}
        >
          {value}
        </button>
      ) : (
        <span className={valueClasses}>{value}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the export to the ui barrel**

Edit `src/components/ui/index.ts`, insert after the `Select` export:

```ts
export { SpecRow } from './spec-row';
```

- [ ] **Step 3: Switch BikeSystemCard over**

In `src/components/gear/bike-system-card.tsx`, change the `SystemSpecRow` import:

```tsx
// Before
import { SystemSpecRow } from './system-spec-row';

// After
import { SpecRow } from '@/components/ui';
```

Then `replace_all` occurrences of `SystemSpecRow` with `SpecRow` in the same file.

- [ ] **Step 4: Delete the old file**

```bash
rm src/components/gear/system-spec-row.tsx
```

- [ ] **Step 5: Type-check and lint**

Run:

```bash
npx tsc --noEmit && npm run lint
```

Expected: no output from `tsc`, clean `lint`. If the delete orphaned any import, fix it.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/spec-row.tsx src/components/ui/index.ts \
        src/components/gear/bike-system-card.tsx
git rm src/components/gear/system-spec-row.tsx
git commit -m "refactor(ui): promote SystemSpecRow to shared SpecRow primitive"
```

---

## Task 2: Create the DividedRowList primitive and refit ActiveSetupList

**Files:**
- Create: `src/components/ui/divided-row-list.tsx`
- Modify: `src/components/ui/index.ts`
- Modify: `src/components/gear/active-setup-list.tsx`

- [ ] **Step 1: Create the DividedRowList primitive**

Write `src/components/ui/divided-row-list.tsx`:

```tsx
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Card } from './card';

interface DividedRowListProps<T> {
  items: readonly T[];
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** Optional className merged onto the wrapping Card. */
  className?: string;
  /** Optional content rendered above the divided list (e.g., kicker + title row). */
  header?: ReactNode;
}

export function DividedRowList<T>({
  items,
  getKey,
  renderItem,
  className,
  header,
}: DividedRowListProps<T>) {
  return (
    <Card className={clsx('overflow-hidden', className)}>
      {header ? (
        <div className="border-b border-[color:var(--border-soft)] px-3 py-2.5 md:px-4 md:py-3">
          {header}
        </div>
      ) : null}
      <ul className="divide-y divide-[color:var(--border-soft)] py-1">
        {items.map((item, i) => (
          <li key={getKey(item, i)}>{renderItem(item, i)}</li>
        ))}
      </ul>
    </Card>
  );
}
```

- [ ] **Step 2: Export it from the ui barrel**

Edit `src/components/ui/index.ts`, insert after the new `SpecRow` export:

```ts
export { DividedRowList } from './divided-row-list';
```

- [ ] **Step 3: Refit ActiveSetupList to consume DividedRowList**

In `src/components/gear/active-setup-list.tsx`, replace the JSX inside the exported `ActiveSetupList` function. The existing row-content helpers stay; only the wrapper changes:

```tsx
import { DividedRowList } from '@/components/ui';
// ... existing imports

export function ActiveSetupList({
  rows,
  onInstall,
  onRemove,
  onService,
}: ActiveSetupListProps) {
  return (
    <DividedRowList
      items={rows}
      getKey={(row) => row.slotKey}
      renderItem={(row) =>
        row.installRecord ? (
          <div className="flex items-start justify-between gap-2 px-3 py-2 md:px-4 md:py-2.5">
            {/* ...existing installed-row JSX, unchanged */}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onInstall(row.slotKey)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-shell-50 focus:outline-none focus-visible:bg-shell-50 md:px-4 md:py-2.5"
          >
            {/* ...existing empty-row JSX, unchanged */}
          </button>
        )
      }
    />
  );
}
```

Remove the now-unused `Card` import (`DividedRowList` owns the Card).

- [ ] **Step 4: Type-check and lint**

```bash
npx tsc --noEmit && npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/divided-row-list.tsx \
        src/components/ui/index.ts \
        src/components/gear/active-setup-list.tsx
git commit -m "refactor(ui): add DividedRowList primitive and adopt in ActiveSetupList"
```

---

## Task 3: Add fueling format helpers (TDD)

**Files:**
- Create: `src/lib/fueling/format.ts`
- Test: `src/lib/fueling/__tests__/format.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/fueling/__tests__/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  formatCarbsGrams,
  formatCarbsPerHour,
  formatFluidMl,
  formatFluidPerHour,
  formatSodiumMg,
  formatSodiumPerHour,
  formatPercent,
  formatGPerKg,
  formatMgPerL,
} from '../format';

describe('fueling format helpers', () => {
  it('formats carb totals as rounded grams with a unit suffix', () => {
    expect(formatCarbsGrams(82)).toBe('82 g');
    expect(formatCarbsGrams(0)).toBe('0 g');
  });

  it('formats per-hour carbs with a slash unit', () => {
    expect(formatCarbsPerHour(85)).toBe('85 g/h');
  });

  it('formats fluid totals with thousands separators', () => {
    expect(formatFluidMl(1500)).toBe('1,500 ml');
  });

  it('formats per-hour fluid', () => {
    expect(formatFluidPerHour(700)).toBe('700 ml/h');
  });

  it('formats sodium and sodium/h', () => {
    expect(formatSodiumMg(450)).toBe('450 mg');
    expect(formatSodiumPerHour(600)).toBe('600 mg/h');
  });

  it('formats percentages from a 0–1 score', () => {
    expect(formatPercent(0.78)).toBe('78%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('formats g/kg values to one decimal', () => {
    expect(formatGPerKg(1.2)).toBe('1.2 g/kg');
    expect(formatGPerKg(0.95)).toBe('1.0 g/kg');
  });

  it('formats mg/L', () => {
    expect(formatMgPerL(700)).toBe('700 mg/L');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npx vitest run src/lib/fueling/__tests__/format.test.ts
```

Expected: all tests fail (module not found).

- [ ] **Step 3: Implement the formatters**

Create `src/lib/fueling/format.ts`:

```ts
function round(value: number): number {
  return Math.round(value);
}

function thousands(value: number): string {
  return round(value).toLocaleString();
}

export function formatCarbsGrams(grams: number): string {
  return `${round(grams)} g`;
}

export function formatCarbsPerHour(gramsPerHour: number): string {
  return `${round(gramsPerHour)} g/h`;
}

export function formatFluidMl(ml: number): string {
  return `${thousands(ml)} ml`;
}

export function formatFluidPerHour(mlPerHour: number): string {
  return `${round(mlPerHour)} ml/h`;
}

export function formatSodiumMg(mg: number): string {
  return `${round(mg)} mg`;
}

export function formatSodiumPerHour(mgPerHour: number): string {
  return `${round(mgPerHour)} mg/h`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function formatGPerKg(gPerKg: number): string {
  return `${gPerKg.toFixed(1)} g/kg`;
}

export function formatMgPerL(mgPerL: number): string {
  return `${round(mgPerL)} mg/L`;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
npx vitest run src/lib/fueling/__tests__/format.test.ts
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fueling/format.ts src/lib/fueling/__tests__/format.test.ts
git commit -m "feat(fueling): add shared format helpers for v3 UI"
```

---

## Task 4: Redesign ContextCard as SpecRow list

**Files:**
- Modify: `src/components/planner/fuel-result-v3.tsx` (replace the `ContextCard` subcomponent, lines 121–155)

- [ ] **Step 1: Rewrite ContextCard**

Replace the existing `ContextCard` function body with:

```tsx
import { SpecRow } from '@/components/ui';
import { formatPercent } from '@/lib/fueling/format';
// (add these imports at the top of the file if not already present)

function ContextCard({ prescription }: { prescription: FuelingPrescription }) {
  const { contextSummary, confidence } = prescription;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-title">Ride snapshot</h3>
          <div className="flex flex-wrap items-center gap-2">
            <PurposePill purpose={contextSummary.purpose} />
            <HeatPill heat={contextSummary.effectiveHeat} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1.5">
          <SpecRow
            label="Duration"
            value={formatDuration(contextSummary.durationMinutes)}
          />
          <SpecRow
            label="IF"
            value={contextSummary.intensityFactor.toFixed(2)}
          />
          <SpecRow label="TSS" value={String(Math.round(contextSummary.tss))} />
          <SpecRow
            label="Confidence"
            value={formatPercent(confidence.score)}
            muted={confidence.score < 0.5}
          />
        </div>
        {confidence.missing.length > 0 && (
          <p className="pt-1 text-xs leading-5 text-ink-500">
            Inferring: {confidence.missing.join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check and lint, then commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/planner/fuel-result-v3.tsx
git commit -m "refactor(planner): ContextCard uses SpecRow list"
```

---

## Task 5: Redesign PreRideCard as unified SpecRow layout

**Files:**
- Modify: `src/components/planner/fuel-result-v3.tsx` (replace `PreRideCard`, lines 157–238)

- [ ] **Step 1: Rewrite PreRideCard**

```tsx
import { formatCarbsGrams, formatGPerKg } from '@/lib/fueling/format';

function PreRideCard({ prescription }: { prescription: FuelingPrescription }) {
  const pre = prescription.pre;
  const carbLoad = prescription.carbLoad;

  if (!pre && !carbLoad) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
          <h3 className="section-title">Pre-ride</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-ink-600">
            No pre-ride fueling needed for this session.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <h3 className="section-title">Pre-ride</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {pre && (
          <div className="space-y-1.5">
            <SpecRow
              label="Carbs"
              value={formatCarbsGrams(pre.carbsGrams)}
              accent
            />
            <SpecRow label="Per kg" value={formatGPerKg(pre.carbsGPerKg)} />
            <SpecRow label="Window" value={`${pre.windowHoursBefore} h before`} />
            {pre.proteinGrams !== undefined && (
              <SpecRow
                label="Protein"
                value={formatCarbsGrams(pre.proteinGrams)}
              />
            )}
            {pre.caffeineMg !== undefined && (
              <SpecRow
                label="Caffeine"
                value={
                  pre.caffeineTimingMinutesBefore !== undefined
                    ? `${pre.caffeineMg} mg · ${pre.caffeineTimingMinutesBefore} min before`
                    : `${pre.caffeineMg} mg`
                }
              />
            )}
          </div>
        )}
        {carbLoad && (
          <div className="rounded-xl border border-brand-200 bg-[color:color-mix(in_oklch,var(--color-brand-50)_58%,white)] px-3 py-2.5">
            <p className="section-kicker text-[0.68rem] text-brand-700">
              Carb load
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-900">
              {carbLoad.targetGPerKgPerDay.toFixed(1)} g/kg/day × {carbLoad.days} days
            </p>
            <p className="mt-0.5 text-xs leading-5 text-ink-600">
              Hourly ceiling {carbLoad.hourlyCeilingGPerKg.toFixed(1)} g/kg.
            </p>
          </div>
        )}
        {pre && pre.notes.length > 0 && (
          <ul className="space-y-1 text-xs leading-5 text-ink-600">
            {pre.notes.map((note, i) => (
              <li key={i}>• {note}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/planner/fuel-result-v3.tsx
git commit -m "refactor(planner): PreRideCard uses unified SpecRow layout"
```

---

## Task 6: Redesign DuringCard stats — one hero + SpecRow list

**Files:**
- Modify: `src/components/planner/fuel-result-v3.tsx` (rewrite the stats portion of `DuringCard`, inside the `<CardContent>` before the pack list block — currently the two stat grids plus the optional copy on lines 258–293)

- [ ] **Step 1: Replace the stats portion with a hero tile + SpecRow list**

Inside `DuringCard`, the `<CardContent>` currently has two `<div className="grid ...">` stat grids and the optional caffeine note. Replace them (preserve the pack/solids block after) with:

```tsx
import {
  formatCarbsGrams,
  formatCarbsPerHour,
  formatFluidMl,
  formatFluidPerHour,
  formatMgPerL,
  formatSodiumPerHour,
} from '@/lib/fueling/format';

// ...inside DuringCard, replacing the two stat grids + caffeine note:

<div className="space-y-3">
  <div className="rounded-2xl border border-brand-200 bg-[color:color-mix(in_oklch,var(--color-brand-50)_55%,white)] px-4 py-3 md:px-5 md:py-4">
    <p className="section-kicker text-[0.68rem] text-brand-700">Carbs / hour</p>
    <p className="mt-1 font-heading text-3xl font-semibold leading-none text-brand-800 tabular-nums">
      {formatCarbsPerHour(during.carbsGPerHour)}
    </p>
    <p className="mt-1 text-xs leading-5 text-brand-700/80">
      {formatCarbsGrams(during.totalCarbsGrams)} total over the ride
    </p>
  </div>
  <div className="space-y-1.5">
    <SpecRow label="Fluid" value={formatFluidPerHour(during.hydrationMlPerHour)} />
    <SpecRow
      label="Total fluid"
      value={formatFluidMl(during.totalHydrationMl)}
    />
    <SpecRow label="Sodium" value={formatSodiumPerHour(during.sodiumMgPerHour)} />
    <SpecRow
      label="Bottle [Na]"
      value={formatMgPerL(during.sodiumMgPerLiterTargetInBottles)}
    />
    <SpecRow
      label="Concentration"
      value={`${(during.bottleConcentrationGPerMl * 100).toFixed(1)} g/100ml`}
    />
    {during.caffeineMg !== undefined && during.caffeineMg > 0 && (
      <SpecRow
        label="Caffeine (solids)"
        value={`${Math.round(during.caffeineMg)} mg`}
      />
    )}
  </div>
  {during.usesMultiTransportableCarbs && (
    <p className="text-xs leading-5 text-ink-600">
      Glucose:fructose mix recommended above 60 g/h.
    </p>
  )}
</div>
```

- [ ] **Step 2: Type-check, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/planner/fuel-result-v3.tsx
git commit -m "refactor(planner): DuringCard stats use hero tile + SpecRow list"
```

---

## Task 7: Redesign DuringCard pack list with DividedRowList

**Files:**
- Modify: `src/components/planner/fuel-result-v3.tsx` (rewrite the bottles section on ~lines 295–365 and the solids section ~367–403 of `DuringCard`)

- [ ] **Step 1: Replace bottles section**

Replace the entire `{packList && packList.bottles.length > 0 && (...)}` block with:

```tsx
{packList && packList.bottles.length > 0 && (
  <DividedRowList
    items={packList.bottles}
    getKey={(_, i) => `bottle-${i}`}
    header={
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <div>
          <p className="section-kicker text-[0.68rem]">Bottles</p>
          <p className="text-sm font-semibold text-ink-900">
            Bring {packList.bottles.length === 1 ? '1 bottle' : `${packList.bottles.length} bottles`}
          </p>
        </div>
        <p className="text-xs leading-5 text-ink-500">Fill each as shown</p>
      </div>
    }
    renderItem={(alloc, i) => {
      const product = alloc.productId
        ? products.find((p) => p.id === alloc.productId)
        : null;
      return (
        <div className="flex items-start justify-between gap-3 px-3 py-2 md:px-4 md:py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-6 text-ink-900">
              Bottle {i + 1}
            </p>
            <p className="truncate text-xs leading-5 text-ink-600">
              {alloc.capacityMl} ml ·{' '}
              {alloc.isWaterOnly ? 'Water' : (product?.name ?? 'Mix')}
              {alloc.isWaterOnly
                ? ''
                : ` · ${alloc.carbsTotal} g carbs${
                    alloc.sodiumMgTotal ? ` · ${alloc.sodiumMgTotal} mg Na` : ''
                  }`}
            </p>
          </div>
          <p className="shrink-0 text-right font-sans text-sm font-semibold leading-6 tabular-nums text-brand-700">
            {alloc.isWaterOnly
              ? 'Water'
              : `${alloc.mixGrams} g${
                  alloc.mixScoops !== undefined ? ` · ~${alloc.mixScoops}×` : ''
                }`}
          </p>
        </div>
      );
    }}
  />
)}
```

- [ ] **Step 2: Replace solids section**

Replace the `{packList && packList.solids.length > 0 && (...)}` block with:

```tsx
{packList && packList.solids.length > 0 && (
  <DividedRowList
    items={packList.solids}
    getKey={(alloc, i) => `${alloc.productId}-${i}`}
    header={
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <div>
          <p className="section-kicker text-[0.68rem]">Solids</p>
          <p className="text-sm font-semibold text-ink-900">Bring solids</p>
        </div>
        <p className="text-xs leading-5 text-ink-500">Carry and eat on schedule</p>
      </div>
    }
    renderItem={(alloc) => {
      const product = products.find((p) => p.id === alloc.productId);
      return (
        <div className="flex items-start justify-between gap-3 px-3 py-2 md:px-4 md:py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-6 text-ink-900">
              {product?.name ?? 'Solid'}
            </p>
            <p className="truncate text-xs leading-5 text-ink-600">
              {alloc.carbsTotal} g carbs · every ~{alloc.timingIntervalMinutes} min
              {alloc.caffeineMgTotal
                ? ` · ${alloc.caffeineMgTotal} mg caffeine`
                : ''}
            </p>
          </div>
          <p className="shrink-0 text-right font-sans text-sm font-semibold leading-6 tabular-nums text-brand-700">
            ×{alloc.quantity}
          </p>
        </div>
      );
    }}
  />
)}
```

- [ ] **Step 3: Keep the shortfall warning**

The existing `{packList.fluidShortfallMl && packList.fluidShortfallMl > 0 ? (...)}` block stays; it's a distinct alert, not a list. Leave its JSX untouched but move it above the bottles `DividedRowList` so the warning precedes the list it describes.

- [ ] **Step 4: Type-check, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/planner/fuel-result-v3.tsx
git commit -m "refactor(planner): DuringCard pack list uses DividedRowList"
```

---

## Task 8: Redesign PostRideCard with SpecRow windows

**Files:**
- Modify: `src/components/planner/fuel-result-v3.tsx` (rewrite `PostRideCard`, lines 409–467)

- [ ] **Step 1: Rewrite PostRideCard**

```tsx
function PostRideCard({ post }: { post: PostRidePrescription | undefined }) {
  if (!post) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-title">Post-ride</h3>
          <span className="inline-flex items-center rounded-full bg-shell-100 px-2.5 py-0.5 text-[0.7rem] font-medium capitalize text-ink-700">
            {post.mode}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <p className="section-kicker text-[0.68rem]">Window 1 · 0–2h</p>
          <SpecRow
            label="Carbs"
            value={formatCarbsGrams(post.window1.carbsGrams)}
            accent
          />
          <SpecRow
            label="Protein"
            value={formatCarbsGrams(post.window1.proteinGrams)}
          />
          {post.window1.fluidsMl !== undefined && (
            <SpecRow label="Fluid" value={formatFluidMl(post.window1.fluidsMl)} />
          )}
          {post.window1.sodiumMg !== undefined && (
            <SpecRow
              label="Sodium"
              value={formatSodiumMg(post.window1.sodiumMg)}
            />
          )}
        </div>
        {post.window2 && (
          <div className="space-y-1.5 border-t border-[color:var(--border-soft)] pt-3">
            <p className="section-kicker text-[0.68rem]">Window 2 · 2–4h</p>
            <SpecRow
              label="Carbs"
              value={formatCarbsGrams(post.window2.carbsGrams)}
              accent
            />
            <SpecRow
              label="Protein"
              value={formatCarbsGrams(post.window2.proteinGrams)}
            />
          </div>
        )}
        {(post.recommendRecoveryDrink || post.notes.length > 0) && (
          <ul className="space-y-1 text-xs leading-5 text-ink-600">
            {post.recommendRecoveryDrink && (
              <li>• Recovery drink recommended.</li>
            )}
            {post.notes.map((note, i) => (
              <li key={i}>• {note}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

Add `formatSodiumMg` to the fueling format import list at the top of the file if not already imported.

- [ ] **Step 2: Type-check, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/planner/fuel-result-v3.tsx
git commit -m "refactor(planner): PostRideCard uses SpecRow windows"
```

---

## Task 9: Redesign DailyCard as SpecRow list

**Files:**
- Modify: `src/components/planner/fuel-result-v3.tsx` (rewrite `DailyCard`, lines 469–505)

- [ ] **Step 1: Rewrite DailyCard**

```tsx
function DailyCard({ prescription }: { prescription: FuelingPrescription }) {
  const daily = prescription.daily;
  if (!daily) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <h3 className="section-title">Daily targets</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          <SpecRow
            label="Carbs"
            value={formatCarbsGrams(daily.carbsGramsTotal)}
            accent
          />
          <SpecRow label="Carbs / kg" value={formatGPerKg(daily.carbsGPerKg)} />
          <SpecRow
            label="Protein"
            value={formatCarbsGrams(daily.proteinGramsTotal)}
          />
          <SpecRow
            label="Protein / kg"
            value={`${daily.proteinGPerKg.toFixed(2)} g/kg`}
          />
          <SpecRow
            label="Caffeine max"
            value={`${Math.round(daily.caffeineMgCeiling)} mg`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/planner/fuel-result-v3.tsx
git commit -m "refactor(planner): DailyCard uses SpecRow list"
```

---

## Task 10: Redesign TimelineCard with DividedRowList

**Files:**
- Modify: `src/components/planner/fuel-result-v3.tsx` (rewrite `TimelineCard`, lines 507–548)

- [ ] **Step 1: Rewrite TimelineCard**

```tsx
function TimelineCard({ items }: { items: TimelineItem[] | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <DividedRowList
      items={items}
      getKey={(item, i) => `${item.offsetMinutesFromStart}-${i}`}
      header={
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="section-title">Ride guide</h3>
          <p className="text-xs leading-5 text-ink-500">
            {items.length} {items.length === 1 ? 'cue' : 'cues'}
          </p>
        </div>
      }
      renderItem={(item) => {
        const offset = item.offsetMinutesFromStart;
        const label =
          offset < 0
            ? `T-${formatTime(Math.abs(offset))}`
            : formatTime(offset);
        const phaseBadge =
          item.phase === 'pre'
            ? 'bg-shell-100 text-ink-700 border-[color:var(--border-soft)]'
            : item.phase === 'post'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-brand-100 text-brand-800 border-brand-200';
        return (
          <div className="flex items-start gap-3 px-3 py-2 md:px-4 md:py-2.5">
            <span
              className={`shrink-0 rounded-md border px-2 py-1 font-sans text-xs font-semibold tabular-nums ${phaseBadge}`}
            >
              {label}
            </span>
            <p className="min-w-0 flex-1 text-sm leading-6 text-ink-900">
              {item.action}
            </p>
            <p className="shrink-0 text-right text-xs font-semibold leading-6 tabular-nums text-ink-600">
              {item.cumulativeCarbs} g
            </p>
          </div>
        );
      }}
    />
  );
}
```

- [ ] **Step 2: Type-check, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/planner/fuel-result-v3.tsx
git commit -m "refactor(planner): TimelineCard uses DividedRowList"
```

---

## Task 11: Remove the obsolete StatCard helper

**Files:**
- Modify: `src/components/planner/fuel-result-v3.tsx`

- [ ] **Step 1: Delete the StatCard function**

After Tasks 4–10, the module-local `StatCard` function (lines 71–86) should have zero remaining callers. Delete the function.

- [ ] **Step 2: Verify nothing still references it**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean. If `tsc` complains that `StatCard` is referenced elsewhere, one of the earlier tasks missed a swap — grep for `<StatCard` and replace with a `<SpecRow>` equivalent.

- [ ] **Step 3: Commit**

```bash
git add src/components/planner/fuel-result-v3.tsx
git commit -m "chore(planner): drop unused StatCard helper"
```

---

## Task 12: Visual QA pass

**Files:** none (manual verification)

- [ ] **Step 1: Run the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Walk each planner section**

Open `http://localhost:5173`, navigate to the Planner route, complete Setup → Ride data → Plan with the v3 engine active (weight must be set in the Athlete page for v3 to unlock).

For each result tab, verify:
- **Pack:** Pre-ride, During (hero tile + SpecRow stats + bottles list + solids list), Post-ride all render. Long product names truncate; amounts stay right-aligned and tabular.
- **Ride guide:** Timeline rows align — time badge left, action wraps in middle, cumulative carbs right.
- **Stats:** Ride snapshot, Daily targets, and warnings all render without clipped content.

- [ ] **Step 3: Check the history page still works**

Navigate to the History page. It still uses v2 `FuelResult` — confirm nothing there regressed (no unintentional imports swapped).

- [ ] **Step 4: Run the full test suite**

```bash
npm run lint && npx tsc --noEmit && npx vitest run
```

Expected: lint clean, tsc clean, all tests pass.

- [ ] **Step 5: Final commit if any polish changes are needed**

If the walk-through surfaces alignment or wrapping issues, fix them in this task and commit:

```bash
git add src/components/planner/fuel-result-v3.tsx
git commit -m "polish(planner): fix v3 alignment issues found in QA"
```

---

## Notes for future work (not in scope)

- **SetupCard density** — the collapsible-heavy Step 1 card was flagged but left alone. A later pass could move the bottle counters and fuel selection rows into `DividedRowList` for consistency.
- **History page** — still renders v2 `FuelResult`. When v3 supports all historical plan shapes, retire v2 and migrate History in one cut.
- **WarningsCard** — untouched here; its severity-colored rows are a distinct pattern from the system card vocabulary and arguably belong separate.

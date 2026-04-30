---
id: 02-01
phase: 2
plan: 01
status: complete
completed: 2026-04-30
---

# Plan 02-01 Summary — Right-rail simplification + quick-counter fix

## What Was Built

### File: `src/components/planner/inventory-rail-panel.tsx` (full rewrite — 94 → 43 lines)

- Panel title: `"Inventory"` → `"Fuel Inventory"` (FUEL-03)
- Removed the entire `<section>` block that contained the `<h3>Bottles</h3>` subheader and bottle-step buttons (FUEL-01 — bottles only live in setup flow now)
- Removed the inner `<h3>Fuel</h3>` nested header (FUEL-03 — single-section panel, no subheaders)
- Replaced the old quick-counter string `{drinkMixCount} mix - {solidCount} solids` with a `formatFuelCounter` helper (FUEL-04):
  - Returns `"2 drink mix · 1 solid"` when both counts > 0
  - Returns `"1 drink mix"` when solidCount = 0
  - Returns `"1 solid"` (or `"2 solids"`) when drinkMixCount = 0
  - Returns `""` when both = 0 (panel summary then renders nothing)
  - "drink mix" stays a mass noun — never `drink mixs`/`drink mixes`
  - "solid"/"solids" pluralizes on `solidCount === 1`
  - Separator is `·` (U+00B7 middle dot), NOT hyphen
- Surfaced the formatted counter as the panel `summary` prop so the rider sees it directly under "Fuel Inventory"
- Dropped now-unused imports: `BOTTLE_SIZES`, `totalBottleCount`, `BottleInventory`, `BottleSize`
- Dropped the `BOTTLE_STEP_BUTTON` constant (only the bottles section used it)
- Dropped `bottleCounts` and `onIncrementBottle` from `InventoryRailPanelProps`

### File: `src/pages/planner.tsx`

- Lines 901–912: Tightened `<InventoryRailPanel>` JSX to match the new prop signature — dropped `bottleCounts={...}` and `onIncrementBottle={...}` props.
- Line 194: Removed the now-unused `incrementBottleCount` store hook. (`bottleCounts` hook on line 187 stays — `SetupCard` still consumes it via the call site at line 620.)

### Deviation: `src/components/planner/nutrition-rail.tsx`

The plan's `formatFuelCounter` returns an empty string when both counts are 0. The plan specified `summary={counterSummary || undefined}` to suppress the subtitle line in that case. But `NutritionRailPanel.summary` was typed as required `string` — TypeScript rejected `undefined`, build failed.

**Resolution (smallest necessary deviation):** Made `summary?: string` optional and conditionally rendered the subtitle `<span>` (`{summary ? <span>...</span> : null}`).

**Risk:** Other consumer (`saved-plans-rail-panel.tsx`) always passes a real string — unaffected.

**Why this stays in scope:** Without this fix, the empty-fuel state would render an empty 1-line `<span>` below "Fuel Inventory", regressing FUEL-03's "no nested subsections, no extra headers" contract for that state.

## Acceptance Evidence

```
$ grep -c '"Fuel Inventory"' src/components/planner/inventory-rail-panel.tsx
1
$ grep -c '"Inventory"' src/components/planner/inventory-rail-panel.tsx
0
$ grep -cF '·' src/components/planner/inventory-rail-panel.tsx
1
$ grep -c "drink mix" src/components/planner/inventory-rail-panel.tsx
1
$ grep -c "<h3" src/components/planner/inventory-rail-panel.tsx
0
$ grep -c "BOTTLE_SIZES\|totalBottleCount\|BottleInventory\|BottleSize" src/components/planner/inventory-rail-panel.tsx
0
$ grep -c "bottleCounts={bottleCounts}" src/pages/planner.tsx
1   # kept — SetupCard still consumes
$ grep -c "onIncrementBottle\|incrementBottleCount" src/pages/planner.tsx
0
$ npm run lint
exit 0
$ npm run build
exit 0
```

## Commits

| Hash | Type | Message |
|------|------|---------|
| `c49d6a1` | refactor | refactor(02-01): collapse rail to single Fuel Inventory section |
| `ae8c37b` | refactor | refactor(02-01): drop bottle props from rail call site; make rail summary optional |

## Self-Check

PASSED. One in-scope deviation documented above (NutritionRailPanel prop relaxation, required to satisfy the plan's empty-state behavior under TypeScript). No other deviations.

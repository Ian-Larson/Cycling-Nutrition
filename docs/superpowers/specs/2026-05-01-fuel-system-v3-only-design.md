# Fuel System v3-Only Cleanup

**Status:** Draft, awaiting user review
**Author:** Claude (paired with Ian)
**Date:** 2026-05-01
**Related plans:** `Plans/v3-science-backed-fueling-engine-rewrite.md`, `Plans/v3.1-fueling-ui-integration.md`

## Goal

Collapse the planner to a single fueling engine (v3), give the rider a freely-editable per-day bottle pool that the engine plans around, and trim three settings rows that no longer earn their place. The end state: less code, fewer concepts, one source of truth for "what bottles am I taking today," and a planner that either runs or tells the rider exactly what to fix.

## Non-goals

- No redesign of the 3-step planner flow (Setup, Ride data, Plan stays).
- No copy or visual rework of `<FuelResultV3>` itself.
- No changes to the v3 engine's targets, timeline, or science constants.
- No changes to `<RideForm>` auto-IF / auto-TSS derivation.
- No new bottle sizes; the {550, 750, 950} set stays.

## Behavior changes (the contract)

| Area | Before | After |
|---|---|---|
| Engine | v2 default, v3 opt-in via Settings toggle | v3 only. No toggle. |
| Weight missing | Silent fall-through to v2 | Hard gate. Planner surfaces an empty state, sends rider to Account. |
| Bottle pool | Capped by counts on `/inventory` | Free `+/-` per size, no upper cap. Pool is the rider's daily declaration. |
| Bottle subset | Every bottle the rider picks is used | Engine selects the smallest subset of ≤2 from the declared pool that meets fluid target. Surplus pool members are kept in reserve, not in the plan. |
| Pool can't cover need | Surfaces in v3 warnings already | Same wiring; copy upgraded to a directly actionable line. |
| `/inventory` page | Live, edits `bottleCounts` | Retired. `/inventory` and `/bottles` redirect to `/`. |
| Settings, Sweat rate row | User-set L/h field | Deleted. Engine falls back to `DEFAULT_SWEAT_RATE_LPH_BY_HEAT[heat]`. |
| Settings, Gut-target tone helper | "Conservative / Progressive / Aggressive tolerance" subtext | Deleted. Stepper stands alone. |
| Settings, Fueling engine row | v2 / v3 SegmentedControl | Deleted. |
| Saved plans + History | v2 `FuelPlan` storage rendered via `<FuelResult>` | v3 `FuelingPrescription` storage rendered via `<FuelResultV3>`. Pre-existing persisted plans are wiped on first load (no users yet). |

## The weight gate

When `athleteProfile.weightKg` is `undefined`, `0`, or non-finite, the planner replaces the 3-step body with an inline empty state. Header, page intro, and the right rail (saved plans, fuel inventory) stay mounted, so the page still reads as the Fuel Plan page rather than a redirect.

**Composition** — uses existing primitives, no new files:

- A single `<Card>` (the only one on the gated page), `--shadow-soft`.
- One `headline`-typography line: `Set your weight to plan`.
- One `body` line, capped at the existing 65–75ch column: `The fueling engine sizes your carbs, fluid, and sodium against rider mass. Set it once on Account.`
- Primary `<Button>` linking to `/account#preferences` with the brand-glow shadow at rest. Label: `Set weight in Account`.
- No icon, no illustration, no progress bar, no metric tile. The card is quiet by design — DESIGN.md's "workshop-quiet" rule.

**Copy rules applied**

- No em dashes (DESIGN.md ban).
- No restated heading (PRODUCT.md "no duplicated explanations").
- "Set your weight to plan" carries imperative voice, no SaaS softening.

**Live unblocking** — not implemented. If the rider sets weight in another tab, the gate clears on the next mount of the planner page. The risk of live-reactive logic firing mid-edit is greater than the once-per-session friction of a re-mount.

## Bottle pool model

The rider declares a pool: `{ 550: n, 750: m, 950: k }` for the current planning session. The pool is the only bottle state in the system after this change.

**UI** — the existing `BottleSizeCounter` in `setup-card.tsx`, with two surface-level changes:

- `max` prop removed. `+` is no longer disabled by an upper bound.
- The `max N` subtext under each size is removed (it referenced inventory counts that no longer exist).
- The disabled (`max === 0`) cell variant is removed; every cell is always interactive.
- `−` clamps at 0; this stays.

**Default state** — empty (`{ 0, 0, 0 }`) when the rider lands without a draft. The picker reads as "what are you taking?" not "here's what we filled in." Forcing the explicit choice fits the workshop register: the rider knows.

**A11y** — keep the existing `aria-label="Add one {size}ml bottle"` and `Remove one {size}ml bottle`. Stepper is `role="spinbutton"` with `aria-live="polite"` per DESIGN.md §5.

**Visual rhythm** — the 3-cell grid stays. With the inventory cap and `max N` line gone, each cell trims by ~14px vertical; the row reads tighter without becoming dense. Brand orange remains reserved for the selected (count > 0) cell border + 60%-opacity wash, per DESIGN.md's brand-rarity rule (≤10% of screen).

## Engine bottle selection

`src/lib/fueling/inventory/select-bottles.ts:selectBottles` already does the work — it picks the smallest single bottle that fits, falls back to the smallest 2-bottle combo, and reports `fluidShortfallMl` when neither covers. The change is upstream: instead of receiving the rider's already-chosen subset, it receives the full declared pool and chooses freely within it.

Wiring change:

1. `useFuelPrescription` (renamed from `useFuelingEngine`) receives the pool as a flat `BottleSlot[]` (one entry per declared bottle).
2. The hook hands that array to `buildPrescription`, which already calls `selectBottles` internally.
3. The output `prescription.bottles` reflects only the bottles the engine actually used.

When `fluidShortfallMl > 0`, the result view surfaces a single warning line in the existing `<Alert variant="warning">` slot of `<FuelResultV3>`. New copy:

> Your declared pool falls short by ~{shortfall}ml. Add a bottle to your pool or plan a refuel stop.

Shortfall is rounded to nearest 50ml to match `mlPerHour` rounding elsewhere in the engine.

## Settings — Fuel section after the cut

The Fuel section in `account/settings.tsx` collapses from three rows to one:

- **Gut target** stepper, helper text removed entirely. The stepper's value already reads `{n} g/h` — no extra copy needed. The "Conservative / Progressive / Aggressive" line was opinion masquerading as guidance.
- ~~**Sweat rate**~~ — row deleted. Engine falls back to heat-driven default.
- ~~**Heavy sweater**~~ — **kept**. It still drives `sweatSodiumMgPerL` selection in `resolve-rider.ts`. The toggle stays in the Fuel section.

Display section drops the **Fueling engine** row entirely.

After the cut, the Fuel section reads:

```
Gut target          [-  65 g/h  +]
Heavy sweater       [○  toggle ]
```

Two rows is below the threshold where a section kicker earns its keep, but the alternative — folding into Display — would mix domains. Section kicker stays.

## Saved-plan storage shape

Storage pivots from v2 `FuelPlan` (engine output of bottle allocations + solid allocations + timing) to a v3 wrapper that carries the prescription plus enough inputs to rebuild it.

```ts
interface FuelPlan {
  id: string;
  createdAt: string;
  title?: string;
  ride: RideCharacteristics;
  bottlePool: BottleInventory;
  selectedDrinkMixId: string | null;
  selectedSolidIds: string[];
  solidOverrides?: Record<string, number>;
  prescription: FuelingPrescription;
}
```

`prescription` is the rendered shape — saved plans replay without touching the engine. Rebuild button re-runs `buildPrescription` only when the rider opens the plan and the rider profile or product list has changed.

**Migration** — none. Bump the persisted store version; on read of an old shape, drop `fuelPlans` to `[]` and continue. The user explicitly chose this path because there are no real users.

## Code map (deletions, moves, rewrites)

### Delete

- `src/components/planner/fuel-result.tsx`
- `src/lib/calculator/index.ts` (`calculateFuelPlan`, `recalculatePlan`, `CalculatorInput`)
- `src/lib/calculator/index.test.ts`
- `src/lib/calculator/bottles.ts` (`selectBottlesForHydration`, `allocateMixToBottles`, `calculateMaxLiquidCarbs`)
- `src/lib/calculator/bottles.test.ts`
- `src/lib/calculator/carbs.ts` (verify no v3 path imports `calculateHydrationNeeds`; if any does, inline the tiny formula at the call site)
- `src/lib/fueling/migration/v2-to-v3.ts` and tests
- `src/lib/fueling/adapters/from-v2-inputs.ts` (the planner-side hook now constructs `FuelingInput` directly from `athleteProfile + ride + pool + products`)
- `src/pages/inventory.tsx`
- The `/inventory` and `/bottles` routes in `src/App.tsx`
- The "Add bottles" link branch in `setup-card.tsx`
- The Sweat rate row and the Engine-version row in `account/settings.tsx` (Heavy sweater stays)
- The `engineVersion` field on `Settings` and the migration-time fallback in `src/store/index.ts`
- The `bottleCounts` slice on the store; its cloud-sync columns; its tests
- The `sweatRateLph` field on `AthleteProfile`; its sync rows; its setting form

### Move (preserves history; not strictly required, but tidies the tree)

- `src/lib/calculator/auto-target.ts` → `src/lib/planner/auto-target.ts`. Used by `<RideForm>` for auto-IF/TSS carb-target derivation. Independent of v2 engine.
- `src/lib/calculator/auto-target.test.ts` → `src/lib/planner/auto-target.test.ts`.
- `src/lib/calculator/timing.ts` → `src/lib/format/time.ts`. Only `formatTime` is used; consumers are `<FuelResultV3>` and `<DebugCopyButton>`.
- `BottleSlot` interface from `src/lib/calculator/bottles.ts` → `src/types/bottle.ts` (alongside `BottleInventory`, `BottleSize`).

After moves, `src/lib/calculator/` is empty and gets removed.

### Rewrite

- `src/types/index.ts` — `FuelPlan` shape per above.
- `src/store/index.ts`:
  - drop `bottleCounts` slice + its action
  - drop `engineVersion` from `Settings`
  - drop `sweatRateLph` from `AthleteProfile`
  - bump persisted version, wipe `fuelPlans` on version mismatch
  - simplify the `Settings` migration in `migrateSettings` accordingly
- `src/hooks/use-fueling-engine.ts` → `src/hooks/use-fuel-prescription.ts`:
  - drop the version routing
  - expose `{ build, weightReady }`. `build` takes the planner's current inputs and returns `FuelingPrescription | null`. `weightReady` is the boolean the page gate consumes
- `src/components/planner/setup-card.tsx`:
  - drop the `bottleCounts` prop
  - drop the inventory-empty branch and its `/inventory` link
  - `BottleSizeCounter` drops `max` and the `max N` subtext
- `src/pages/planner.tsx`:
  - delete the v2 fork (`isV3 ? FuelResultV3 : FuelResult`)
  - delete the `lastInputRef`, `recalculatePlan`, `calculateFuelPlan` paths; rebuild flows through `useFuelPrescription` only
  - rename `selectedBottleCounts` → `bottlePool` for clarity
  - drop the `Math.min(count, bottleCounts[size])` clamp at line 298
  - render the weight-gate `<Card>` instead of the steps when `!weightReady`
  - persist the new `FuelPlan` shape on save
- `src/pages/history.tsx` — render `<FuelResultV3 prescription={plan.prescription} ... />`. Drop the v2 `<FuelResult plan={plan} ...>` path.
- `src/components/planner/saved-plans-rail-panel.tsx` — same swap.
- `src/components/account/settings.tsx`:
  - delete `getGutTargetTone`
  - delete the Sweat rate `<Row>`, the parsing helpers, and the `commitSweatRate` flow
  - delete the Fueling engine `<Row>`
  - delete the `helper` prop on Gut target
- `src/components/layout/navigation.ts` and `navigation.test.ts` — drop `/inventory` and `/bottles` from the Fuel Plan match list

## Data flow (after)

```
athleteProfile (incl. weightKg)  ─┐
                                  │
plannerDraft.bottlePool           ├─►  useFuelPrescription.build()
plannerDraft.selectedDrinkMixId   │      │
plannerDraft.selectedSolidIds     │      ▼
products                          │   buildPrescription   ─►  FuelingPrescription
ride: RideCharacteristics ────────┘      │                      │
                                          ▼                      ▼
                                    selectBottles         <FuelResultV3 />
                                    (smallest ≤2
                                     from pool)
```

The hook is the only entry point. No two-engine fork. No adapter layer between hook input and engine input — `FuelingInput` is constructed inline from the same fields the v3 hook already reads.

## Risks and how we keep them small

- **Deleting `carbs.ts`.** It exports `calculateTotalCarbsNeeded` and `calculateHydrationNeeds`, both used by the deleted v2 chain. Confirm no v3 module imports them before deleting; if any do, inline. (Search: `import.*carbs` outside `src/lib/calculator/`.)
- **Cloud sync schema.** `bottleCounts` and `sweatRateLph` are written into the cloud snapshot today. The store migration drops them on read; the snapshot writer drops them on write. With no users yet, the existing rows can be dropped or ignored — no need to keep them nullable for a transition window.
- **`auto-target.ts` move.** It currently reads `sweatRateLph` and `heavySweater` to compute auto-target hydration. After the sweat-rate field is removed, `sweatRateLph` is always `undefined` at the call site; the helper already handles that branch (`heavySweater` plus heat-driven default). No new logic needed; just trace the call site to confirm.
- **History page weight gate.** History rendering doesn't need rider weight — it shows already-prescribed plans. The gate applies only to the planner page.
- **Saved-plan rebuild after the change.** Old localStorage with old `fuelPlans` is dropped; rider sees an empty Saved Plans rail. Acceptable per the explicit user decision.

## Testing

- **Unit, bottle pool:** `BottleSizeCounter` allows `+` past 1 (regression for the 950ml bug). `−` still clamps at 0.
- **Unit, engine wiring:** `useFuelPrescription.build` returns `null` when `weightKg` is missing; returns a prescription when present.
- **Unit, smallest-subset selection:** with a pool of `{ 550: 1, 750: 1, 950: 1 }` and a low fluid target, `prescription.bottles` returns one bottle. With a tight target, returns the smallest 2-combo. With an unreachable target, returns the largest pair and `fluidShortfallMl > 0`.
- **Integration, gate:** planner with `weightKg: undefined` renders the empty state, no `<RideForm>`. Setting weight and re-mounting renders the steps.
- **Integration, save:** building a plan and saving it persists the new `FuelPlan` shape; reloading the page renders it from the rail without engine recompute.
- **Integration, settings:** Fuel section renders Gut target + Heavy sweater only; Display section renders Units + Temperature only. No Sweat rate, no Engine row, no tone helper.
- **Integration, store migration:** seeding localStorage with v1-shape data (engineVersion, bottleCounts, sweatRateLph, old fuelPlans) loads cleanly with the slices removed and `fuelPlans` empty.
- All tests under `src/lib/calculator/` delete with their files. All tests referencing `engineVersion`, `bottleCounts`, or `sweatRateLph` update.

## Acceptance check

A reviewer pulling the branch should be able to:

1. Open the planner with no weight set, see the gate, click through to Account, set weight, return to planner, see the steps.
2. Open the planner with weight set, declare 2x 950ml (the original bug), select a drink mix, enter a 60-minute ride, build a plan. Expected: a prescription that uses one or both 950s based on fluid target.
3. Set the pool to `{ 550: 0, 750: 1, 950: 0 }` for a 4-hour ride in heat. Expected: prescription with the 750 + a fluid-shortfall warning suggesting a refuel stop.
4. Save the plan, reload the page, see it in the Saved Plans rail. Reuse it. Expected: the planner draft repopulates with the same pool, drink mix, solids, and ride.
5. Open Settings. Expected: no Sweat rate, no Fueling-engine toggle, no "Progressive tolerance" helper. Heavy sweater + Gut target remain.
6. Visit `/inventory` directly. Expected: redirect to `/`.

## Implementation order (suggestion for the plan)

1. Move `auto-target.ts`, `timing.ts`, and `BottleSlot`. Update imports. Tests still pass.
2. Bump store version; drop `bottleCounts`, `engineVersion`, `sweatRateLph`. Wipe `fuelPlans`. Tests for old-shape parse still pass.
3. Rewrite `useFuelingEngine` → `useFuelPrescription`. Update `planner.tsx` to consume it. v2 fork still mounted at this point.
4. Pivot `FuelPlan` shape; rewrite saved-plan + history rendering to use prescription.
5. Delete `<FuelResult>` and the `src/lib/calculator/` tree.
6. Trim `<SetupCard>`: remove inventory cap, remove `/inventory` link, remove `bottleCounts` prop.
7. Delete `/inventory` and `/bottles` routes; delete `src/pages/inventory.tsx`.
8. Trim Settings: drop the three rows.
9. Add the weight gate to `planner.tsx`.
10. Run the full test suite. Add the new bottle-pool, gate, and storage tests.

Each step ends with a green build and a small commit, per CLAUDE.md "Commit early and often."

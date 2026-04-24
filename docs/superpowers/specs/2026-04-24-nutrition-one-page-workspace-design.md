# Nutrition One-Page Workspace Design

**Status:** Approved for implementation planning
**Date:** 2026-04-24

## Goal

Turn the nutrition planning area into one coherent workspace. The main area keeps the guided three-step planning flow, while the right side exposes compact inventory and saved-plan panels so riders do not have to switch pages during normal planning.

## Problem

The current nutrition area is split across three route-level pages:

- `/` for building a fuel plan.
- `/inventory` for bottle and fuel availability.
- `/history` for saved plans.

This makes the user jump away from the planning task to check inventory or reuse a saved plan. The planner itself also behaves like a full-page step switcher: Setup, Ride data, and Plan replace each other instead of flowing in and out in one workspace.

## Direction

Use a one-page nutrition workspace with:

- A progressive accordion in the main column for Setup, Ride data, and Plan.
- A compact right-side utility rail for Inventory and Saved plans.
- Mobile layout that keeps planning first, then stacks Inventory and Saved plans below.
- Existing full `/inventory` and `/history` pages retained for deeper management.

This is intentionally not a dashboard grid. The planning task remains guided and focused, while related data is close at hand.

## Page Structure

Desktop layout:

```text
Fuel plan
[summary/intro]

+--------------------------------------+--------------------------+
| Main planning flow                   | Right rail               |
|                                      |                          |
|  1. Setup      [expanded/summary]    |  Inventory      [expand] |
|  2. Ride data  [expanded/summary]    |  Saved plans    [expand] |
|  3. Plan       [expanded/result]     |                          |
+--------------------------------------+--------------------------+
```

Mobile layout:

```text
Fuel plan
1. Setup
2. Ride data
3. Plan
Inventory
Saved plans
```

The `/` route remains the nutrition home. The existing `/inventory` and `/history` routes remain available for full product editing and deeper saved-plan browsing.

## Main Planning Flow

The main column uses a progressive accordion with three panels:

1. **Setup**
   - Starts expanded unless a valid draft already exists.
   - Contains the current bottle count selection and fuel selection behavior from `SetupCard`.
   - Once valid, collapses to a concise summary such as `2 bottles - Tailwind - 4 solids`.
   - Unlocks Ride data when at least one bottle and one drink mix are selected.

2. **Ride data**
   - Unlocks when Setup is valid.
   - Reuses the existing `RideForm` manual/auto behavior.
   - Once valid, collapses to a summary such as `2h 15m - tempo - warm - 80g/h`.
   - Unlocks Plan when ride data can calculate.

3. **Plan**
   - Unlocks after Ride data is valid.
   - The Build plan action expands this panel and renders the result inline.
   - Keeps the existing Pack, Ride guide, and Stats result tabs.
   - Reuses `FuelResult` and `FuelResultV3`.

Only the active work area is expanded by default. Completed steps become summaries, and clicking a completed step reopens it inline without leaving the page.

## Plan Freshness

Changing Setup or Ride data after a plan exists should not make the result disappear.

Instead, the Plan panel enters a stale state:

- The old result remains visible.
- A clear `Rebuild plan` action appears.
- Copy should make it clear the displayed result reflects previous inputs.
- Rebuilding replaces the result with the current inputs and clears the stale state.

This avoids the jarring feeling of losing a result while still preventing the user from trusting an outdated plan.

## Right Utility Rail

The right rail uses compact dropdown-style panels.

### Inventory Panel

Shows a compact readout of:

- Bottle inventory counts by size.
- Available drink mixes.
- Available solid fuels.
- Quick availability toggles for existing products.
- A link or action to open full inventory management on `/inventory`.

The rail should not include add/edit product forms in this pass. Product creation and detailed edits stay on `/inventory` to keep the planner page focused.

### Saved Plans Panel

Shows the newest saved plans with:

- Plan title or generated fallback label.
- Duration, intensity, carbs, hydration, and date.
- `Reuse` action.
- `Details` disclosure for compact plan details when needed.
- Delete confirmation matching the current history behavior.

Reusing a saved plan should populate the main accordion draft, load Setup and Ride data, and expand Ride data so the rider can review before rebuilding. It should not mark the saved result as a current plan until the user rebuilds with the loaded draft.

## Navigation

The nutrition primary nav remains `Fuel Plan`.

The existing section nav currently exposes:

- Build plan
- Inventory
- Saved plans

With the one-page workspace, this section nav becomes less useful on `/`. The first implementation should keep it to avoid a broader navigation change. The target design is that normal planning uses the right rail instead of switching tabs, so a separate polish pass can remove or reduce the nutrition section nav on the planner route.

## Component Architecture

Create focused planner layout pieces:

- `NutritionWorkspaceLayout`
  - Owns the two-column desktop layout and mobile stacking.
  - Receives main content and rail content as children.

- `PlanningAccordion`
  - Owns the active expanded step.
  - Owns unlock rules for Setup, Ride data, and Plan.
  - Displays each step's summary and stale/current state.

- `PlanningStepPanel`
  - Shared panel wrapper for numbered step headers, summaries, disabled state, active state, and body content.

- `NutritionRail`
  - Shared container for rail panels.
  - Renders as a right-side column on desktop and below the planner flow on mobile.

- `InventoryRailPanel`
  - Compact inventory dropdown.
  - Pulls bottle counts and products from the store.
  - Supports product availability toggles.
  - Links to `/inventory` for add/edit management.

- `SavedPlansRailPanel`
  - Compact saved plans dropdown.
  - Pulls saved plans from the store.
  - Supports reuse, detail disclosure, and delete confirmation.

- Summary/helper functions
  - Setup summary: selected bottles, selected drink mix, selected solid count.
  - Ride summary: duration, mode/intensity, heat, carb target.
  - Saved plan to draft: shared helper extracted from current `HistoryPage` reuse behavior.

## Existing Components To Reuse

- `SetupCard`
  - Reuse behavior and refit the presentation so it does not appear as a card nested inside another card.

- `RideForm`
  - Reuse directly.

- `FuelResult`
  - Reuse for v2 result rendering.

- `FuelResultV3`
  - Reuse for v3 result rendering.

- Inventory page logic
  - Reuse bottle/product store interactions and availability toggles.
  - Keep add/edit forms on `/inventory`.

- History page logic
  - Move saved-plan reuse derivation into a shared helper so the rail and history page do not duplicate it.

## Data Flow

The planner continues to use local React state backed by `plannerDraft` persistence:

- Selected bottle counts.
- Selected drink mix.
- Selected solid fuel IDs.
- Ride form snapshot.
- Current calculated plan.
- Plan title.

The new accordion state is UI state only:

- Active expanded step.
- Whether the current plan is stale.
- Rail panel expansion state.
- Saved plan detail expansion state.
- Delete confirmation state.

Plan calculation remains unchanged:

- `calculateFuelPlan` handles v2.
- `useFuelingEngine().buildV3` handles v3 when enabled.
- `recalculatePlan` remains available for inline solid quantity adjustments.

## Error And Empty States

- If there are no bottles, Setup shows a compact empty state with a link to `/inventory`.
- If there is no drink mix, Setup shows a compact empty state with a link to `/inventory`.
- If Setup is invalid, Ride data and Plan are disabled with short explanatory labels.
- If Ride data is invalid, Plan is disabled with a short explanatory label.
- If there are no saved plans, the rail shows a compact empty state and a build-plan prompt.
- If an unavailable product is used by a saved plan, reuse should preserve the selection where possible and make the draft reviewable before rebuilding.

## Responsive Behavior

- Desktop: main planner column gets the dominant width; utility rail is narrower and can remain sticky if it does not create overlap or awkward scroll behavior.
- Tablet: preserve two columns only if there is enough width for readable panel content.
- Mobile: stack main flow first, then Inventory and Saved plans. Rail panels remain collapsible.
- Touch targets should remain at least 44px high for accordion headers, rail headers, and primary actions.

## Out Of Scope

- Rewriting the calculator or fueling engine.
- Adding product creation/edit forms to the rail.
- Removing `/inventory` or `/history`.
- Redesigning the full history page.
- Redesigning the full inventory page beyond any shared helper extraction needed for the rail.
- Changing cloud sync or persisted state schema unless a small migration is unavoidable.

## Testing Plan

Automated tests:

- Summary helper tests for Setup and Ride data.
- Saved-plan-to-draft helper tests, including unavailable product behavior.
- Navigation tests only if section nav behavior changes.

Manual verification:

- Fresh user can progress Setup to Ride data to Plan without route changes.
- Valid draft opens in the appropriate step with summaries populated.
- Editing Setup after calculation marks Plan stale and offers Rebuild plan.
- Editing Ride data after calculation marks Plan stale and offers Rebuild plan.
- Rebuild updates the displayed result and clears stale state.
- Inventory rail toggles product availability and the planner reacts correctly.
- Saved plan reuse populates the accordion draft correctly.
- Mobile stacks planning before rail panels.
- Existing `/inventory` and `/history` routes still work.

## Acceptance Criteria

- The nutrition planner is usable as a single page for normal planning.
- The three planning steps flow in and out inline through accordion panels.
- Inventory and saved plans are available from the right rail on desktop and below the flow on mobile.
- Existing calculator behavior is preserved.
- Existing full inventory and history routes remain available.
- No unrelated gear, labs, account, or cloud sync behavior changes.

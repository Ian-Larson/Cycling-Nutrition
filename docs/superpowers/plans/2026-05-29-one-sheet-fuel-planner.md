# One-Sheet Fuel Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Fuel Plan step accordion with one continuous, live-updating sheet centered on duration, projected IF, default carry setup, pack list, and a simple grams-per-30-minutes cue.

**Architecture:** Keep the existing fuel engine and store. Add focused planner helper utilities for ride derivation, draft persistence, missing requirement checks, and recurring cue math, then simplify `PlannerPage` and `FuelResultV3` presentation around those utilities.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Testing Library, existing Domestique UI primitives.

---

## File Structure

- Modify `src/types/fuel-plan.ts`: persist `solidOverrides` in planner drafts so live pack edits survive.
- Modify `src/store/index.ts`: normalize `solidOverrides` during persisted-state hydration.
- Create `src/lib/planner/one-sheet.ts`: pure helpers for default draft setup, IF-driven ride building, missing requirement copy, and 30-minute cue formatting.
- Create `src/lib/planner/one-sheet.test.ts`: TDD coverage for the pure planner helpers.
- Modify `src/components/planner/fuel-result-v3.tsx`: replace detailed ride cue timeline with one recurring 30-minute target and move stats/warnings into an optional details view.
- Modify `src/components/planner/fuel-result-v3.test.tsx`: update result expectations around the simpler cue.
- Modify `src/pages/planner.tsx`: remove `PlanningStepPanel` flow, remove result tabs/build button path, render Ride / Carry / Plan as one continuous sheet, and live-build when requirements are valid.
- Create `src/pages/__tests__/planner-one-sheet.test.tsx`: integration coverage for live plan generation and missing requirement states.
- Keep `src/components/planner/planning-step-panel.tsx` in place for now unless no imports remain after implementation. Delete only if unused and tests/build confirm it is safe.

## Task 1: Pure Planner Helpers

**Files:**
- Create: `src/lib/planner/one-sheet.ts`
- Create: `src/lib/planner/one-sheet.test.ts`
- Modify: `src/types/fuel-plan.ts`
- Modify: `src/store/index.ts`

- [ ] **Step 1: Write failing helper tests**

Add tests for duration plus IF ride building, carb override custom state, 30-minute cue formatting, missing requirement copy, and solid override normalization.

- [ ] **Step 2: Run helper tests and verify red**

Run: `npm test -- src/lib/planner/one-sheet.test.ts`

Expected: FAIL because `src/lib/planner/one-sheet.ts` does not exist.

- [ ] **Step 3: Implement helpers and draft type persistence**

Implement:

```ts
export function buildOneSheetRide(input: OneSheetRideInput): RideCharacteristics
export function formatEveryThirtyMinutesCue(carbsGPerHour: number): string
export function getMissingPlanRequirements(input: PlanRequirementInput): string[]
export function normalizeSolidOverrides(value: unknown): Record<string, number> | undefined
```

Use `calculateAutoTarget({ inputPair: 'duration_if', ... })` inside `buildOneSheetRide`. Store `durationMinutes` and `intensityFactor` on `autoMetrics.userProvidedDurationMinutes` and `autoMetrics.userProvidedIntensityFactor` so existing draft hydration can recover the top-row inputs.

Add `solidOverrides?: Record<string, number>` to `PlannerDraft` in `src/store/index.ts` and `src/types/fuel-plan.ts`, then use `normalizeSolidOverrides` inside `normalizePlannerDraft`.

- [ ] **Step 4: Verify helper tests green**

Run: `npm test -- src/lib/planner/one-sheet.test.ts`

Expected: PASS.

## Task 2: Simple 30-Minute Result Cue

**Files:**
- Modify: `src/components/planner/fuel-result-v3.tsx`
- Modify: `src/components/planner/fuel-result-v3.test.tsx`

- [ ] **Step 1: Write failing result tests**

Update `FuelResultV3` tests so `section="all"` expects:

```ts
expect(screen.getByText(/Every 30 min: 38 g carbs/i)).toBeInTheDocument();
expect(screen.queryByText(/Sip bottle 1/i)).not.toBeInTheDocument();
expect(screen.getByRole('button', { name: /Details/i })).toBeInTheDocument();
expect(screen.queryByRole('heading', { name: /Ride cues/i })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run result tests and verify red**

Run: `npm test -- src/components/planner/fuel-result-v3.test.tsx`

Expected: FAIL because the existing component still renders granular timeline cues.

- [ ] **Step 3: Implement result simplification**

Replace `RideCueList` with `ThirtyMinuteCue` that reads `prescription.during.carbsGPerHour` and displays `formatEveryThirtyMinutesCue`.

Render order for `section="all"`:

1. `BringList`
2. `ThirtyMinuteCue`
3. collapsed/secondary details containing `RideNumbers` and `WarningsList`

Keep `section="pack"` behavior compatible for saved-plan cards and copy tests.

- [ ] **Step 4: Verify result tests green**

Run: `npm test -- src/components/planner/fuel-result-v3.test.tsx`

Expected: PASS.

## Task 3: One-Sheet Planner Page

**Files:**
- Modify: `src/pages/planner.tsx`
- Create: `src/pages/__tests__/planner-one-sheet.test.tsx`
- Modify: `src/pages/__tests__/planner-weight-gate.test.tsx`

- [ ] **Step 1: Write failing planner integration tests**

Add integration tests that set athlete weight and FTP, set a default bottle/mix setup, render `PlannerPage`, and expect a pack result without clicking a Build button.

Add a second test that sets zero bottles and expects local missing requirement copy.

- [ ] **Step 2: Run planner tests and verify red**

Run: `npm test -- src/pages/__tests__/planner-one-sheet.test.tsx`

Expected: FAIL because the current page still uses the step accordion and Build Plan button.

- [ ] **Step 3: Implement the one-sheet page**

In `PlannerPage`, replace step/result-tab state with direct input state, derive a live `RideCharacteristics` from Duration + IF, build the prescription in `useMemo`, persist draft changes, and render Ride / Carry / Plan as one continuous sheet with existing rail support.

- [ ] **Step 4: Verify planner tests green**

Run: `npm test -- src/pages/__tests__/planner-one-sheet.test.tsx src/pages/__tests__/planner-weight-gate.test.tsx`

Expected: PASS.

## Task 4: Full Verification and Cleanup

**Files:**
- Modify only files touched by Tasks 1-3.

- [ ] **Step 1: Run focused planner suite**

Run: `npm test -- src/lib/planner/one-sheet.test.ts src/components/planner/fuel-result-v3.test.tsx src/pages/__tests__/planner-one-sheet.test.tsx src/pages/__tests__/planner-weight-gate.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git add src docs/superpowers/plans/2026-05-29-one-sheet-fuel-planner.md
git commit -m "Build one-sheet fuel planner"
```

Expected: commit created on `one-sheet-fuel-planner`.

## Self-Review

- Spec coverage: The plan covers the one-sheet page, live updates, duration plus IF default path, editable carb override, default carry setup, simplified 30-minute cue, secondary details, draft persistence, and saved-plan reuse through draft loading.
- Placeholder scan: No TBD/TODO placeholders.
- Type consistency: `PlannerDraft.solidOverrides`, `RideCharacteristics.autoMetrics`, and existing `FuelingPrescription` fields are used consistently.

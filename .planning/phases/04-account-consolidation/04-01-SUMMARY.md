---
phase: 04-account-consolidation
plan: 01
subsystem: ui
tags: [react, refactor, account, athlete, component-extraction]

# Dependency graph
requires:
  - phase: 01-layout-tab-foundations
    provides: page-shell utility, PageIntro, SectionNav primitives consumed unchanged here
provides:
  - "src/components/account/athlete-pane.tsx — composable AthletePane component containing every form card (Profile, Fuel targets, Preferences, Connections), all athlete state hooks, all helpers/types — with no page-shell or PageIntro wrapper"
  - "src/pages/athlete.tsx thinned to a 34-line shell that renders PageIntro + SectionNav + <AthletePane /> inside page-shell"
  - "id=\"preferences\" deep-link anchor preserved on the Preferences card, now living inside AthletePane"
affects: [04-02-account-consolidation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pane / page-shell separation — page owns shell + PageIntro + section navigation, pane owns the content cards. Lets the same content compose into multiple page shells (Plan 04-02 will mount <AthletePane /> inside the consolidated /account page)."

key-files:
  created:
    - "src/components/account/athlete-pane.tsx (536 lines) — AthletePane export"
  modified:
    - "src/pages/athlete.tsx (562 → 34 lines) — now a thin shell delegating to <AthletePane />"

key-decisions:
  - "Pure refactor only — every line of the card grid (Profile / Fuel targets / Preferences / Connections) moved byte-for-byte; AthletePane drops only the wrapper, PageIntro, SectionNav, and useSearchParams (the page-level concerns), and keeps every Link/Input/Toggle/SegmentedControl/PresetButtons/clsx call exactly as before."
  - "id=\"preferences\" anchor preserved on the Preferences <Card> inside athlete-pane.tsx — verified via grep (count = 1). The /settings → /athlete#preferences redirect (App.tsx:48-56) continues to work."
  - "?return=planner-step2 plumbing stays at the page level (it controls the Back-to-plan Link, which is a page-shell concern, not a pane concern)."

patterns-established:
  - "Pane composability: a content pane (cards, state, helpers) lives in src/components/account/, while a route page in src/pages/ supplies the shell + PageIntro + section-level chrome. Plan 04-02 reuses this seam to mount AthletePane on top of /account."

requirements-completed: [ACCT-01]

# Metrics
duration: 3 min
completed: 2026-04-30
---

# Phase 04 Plan 01: AthletePane Extraction Summary

**Extracted /athlete's full card grid (Profile, Fuel targets, Preferences, Connections) into a reusable `<AthletePane />` component while leaving /athlete byte-for-byte identical — pure refactor, zero behavior change.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-30T19:18:48Z
- **Completed:** 2026-04-30T19:21:35Z
- **Tasks:** 3
- **Files modified:** 2 (1 created, 1 thinned)

## Accomplishments

- New file `src/components/account/athlete-pane.tsx` (536 lines) exports `AthletePane` containing every form card, state hook, helper, and type previously inline in athlete.tsx.
- `src/pages/athlete.tsx` reduced from 562 → 34 lines, now a thin shell that renders `PageIntro` + `SectionNav` + `<AthletePane />` inside the `page-shell` wrapper.
- `id="preferences"` deep-link anchor preserved (grep returns 1) — the `/settings` redirect to `/athlete#preferences` continues to work.
- `?return=planner-step2` "Back to plan" Link plumbing preserved verbatim at the page-shell level.
- Plan 04-02 (Wave 2) is now unblocked: it can `import { AthletePane } from '@/components/account/athlete-pane'` and mount the same pane inside the consolidated /account page.

## Task Commits

Each task was committed atomically with explicit `git add` paths (excluding unrelated working-tree user state — `D .impeccable.md`, `?? PRODUCT.md`):

1. **Task 1: Create src/components/account/athlete-pane.tsx with the full extracted athlete content** — `e6aef56` (feat)
2. **Task 2: Replace src/pages/athlete.tsx with a thin shell that delegates to <AthletePane />** — `9bcd7f9` (refactor)
3. **Task 3: Verify lint, typecheck, and build are green after the extraction** — verification only, no commit (no file modifications). `npm run lint` exited 0; `npm run build` exited 0; `npx vitest run` reports 515/515 tests pass across 78 files.

**Plan metadata commit:** Final docs commit (this SUMMARY.md, STATE.md, ROADMAP.md, REQUIREMENTS.md) follows.

## Files Created/Modified

- `src/components/account/athlete-pane.tsx` (created, 536 lines) — AthletePane component owning every athlete form card and all related state.
- `src/pages/athlete.tsx` (modified, 562 → 34 lines) — thin page shell that wraps `<AthletePane />` with `PageIntro` + "Back to plan" + `SectionNav`.

## Decisions Made

- Move types (`OptionalNumericAthleteField`, `AthleteFieldErrorKey`), constants (`GUT_TARGET_PRESETS`, `TEMPERATURE_OPTIONS`), and module-level helpers (`roundTo`, `getGutTargetLabel`, `parseDraftNumber`, `getWeightDraftFromProfile`) **with** AthletePane into athlete-pane.tsx — they are pane-internal implementation details, not page-shell concerns.
- Keep the `Link` import in athlete-pane.tsx (the Preferences card has internal Links to `/account` and `/power-meter-analyzer`; the Connections card has another to `/account`). Drop only `useSearchParams`, `PageIntro`, `SectionNav` from the pane.
- The `to={\`/${plannerReturnStep}\`}` template literal stays byte-for-byte at the page level — this Link is a page-shell concern, not a pane concern, and behaves identically (`/` when no return param, `/?step=2` when `?return=planner-step2`).

## Deviations from Plan

None — plan executed exactly as written. All Task 1 acceptance criteria, all Task 2 acceptance criteria, and the Task 3 lint+build gate passed first-try with no fixes needed.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration touched.

## Next Phase Readiness

- ACCT-01 partially satisfied at the seam level: the AthletePane building block is ready. Marking ACCT-01 complete in REQUIREMENTS.md is deferred to Plan 04-02, which is the plan that actually consolidates /account (rendering AthletePane on top + condensed Account/Sync/Strava cards below) and removes /athlete from the nav. This matches the same per-requirement deferral pattern used in Phase 1 (LAYOUT-01/02 stayed Pending until the final wave landed).
- Plan 04-02 (Wave 2) is unblocked. It will:
  - Rewrite `src/pages/account.tsx` to render `<AthletePane />` on top + sign-in/sync/Strava cards below
  - Delete `src/pages/athlete.tsx`
  - Add a redirect from `/athlete` → `/account` (and `/settings#preferences` → `/account#preferences`)
  - Set `sectionNavItems.account = []` (so SectionNav renders nothing for the consolidated page)
  - Rewire two internal Links (ride-form.tsx:813, power-meter-analyzer.tsx:249) and update navigation.test.ts.
- All verification gates green: `npm run lint` exit 0, `npm run build` exit 0, `npx vitest run` 515/515 pass.

---
*Phase: 04-account-consolidation*
*Completed: 2026-04-30*

## Self-Check: PASSED

- FOUND: src/components/account/athlete-pane.tsx
- FOUND: src/pages/athlete.tsx (modified)
- FOUND: .planning/phases/04-account-consolidation/04-01-SUMMARY.md
- FOUND commit: e6aef56 (Task 1: AthletePane extraction)
- FOUND commit: 9bcd7f9 (Task 2: thin athlete.tsx shell)
- VERIFIED: `grep -c 'id="preferences"' src/components/account/athlete-pane.tsx` returned 1
- VERIFIED: `grep -rl 'AthletePane' src/` returns exactly two files (declaration + consumer)
- VERIFIED: `npm run lint` exit 0, `npm run build` exit 0, `npx vitest run` 515/515 tests pass

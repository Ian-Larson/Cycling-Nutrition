---
phase: 1
plan: 01
subsystem: layout-foundations
tags: [layout, css, page-shell, polish, foundations, layout-01]
requires:
  - .planning/phases/01-layout-tab-foundations/01-UI-SPEC.md
  - src/index.css (.page-shell utility, lines 155-159 mobile + 266-270 desktop)
provides:
  - Single source of truth for page-shell container width + side padding
  - Foundation for LAYOUT-01 (page-shell parity across all primary tabs)
  - Foundation for ROADMAP success criterion 2 (identical side padding from a single primitive)
affects:
  - src/pages/planner.tsx
  - src/pages/gear.tsx
  - src/pages/gear-inventory.tsx
  - src/pages/account.tsx
  - src/pages/athlete.tsx
  - src/pages/inventory.tsx
  - src/pages/history.tsx
  - src/pages/power-meter-analyzer.tsx
tech_stack:
  added: []
  patterns:
    - "Single .page-shell CSS utility owns container width (max-w-6xl) and side padding (16px mobile / 24px desktop). Pages may only co-declare vertical rhythm (space-y-*) alongside it."
key_files:
  created:
    - .planning/phases/01-layout-tab-foundations/01-01-SUMMARY.md
  modified:
    - src/pages/planner.tsx
    - src/pages/gear.tsx
    - src/pages/gear-inventory.tsx
    - src/pages/account.tsx
    - src/pages/athlete.tsx
    - src/pages/inventory.tsx
    - src/pages/history.tsx
    - src/pages/power-meter-analyzer.tsx
decisions:
  - "Strip max-w-6xl from page wrappers verbatim per UI-SPEC migration table; do not touch .page-shell utility (already canonical)"
  - "Stage 8 explicit files only — leave unrelated working-tree user state (D .impeccable.md, ?? PRODUCT.md) untouched"
metrics:
  duration: "~1m 11s"
  tasks_completed: 1
  files_modified: 8
  commits: 1
  completed_date: 2026-04-30
---

# Phase 1 Plan 01: Page-Shell Padding Single Source of Truth Summary

Stripped redundant `max-w-6xl` token from 8 page-shell wrappers so the `.page-shell` utility in `src/index.css` is the single source of truth for shell container width and side padding (LAYOUT-01).

## Objective Recap

`.page-shell` already declares `mx-auto max-w-6xl px-4` at mobile (src/index.css:155-159) and `padding-inline: 1.5rem` at desktop md+ (src/index.css:266-270). The 8 page wrappers each redundantly co-declared `max-w-6xl` alongside `page-shell`, creating drift risk: any future single-page edit (e.g. someone changing one page to `max-w-5xl`) would silently break the no-shift contract in Foundation 4. Plan 01 deletes the duplication so width/padding can only be tweaked in one place.

## Implementation Details

### Task 1: Strip redundant `max-w-6xl` from all 8 page wrappers

Mechanical, one-token edit on each top-level page wrapper element. Used the `Edit` tool (not regex) per plan instruction so each diff is line-reviewable in `git diff`.

| File | Old className | New className |
|------|---------------|---------------|
| src/pages/planner.tsx | `page-shell max-w-6xl space-y-5 md:space-y-6` | `page-shell space-y-5 md:space-y-6` |
| src/pages/gear.tsx | `page-shell max-w-6xl space-y-4 md:space-y-6` | `page-shell space-y-4 md:space-y-6` |
| src/pages/gear-inventory.tsx | `page-shell max-w-6xl space-y-4 md:space-y-6` | `page-shell space-y-4 md:space-y-6` |
| src/pages/account.tsx | `page-shell max-w-6xl space-y-4 md:space-y-6` | `page-shell space-y-4 md:space-y-6` |
| src/pages/athlete.tsx | `page-shell max-w-6xl space-y-4 md:space-y-6` | `page-shell space-y-4 md:space-y-6` |
| src/pages/inventory.tsx | `page-shell max-w-6xl space-y-4 md:space-y-6` | `page-shell space-y-4 md:space-y-6` |
| src/pages/history.tsx | `page-shell max-w-6xl space-y-4 md:space-y-6` | `page-shell space-y-4 md:space-y-6` |
| src/pages/power-meter-analyzer.tsx | `page-shell max-w-6xl space-y-4 md:space-y-6` | `page-shell space-y-4 md:space-y-6` |

`space-y-5` was preserved on `planner.tsx`; `space-y-4` preserved on the other 7. Net diff: `8 files changed, 8 insertions(+), 8 deletions(-)` — exactly one-token-per-file.

### Source-of-truth invariant preserved

`src/index.css` was NOT touched. Confirmed via `git diff --stat src/index.css` returning empty pre-commit and via per-file commit set in `git status` (only the 8 page files staged).

`grep -c 'max-w-6xl' src/index.css` returns 1 — the canonical declaration on line 156 inside the `.page-shell` rule is preserved.

## Verification

### Acceptance criteria (all 18 grep checks)

| Criterion | Result |
|-----------|--------|
| `grep -c 'page-shell max-w-6xl' src/pages/planner.tsx` | 0 ✓ |
| `grep -c 'page-shell max-w-6xl' src/pages/gear.tsx` | 0 ✓ |
| `grep -c 'page-shell max-w-6xl' src/pages/gear-inventory.tsx` | 0 ✓ |
| `grep -c 'page-shell max-w-6xl' src/pages/account.tsx` | 0 ✓ |
| `grep -c 'page-shell max-w-6xl' src/pages/athlete.tsx` | 0 ✓ |
| `grep -c 'page-shell max-w-6xl' src/pages/inventory.tsx` | 0 ✓ |
| `grep -c 'page-shell max-w-6xl' src/pages/history.tsx` | 0 ✓ |
| `grep -c 'page-shell max-w-6xl' src/pages/power-meter-analyzer.tsx` | 0 ✓ |
| `grep -c 'className="page-shell space-y-5 md:space-y-6"' src/pages/planner.tsx` | 1 ✓ |
| `grep -c 'className="page-shell space-y-4 md:space-y-6"' src/pages/gear.tsx` | 1 ✓ |
| `grep -c 'className="page-shell space-y-4 md:space-y-6"' src/pages/gear-inventory.tsx` | 1 ✓ |
| `grep -c 'className="page-shell space-y-4 md:space-y-6"' src/pages/account.tsx` | 1 ✓ |
| `grep -c 'className="page-shell space-y-4 md:space-y-6"' src/pages/athlete.tsx` | 1 ✓ |
| `grep -c 'className="page-shell space-y-4 md:space-y-6"' src/pages/inventory.tsx` | 1 ✓ |
| `grep -c 'className="page-shell space-y-4 md:space-y-6"' src/pages/history.tsx` | 1 ✓ |
| `grep -c 'className="page-shell space-y-4 md:space-y-6"' src/pages/power-meter-analyzer.tsx` | 1 ✓ |
| `grep -c 'max-w-6xl' src/index.css` | 1 (canonical preserved) ✓ |
| `git diff --stat src/index.css` | empty (utility untouched) ✓ |

### Build gates

| Command | Exit |
|---------|------|
| `npm run lint` | 0 ✓ |
| `npm run build` | 0 ✓ (226 modules transformed, dist/index.html + 74.23 kB CSS bundle generated) |

### Plan-level grep gate

`grep -lE 'page-shell\s+max-w-6xl' src/pages/*.tsx | wc -l` returns **0** — zero pages still declare the duplicate token.

## Deviations from Plan

None — plan executed exactly as written.

The plan's 8 Edit calls each succeeded on the first try with verbatim old_string matches from the UI-SPEC migration table. No Rule 1 (bug), Rule 2 (missing functionality), or Rule 3 (blocker) deviations were triggered.

## Risk / Threat Coverage

Plan threat register (from `<threat_model>`):
- **T-01-01 Tampering — mitigated.** Edit tool with verbatim old_string match prevents accidental edits; acceptance criteria grep confirms exact new className on each file (16 grep checks all pass).
- **T-01-02 Visual DoS — mitigated.** `npm run build` exit 0 confirms no className typo broke Tailwind class generation.
- **T-01-03/04/05/06 — accept.** No data, identity, or permission surface touched.

No new threat surfaces introduced.

## Working-Tree Hygiene

The working tree contained two unrelated user-state changes at plan start (`D .impeccable.md`, untracked `PRODUCT.md`). Per plan instruction these were excluded from staging — `git add` was called with the 8 explicit file paths, never `git add .` or `git add -A`. `git status --short` post-commit shows the unrelated state still pending, untouched by this plan.

## Commits

| Hash | Type | Message |
|------|------|---------|
| `a8991b5` | refactor | refactor(01-01): strip redundant max-w-6xl from page-shell wrappers |

8 files changed, 8 insertions(+), 8 deletions(-).

## Downstream Impact

- **Plan 02 (Wave 2 — canonical tab primitive consolidation)**: depends on this plan landing first so the no-shift Foundation 4 acceptance test runs against a clean shell. Plan 02 can proceed.
- **Phases 2/3/4 (per-surface phases)**: future per-page edits to side padding or container width are now one-line edits to `.page-shell` in `src/index.css`. Per-page overrides are forbidden by the binding rule in UI-SPEC §Foundation 1.
- **REQ-LAYOUT-01**: partially satisfied. Single source of truth is in place. Full satisfaction lands once Plans 02 + 03 also remove sibling-tab structural variation that could shift content x-position.

## Self-Check: PASSED

- File `.planning/phases/01-layout-tab-foundations/01-01-SUMMARY.md` exists ✓
- Commit `a8991b5` exists in `git log` ✓
- All 8 modified files contain expected new className ✓
- `src/index.css` untouched ✓
- Lint + build green ✓

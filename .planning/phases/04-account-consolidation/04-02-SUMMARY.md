---
phase: 04-account-consolidation
plan: 02
subsystem: ui
tags: [react, refactor, account, athlete, route-redirect, navigation]

# Dependency graph
requires:
  - phase: 01-layout-tab-foundations
    provides: page-shell utility (LAYOUT-01) — wrapper className `page-shell space-y-4 md:space-y-6` reused verbatim
  - phase: 04-account-consolidation
    plan: 01
    provides: <AthletePane /> at src/components/account/athlete-pane.tsx — mounted as the top pane of /account
provides:
  - "src/pages/account.tsx — consolidated 2-pane page (PageIntro + <AthletePane /> + condensed Account/Sync/Strava section)"
  - "/athlete route redirects to /account via <Navigate replace /> (legacy bookmarks preserved)"
  - "/settings route retargeted from /athlete#preferences to /account#preferences"
  - "sectionNavItems.account = [] — SectionNav renders nothing for the consolidated section"
  - "Two internal-link rewrites: ride-form.tsx Add-FTP banner and power-meter-analyzer.tsx Athlete-settings action both point at /account"
affects: [05-documentation-realignment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pane composition reuse — the same <AthletePane /> component now mounts inside the consolidated /account page (rather than living on its own /athlete route). Demonstrates the pane/page-shell separation seam established by Plan 04-01."
    - "Route-redirect retirement — replacing a deleted page with `<Route path=\"/x\" element={<Navigate to=\"/y\" replace />} />` preserves stale bookmarks while removing the destination from the live app."

key-files:
  created:
    - ".planning/phases/04-account-consolidation/04-02-SUMMARY.md (this file)"
  modified:
    - "src/pages/account.tsx (242 → 254 lines, +12) — rewritten as 2-pane consolidated page"
    - "src/App.tsx (69 → 67 lines, −2) — dropped AthletePage import, replaced /athlete route with redirect, retargeted /settings redirect"
    - "src/components/layout/navigation.ts (120 → 110 lines, −10) — sectionNavItems.account collapsed to []"
    - "src/components/layout/navigation.test.ts (53 → 50 lines, −3) — test rewritten to assert empty account section nav"
    - "src/components/planner/ride-form.tsx — Add-FTP banner Link rewired to /account"
    - "src/pages/power-meter-analyzer.tsx — Athlete-settings action Link rewired to /account#preferences"
  deleted:
    - "src/pages/athlete.tsx (34 lines, the thin shell from Plan 04-01)"

key-decisions:
  - "Surface a 'Back to plan' action only when ?return=planner-step2 is in the URL — guards against the action button cluttering the page on every account visit. Hard-coded `?step=2` substitution prevents open-redirect via search-param injection (T-04-13 accept disposition)."
  - "Bottom-pane heading hierarchy: <h2> 'Account, sync, and Strava' wraps the section, while each card title becomes <h3> ('Sign in', 'Cloud backup', 'Strava'). Cards keep visual `section-title text-lg` for stylistic continuity even though they drop a heading level."
  - "Section landmark uses aria-labelledby='account-sync-heading' so screen readers get a named region for the bottom pane."
  - "id='strava' anchor preserved on the Strava card — any deep-links to /account#strava continue to work."
  - "Inherited self-links: AthletePane contains two `to=\"/account\"` Links (Preferences-card 'Account and cloud backup' + Connections-card 'Open account') that become refresh-on-self-click after consolidation. Plan 04-02 deliberately leaves them alone — refresh-on-self-click is harmless, and the plan-checker explicitly flagged this as defensible (INFO-level note)."
  - "'/athlete' and '/settings' KEPT in primaryNavItems[3].matchPaths so the bottom-nav Account tab continues to highlight during the redirect transition (a single render frame) and so anyone with a stale bookmark sees the correct primary tab as active."

patterns-established:
  - "2-pane page composition: a single page wrapper (`page-shell space-y-4 md:space-y-6`) hosts a high-density top pane (AthletePane's lg:grid-cols-[minmax(0,1.16fr)_minmax(19rem,0.84fr)]) and a single-column bottom section. This is the pattern future consolidated routes will mirror."
  - "Section-nav retirement: setting `sectionNavItems.{section} = []` is the canonical way to retire a sub-nav without touching consumer JSX (SectionNav already returns null when items.length <= 1). Future consolidations should reuse this seam."

requirements-completed: [ACCT-01]

# Metrics
duration: 5 min
completed: 2026-04-30
---

# Phase 04 Plan 02: Account Consolidation Summary

**Consolidated /account into a single 2-pane page (AthletePane on top + condensed Account/Sync/Strava section below), deleted athlete.tsx, redirected /athlete + /settings, and rewired the two internal links — closing ACCT-01 and Phase 4.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-30T15:25:00Z (approx — local time)
- **Tasks:** 5 (4 implementation + 1 verification)
- **Files modified:** 6 (1 rewritten, 1 deleted, 4 edited)

## Accomplishments

- `src/pages/account.tsx` rewritten as the consolidated 2-pane page: PageIntro (with conditional Back-to-plan action) + `<AthletePane />` + a single-column condensed `<section>` containing Sign-in, Cloud backup, and Strava cards. Wrapper className matches Phase 1 LAYOUT-01 verbatim.
- `src/pages/athlete.tsx` deleted (34 lines removed). The /athlete URL now redirects to /account via `<Navigate to="/account" replace />`.
- `src/App.tsx` updated: dropped AthletePage import, replaced /athlete route with redirect, retargeted /settings redirect from /athlete#preferences to /account#preferences.
- `src/components/layout/navigation.ts`: `sectionNavItems.account` collapsed to `[]`; primaryNavItems[3].matchPaths preserved (still contains '/athlete' and '/settings' for highlight continuity during redirect).
- `src/components/layout/navigation.test.ts`: assertion rewritten from "keeps athlete preferences inside account → ['Account', 'Athlete']" to "exposes no sub-nav for the consolidated account section → []".
- `src/components/planner/ride-form.tsx`: Add-FTP banner Link rewired from `/athlete?return=planner-step2` to `/account?return=planner-step2`.
- `src/pages/power-meter-analyzer.tsx`: Athlete-settings action Link rewired from `/athlete#preferences` to `/account#preferences`.
- All 5 useAuth handlers preserved verbatim in the new account.tsx: `signInWithEmail`, `signOut`, `syncNow`, `connectStrava`, `disconnectStrava`. Both `<SyncStatusBadge>` instances (kind="auth" + kind="cloud") preserved. The Supabase-not-configured Alert preserved. `id="strava"` deep-link anchor preserved.

## Task Commits

Each task was committed atomically with explicit `git add`/`git rm` paths (excluding unrelated working-tree user state — `D .impeccable.md`, `?? PRODUCT.md`):

1. **Task 1: Empty account section nav and update test assertion** — `7d042d6` (refactor)
2. **Task 2: Rewrite account.tsx as consolidated 2-pane page** — `f860927` (refactor)
3. **Task 3: Delete athlete.tsx and redirect /athlete + /settings to /account** — `6ccf30a` (refactor)
4. **Task 4: Rewire internal /athlete links to /account** — `fa1c116` (refactor)
5. **Task 5: Verification gate** — verification only, no commit. `npm run lint` exit 0; `npm run build` exit 0; `npx vitest run` 515/515 tests pass across 78 files.

**Plan metadata commit:** Final docs commit (this SUMMARY.md, STATE.md, ROADMAP.md, REQUIREMENTS.md) follows.

## Files Created/Modified

- `.planning/phases/04-account-consolidation/04-02-SUMMARY.md` (created, this file)
- `src/pages/account.tsx` (rewritten, 242 → 254 lines)
- `src/App.tsx` (modified, 69 → 67 lines)
- `src/components/layout/navigation.ts` (modified, 120 → 110 lines)
- `src/components/layout/navigation.test.ts` (modified, 53 → 50 lines)
- `src/components/planner/ride-form.tsx` (1-line edit)
- `src/pages/power-meter-analyzer.tsx` (1-line edit)
- `src/pages/athlete.tsx` (deleted, 34 lines)

## Decisions Made

- The "Back to plan" action only renders when `?return=planner-step2` is in the URL — this guards against the action button cluttering the page on every account visit. Hard-coded `?step=2` substitution prevents open-redirect via search-param injection (T-04-13 from threat model).
- Bottom-pane heading hierarchy: section <h2> ("Account, sync, and Strava") wraps three cards whose titles drop to <h3> ("Sign in", "Cloud backup", "Strava"). Visual `section-title text-lg` size class kept for stylistic continuity with other primary surfaces.
- Section landmark uses `aria-labelledby="account-sync-heading"` for screen-reader continuity.
- `id="strava"` anchor preserved on the Strava card — any deep-links to /account#strava continue to work.
- AthletePane's two `to="/account"` self-links (Preferences card + Connections card) deliberately left in place — they become refresh-on-self-click after consolidation, which is harmless. The plan-checker flagged this as INFO-level (defensible).
- '/athlete' and '/settings' KEPT in primaryNavItems[3].matchPaths so the bottom-nav Account tab continues to highlight during the redirect transition (a single render frame) and so anyone with a stale bookmark sees the correct primary tab as active.

## Deviations from Plan

None — plan executed exactly as written. All 5 task acceptance-criteria blocks passed first-try. Lint + build + tests green at the verification gate with zero new errors. No Rule 1/2/3 auto-fixes triggered. No Rule 4 architectural decisions surfaced.

## Issues Encountered

None. The pre-staged `git rm src/pages/athlete.tsx` in Task 3 already had the deletion staged when the subsequent `git add src/App.tsx src/pages/athlete.tsx` ran, which produced a single benign "pathspec did not match" error — recovered immediately by re-running `git add src/App.tsx` alone (the deletion was already in the index from `git rm`). Functionally equivalent outcome; documented here as a workflow note rather than a deviation from the plan.

## User Setup Required

None — no external service configuration touched. /athlete and /settings legacy URLs continue to resolve (now via redirect). Supabase + Strava env-var dependency unchanged.

## Next Phase Readiness

- ACCT-01 satisfied: /account is now the consolidated 2-pane page; /athlete is gone; legacy URLs redirect; the previously separate sync/login flow lives inside /account; spacing matches every other primary route via the canonical `page-shell space-y-4 md:space-y-6` wrapper.
- Phase 4 closes with this plan. Marking ACCT-01 Complete in REQUIREMENTS.md and Phase 4 Complete in ROADMAP.md is part of the plan-metadata commit.
- Phase 5 (Documentation Realignment) is unblocked. It rewrites PRODUCT.md to shipped reality (orange `#f8622e` brand, light-mode only, IBM Plex Sans, real primitives) and corrects the CLAUDE.md font reference. No code changes — pure docs work.
- All verification gates green: `npm run lint` exit 0, `npm run build` exit 0, `npx vitest run` 515/515 tests pass.

## Verification Results

| Gate | Result |
|------|--------|
| `npm run lint` | exit 0, zero output |
| `npm run build` | exit 0, dist/index-*.js 755.08 kB (gzip 215.10 kB) |
| `npx vitest run` | 515/515 tests pass across 78 files (3.64s) |
| `grep -rn 'to="/athlete' src/` | 0 matches (all internal /athlete link targets retired) |
| `grep -rn "from '@/pages/athlete'" src/` | 0 matches (no dangling imports) |
| `grep -c "'/athlete'" src/components/layout/navigation.ts` | 1 (matchPaths reference preserved for highlight continuity) |
| `grep -c '<AthletePane />' src/pages/account.tsx` | 1 |
| `grep -c '<Route path="/athlete" element={<Navigate to="/account" replace />} />' src/App.tsx` | 1 |
| `grep -c "to={{ pathname: '/account', hash: '#preferences' }}" src/App.tsx` | 1 |
| `test -f src/pages/athlete.tsx` | non-zero (deleted) |

## Threat Flags

None. The threat surface in this plan stays inside the existing register (T-04-06 through T-04-13). No new network endpoints, auth paths, or trust-boundary changes introduced.

---
*Phase: 04-account-consolidation*
*Completed: 2026-04-30*

## Self-Check: PASSED

- FOUND: src/pages/account.tsx (rewritten — consolidated 2-pane page)
- FOUND: .planning/phases/04-account-consolidation/04-02-SUMMARY.md (this file)
- MISSING (intentional): src/pages/athlete.tsx (deleted in Task 3 — confirmed via `test ! -f`)
- FOUND commit: 7d042d6 (Task 1: empty account section nav)
- FOUND commit: f860927 (Task 2: rewrite account.tsx)
- FOUND commit: 6ccf30a (Task 3: delete athlete.tsx + redirects)
- FOUND commit: fa1c116 (Task 4: rewire internal links)
- VERIFIED: `npm run lint` exit 0, `npm run build` exit 0, `npx vitest run` 515/515 tests pass
- VERIFIED: `grep -rn 'to="/athlete' src/` returns 0 lines
- VERIFIED: `grep -rn "from '@/pages/athlete'" src/` returns 0 lines
- VERIFIED: `grep -c "'/athlete'" src/components/layout/navigation.ts` returns 1

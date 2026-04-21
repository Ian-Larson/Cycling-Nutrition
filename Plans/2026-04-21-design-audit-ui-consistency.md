# 2026-04-21 · Design Audit & UI Consistency Pass

Full design / UX audit of the Cycling Nutrition app across Planning, Gear, and Account surfaces. Findings are grouped into **five cross-cutting patterns** (biggest leverage) and **three per-surface sections** (page-specific follow-ups).

Every item cites `file:line` so it can be tackled without re-investigating.

Branch: `claude/design-audit-ui-EyMeB`

---

## Cross-cutting patterns

These are the themes where "fix the pattern" pays back more than fixing individual screens.

### Pattern 1 — Missing primitives, so features roll their own

The design system has `Button`, `Card`, `Input`, `Select`, `Checkbox`, `Toggle`, `Collapsible`, `Stepper`, `Toast`, `SpecRow`, `DividedRowList` — but no `Badge`, `Alert`, `IconButton`, `Chip/Tag`, `SegmentedControl`, `Dropdown/Popover`, `Dialog/Modal`, or `Tooltip`. As a result those patterns are hand-rolled 22+ times with drifted styling.

Worst offenders:
- `src/components/planner/fuel-result-v3.tsx` — 10+ inline badge / alert spans (lines 68, 76, 208, 287, 384)
- `src/components/planner/ride-form.tsx` — 8+ chips, segmented controls, ad-hoc inputs (lines 143, 504, 594, 794)
- `src/pages/planner.tsx` — alert divs at 569, 638
- `src/pages/account.tsx` — badge at 103, alert at 111
- Gear sheets (`add-part`, `remove-part`, `install-part`, `edit-bike-*`, `overflow-menu`) each redefine modal/dialog scaffolding
- `src/pages/inventory.tsx:39-50` — two inline icon buttons

**Deliverable:** Add `Badge`, `Alert`, `IconButton`, `Dialog`, `SegmentedControl`, `Tabs` as primitives. Do a one-pass replacement of inline equivalents.

### Pattern 2 — Semantic colors are hardcoded instead of tokenized

- Amber (12 call-sites), rose (13), emerald (1) used directly for warning / error / success — no `--color-warning-*` / `--color-error-*` / `--color-success-*` tokens.
- `--surface-panel`, `--surface-panel-strong`, `--surface-soft` all resolve to white — redundant.
- 14+ inline `color-mix(...)` expressions that should be CSS vars (e.g. `bg-[color:color-mix(in_oklch,var(--color-brand-100)_72%,white)]` in `fuel-result-v3.tsx`, `ride-form.tsx`, `planner.tsx`).

**Deliverable:** Introduce `--color-warning/error/success` token sets and `--bg-shell-light` / `--bg-brand-light` derived vars. Replace hand-rolled color-mix calls.

### Pattern 3 — Focus rings and touch-target sizing drift between primitives

| Primitive | Focus ring | Size |
|---|---|---|
| Button | `focus-visible:ring-2 ring-brand-200 offset-2` | `min-h-11` mobile |
| Input | `focus:ring-2 ring-brand-200` (no `-visible`, no offset) | — |
| Collapsible | `focus:ring-2 ring-brand-500 offset-2` (color differs) | — |
| Stepper | `focus-visible:ring-2 ring-brand-200 offset-1` | `h-11/w-11` mobile / `h-8/w-8` desktop |
| Checkbox | `focus-visible:... offset-1` | — |
| Toggle | `focus-visible:ring-2 ring-brand-200 offset-2` | — |

Touch-target misses:
- `inventory.tsx:117-156` — 24px-wide "Edit" button
- `gear-history-table.tsx:356-373` — tiny borderless action buttons
- `power-meter-analyzer.tsx:487` uses `min-h-12 md:min-h-11` while Button uses `min-h-11 md:min-h-10`

**Deliverable:** One PR normalizing focus rings (all `focus-visible:ring-2 ring-brand-200 offset-2`) and enforcing `min-h-11` / 44px on interactive elements.

### Pattern 4 — Mobile and desktop layouts are duplicated JSX, not one responsive tree

- `history.tsx:154-237` — stat cards rendered twice (mobile @175-202, desktop @204-231) with near-identical JSX and slightly different padding.
- `inventory.tsx:117-159` vs `186-203` — mobile product rows and desktop rows with different edit-button styling.
- `inventory.tsx:375-425` — two empty-state blocks (mobile @399-402, desktop @418-422) with different filter predicates, so they can disagree mid-edit.

**Deliverable:** Collapse to a single tree with `hidden md:block` at the parent, not at each child.

### Pattern 5 — Accessibility debt concentrates in the same places

- **Color-only meaning:** planner step nav (`planner.tsx:471-527`), urgency pills (`active-setup-list.tsx:68-79`), history-table type badges (`gear-history-table.tsx:293-302`), target bar (`fuel-result.tsx:13-51`), sync badge (`account.tsx:103-105`).
- **Missing ARIA:** gear tabs use `aria-pressed` not `role=tab` (`gear-tabs.tsx:29`); Stepper lacks `aria-valuenow/min/max`; Toast has no assertive role for errors; `PresetButtons` lack `aria-pressed` / `role=group`.
- **Sort indicators** in `gear-history-table.tsx:249-252` use `▲/▼` at `text-[0.6rem]` with no `aria-sort`.

**Deliverable:** Pass that (a) adds text/icon to every color-only signal, (b) promotes Gear tabs to ARIA tabs, (c) wires `aria-valuenow/min/max` on Stepper, (d) adds `aria-sort` / `aria-pressed` where missing.

---

## Surface-specific findings

### Planning flow (`/`, `/history`, `/inventory`)

1. **Step navigation is bespoke, not a component** — `planner.tsx:471-527`. Three separate step buttons with conditional classnames; the `Next` footer duplicates at 542-556 and 585. Active/complete distinction is color-only. **Extract `StepButton` + `StepNavigation`; add "Current" / "Done" text.**
2. **No indication that a plan draft is autosaved** — `planner.tsx:235-250` persists silently. **Add a quiet "Saved" indicator in the page header or step nav.**
3. **Result tabs (Pack / Guide / Stats) hand-rolled** — `planner.tsx:712-746`. Duplicates the preset-button pattern from `ride-form.tsx`. **Ship a `Tabs` primitive.**
4. **Auto-calc "Calculation details" defaults closed** — `ride-form.tsx:851-878`. IF / TSS per hour are the most trust-building numbers in auto mode, hidden. **Default open, or hoist two key values above the collapsible.**
5. **Auto-mode input-pair selector is unlabeled** — `ride-form.tsx:701-752`. "Duration + IF" / "Duration + TSS" / "IF + TSS" appear with no explainer. **Add: "Pick the two values you know; we'll calculate the third."**
6. **TargetBar color has no legend** — `fuel-result.tsx:13-51`. **Small legend: "on target / ±5-10g / ±10g+".**
7. **Bottle numbering loses meaning on refills** — `fuel-result.tsx:174-229`. "01 / 02 / 03" repeats across fills. **Prefix: "Fill 1 · Bottle 1".**
8. **Reuse-plan lands on step 2 with no confirmation** — `history.tsx:75-110` jumps to `/?step=2`, step 1 already populated but collapsed. **Navigate to step 1, or toast "Plan loaded from ...".**
9. **Delete-confirm timer has no a11y announcement** — `history.tsx:256-276`. **`aria-live` countdown or explicit Cancel.**
10. **History stat cards duplicated mobile vs desktop** — see Pattern 4.
11. **Inventory bottle-count copy is duplicated and unclear** — `inventory.tsx:225, 240-242`. Two overlapping explanations; neither says "total you own" vs "per-ride max." **Consolidate directly under the inputs.**
12. **Filter-pill counts inconsistent** — `inventory.tsx:299-328` vs `362-367` vs the "All" pill without a count. **Always show count or never.**
13. **Duration input focus ring differs from standard Input** — `ride-form.tsx:141-176`. **Normalize to Input's focus style.**
14. **Setup card "Add bottles" link is visually thin** — `setup-card.tsx:185-189`. **Tertiary button or clearly routed anchor.**
15. **Warnings use rose/amber with no severity scale** — `fuel-result-v3.tsx:41-63, 82-113`. **Use Alert primitive (Pattern 1).**
16. **Empty states drift** — Planner "Create a plan in step 2", History "No plans saved yet", Inventory "No fuel added yet." **Standard pattern: "Nothing here yet. [Primary action]."**

### Gear tracking (`/gear`, `/gear/inventory`, `/power-meter-analyzer`)

17. **Two nav systems stacked** — `GearTabs` (`gear-tabs.tsx`) and `GearSubNav` (`gear-sub-nav.tsx`) both render as bordered pill rows. **Underline primary, leave secondary as pill row — or merge.**
18. **Gear tabs aren't semantic tabs** — `gear-tabs.tsx:29` uses buttons with `aria-pressed`. **Move to the ARIA tabs pattern.**
19. **Urgency signals are color-only and tiny** — `active-setup-list.tsx:68-79` renders "OVERDUE" at `text-[0.65rem]`. **Bump to `text-xs`, add ⚠ icon, add sr-only label.**
20. **Install / Set / Edit affordances are hover-only** — `bike-system-card.tsx:49-72` (pencil on group-hover only); `:87` ("Set" looks like a label); `active-setup-list.tsx:130-143` (install is a link-looking button). None work on touch. **Always visible, button-shaped.**
21. **`/gear/inventory` stat strip is five identical gray tiles** — `gear-inventory.tsx:245-249, 331-340`. **Color-code by status, add icons.**
22. **ChipRow filter uses inverted logic** — `gear-inventory.tsx:153-201`. `selected.size === 0` means "all." **Rename or flip.**
23. **"All" button doubles as Clear** — `gear-inventory.tsx:355-376`. **Rename "Clear" or add an × icon.**
24. **GearLifeBar has no label** — `gear-life-bar.tsx:8-31` + `gear-due-list.tsx:91-100`. **Caption + aria-label with "X% of interval used".**
25. **Mileage vs interval ambiguity** — `gear-due-list.tsx:20-35`. "Mileage unavailable" — unknown odometer or no interval? **Distinguish.**
26. **History table sort indicators invisible** — `gear-history-table.tsx:249-252` (`text-[0.6rem]` arrows, no `aria-sort`). **Bump size, add `aria-sort`.**
27. **Action buttons in history rows blend into the table** — `gear-history-table.tsx:356-373`. **Mini-button style with border on hover.**
28. **Install-Part sheet header is redundant** — `install-part-sheet.tsx:170-174`. **Merge title + description.**
29. **Power-meter-analyzer uses technical jargon without explanation** — `power-meter-analyzer.tsx:407-426` ("Left-only doubled"), `:394-405` ("Offset" with no unit), `:443-455` (Reference unexplained). **Helper text / tooltips.**
30. **Accuracy Summary hides when a single file is loaded** — `power-meter-analyzer.tsx:531-617`. **Show that file's stats, label as "Reference".**
31. **GearDuePreviewBand buries the "+N more" affordance** — `gear-due-preview-band.tsx:54-61`. **Pill-badge "+3 more".**
32. **Bike-pill truncation has no tooltip** — `bike-pill-row.tsx:116-118`. **Add `title`.**
33. **Part card misses lifetime miles on spare parts** — `gear-inventory.tsx:506-516`. **Always render; show "Never installed" for spares.**

### Account / Athlete / Sync (`/athlete`, `/account`, callbacks, header, mobile-nav)

34. **Nav labeling confuses "Sync" with "Account" with "Athlete"** — `navigation.ts:76` labels it "Sync" but it routes to `/athlete`; a distinct `/account` page also exists; `athlete.tsx:541-545` links out to `/account` from inside the Account section. **Merge into `/account` with tabs (Profile / Preferences / Sync), or relabel so names and URLs match.**
35. **Global auth/sync status is invisible** — `header.tsx:10-48`, `mobile-nav.tsx`. **Small status pill in the header: "Guest" / "Synced" / "Sync error".**
36. **Sync status badge is under-emphasized** — `account.tsx:103-105, 167-174`. `bg-shell-100 text-xs` for primary system state. **Semantic color (emerald / amber / rose) + status dot.**
37. **Strava copy is passive** — `account.tsx:209-213`. **"Connect Strava to securely store your profile. Ride sync coming soon."**
38. **Strava prerequisite is hidden** — `account.tsx:249-253`. **Always show requirement, wire `aria-describedby`.**
39. **Loading states lack visual feedback** — `account.tsx:141-152` relies on text alone. **Spinner or `opacity-75 cursor-wait`.**
40. **Auth & Strava callback pages are near-duplicates** — `auth-callback.tsx` + `strava-callback.tsx`. **Extract `CallbackCard`.**
41. **Callback error text has no background** — `auth-callback.tsx:89-95`. **Wrap in `bg-rose-50 border border-rose-200`.**
42. **Back-to-plan button is hand-rolled** — `athlete.tsx:298-301`. **Use `<Button>`.**
43. **Unit toggle is hand-rolled** — `athlete.tsx:315-340`. **Use `SegmentedControl` (Pattern 1).**
44. **`#preferences` scroll target is fragile on mobile** — `athlete.tsx:481`. **`calc(var(--safe-area-top) + 3rem)`.**
45. **Default gut-target (65 gph) is invisible** — `athlete.tsx:82`. **Placeholder + "(default: 65)" helper.**
46. **"Heavy sweater" context hidden on mobile** — `athlete.tsx:442-448`. Description is `md:block` only. **Always show (smaller on mobile).**
47. **Sign-in status badge lacks semantic color** — `account.tsx:103-105`. See #36.
48. **Form errors are plain rose text** — `athlete.tsx:367, 379, 391, 426, 438`. **`border-rose-500 bg-rose-50` + ⚠ glyph.**
49. **Guest-mode terminology drifts** — `auth-provider.tsx:147`. **Standardize: "Not signed in · Local only".**
50. **Sign-in error has no retry** — `account.tsx:156-158`. **Secondary Retry button.**

---

## Execution plan — phased

Order chosen so each phase unblocks the next.

### Phase 1 · Primitive + token foundation (Patterns 1, 2, 3) — ✅ complete
- [x] Add `Badge`, `Alert`, `IconButton`, `Dialog`, `SegmentedControl`, `Tabs` primitives under `src/components/ui/`.
- [x] Export them from `src/components/ui/index.ts`.
- [x] Introduce `--color-warning-*`, `--color-error-*`, `--color-success-*` token sets in `index.css`.
- [x] Introduce `--bg-shell-light` and `--bg-brand-light` vars to replace repeated `color-mix` calls.
- [x] Collapse redundant `--surface-panel`, `--surface-panel-strong`, `--surface-soft` (removed unused `--surface-panel-strong`; documented remaining vars).
- [x] Normalize focus-ring pattern across Button / Input / Select / Stepper / Checkbox / Collapsible / Toggle / SpecRow.
- [x] Enforce `min-h-11` (44 px) on every interactive primitive (Button, IconButton, Tabs, SegmentedControl; others already compliant).

### Phase 2 · Replace hand-rolled with primitives (Pattern 1 follow-through)
- [x] Replace inline badges/alerts in `fuel-result-v3.tsx`, `planner.tsx`, `ride-form.tsx`, `account.tsx`, `product-card.tsx`, `bike-system-card.tsx`, `add-part-sheet.tsx`.
- [x] Replace hand-rolled modal scaffolding in gear sheets (`add-part`, `remove-part`, `install-part`, `edit-bike-*`, `log-gear-service`, `edit-service-event`, `edit-bike-name-dialog`). `overflow-menu` kept as a dropdown (not a modal) with focus-ring + color-token normalization.
- [x] Replace result-tab and step-button patterns in `planner.tsx` with `Tabs` + new `StepNavigation`.
- [x] Replace unit toggle in `athlete.tsx:315-340` with `SegmentedControl`.

### Phase 3 · IA cleanup for Account area (#34, #35)
- [ ] Decide: merge `/athlete` into `/account` with tabs, or rename so "Sync" label matches route/title.
- [ ] Add global auth / sync / Strava status pill to `Header` + `MobileNav`.
- [ ] Extract `CallbackCard` and re-use from both auth and Strava callbacks.
- [ ] `SyncStatusBadge` component used in account + header.

### Phase 4 · Planner polish (#1–#16)
- [ ] `StepNavigation` + "Current / Done" text on steps.
- [ ] "Saved" indicator for plan draft persistence.
- [ ] Default-open calculation details (or hoist key values) in auto mode.
- [ ] Explainer copy for input-pair selector.
- [ ] Legend for TargetBar.
- [ ] Refill-aware bottle numbering.
- [ ] Toast + step-1 landing on "Reuse plan".
- [ ] `aria-live` on delete-confirm timer.
- [ ] De-duplicate History / Inventory mobile vs desktop trees.
- [ ] Reconcile inventory bottle-count copy, filter-pill counts, empty-state voice.

### Phase 5 · Gear polish (#17–#33)
- [ ] Promote gear tabs to ARIA tabs pattern.
- [ ] Resolve GearTabs / GearSubNav visual overlap.
- [ ] Urgency pills: icon + text + sr-only label.
- [ ] Always-visible edit affordances on bike-system rows and active-setup empty slots.
- [ ] Color-code inventory stat strip; fix ChipRow inverted logic; rename "All" → "Clear".
- [ ] GearLifeBar caption + aria-label; disambiguate "Mileage unavailable".
- [ ] History table: `aria-sort`, visible sort indicator, clear row actions.
- [ ] Tooltip on truncated bike pill; always-show lifetime miles on parts.

### Phase 6 · Power-meter-analyzer explainers (#29, #30)
- [ ] Units on Offset input; tooltip on Reference; humanize meter-mode labels.
- [ ] Accuracy Summary shows reference row with one file loaded.

### Phase 7 · Accessibility sweep (Pattern 5 follow-through)
- [ ] Add text/icon to every color-only signal.
- [ ] `aria-valuenow/min/max` on Stepper.
- [ ] `aria-pressed` / `role=group` on PresetButtons.
- [ ] Assertive role on error Toasts.
- [ ] Form errors gain border highlight + icon across athlete/account.

---

## Tracking

Each phase should ship as its own commit (or series of small commits) on `claude/design-audit-ui-EyMeB`. Check boxes above as they complete.

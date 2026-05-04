# Performance Tab Polish — Shape Brief

> **Status:** Brief approved 2026-05-04. Ready to hand to `/impeccable craft` (or directly to implementation).
> **Surface:** `/performance` route (`src/pages/performance.tsx` + `src/components/performance/*`)
> **Register:** product
> **Color strategy:** Restrained
> **Theme:** Light only

## 1. Feature Summary

The Performance tab is the rider's weekly check-in and block-over-block review surface. It answers two questions at a glance: *"Is my fitness trending up?"* and *"How does this block compare to the last one?"* — using w/kg, FTP, weight history, power records, and a power-profile shape. This is a polish pass — the functionality shipped without design consideration; we're rebuilding the layout, hierarchy, and chrome around the existing data without adding new metrics.

## 2. Primary User Action

**Read a comparison verdict in under five seconds.** The rider should land, see the page-level period (e.g. "Last 90d vs previous 90d"), and immediately read whether they're stronger, weaker, or steady — with the supporting numbers within one glance. Everything else is secondary evidence.

## 3. Design Direction

- **Color strategy: Restrained** — project default. Tinted neutrals carry the surface; brand-500 marks only the *active period*, the *current-period polygon* in the hexagon, and primary CTAs. Brand stays ≤10% per screen.
- **Theme: light mode only** — locked by PRODUCT.md.
  - *Scene sentence:* "An experienced rider on a Sunday evening, kitchen counter, phone in hand, looking back at three months of training before they plan next week — calm, focused, not seeking dopamine."
- **Anchor references:** the workshop log book (DESIGN.md North Star), a printed lab report (numeric clarity, tabular columns, no chrome), and a watchmaker's bench plate (orange marking only on the active screw).

The page-level period selector is the single source of truth for time scope across the whole page — one control, not two. The hexagon's two-polygon overlay (current vs prior) is the centerpiece visual; everything else supports it.

## 4. Scope

- **Fidelity:** production-ready
- **Breadth:** entire `/performance` route
- **Interactivity:** shipped-quality, with these confirmed UX additions:
  - trend chart hover/tap tooltips
  - PR tile tap-to-context (links to ride source)
  - sticky period control on scroll (desktop only — mobile non-sticky)
  - sparkline next to current w/kg in Snapshot
- **Time intent:** polish until ship; one tight PR series, no new metrics or new data

## 5. Layout Strategy

A single curated scroll, narrative-ordered. Cards group sections so the page reads as a stack of workbench plates rather than floating divs. Spacing rhythm: 16/24/32 between sections on mobile, 24/32/40 on desktop.

```
1. Page intro                  (existing, copy revised)
2. Snapshot card               (verdict + sparkline + spec rows)
3. Period control              (page-level, sticky on desktop only)
4. Trend small-multiples       (3 stacked mini-charts, w/kg featured)
5. Power records strip         (3 PR tiles, refined)
6. Power profile card          (hexagon + legend + axis labels)
7. Recent rides                (compact list, capped at 5)
8. Data status footer          (consolidated Strava controls)
```

**Hierarchy carries through weight + spacing, not size.** No element exceeds the existing Title scale (1.1rem, 700) for in-card headings; the only Display-styled element on the page is the page intro. The current `font-display text-6xl` w/kg number in HeroStrip is rebuilt: large *Title* weight at most, with a one-line **verdict** ("**Stronger** — w/kg up 0.2 vs 90d ago") doing the heavy emotional lift instead of pure number size.

## 6. Key States

| State | Behavior |
|---|---|
| **First-run / disconnected** | One curated `Get set up` card replaces all data sections: two CTAs (`Add FTP & weight` → /account#athlete, `Connect Strava` → OAuth). Below it: Page intro only. No dashed-border stack. |
| **FTP+weight only, no rides** | Snapshot + trend small-multiples render. PR strip, power profile, and rides are quietly absent (not shown as "—"). Footer shows "Connect Strava to see records" link. |
| **Strava connected, sync in progress** | Sticky inline status in the Data status footer — "Importing 12 of 200 rides…". Nothing flickers above. |
| **Reauth needed** | StravaReauthBanner moves into the Data status footer area, never above the data. |
| **Rate-limited** | Sync error inline in footer; rest of page renders with last-known data. |
| **All data present** | Full 8-section narrative. |
| **Insufficient comparison-period data** | Hexagon shows current polygon only; comparison polygon dimmed; legend annotates "no prior-period rides". |
| **PR tile empty** | Renders as a single em-dash on `ink-400`. No full empty-state card. |

## 7. Interaction Model

- **Page-level period control**: segmented-control of 4 implicit-comparison presets — `30d`, `90d`, `6mo`, `12mo` — page derives "vs prior equal window" automatically. Selecting one re-scopes trend + PRs + hexagon simultaneously. Sticky on scroll on desktop; collapses to a slim chip row on mobile (non-sticky).
- **Trend small-multiples**: three stacked mini-charts (w/kg / FTP / weight) showing **absolute values** with their own y-domains clamped tight to the data — drop the existing ±15% pct-change framing entirely. w/kg uses brand-500 stroke; FTP and weight use `ink-700` stroke. Tap or hover reveals a vertical guide and a small tooltip with the value at that date.
- **PR tiles**: tap a tile → navigates to the source ride. Hover on desktop: subtle lift, no card-on-card.
- **Hexagon**: tap an axis label → highlights both polygons' value at that duration with a small inline label. Two legend rows live below the hexagon at the same alignment as the small-multiples legend (consistent), each 8px ink-700 + 8px brand-500/ink-400 dot.
- **Recent rides**: compact list of last **5** rides — date, name, distance, time. Tap → ride detail. No photos, no kudos, no segment data — anti-goal: not a Strava feed. No "View more" overflow.
- **Data status footer**: collapsed-by-default details — last sync, scope status, "Sync now" button, reauth link if needed.
- **Reduced-motion**: all chart entrance reveals respect `prefers-reduced-motion`. No spring/bounce.

## 8. Content Requirements

- **Page intro title** stays *"Are you getting stronger?"* (on-voice, asks the page's question).
- **Page intro description** revised: "Your w/kg, power records, and profile compared across periods. Update FTP and weight from Account."
- **Verdict line** in Snapshot — generated from the period delta:
  - delta ≥ +0.1 → "**Stronger** — w/kg up {delta} vs {period}"
  - delta ≤ −0.1 → "**Slipping** — w/kg down {delta} vs {period}"
  - else → "**Holding steady** — w/kg ±{delta} vs {period}"
- **Sparkline source**: the w/kg line for the **selected period** (matches the rest of the page).
- **Section eyebrows** (existing label style): `Snapshot`, `Trend`, `Power records`, `Power profile`, `Recent rides`. Drop the `Period` label — the control speaks for itself.
- **Empty / new-user copy**: "Set up your fitness picture. Add FTP and weight to see your w/kg trend; connect Strava to see records." (one sentence, two CTAs.)
- **PR tile**: keep label/wkg/watts/ride-name/date but truncate ride name to one line with `title=` for full text. Date uses relative format if <30d ("12d ago"), absolute beyond.
- **Hexagon legend labels**: come from `currentLabel`/`comparisonLabel` — no change.

No em dashes in body copy (DESIGN.md rule). The `—` placeholder for missing data is the documented exception and stays.

## 9. Resolved Open Questions (recommendations confirmed)

1. **Period preset shape:** implicit-comparison presets — `30d` / `90d` / `6mo` / `12mo`. Page derives "vs prior equal window".
2. **Sparkline source:** selected period (matches the rest of the page).
3. **Trend chart y-axis:** drop the ±15% pct-change normalization; small-multiples each show absolute values with tight per-chart y-domains.
4. **Rides list cap:** 5, no overflow.
5. **Sticky period control:** sticky on desktop only; non-sticky on mobile.

## 10. Recommended Implementation References

- **`reference/product.md`** — primary register reference; data-density and dashboard-vs-tool guidance.
- **`reference/layout.md`** — section grouping, rhythm, sticky controls.
- **`reference/typeset.md`** — fixing the Display-in-UI violations across HeroStrip and PrTile.
- **`reference/animate.md`** — chart entrance, period-change cross-fade, reduced-motion handling.
- **`reference/harden.md`** — empty/error/edge state coverage, especially the new "one curated setup" path.

## 11. Likely Implementation Surfaces

For the implementer's orientation, not a binding plan:

- `src/pages/performance.tsx` — page composition, state-routing
- `src/components/performance/hero-strip.tsx` → rename or rebuild into `snapshot-card.tsx` (verdict + sparkline + spec rows)
- `src/components/performance/range-toggle.tsx` + `period-preset-selector.tsx` → unify into one page-level period control; delete the loser
- `src/components/performance/trend-trio-chart.tsx` → rebuild as `trend-multiples.tsx` (3 stacked mini-charts, absolute-value, tokenized colors)
- `src/components/performance/pr-tile.tsx` + `pr-tiles.tsx` → re-skin to match Card spec (`rounded-2xl`, `--border-soft`, `--shadow-soft`), tap-to-source affordance
- `src/components/performance/power-profile-hexagon.tsx` → wrap in Card; tighten legend; axis-label tap interaction
- `src/components/performance/recent-rides.tsx` → cap at 5, ensure compact layout
- New: `data-status-footer.tsx` — consolidates `sync-button`, `strava-reauth-banner`, `backfill-prompt` into a single bottom-of-page panel
- Empty-state path: replace `BackfillPrompt` and the dashed-border individual empties with a single `setup-card.tsx`

## 12. Out of Scope (explicitly)

- New metrics (TSS, CTL/ATL/TSB, NP, IF, etc.)
- Ride detail page beyond what currently exists
- Photos, kudos, segments, social features (anti-goal: Strava-clone feed)
- Coaching dashboard chrome (PMC charts, tag walls)
- Editing FTP/weight inline on this page (still belongs to Account)
- Dark mode

---

**Hand-off:** This brief is the input to `/impeccable craft` or to a phase plan. The next step is implementation; no further design exploration is needed before code.

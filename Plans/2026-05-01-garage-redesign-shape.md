# Garage redesign — design brief

> Status: shape brief, approved 2026-05-01. Ready for `/impeccable craft`.
> Source: `/impeccable shape` session, all 6 discovery answers locked.

## Locked decisions
1. **Section model:** collapsible `PlanningStepPanel`-style accordion (matches Fuel Plan).
2. **Service unification:** timeline (Coming up → Recently done) — `GearDuePreviewBand` dies.
3. **Output:** production-ready brief.
4. **GearSubNav:** killed; Inventory reached via a small contextual link in Garage's `PageIntro` meta slot.
5. **Cross-bike awareness:** pill-row dots per bike + garage-wide hint in collapsed Service header.
6. **Default panel:** state-aware (Service if anything overdue/soon, otherwise Active setup).

## Open question resolutions (from brief approval)
1. **History as its own panel?** No — consolidate into Service with inline Show-all expansion. Two panels total.
2. **Garage-wide derivation lives where?** New `src/lib/gear/garage-status.ts` (+ test). Used by panel header + pill dots + default-panel selector.
3. **Inventory page back-link.** *"← Back to garage"* in the Inventory page meta slot.
4. **`gearSelectedBikeId` persistence.** Unchanged — keep in store.

---

## 1. Feature Summary
The Garage page becomes a single, scrollable workshop view with the loved bike spec card pinned to a sticky left rail and **two collapsible panels** on the right (Active setup + Service). The dual nav strip dies. The duplicated due-soon band disappears. Service reads as one continuous maintenance timeline — *Coming up* on top, *Recently done* below — instead of being split across two tabs.

## 2. Primary User Action
**See, in one glance, whether anything on any bike needs attention before today's ride — and log a service in two taps when it does.**

Everything else (rebuilding a wheel, swapping a chainring, reading the spec card) is secondary to that primary loop.

## 3. Design Direction
- **Color strategy:** **Restrained** (project default). Brand orange stays reserved for primary CTAs, the active-panel chrome (existing `border-brand-200 + brand-50/70` from `PlanningStepPanel`), and the focus rings. Service status uses the existing `success-*` / `warning-*` / `error-*` semantic scales — no new hues.
- **Theme scene:** *A self-coached cyclist standing in front of their bike on a Saturday morning, phone in one hand, deciding whether they need to rebuild a wheel before the ride.* → light mode, daylight-bright surfaces, dense but calm. (Matches PRODUCT.md and DESIGN.md — light-mode only this milestone.)
- **Anchor references:** the existing **Fuel Plan page** (`PlanningStepPanel` + sticky right rail), a **paper service log book** (the Recently done tail reads like a short ledger), and **Apple Health's per-day timeline** (mixed past/future entries, color-coded urgency, no dashboard theater).
- **No image probes generated** — Claude Code lacks native image generation, and this is a structural rethink rather than a visual lane decision.

## 4. Scope
- **Fidelity:** production-ready; built to ship.
- **Breadth:** the entire `/gear` route. Touches `/gear/inventory` only enough to remove the shared sub-nav and add a back-link to Garage.
- **Interactivity:** shipped-quality React. All sheets (install / remove / log service / edit event) keep their current implementations.
- **Time intent:** polish until it ships.

## 5. Layout Strategy
Same two-column shell as today (sticky left aside + main column), but the main column swaps `Tabs` for two `PlanningStepPanel`-style cards stacked vertically.

```
┌─ PageIntro ──────────────────────────────────────────────┐
│ Garage                          Spares · 12 in inventory →│
│ Installed parts, service schedule, and maintenance log.   │
└───────────────────────────────────────────────────────────┘

┌──────────────────────┬───────────────────────────────────┐
│ ⌜sticky aside⌝       │ ▷ 1  Active setup · 8 parts       │
│  ┌─ Bike pills ─┐    │     installed                     │
│  │ ●● ○ ○       │    │                                   │
│  └──────────────┘    │ ▼ 2  Service · 2 due on this bike │
│                      │        · 1 overdue elsewhere      │
│  ┌─ BikeSystem ─┐    │   ┌──── Coming up ────────────┐   │
│  │  Bike name   │    │   │ Chain · Overdue · -120mi  │   │
│  │  Odometer    │    │   │ [Log service]             │   │
│  │  Weight      │    │   │ Tires · Due soon · 80mi   │   │
│  │  Gear range  │    │   │ [Log service]             │   │
│  │  Crankset    │    │   ├── Recently done ──────────┤   │
│  │  Cassette    │    │   │ Brake bleed · 5d ago      │   │
│  └──────────────┘    │   │ Bar tape   · 3w ago       │   │
│                      │   │ Show all 14 entries →     │   │
└──────────────────────┴───────────────────────────────────┘
```

**Spatial logic.** The aside answers "*which bike, what is it*." The main column answers "*what's true about that bike right now, and what do I do about it*." Active setup is the "what's installed" half; Service is the "what's been done and what's coming" half. Rhythm comes from the existing `PlanningStepPanel` border-and-shadow change-of-state — when Service is open, its border lifts to `brand-200` and floats with `--shadow-float`. That's the only motion that needs to land hard.

**Density rule.** When Service is open, target ~5–7 visible items above the fold on a 14" laptop. Coming up gets up to 4 rows; Recently done shows 3 by default with "Show all" expanding inline.

## 6. Key States

### Page level
| State | What the rider sees |
|---|---|
| **Empty garage** (no bikes) | PageIntro stays. Aside shows BikePillRow's existing empty state ("Connect Strava to import bikes") + no spec card. Main column shows a single Card: *"Add a bike to start tracking gear and service."* No collapsed panels. |
| **First-time, bike present, nothing logged** | Active setup is open by default (no service to read yet). Service panel header reads: *"Service · No history yet"*. Inside: empty Coming up (*"Nothing scheduled. Log service when you're back from a ride."*) and empty Recently done (*"Your first logged service shows up here."*). |
| **Established, healthy** | Service panel collapsed. Header: *"Service · All clear"*. Active setup open by default. |
| **Established, attention needed** | Service panel **opens by default** (state-aware). Header reflects the worst urgency: e.g. *"Service · 2 due on this bike · 1 overdue elsewhere"*. |
| **All bikes selected** (`selectedBikeId === null`) | Spec card hides (no single bike to describe). Aside shows the pill row only. Active setup shows a per-bike summary card stack instead of the slot list. Service shows garage-wide timeline with bike name on each row. |

### Panel: Active setup
Identical content to today (`ActiveSetupList` over `deriveActiveSetup`). Empty install slots already render an "Install →" affordance. **No changes to row visuals — this is the part that already works.**

### Panel: Service
| State | What the rider sees |
|---|---|
| **Default** | Coming up section header (`section-kicker`, ink-700). Rows: existing `GearDueRow` cards, sorted by urgency descending (overdue → soon → on track → unscheduled). Hairline divider (`border-[color:var(--border-soft)]`, mt-4 mb-3). Recently done section header. Up to 3 most recent `gearServiceEvents` rows (extract a `ServiceLogRow` from `GearHistoryTable`). "Show all 14 entries →" inline expand button if more exist. |
| **Coming up empty, History present** | "*Nothing scheduled. Log service when you're back from a ride.*" + the Recently done tail. |
| **Both empty** | Single quiet line, no card chrome: "*No service yet. Log your first one from the parts list.*" |
| **Recently done expanded** | The 3-row preview replaces with the full `GearHistoryTable`. Button toggles to "*Show recent only ↑*". Scroll position pins to the divider so the rider doesn't lose place. |
| **History-only filter (single bike with stale install)** | Coming up shows the existing "*No schedule*" badge from `derive-gear-due`. Recently done shows entries normally. |

### Bike pill row
| State | What the rider sees |
|---|---|
| **Pill, no issues** | Current visual exactly as today. |
| **Pill, due soon (this or any of its parts)** | Small 6px `bg-warning-500` dot, top-right of the pill, with a 1.5px `shell-100` ring so it sits above the pill border. `aria-label` appends *"…, 1 service due soon"*. |
| **Pill, overdue** | Same dot, `bg-error-500`. `aria-label` appends *"…, 2 services overdue"*. |
| **All Bikes pill** | Worst-urgency dot across the whole garage. |

The dot is **not the only signal** (DESIGN.md: "non-color-only state cues"). Beyond the dot, the collapsed Service panel header carries the count text, and `aria-label` carries the full status — keyboard / screen-reader users get the information without depending on color.

### Reduced motion
- Panel expand: respects existing `PlanningStepPanel` transition (already 200ms, no transform).
- Pill dots: static; never pulse or animate.
- Show-all expansion: instant, no height-animate (avoids the layout-property ban).

## 7. Interaction Model

**Default panel selection (one effect on mount).**
```ts
const garageStatus = useMemo(() => deriveGarageStatus(...), [bikes, dueItems]);
const [openPanel, setOpenPanel] = useState<'active' | 'service'>(() =>
  garageStatus.hasAttention ? 'service' : 'active'
);
```
No persistence to the store — the rider reopens to whatever's most actionable today. No surprise.

**Panel toggle.** Same as Fuel Plan: clicking a closed header opens it and closes the other. Clicking the open header collapses it (so the rider can hide everything and just look at the spec card if they want).

**Inventory link in PageIntro meta slot.** Plain `<Link>` styled as `text-xs font-medium text-brand-700 hover:underline`. Format: *"Spares · {n} in inventory →"*. Hidden when count is 0; the link itself stays subtle. On `/gear/inventory`, the same slot becomes *"← Back to garage"*.

**Bike select.** Unchanged. Selecting a bike in the pill row updates the spec card and refilters Active setup + Service. Service panel header recomputes its cross-bike hint live.

**Coming up row → Log service.** Unchanged: opens the existing `LogGearServiceSheet` with prefilled context.

**Recently done row → Edit.** Tap the row (or its overflow menu) opens the existing `EditServiceEventSheet`.

**Show all toggle.** Inline button, never navigates. Recently done expands to the full `GearHistoryTable` in place. Caret rotates 180°.

**No new modals introduced.** All four existing sheets (install / remove / log / edit) keep their current invocation paths.

## 8. Content Requirements

### PageIntro
- **Title:** `Garage` (unchanged).
- **Description:** `Installed parts, service schedule, and maintenance log.` (replaces the wordier current copy; drops "spare inventory" since that lives in the meta slot now).
- **Meta slot:** `Spares · {n} in inventory →` link (hidden when n = 0).

### Panel headers (collapsed state)
Format: `{title} · {summary}`. The summary slot is dynamic:

**Active setup**
- `8 parts installed`
- `No parts installed yet`
- `Choose a bike` (when nothing selected and no primary)

**Service**
- `All clear` — nothing due anywhere
- `2 due on this bike` — single-bike scope, no cross-bike issues
- `2 due on this bike · 1 overdue elsewhere` — single-bike scope + cross-bike
- `1 overdue elsewhere` — current bike clean, garage isn't
- `3 due across your garage` — All Bikes scope
- `No history yet` — empty first-run

The "elsewhere" suffix only appears when `selectedBikeId !== null` and another bike has overdue/soon items.

### Service section sub-headers
- `Coming up` (`section-kicker`, ink-700, no count — count lives in panel header)
- `Recently done` (same treatment)

### Empty/error microcopy
- Coming up empty: `Nothing scheduled. Log service when you're back from a ride.`
- Recently done empty: `Your first logged service shows up here.`
- Both empty (compressed): `No service yet. Log your first one from the parts list.`
- Aside, no bike: keep BikePillRow's existing Strava-disconnected copy.

### Accessibility-only strings
- Pill dot (`aria-label` suffix): `, {n} service{s} overdue` / `, {n} due soon` (none when clean).
- Service panel header (`aria-label`): `Service section. {summary}. {open|closed}.`

## 9. Recommended References
- **`reference/spatial-design.md`** — for the two-panel cadence inside the main column and the sticky-aside coexistence.
- **`reference/interaction-design.md`** — for the panel toggle pattern, the inline Show-all expansion, and the meta-slot link.
- **`reference/critique.md`** — to score the result against information density, primary-action latency, and the AI slop test once the build lands.
- **PRODUCT.md §Information Architecture** — already updated for Bottles/Saved-plans precedent; this work extends the same logic to Garage/Inventory.
- **DESIGN.md §5 Components** — confirms `PlanningStepPanel` is the right primitive to compose; no net-new primitive required.

---

## Files this implies
- **Rewrite:** `src/pages/gear.tsx`
- **Delete:** `src/components/gear/gear-sub-nav.tsx`, `src/components/gear/gear-due-preview-band.tsx`
- **Modify:**
  - `src/components/gear/bike-pill-row.tsx` — add status dots
  - `src/pages/gear-inventory.tsx` — drop sub-nav, add `← Back to garage` meta-slot link
  - `src/components/gear/gear-due-list.tsx` — confirm `GearDueRow` is exported for reuse inside the timeline
  - `src/components/gear/gear-history-table.tsx` — extract `ServiceLogRow` for inline use in Recently done
- **New:**
  - `src/components/gear/service-timeline.tsx` — composes Coming up + divider + Recently done + Show-all toggle
  - `src/lib/gear/garage-status.ts` — derives `{ thisBikeCounts, elsewhereCounts, perBikeUrgency, hasAttention }` from `bikes + dueItems + selectedBikeId`
  - `src/lib/gear/garage-status.test.ts` — covers single-bike / all-bikes / clean / mixed-urgency scopes

## Acceptance signals
- `/gear` renders one `PageIntro` and zero secondary nav strips.
- `Tabs` import is gone from `pages/gear.tsx`.
- `GearDuePreviewBand` and `GearSubNav` are deleted from the tree.
- Visiting `/gear` with an overdue/due-soon item lands with the Service panel open; visiting clean lands with Active setup open.
- A bike with overdue service shows a red dot on its pill, regardless of which bike is currently selected.
- `npm run lint` and `npm run build` both pass.

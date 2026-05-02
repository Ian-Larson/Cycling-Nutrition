# Account / Athlete refinement — design brief

**Date:** 2026-05-02
**Command:** `/impeccable shape`
**Scope:** `/account` Athlete area only. Fuel / Display / Connections sections unchanged.

## 1. Feature summary

Replace the hero "identity card → form-mode" pattern (`IdentityStrip`) with a quiet, row-based Athlete section that visually matches Fuel / Display / Connections. Editing happens **per-field, in place** — tap a value, it becomes a focused input, the rest of the strip stays readable. The whole Account page becomes one continuous, scannable list rather than a hero card stacked on a list.

## 2. Primary user action

A self-coached cyclist updates a single number — usually weight, sometimes FTP after a test — without losing sight of the others or what they together produce (W/kg). Identity changes are rare; the design rewards the common case (one tap, one number, done).

## 3. Design direction

- **Color strategy:** Restrained. Brand orange only on focus rings while editing, and the existing `brand-200` ring + `shell-100` offset.
- **Scene sentence:** A rider at the kitchen counter at 6:42am, marking down their post-FTP-test number on a service log next to the bike — phone in one hand, half-finished coffee in the other. Forces light mode, generous targets, zero ambient ornament.
- **Anchor references:** iOS Settings inline-edit rows; a paper service log where each line is a labeled spec; the existing `divided-row-list` pattern already used in Garage.
- **No surface override** vs PRODUCT.md / DESIGN.md.

## 4. Scope

- Fidelity: production-ready.
- Breadth: `/account` Athlete area. `IdentityStrip` removed; `Settings` gains an `Athlete` Section as the new first section. `?return=planner-step2` back-link unchanged.
- Interactivity: shipped quality, including focus, keyboard, error, and empty states.
- Time intent: polish-to-ship in one pass.

## 5. Layout strategy

A single `<Section kicker="Athlete">` with five rows in this order:

```
ATHLETE
─────────────────────────────────
  Name       Ian
  Age        34 yrs
  FTP        280 W
  Weight     72.0 kg
  W/kg       4.05            ← derived, non-editable
─────────────────────────────────
FUEL
  Gut target     [− 65 g/h +]
  Heavy sweater         [on]
…
```

- Reuses the existing `Row` primitive, label-column width, `divide-y` rhythm, and `scroll-mt-24`.
- W/kg is a peer row, not a hero. Same type weight, same row height, just no edit affordance. Recomputes live.
- No card chrome, no "Edit" chip, no "Done" button.

## 6. Key states

| State | Behavior |
|---|---|
| Read (populated) | Label + value in `tabular-nums`. Whole row hover-tints `shell-50`. Cursor: text. |
| Read (empty) | Label + `—` in `ink-400`. Tap still enters edit. |
| Editing | Value cell collapses to a focused inline `Input` — `brand-400` border, `brand-200` focus ring, `shell-100` offset. Row height is unchanged. |
| Live derive | W/kg row recomputes on every keystroke while FTP or Weight is being edited. `aria-live="polite"`. |
| Validation error | Inline message in the helper slot under the row, in `error-700` / `error-100`. Bounds: age 10–120, FTP ≥ 1, weight ≥ 1. |
| Imperial / metric | Weight row label stays `Weight`; unit lives on the value (`72.0 kg` / `158.7 lb`). Switching units in Display reformats the value, not the label. |

## 7. Interaction model

- Tap row (or focus + Enter) → value cell becomes a focused input.
- Type → field updates. W/kg row recomputes live if the edited field is FTP or Weight.
- Blur or Enter → commit. Esc → cancel and revert.
- Tab while editing → commit current row, advance to next editable row's read state.
- No "Edit" buttons, no "Save" buttons, no card-wide mode flip.

## 8. Content

- Section kicker: `Athlete`.
- Row labels: `Name`, `Age`, `FTP`, `Weight`, `W/kg`.
- Empty placeholder: `—`.
- Input placeholders on tap: `Ian`, `34`, `280`, `72`.
- Error copy: reuse existing `Use a value between 10 and 120.` / `Use a value ≥ 1.` strings.
- No helpers under rows.

## 9. Recommended references during build

- `reference/interaction-design.md` — inline-edit row mechanics, blur/Enter/Esc.
- `reference/spatial-design.md` — preserving row height during state change.
- `reference/harden.md` — empty/error/i18n states, imperial/metric formatting.

## 10. Resolved decisions

1. W/kg row when FTP or Weight is unset: show `—`. No helper.
2. Tap target visual: no chevron — hover-tint only, matching the Stepper/Toggle/SegmentedControl rows.
3. `IdentityStrip` and any tests for it: deleted entirely.

## Implementation notes

- Build a small co-located `EditableValueRow` helper in `settings.tsx` (avoid premature abstraction into `ui/`). It should accept: label, current display value (string), draft state setters, commit / cancel callbacks, a placeholder, an error string, an `inputMode`, and `id`.
- Extract the existing draft / commit logic out of `identity-strip.tsx`'s `commitInteger` and `commitWeight` and reuse — same validation bounds and copy.
- Live-recompute W/kg from the in-progress draft, not just the committed store value, so the rider sees the effect of typing.
- Delete `src/components/account/identity-strip.tsx`. Drop import + JSX from `src/pages/account.tsx`.
- Update `src/components/account/__tests__/settings.test.tsx` to assert the new Athlete rows render and inline editing commits to the store.

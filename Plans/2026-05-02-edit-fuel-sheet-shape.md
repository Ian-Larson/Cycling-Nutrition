# Edit Fuel — Focus Sheet Shape

**Date**: 2026-05-02
**Type**: `/impeccable shape` brief — design-only, no code yet
**Surface**: Add / Edit Fuel editor on the Planner (`src/components/planner/inventory-rail-panel.tsx`, wrapping `src/components/products/product-form.tsx`)
**Status**: Confirmed — ready to hand off to `/impeccable craft` or freeform implementation

---

## 1. Feature Summary
Promote the Add / Edit Fuel surface from an inline rail form to a focused sheet — centered dialog on desktop, bottom sheet on mobile. The form gets its own room: wider two-column layout for paired fields, a sticky footer that's always visible, and disciplined motion that confirms the work without performing it. Replaces the current scroll-to-find-Save pain in `InventoryRailPanel` (`src/components/planner/inventory-rail-panel.tsx:84-110`) without redesigning the form fields themselves.

## 2. Primary User Action
Capture a fuel item correctly with **Save in view at all times**, in under 20 seconds for a typical drink mix.

## 3. Design Direction
- **Color strategy**: Restrained (project default holds). Brand orange only for the primary CTA, focus rings, the Available toggle thumb, and the post-save list pulse. The sheet itself is paper-white on a tinted-ink backdrop.
- **Theme — scene sentence**: *A rider on the kitchen counter at 6:30am, opening a new Maurten sachet, glancing at the label, typing one fuel into the bench register before changing into kit.* Forces light mode (PRODUCT.md mandate) and forces the editor to feel like the **paper card lifted out from under the inventory list**, not a separate "page."
- **Anchors**: the existing `Dialog` primitive (DESIGN.md already calls it "the one place real elevation appears"); Linear's Cmd-K focus dialogs for content-density-first chrome; a hand-clipped index card pulled from a binder for the metaphor of "the rider's bench making room for one item."
- Image probes skipped — Claude Code lacks native image generation; brief carries the direction.

## 4. Scope
- **Fidelity**: production-ready.
- **Breadth**: one component used for both Add and Edit, replacing the inline editor branches in `inventory-rail-panel.tsx`. `ProductForm` field internals stay; sheet chrome + layout are net-new.
- **Interactivity**: shipped quality with disciplined motion.
- **Time intent**: polish to ship.

## 5. Layout Strategy
**Desktop (≥640px)** — centered `Dialog` (already in `src/components/ui/`), ~520px wide, `max-h: 80vh`. Two-column grid for naturally-paired inputs (Name+Brand, Carbs+Calories, Serving+Scoop, Conc min+Max). Type and Available collapse onto a single row as an inline pair. Header is a thin strip with the title and an `Esc` close hint; footer is sticky with primary right-aligned (`Save fuel` / `Save changes`), `Cancel` to its left, and `Delete` (edit-only) on the far left as a quieter ghost-danger button — never the eye magnet.

**Mobile (<640px)** — bottom sheet with `rounded-t-2xl`, `max-h-[88vh]`, a 32×4 visual drag handle at the top (visual only for v1). Single column. Same sticky footer arrangement.

**Drink-mix-only fields** (Serving / Scoop / Conc min / Max) live inside one inline `surface-note` group with a small "Drink mix details" eyebrow. They animate in/out when Type changes — not a step, not a hidden toggle, just a content group that knows when to be there.

## 6. Key States
- **Add (default)** — empty fields. Primary CTA: "Save fuel," disabled until name + carbs + calories valid. Once carbs has a value, calories shows a *suggested* ghost value (4 × carbs for drink mix, 3.8 × for solid) with a tiny "auto" trailing chip. The user can type to overwrite or tap the chip to clear.
- **Add (drink mix)** — drink-mix details visible inline; placeholders are realistic notebook entries (`0.06`, `0.10`), not the abstract `per label`.
- **Add (solid)** — drink-mix group collapses out with a 180ms ease-out-quart height transition; fields don't render at all.
- **Edit** — header swaps to "Edit {name}". Primary CTA: "Save changes." Delete button at footer-left.
- **Validating** — per-field inline errors below offending inputs; `aria-describedby` wired; never a banner.
- **Submitting** — primary CTA shows the existing busy spinner state; sheet stays open until resolve.
- **Saved (success pulse)** — sheet closes; the matching inventory list row pulses `brand-100 → transparent` over 600ms; the rail summary line briefly reads "Logged." for ~1.6s before reverting to the count.
- **Cancel with dirty form** — `Esc` / backdrop / Cancel triggers a small inline confirm strip **inside the footer** ("Discard unsaved changes?" with `Discard` / `Keep editing` actions). No nested modal.
- **Delete confirm (edit only)** — keep the existing 4-second "Confirm?" countdown from `product-form.tsx:259-282`. Already on-brand.
- **Empty inventory CTA** — the "Add fuel" pill in the rail (`inventory-rail-panel.tsx:129`) gets a one-line nudge below it on first run: "Start with whatever's on the bench." Removed once any fuel exists.

## 7. Interaction Model
- **Open** — clicking the rail's "Add fuel" pill or any inventory list row promotes the sheet. Backdrop: `color-mix(ink-900 42%, transparent) + backdrop-blur-sm` (per DESIGN.md elevation).
- **Motion (in)** — backdrop fades in 140ms; sheet enters 180ms with `cubic-bezier(0.16, 1, 0.3, 1)` — `translateY(8px) → 0` desktop, `translateY(100%) → 0` mobile. Transform + opacity only; never animate layout properties (DESIGN.md ban).
- **Motion (type change)** — drink-mix group expand/collapse via `grid-template-rows: 0fr → 1fr` or measured-height fallback; 180ms ease-out-quart; respects `prefers-reduced-motion`.
- **Auto-calorie ghost** — implemented as placeholder-style + state, not real value. Typing replaces the ghost; tapping the "auto" chip clears. Field is genuinely empty until accepted, so accidentally hitting Save without it is impossible.
- **Save** — primary CTA enables when required fields valid → optimistic save → sheet closes → success pulse.
- **Esc / backdrop / Cancel** — same path. Dirty check uses an `initialData` snapshot equality; no diff if nothing changed.
- **Focus** — first field auto-focuses on open; keyboard tab order left-to-right, top-to-bottom across the two-column grid; focus returns to the originating list row (or the "Add fuel" pill) on close.
- **Keyboard** — `Cmd/Ctrl+Enter` saves from any field; `Esc` follows the dirty-form path.

## 8. Content Requirements
- **Header**: "Add fuel" / "Edit {name}" — no subtitle (PRODUCT.md: don't restate visible information).
- **Field labels**: keep current. Drop unit-suffix repetition where the unit is also in the placeholder.
- **Placeholders** (notebook tone): `Maurten 320`, `Maurten`, `80`, `320`, `80`, `40`, `0.06`, `0.10`.
- **Auto-suggest microcopy**: `auto · tap to clear` (lowercase, ink-500).
- **Success line in rail summary**: `Logged.` (period, not exclamation).
- **Discard prompt**: `Discard unsaved changes?` with actions `Discard` and `Keep editing`.
- **Primary CTAs**: `Save fuel` (add), `Save changes` (edit). Cancel: `Cancel`.
- **Empty-inventory nudge**: `Start with whatever's on the bench.`
- **No em dashes** anywhere in copy.

## 9. Recommended References
- `reference/interaction-design.md` — focus management, keyboard flow, dirty-form confirmation.
- `reference/motion-design.md` — sheet entrance, type-toggle expand/collapse, success pulse, reduced-motion fallbacks.
- `reference/spatial-design.md` — desktop two-column grid, mobile reflow, sticky footer pattern.

## 10. Open Questions
- **Auto-calorie ghost on by default?** Recommendation: yes — it's dismissible, harmless, usually right, and earns trust. Watch for regressions in `setup-card.test.tsx`.
- **Success pulse: rail summary line or toast?** Recommendation: rail summary line. DESIGN.md reserves toasts; a visible cue inside the panel where the work happened is calmer and more legible.
- **Drag-to-dismiss on mobile?** Recommendation: visual handle only for v1; backdrop tap + Cancel is sufficient. Add gesture later if data calls for it.
- **Reuse `ProductForm` or fork?** Recommendation: keep `ProductForm` for the field-and-validation logic; the sheet wraps it and overrides the footer. The current `compact` prop becomes redundant once the sheet owns the chrome and can be retired.

---

## Delight reading

The user selected motion + personality alongside "strictly functional" in shape discovery. Read as a guardrail: yes to motion and personality, but kept inside the workshop register. Every motion beat (sheet entrance, type-toggle, success pulse) and every copy beat ("Logged.", "Start with whatever's on the bench.") earns its place by serving the work, not performing it. No SaaS theater, no decorative shimmer, no marketing voice.

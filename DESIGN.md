---
name: Domestique
description: A cyclist's quiet workshop — fueling, gear, and ride context, calmly arranged for the rider in front of the screen.
colors:
  brand-50: "#fff5f1"
  brand-100: "#ffe4d9"
  brand-200: "#ffc5b1"
  brand-300: "#ff9c78"
  brand-400: "#fb784d"
  brand-500: "#f8622e"
  brand-600: "#d94c20"
  brand-700: "#a93a17"
  brand-800: "#7a2c14"
  brand-900: "#4f1d0f"
  shell-50: "#ffffff"
  shell-100: "#ffffff"
  shell-200: "#f1f1f1"
  shell-300: "#d8d8d8"
  ink-50: "#fafbfb"
  ink-100: "#eceff1"
  ink-200: "#d8dde2"
  ink-300: "#bcc4cc"
  ink-400: "#929ba5"
  ink-500: "#6d7681"
  ink-600: "#58626d"
  ink-700: "#434d57"
  ink-800: "#313b45"
  ink-900: "#222b33"
  success-100: "#d1fae5"
  success-500: "#10b981"
  success-700: "#047857"
  warning-100: "#fef3c7"
  warning-500: "#f59e0b"
  warning-700: "#b45309"
  error-100: "#ffe4e6"
  error-500: "#f43f5e"
  error-600: "#e11d48"
  error-700: "#be123c"
typography:
  display:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.72rem + 0.78vw, 2.58rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.042em"
  headline:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1.08rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.024em"
  title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.brand-500}"
    textColor: "{colors.shell-100}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.brand-700}"
    textColor: "{colors.shell-100}"
  button-secondary:
    backgroundColor: "{colors.shell-100}"
    textColor: "{colors.ink-900}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.75rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-700}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.75rem"
  button-danger:
    backgroundColor: "{colors.error-600}"
    textColor: "{colors.shell-100}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.75rem"
  chip-outlined:
    backgroundColor: "{colors.shell-100}"
    textColor: "{colors.ink-700}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0.375rem 0.75rem"
  chip-outlined-selected:
    backgroundColor: "{colors.brand-100}"
    textColor: "{colors.brand-800}"
  chip-subtle:
    backgroundColor: "{colors.shell-200}"
    textColor: "{colors.ink-700}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
  chip-subtle-selected:
    backgroundColor: "{colors.brand-100}"
    textColor: "{colors.brand-900}"
  card:
    backgroundColor: "{colors.shell-100}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.xl}"
    padding: "0.75rem 1rem"
  input:
    backgroundColor: "{colors.shell-100}"
    textColor: "{colors.ink-900}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.625rem 0.875rem"
    height: "3rem"
  badge-brand:
    backgroundColor: "{colors.brand-100}"
    textColor: "{colors.brand-800}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
  badge-success:
    backgroundColor: "{colors.success-100}"
    textColor: "{colors.success-700}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
  badge-warning:
    backgroundColor: "{colors.warning-100}"
    textColor: "{colors.warning-700}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
  badge-error:
    backgroundColor: "{colors.error-100}"
    textColor: "{colors.error-700}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
---

# Design System: Domestique

## 1. Overview

**Creative North Star: "The Rider's Workshop"**

The interface is the rider's own bench — calipers, log book, half-finished service notes laid out in the order the work needs them. Brand orange is the marking pen used to circle the next decision. The aesthetic does not perform expertise; it serves it.

The product is reached on a phone, on a kitchen counter, often before a hard ride. The rider has minutes, not hours, and they're solving for numbers — grams of carbs, milliliters in each bottle, miles since the last chain replacement. Domestique respects that the rider already knows what they're doing; it removes the math, surfaces the next step, and gets out of the way. SaaS theater, gradient mood-boards, dashboard hero metrics, and oversized headlines are explicitly rejected — the product would feel less competent the louder it got.

Light-mode only. Density when density helps. Brand color reserved for active controls, primary CTAs, and focus rings. Hierarchy carried by spacing, weight, and grouping rather than by typographic shouting.

**Key Characteristics:**
- Workshop-quiet, not consumer-loud
- Numbers and notes are first-class
- Surfaces fade so the work shows
- One warm accent for active work
- Light mode only — designed for daylight, not night-mode nostalgia
- Tabular numerics everywhere data appears

## 2. Colors

A warm-shell + cool-ink palette, with a single saturated brand orange that earns its place by appearing rarely. The strategy is **Restrained**: tinted neutrals carry the surface; orange is the marking pen.

### Primary
- **Marking-Pen Orange** (`#f8622e`, `--color-brand-500`): the only saturated color in the system. Reserved for primary CTAs, active controls, the current step, focus rings, and selected chips. Lightest tints (`brand-50`, `brand-100`) carry "selected" and "info" states; deepest tints (`brand-700`, `brand-800`) carry text and hover. Brand-900 is the floor for body text contrast on brand-100 surfaces.

### Neutral — Warm Shells
- **Paper White** (`#ffffff`, `--color-shell-50` and `--color-shell-100`): the canvas. The two values are intentionally identical — the scale leaves room to differentiate later without renaming consumers.
- **Light Grit** (`#f1f1f1`, `--color-shell-200`): subtle ground for chips, hover surfaces, and adjacent tonal layers.
- **Sand** (`#d8d8d8`, `--color-shell-300`): edges and dividers when borders need to read.

### Neutral — Cool Inks
- **Bench Ink** (`#222b33` … `#fafbfb`, `--color-ink-50` through `--color-ink-900`): the type scale. `ink-900` is the deepest body text; `ink-600` and `ink-700` are workhorse copy and label inks; `ink-400` and below are secondary metadata, placeholders, and disabled states.

### Semantic — Status
- **Success Pine** (`#047857`, `success-700` on `success-100` `#d1fae5`): low-intensity confirmation, post-ride badges, "in stock" indicators.
- **Warning Amber** (`#b45309`, `warning-700` on `warning-100` `#fef3c7`): "needs rebuild," service-due flags, mild caution.
- **Error Crimson** (`#be123c`, `error-700` on `error-100` `#ffe4e6`): destructive confirms, validation errors, danger buttons (`error-600`).

### Named Rules
**The One Warm Voice Rule.** The brand is one color. There is no secondary or tertiary brand accent. If a screen needs more color than orange + neutrals, it's a job for the success/warning/error scales — never invented hues.

**The Tinted Neutral Rule.** Pure `#000` and pure `#fff` are forbidden. Shells are warm; inks are cool; both lean into the brand hue at the extremes (`shell-50` lightly, `ink-900` cooler). Never paste raw black or white into a component.

**The 10% Rule.** Brand orange covers ≤10% of any given screen. Its rarity is the point. If a layout calls for more orange, the layout is wrong.

## 3. Typography

**Display Font:** IBM Plex Sans (with `system-ui, sans-serif` fallback)
**Body Font:** IBM Plex Sans (same)
**Label/Mono Font:** IBM Plex Sans, with `font-variant-numeric: tabular-nums` on all data displays.

**Character:** A single family carries display, headline, body, and label. IBM Plex Sans has the proportions of a working tool — even spacing, clear apertures, comfortable at small sizes — without the warmth or bookishness of a humanist serif. Weight contrast and tabular numerics do the work that font-pairing usually does.

### Hierarchy
- **Display** (700, `clamp(2rem, 1.72rem + 0.78vw, 2.58rem)`, 0.98 line-height, -0.042em tracking): page titles only. Capped at 18ch on desktop, full-width on mobile.
- **Headline** (700, 1.08rem, 1.2 line-height, -0.024em): section titles inside cards.
- **Title** (700, 1.1rem, 1.2 line-height, -0.025em, tabular-nums): the most-trafficked unit in the app — `page-stat-value`, the carbs/calories/hydration callouts. Tabular figures so columns align.
- **Body** (400, 1rem, 1.5 line-height): all running prose. Capped at 65–75ch.
- **Label** (600, 0.78rem, 0.02em letter-spacing): kickers and section eyebrows. Plus a smaller variant at 0.74rem with the same tracking for stat labels.

### Named Rules
**The Tabular Rule.** Any element that displays a number — bottle counts, grams of carbs, watts, kilograms — uses `tabular-nums`. Numbers must align column-wise so the rider can compare at a glance.

**The No-Display-In-UI Rule.** The Display style is reserved for page titles. Buttons, labels, data, and inline numbers stay at Title or Body weight. Display-sized type inside a component is a sign the hierarchy is wrong elsewhere.

**The 65ch Rule.** Body copy is capped at 65–75 characters per line. Wider text reads as marketing; the workshop is denser, but per-line still compact.

## 4. Elevation

The system is **mostly flat with intentional warmth**. Cards sit on the page with a soft 1px border and a barely-visible drop shadow — enough to separate them from the canvas without performing depth. Brand-glow shadows light up only for primary affordances at rest and on hover. Modal dialogs are the one place real elevation appears, with an ink-tinted backdrop and a heavier float shadow.

### Shadow Vocabulary
- **`--shadow-soft`** (`0 8px 24px -18px rgb(34 43 51 / 0.18)`): the default card shadow. Almost invisible, but the page reads as having layers when you scan it.
- **`--shadow-float`** (`0 18px 48px -28px rgb(34 43 51 / 0.34)`): dialog and bottom-sheet only. Heavier so the modal reads as lifted.
- **`--shadow-brand-glow-sm`** (`0 6px 16px -14px brand@82%`): the warm pulse under selected segmented-control segments, active tabs, and the toggle thumb when on. Small, fast.
- **`--shadow-brand-glow-md`** (`0 12px 26px -16px brand@74%`): the resting glow under a primary button and the active step in step-navigation. The pen is hovering above the page.
- **`--shadow-brand-glow-lg`** (`0 16px 32px -18px brand@82%`): primary-button hover only. Lifts as the rider commits.

### Surface Layers
- **`--surface-panel`** (`#ffffff`): card body.
- **`--surface-soft`** (`#ffffff`): card header and muted inline tints.
- **`--bg-shell-light`** / **`--bg-brand-light`**: tinted ground for inline callouts and selected rows.
- **`--surface-translucent-soft` / `--surface-translucent` / `--surface-translucent-strong`** (white at 55%, 78%, 90%): for translucent panels over tinted backgrounds — mobile nav, toast, a few in-progress overlays.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadow appears only as a response to state — primary action, modal lift, focus ring. Decorative drop shadow is forbidden.

**The Brand-Glow Reserved Rule.** Brand-glow shadows attach only to brand-colored surfaces (primary buttons, selected pills, the on-state toggle thumb, the active step). Never bolt a brand glow onto a neutral surface to "warm it up."

## 5. Components

The library lives in `src/components/ui/` and is the source of truth. New surfaces compose these primitives — net-new primitives only when foundation work absolutely requires it.

### Buttons
- **Shape:** rounded `0.75rem` (`rounded-xl`). Border on every variant, including `ghost` (transparent border), so heights and rhythms align.
- **Primary:** `brand-500` background, white text, `--shadow-brand-glow-md` at rest, `--shadow-brand-glow-lg` on hover. Hover darkens to `brand-700`. Active state translates 1px down.
- **Secondary:** white background, `--border-soft`, `ink-900` text. Subtle ink-tinted shadow on hover only.
- **Ghost:** transparent, `ink-700` text. Hover swaps to `shell-50` background with `ink-900` text.
- **Danger:** `error-600` background, white text. Same shadow treatment as primary but tinted red.
- **Sizes:** `sm` (min-h 44px touch target on mobile, 36px desktop), `md` (44/40), `lg` (44/44, larger horizontal padding).
- **Focus:** `focus-visible:ring-2 brand-200` with `ring-offset-2 ring-offset-shell-100`. Always visible when keyboard-driven; never on mouse click.

### Chips
- **Shape:** fully rounded pill (`rounded-full`).
- **Sizes:** `sm` (compact filter, min-h 28px) and `md` (touch-target, min-h 44px on mobile, 40px desktop).
- **Tones:** `subtle` (no border, on `shell-200` ground; selected → `brand-100` / `brand-900`) and `outlined` (with `--border-soft`; selected → `brand-300` / `brand-100` / `brand-800`).
- **State:** `aria-pressed` for radio behavior; `disabled` opacity 50% with no pointer events.
- **Focus:** the same `brand-200` ring + `shell-100` offset as Buttons.
- **Use:** filter rows, single-select preference rows, bike pickers. The Chip primitive replaced five hand-rolled equivalents in May 2026.

### Cards / Containers
- **Corner Style:** `rounded-2xl` (`1rem`), softer than buttons.
- **Background:** `--surface-panel` (white).
- **Border:** 1px `--border-soft` always present. Cards never shadow without a border.
- **Shadow:** `--shadow-soft`. See Elevation.
- **Internal padding:** 12px / 16px on mobile, 16px / 20px on desktop.
- **Header:** lighter `--surface-soft` background, divider below.
- **No nested cards.** A card inside a card is a sign the IA is wrong; use `surface-note` (the inline tinted callout class) instead.

### Inputs / Fields
- **Style:** `rounded-xl` (`0.75rem`), 1px `--border-soft`, white background, `ink-900` text.
- **Focus:** `focus-visible` (keyboard only) lifts the border to `brand-400` and adds a `brand-200` ring with `shell-100` offset. Mouse clicks do not show the ring.
- **Error:** `error-500` border, `error-50` background, `error-700` body for the message, with an icon and `aria-describedby`.
- **Heights:** 48px on mobile, 44px on desktop.
- **Sibling: Select** (same chrome, same focus, native `<select>` for mobile-friendly behavior).

### Segmented Control / Tabs / Toggle
- **Segmented Control:** rounded-full container with 1px border and an inset hairline highlight; selected segment is `brand-500` solid with `--shadow-brand-glow-sm` underneath. Idle segments are flat with `ink-700` text. Used for ≤4 mutually exclusive choices.
- **Tabs:** same pill-on-pill pattern, but in a horizontal scroll-aware row. Used for primary view modes (Pack / Ride guide / Stats) and gear-section view modes.
- **Toggle:** rounded-full track, 28px tall on mobile / 24px on desktop, with a circular thumb that translates on state change. The thumb glows brand-warm when on and stays neutral when off.

### Stepper
- **Use:** counters for things the rider has on the bench (bottles by size). Horizontal `−`, value, `+`. Buttons are 44px on mobile, 32px on desktop. The value is a `role="spinbutton"` with `aria-live="polite"`.

### Dialog / Sheet
- **Mobile:** bottom-aligned sheet with `rounded-t-2xl`. Slides up.
- **Desktop:** centered modal with `rounded-2xl`.
- **Backdrop:** ink-tinted, `color-mix(in oklch, ink-900 42%, transparent)` plus `backdrop-blur-sm`. Never raw `bg-black`.
- **Float:** uses `--shadow-float`, the only place that shadow appears.
- **Use modals sparingly.** Inline edits and side panels are preferred. A modal is a hard interrupt.

### Alerts
- **Use:** in-flow messages with strong semantic meaning (validation summary, sync status, post-action confirmation). Variants: `info` (brand-tinted), `success`, `warning`, `error`.
- **Shape:** `rounded-xl`, 1px border in the variant tint, light tint background, icon at left.
- **Live region:** errors use `role="alert"` and `aria-live="assertive"`; the rest are `status` / `polite`.

### Badges
- **Use:** inline metadata — "Heavy sweater," "Auto," "Needs rebuild," post-phase markers. Variants neutral / brand / success / warning / error.
- **Shape:** rounded-pill, no border, `text-[0.66rem]` (sm) or `text-xs` (md), font-weight 500.

### Signature Component: Page Intro
A two-column grid at desktop (`page-intro-grid`) with title + summary on the left and a `meta` slot on the right. The meta slot carries the page's status — draft-saved checkmarks, page links, badge rows. Page-intro is bordered below by `--border-soft`. It establishes the page's identity without needing a hero image.

## 6. Do's and Don'ts

### Do:
- **Do** use brand orange (`#f8622e`) only for the active step, primary CTAs, current selection, and focus rings. The rarer it is, the louder it speaks.
- **Do** put numbers in `tabular-nums` whenever they render. Bottle counts, grams, kcal, watts, miles, days — all of them.
- **Do** compose new surfaces from `src/components/ui/` primitives. Reach for `Chip`, `SegmentedControl`, `PresetButtons`, `Stepper`, `Toggle`, `Card`, `Dialog`, `Alert`, `Badge` before writing inline class strings.
- **Do** reach for `success-*`, `warning-*`, `error-*` token scales for status. Raw Tailwind `emerald` / `amber` / `red` have no place here.
- **Do** use `focus-visible:` (keyboard only) for focus rings. Never plain `focus:` — it fires on mouse clicks.
- **Do** use `…` (a single ellipsis glyph) for loading states. Never `...` (three periods).
- **Do** tint neutrals: `ink-*` is cool-grey, `shell-*` is warm-white. Pure black and pure white are forbidden.
- **Do** vary spacing for rhythm — 12px / 16px / 20px / 24px / 32px is the working scale. Same padding everywhere is monotony.

### Don't:
- **Don't** invent a second brand color or "complement" the orange. The system has one warm voice.
- **Don't** SaaS-decorate: hero metrics with gradient accents, marketing-grade headline pairings, identical card grids. PRODUCT.md calls these out as anti-references; this spec carries that line.
- **Don't** restate visible information in copy ("Your fuel plan" above a heading that says "Fuel plan"). Every word earns its place.
- **Don't** use em dashes (`—` or `--`) in copy. Use commas, colons, semicolons, periods, or parentheses. Em dashes used as `no-value` placeholders in spec rows are the one exception.
- **Don't** wrap a card inside a card. If you need an inline callout, use the `surface-note` class.
- **Don't** add a brand-tinted shadow to a non-brand surface to "warm it up." Brand glow attaches only to brand-colored elements.
- **Don't** ship a primitive without all states: default, hover, focus-visible, active, disabled, and (where applicable) loading and error.
- **Don't** add new translucent-white opacities. The three `--surface-translucent-*` tokens cover the use cases; if a fourth is genuinely needed, add it as a token, not as a literal.
- **Don't** raise the page title above 2.58rem. Hierarchy is built with spacing and weight, not by making display type bigger.
- **Don't** invent a sub-nav for a single page. The Fuel-plan section's IA was simplified in May 2026 — Bottles and Saved-plans are standalone leaves reached via context, not via umbrella navigation.

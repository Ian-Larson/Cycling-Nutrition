# Account Page Rethink — Shape Brief

**Date:** 2026-05-01
**Command:** `/impeccable shape`
**Status:** Confirmed by user. Ready for `/impeccable craft` or direct implementation.

## Problem

Today's `/account` page stacks **6 cards**: Profile, Fuel targets, Preferences, Sign in, Cloud backup, Strava. Three of those (Sign in / Cloud backup / Strava) are structurally identical — header + status badge + descriptive paragraph + surface-note for metadata + one button — so they read as the same thing said three times. The athlete side carries the chrome of three cards for what is really one rider record plus a small toggle row. Net effect: a hub page feels like a directory of repeating chrome.

## 1. Feature summary

A single `/account` page that is **rider identity** + **quick settings hub** in one quiet surface. Replaces today's six-card stack with one compact header strip (who the rider is) and one Settings card (everything they'd ever flip from this page — fuel targets, display preferences, account/sync/Strava connections — as peer rows under three section kickers).

## 2. Primary user action

There isn't one. The page is a hub: open it, do one of {tweak a number, check status, flip a setting}, leave. The brief makes all three feel one tap deep — none gets a "hero" spot.

## 3. Design direction

- **Color strategy: Restrained.** Project default. Brand orange only on the active toggle/chip and primary action button. ≤10% surface coverage as always.
- **Theme scene sentence:** Self-coached cyclist on their phone in the kitchen at 6:43am, daylight coming through the window, checking that their FTP is current and they're still synced before heading out. Light mode forced by the scene.
- **Anchor references:** (1) a calibration log clipped to a workshop bench — labels left, values right, hairline rules between rows; (2) the iOS Settings app's row rhythm (tight, peer, scannable, never card-in-card); (3) Domestique's existing `divided-row-list` and `spec-row` primitives.
- No image probes — refining a known surface, not exploring a new lane.

## 4. Scope

- **Fidelity:** production-ready.
- **Breadth:** one route (`/account`), one component refactor (`AthletePane` plus the `account-sync-heading` section get replaced; page header trims).
- **Interactivity:** shipped-quality. Inline-edit, all states, real auth/sync wiring intact.
- **Time intent:** polish until ships.

## 5. Layout strategy

Two stacked surfaces. Total card count drops from 6 → 1.

### (A) Identity strip — not a card

A page-intro-style band immediately under the page title.

- **Left:** rider name as a Headline (700, 1.08rem). Below it, three secondary stats inline as a tabular muted metadata line: `34 yrs · 280 W · 72 kg`. Each stat is independently tappable to enter inline edit on that field.
- **Right:** `3.89 W/kg` as a Title-style tabular number (the exact `page-stat-value` treatment), label "Power-to-weight" above it in `section-kicker`. This is the one stat the rider checks; it earns prominence by being the only large number on the strip.
- **Edit affordance:** a single ghost "Edit" link at the strip's right edge (mobile: row below). Tapping it flips the strip into a 4-input inline form (Name / Age / FTP / Weight); commit-on-blur as today. No modal.
- **Bottom border:** `--border-soft` hairline. Sets the page's first horizontal beat.

### (B) Settings card — one Card, three internally-divided sections

Card chrome: standard `rounded-2xl` panel, `--shadow-soft`, `--border-soft`, no header bar. The card simply *holds* the rows; it doesn't announce itself.

Each section is introduced by a `section-kicker`-style eyebrow (0.74rem, 0.02em tracking, ink-500, all-caps), no horizontal rule above it, and a hairline divider between sections.

```
FUEL
  Gut target            [60][65][75][85][95]   →  inline preset row, value tabular at left
  Sweat rate            0.9 L/h                →  click value to inline edit
  Heavy sweater         (Toggle)
                        helper line beneath only when value would surprise

DISPLAY
  Units                 (Metric | Imperial)    →  segmented control, right-aligned
  Temperature           (°C | °F)
  Fueling engine        (v2 | v3)
                        v3 helper line beneath chips only

CONNECTIONS
  Account               Signed in as ian@…        [Sign out]
  Sync                  Synced 4 min ago          [Sync now]
  Strava                Connected · Ian Larson    [Disconnect]
```

Row rhythm: ~48px touch target on mobile, ~40px on desktop. Label is `ink-700` body-weight. Control sits flush right. No card-in-card; no `surface-note` for static metadata; metadata lives inline inside the row.

## 6. Key states

### Identity strip

- Default (signed-in or guest): name + W/kg + stats line. Edit affordance visible.
- Edit mode: 4 inputs, focused on whichever field was tapped, commit-on-blur, "Done" link replaces "Edit". Errors inline per existing `Input` validation.
- Missing data: dashes (`—`) for unset stats; W/kg shows `—` with a quiet "Set FTP and weight" inline hint until both exist.

### Fuel rows

- Default with value, default with helper copy, error inline (existing).
- Heavy sweater off / on (Toggle thumb glow only when on).

### Display rows

- Three radio-style segmented controls. Selected segment carries the brand glow. No helper text by default; v3 row gets one line beneath because it has a real consequence ("v3 adds pre/post-ride targets and warnings; needs weight").

### Connections — signed out

- Account row: row label + "Not signed in" + the magic-link email input and "Send magic link" button expanded inline as the row body.
- Sync row: muted ("Sign in to back up changes"), action disabled.
- Strava row: muted ("Sign in to connect Strava"), action disabled.

### Connections — signed in (default)

- Account row: "ian@example.com" + "Sign out" ghost button. Status reads tight; no separate paragraph.
- Sync row: "Synced 4 min ago" + "Sync now" secondary. Mode (Cloud + local / Local only) is implicit when signed in; doesn't need its own line.
- Strava row, not connected: "Not connected" + "Connect" secondary.
- Strava row, connected: "Ian Larson · since May 2025" + "Disconnect" ghost. **Disconnect opens a Dialog confirm** before firing.

### Inline messages

Auth / sync / Strava messages appear *inside* their row, immediately below the action, as a single line of `ink-600 text-sm`. Errors use `error-700` and `role="alert"`. Never a separate paragraph at the bottom of the section.

### Loading

- Sync now / Send magic link / Disconnect: button disabled with `…` glyph (existing).
- No skeleton state needed; data is local-first.

### Supabase not configured (build env)

- Account row replaces inline form with the existing warning Alert (kept), Sync and Strava rows show muted "Accounts disabled in this build."

## 7. Interaction model

- Tap any value (name, age, FTP, weight) → that field becomes editable inline; commit on blur or Enter.
- Tap "Edit" on the strip → all four fields editable at once.
- Toggle, Chip, SegmentedControl — single tap, instant commit, no save button (matches existing store pattern).
- Sign out — one click (matches existing).
- Sync now — one click.
- **Disconnect Strava — opens Dialog confirm.** "Disconnect Strava? You'll need to re-authorize to reconnect." [Cancel] [Disconnect].
- Magic-link form — submit → button shows `Sending…` → row message appears inline on result.
- **Keyboard:** every row reachable in tab order. Focus rings use the standard brand-200 ring on shell-100 offset. Inline-edit fields auto-focus on activation.
- **Reduced motion:** segmented-control glow and toggle thumb already respect this. No new motion.

## 8. Content requirements

Strip and rows lean on labels alone. Helpers are deleted unless they earn their place.

| Where | Today | Rebuild |
|---|---|---|
| Page intro description | "Profile, planning defaults, and the sign-in that backs them up across devices." | **Delete.** Strip below makes it obvious. Keep the title `Account`. |
| "Account, sync, and Strava" H2 | Section heading | **Delete.** The kicker `CONNECTIONS` carries it. |
| Sign-in card body copy | `statusCopy` paragraph | **Delete.** Email goes in the Account row's value column; status is implicit. Keep the `not configured` Alert. |
| Cloud backup paragraph | "The app still saves immediately on this device. When signed in, changes are copied to your account…" | **Delete.** The Sync row's "Synced 4 min ago" carries it. |
| Strava paragraph | "Optional connection. This phase stores the connection securely but does not import rides." | **Delete entirely.** If Strava ever imports rides, that copy will rot. |
| Open labs link | Bottom of preferences card | **Delete from /account.** Power-meter analyzer is a destination, not a setting. |
| W/kg "From FTP and weight" caption | In the surface-note today | **Delete.** The kicker "Power-to-weight" alone is enough on the strip. |
| Heavy sweater "Use higher sodium in auto mode" | Helper next to toggle | **Keep**, tighter. "Bias auto toward more sodium." |
| v3 engine helper | "v3 adds pre/post-ride, daily targets, and warnings. Requires weight." | **Keep**, tighter. "Adds pre/post-ride targets and warnings. Needs weight." |
| Gut target tone label | "Conservative / Progressive / Aggressive tolerance." | **Keep** (load-bearing). One line beneath the preset row. |
| Date format | `Intl.DateTimeFormat medium + short` | **Replace** with relative for fresh values ("Synced 4 min ago"), absolute for stale (>24h: "Synced May 2"). Single helper. |

No em dashes anywhere. Single ellipsis glyph for loading.

## 9. Phone-strip prototype note

On viewports below ~380px, the inline stats line (`34 yrs · 280 W · 72 kg`) and the W/kg block compete for horizontal space. Implementation will prototype a floating W/kg block (right-aligned, spanning rows 1–2 of the strip) and adjust during build — falling back to a stacked layout (name → stats → W/kg full-width) if the float reads cluttered.

## 10. Build sequence

1. Replace `AccountPage` page-intro description; keep title only.
2. Build `IdentityStrip` component (new) — read-mode + edit-mode states. Replaces the Profile card portion of `AthletePane`.
3. Build `SettingsCard` component (new) — three sections (FUEL / DISPLAY / CONNECTIONS) using existing primitives plus the divided-row pattern. Replaces the Fuel-targets and Preferences cards plus all three account/sync/Strava cards.
4. Add Dialog confirm for Disconnect Strava.
5. Add the relative-time formatter for sync timestamps.
6. Delete `AthletePane` once parity is confirmed; remove unused imports from `AccountPage`.
7. Verify all states by hand: signed-out, signed-in (no Strava), signed-in (with Strava), Supabase-not-configured, mid-sync, mid-disconnect, missing-FTP/weight (W/kg dashes).

## 11. Files affected

- `src/pages/account.tsx` — trim to page-intro title + new components.
- `src/components/account/athlete-pane.tsx` — delete after migration.
- `src/components/account/identity-strip.tsx` — new.
- `src/components/account/settings-card.tsx` — new.
- `src/components/account/disconnect-strava-dialog.tsx` — new (small).
- `src/lib/format/relative-time.ts` — new helper for "Synced 4 min ago".

## 12. Recommended references during build

- `interaction-design.md` — inline edit / commit-on-blur is the central pattern.
- `spatial-design.md` — divided-row rhythm is the layout craft this depends on.
- `clarify.md` — final copy pass before ship.

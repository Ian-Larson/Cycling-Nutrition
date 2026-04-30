## Design Context

### Users
Primarily experienced self-coached cyclists using the app before a ride, often on mobile, to build a fast and reliable fueling plan without doing nutrition math by hand. They need to confirm kit readiness, set ride demands, and leave with precise numbers and followable instructions quickly.

### Brand Personality
Precise, efficient, focused. The product should feel dependable, clear, and fast under time pressure. Copy should be brief, concrete, and useful to cyclists who want numbers and actions without marketing language.

### Aesthetic Direction
Quiet utility-first interface, not SaaS. Brand identity is the warm orange `#f8622e` (`--color-brand-500`) used sparingly for active controls, primary CTAs, and focus rings. Surfaces sit on warm whites (`--color-shell-50`, `--color-shell-100`) over a cool ink-grey type scale (`--color-ink-50` through `--color-ink-900`). Typography is IBM Plex Sans across body, UI, and display; weights 400 / 500 / 600 / 700. Light mode only — no dark variants in this milestone. Avoid oversized headlines, dashboard theater, ornamental gradients, product-marketing chrome, and copy that restates visible information.

### Design Principles
1. Optimize for speed of use: reduce taps, reduce reading, reduce hesitation.
2. Prioritize numeric clarity: show the stats, sources, and actions cyclists need first.
3. Keep copy tight: no duplicated explanations, no slogans, no filler.
4. Design as a utility tool, not a SaaS dashboard or marketing surface.
5. Build hierarchy through spacing, grouping, and weight rather than oversized type.
6. Meet light-mode accessibility — sufficient contrast on text and borders, non-color-only state cues, and reduced-motion-safe interactions.

### Primitives
Hand-rolled UI components live in `src/components/ui/`: alert, badge, button, card, checkbox, collapsible, dialog, divided-row-list, icon-button, input, preset-buttons, segmented-control, select, spec-row, stepper, tabs, toast, toggle. New surfaces compose these — net-new primitives only when foundation work absolutely requires it.

### Tokens
All colors, fonts, and spacing live in the Tailwind v4 `@theme` block at `src/index.css`. Brand orange (`--color-brand-50` through `--color-brand-900`), shell warm-whites (`--color-shell-50` through `--color-shell-300`), ink cool-greys (`--color-ink-50` through `--color-ink-900`), and semantic success / warning / error scales are tokens — not hex literals. Fonts: `--font-sans`, `--font-body`, and `--font-display` all resolve to IBM Plex Sans.

### Information Architecture
Three primary tabs — Fuel Plan, Garage, Account.
- **Fuel Plan** (`/`) — Pack / Ride guide / Stats sub-tabs; the right rail shows a single "Fuel Inventory" panel.
- **Garage** (`/gear`) — Active setup / Service / History sub-tabs; the "Due Soon" service card appears only on Service. Inventory sub-route at `/gear/inventory`.
- **Account** (`/account`) — single 2-pane page: Athlete profile and fuel-target preferences on top; Sign-in, cloud-sync, and Strava connect-disconnect below. Legacy `/athlete` and `/settings` routes redirect to `/account[#preferences]`.

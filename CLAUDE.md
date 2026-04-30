# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

Domestique is a cyclist's assistant web app — a single home for planning, training, and maintaining the rider and the bike. Current capabilities:

- **Fuel planning** — optimal bottle configurations, drink mix allocation, and timed consumption guides based on ride duration, intensity, and heat.
- **Gear Hub** — bike and component inventory, weight tracking, and maintenance records.
- **Ride history** — logged rides and athlete profile.
- **Power meter analyzer** — power data analysis tools.
- **Strava sync** — import rides via Strava OAuth.
- **Cloud sync** — Supabase-backed account with local-first storage and cloud backup.

## Commands

```bash
npm run dev      # Start development server (localhost:5173)
npm run build    # Production build (outputs to dist/)
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

## Architecture

- **React 19 + TypeScript + Vite** - SPA deployed to GitHub Pages
- **Zustand** - State management with localStorage persistence
- **Tailwind CSS v4** - Styling with custom fonts (Outfit, Source Sans 3)

### Key Directories

```
src/
├── components/    # React components by feature
│   ├── ui/         # Reusable primitives (Button, Card, Input, etc.)
│   ├── layout/     # Header, MobileNav
│   ├── planner/    # Fuel planning components
│   ├── products/   # Product/inventory components
│   ├── gear/       # Gear Hub (bikes, components, maintenance)
│   └── analyzer/   # Power meter analyzer
├── lib/
│   ├── calculator/ # Core nutrition calculation engine
│   └── cloud/      # Supabase sync + cloud backup
├── pages/         # Route-level page components
├── store/         # Zustand store with persistence
└── types/         # TypeScript type definitions
```

### Calculation Engine

The calculator (`src/lib/calculator/`) handles:
- Carb/hydration needs based on duration, intensity, heat
- Optimal bottle selection (smallest combo meeting needs)
- Drink mix allocation across bottles
- Timed consumption guide generation

## Rules to always follow

- Commit early and often: With clear messages about what the commit solves.
- Break tasks into small issues and tackle them. Separate features, use best coding practices
- After making and approving a plan, always name it and place it in the Plans folder as a .md file

## GSD Workflow

This repo is managed with GSD (Get-Shit-Done). The current milestone is **Polish & Redesign Sweep v1** — see `.planning/` for the source of truth:

- `.planning/PROJECT.md` — what Domestique is, core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — v1 requirements (REQ-IDs) and traceability
- `.planning/ROADMAP.md` — 5 phases, foundations-first, dependencies, success criteria
- `.planning/STATE.md` — current phase, position, accumulated context
- `.planning/codebase/` — codebase map (STACK / ARCHITECTURE / STRUCTURE / CONVENTIONS / INTEGRATIONS / TESTING / CONCERNS)
- `.planning/config.json` — workflow config (mode: yolo, granularity: coarse, parallelization: true)

**Phase planning uses `/impeccable`** as the design lens. Use `/gsd-plan-phase 1` (or `/gsd-discuss-phase 1` first) to start.

Historical implementation plans live in `Plans/` and are reference-only — they predate the GSD workflow.

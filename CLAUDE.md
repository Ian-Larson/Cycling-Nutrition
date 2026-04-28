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

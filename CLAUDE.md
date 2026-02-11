# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

Cycling nutrition calculator web app to help athletes plan and fuel on rides. Calculates optimal bottle configurations, drink mix amounts, and consumption timing based on ride characteristics.

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
│   ├── ui/        # Reusable primitives (Button, Card, Input, etc.)
│   ├── layout/    # Header, MobileNav
│   ├── bottles/   # Bottle CRUD components
│   ├── products/  # Product CRUD components
│   └── planner/   # Fuel planning components
├── lib/
│   └── calculator/  # Core nutrition calculation engine
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

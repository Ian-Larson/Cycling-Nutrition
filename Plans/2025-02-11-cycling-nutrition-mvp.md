# Cycling Nutrition Calculator - MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web app that helps cyclists plan nutrition for rides by calculating optimal bottle configurations, drink mix amounts, and consumption timing.

**Architecture:** React SPA with Zustand for state management, localStorage for persistence, and a pure TypeScript calculation engine. Mobile-first responsive design deployed to GitHub Pages.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Tailwind CSS, React Router

---

## Feature Sections

### Section 1: Project Foundation
**Tasks 1-4** | Sets up the development environment

- Initialize Vite + React + TypeScript project
- Configure Tailwind CSS with custom fonts (Outfit/Source Sans 3)
- Set up path aliases (@/ imports)
- Create GitHub Actions workflow for automatic deployment

**Commits:** 4 commits

---

### Section 2: Data Layer
**Tasks 5-6** | Defines data models and state management

- TypeScript types for: Bottle, Product, Ride, FuelPlan
- Zustand store with localStorage persistence
- CRUD actions for bottles, products, and fuel plans

**Key Files:**
- `src/types/*.ts` - Domain models
- `src/store/index.ts` - State management

**Commits:** 2 commits

---

### Section 3: Calculation Engine
**Task 7** | Core nutrition planning logic

- Calculate total carbs needed based on duration + target g/hr
- Calculate hydration needs based on heat + intensity
- Select optimal bottle combination (smallest that meets needs)
- Allocate drink mix proportionally across bottles
- Generate timed consumption guide

**Key Files:**
- `src/lib/calculator/carbs.ts` - Carb/hydration calculations
- `src/lib/calculator/bottles.ts` - Bottle selection algorithm
- `src/lib/calculator/timing.ts` - Consumption guide generation

**Commits:** 1 commit

---

### Section 4: UI Component Library
**Tasks 8-9** | Reusable UI components

- Primitives: Button, Card, Input, Select, Slider
- Layout: Header (desktop nav), MobileNav (bottom tabs)
- Styled with Tailwind, brand colors, custom fonts

**Key Files:**
- `src/components/ui/*.tsx` - UI primitives
- `src/components/layout/*.tsx` - Layout components

**Commits:** 2 commits

---

### Section 5: Bottles Management
**Task 11** | CRUD for user's bottle inventory

- List all bottles with availability toggle
- Add new bottles (name, capacity: 550/750/950ml)
- Delete bottles
- Mark bottles available/unavailable (for "what's clean today")

**Key Files:**
- `src/pages/bottles.tsx`
- `src/components/bottles/bottle-card.tsx`
- `src/components/bottles/bottle-form.tsx`

**Commits:** 1 commit

---

### Section 6: Products Management
**Task 12** | CRUD for nutrition products

- List products filtered by type (drink mix, gel, chews, bar)
- Add products with nutrition info (carbs, serving size, scoop size)
- Edit/delete products

**Key Files:**
- `src/pages/products.tsx`
- `src/components/products/product-card.tsx`
- `src/components/products/product-form.tsx`

**Commits:** 1 commit

---

### Section 7: Fuel Planner (Core Feature)
**Task 13** | Main ride planning interface

- Input ride characteristics:
  - Duration (30min - 5hrs slider)
  - Intensity (recovery → race)
  - Heat factor (cool → hot)
  - Carb target (30-120 g/hr slider)
- Calculate and display:
  - Which bottles to bring
  - Grams of mix per bottle (+ approximate scoops)
  - Consumption timeline with carb totals

**Key Files:**
- `src/pages/planner.tsx`
- `src/components/planner/ride-form.tsx`
- `src/components/planner/fuel-result.tsx`

**Commits:** 1 commit

---

### Section 8: Polish & Deploy
**Tasks 10, 14-15** | Routing, defaults, deployment

- React Router setup with all pages
- Default sample data (common bottles + popular drink mixes)
- Build verification
- GitHub Pages deployment

**Commits:** 3 commits

---

## Summary

| Section | Feature | Tasks | Commits |
|---------|---------|-------|---------|
| 1 | Project Foundation | 1-4 | 4 |
| 2 | Data Layer | 5-6 | 2 |
| 3 | Calculation Engine | 7 | 1 |
| 4 | UI Components | 8-9 | 2 |
| 5 | Bottles Management | 11 | 1 |
| 6 | Products Management | 12 | 1 |
| 7 | Fuel Planner | 13 | 1 |
| 8 | Polish & Deploy | 10, 14-15 | 3 |
| **Total** | | **15 tasks** | **15 commits** |

---

## Verification Checklist

- [ ] `npm run dev` starts development server
- [ ] Can add/edit/delete bottles
- [ ] Can add/edit/delete products
- [ ] Fuel planner calculates and displays results
- [ ] Data persists after page refresh
- [ ] `npm run build` succeeds
- [ ] App deploys to GitHub Pages

---

## Future Enhancements (Not in MVP)

- Athlete profile (FTP, weight, zones)
- TSS-based automatic carb targets
- Saved rides for quick reuse
- Fuel plan history
- Data export/import
- Backend sync for cross-device access

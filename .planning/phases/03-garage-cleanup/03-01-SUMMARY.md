---
id: 03-01
phase: 3
plan: 01
status: complete
completed: 2026-04-30
---

# Plan 03-01 Summary — Move GearDuePreviewBand into Service tab panel

## What Was Built

One structural move in `src/pages/gear.tsx` that satisfies both GEAR-01 and GEAR-02 simultaneously.

### Before

```tsx
<section className="min-w-0 space-y-3 md:space-y-4">
  {tab !== 'due' ? (
    <GearDuePreviewBand
      items={filteredDueItems}
      bikes={bikes}
      onLogService={handleQueueDueService}
      onViewAll={() => setTab('due')}
      selectedBikeId={selectedBikeIdForView}
    />
  ) : null}
  <Tabs value={tab} onChange={...}>
    ...
    <TabPanel value="due">
      <GearDueList ... />
    </TabPanel>
    ...
  </Tabs>
</section>
```

The conditional `tab !== 'due'` rendered the band on Active+History (BACKWARDS from GEAR-01). The band was a sibling above `<Tabs>`, so the tab strip moved vertically when switching to/from Service.

### After

```tsx
<section className="min-w-0 space-y-3 md:space-y-4">
  <Tabs
    value={tab}
    onChange={...}
    className="space-y-4 md:space-y-6"
  >
    ...
    <TabPanel value="due">
      <GearDuePreviewBand
        items={filteredDueItems}
        bikes={bikes}
        onLogService={handleQueueDueService}
        onViewAll={() => setTab('due')}
        selectedBikeId={selectedBikeIdForView}
      />
      <GearDueList ... />
    </TabPanel>
    ...
  </Tabs>
</section>
```

- **GEAR-01:** Band now renders only on Service tab (inside its panel).
- **GEAR-02:** `<Tabs>` is the first child of `<section>` in every render path; tab strip y-position is constant.

### Follow-up fix (commit `3d1ed03`)

After the move, `<Tabs>` became the only sibling under `<section>`, so the parent's `space-y-3 md:space-y-4` no longer applied between the tab-list header and the active panel content (it only spaces siblings). Added `className="space-y-4 md:space-y-6"` to the `<Tabs>` element directly to match the page wrapper rhythm (16px mobile / 24px desktop). Verified visually by user.

## Acceptance Evidence

```
$ grep -c "tab !== 'due'" src/pages/gear.tsx
0
$ grep -c "GearDuePreviewBand" src/pages/gear.tsx
2   # 1 import + 1 mount
$ grep -c "<GearDuePreviewBand" src/pages/gear.tsx
1   # the single mount inside <TabPanel value="due">
$ npm run lint
exit 0
$ npm run build
exit 0
```

Manual verification: user confirmed tab strip no shift across Active/Service/History, breathing room below strip acceptable.

## Commits

| Hash | Type | Message |
|------|------|---------|
| `c712819` | refactor | refactor(03-01): move GearDuePreviewBand into Service tab panel |
| `3d1ed03` | fix | fix(03-01): restore vertical rhythm below Garage tab strip |

## Self-Check

PASSED. One in-scope follow-up commit for the spacing rhythm regression introduced by the move (documented above).

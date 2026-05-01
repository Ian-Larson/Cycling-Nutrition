import { describe, expect, it } from 'vitest';
import {
  getActivePrimaryNavItem,
  getSectionNavItems,
  primaryNavItems,
} from './navigation';

describe('primary navigation grouping', () => {
  it('condenses the tab bar to the main app functions', () => {
    expect(primaryNavItems.map((item) => item.label)).toEqual([
      'Fuel plan',
      'Garage',
      'Labs',
      'Account',
    ]);
  });

  it.each([
    ['/', 'Fuel plan'],
    ['/inventory', 'Fuel plan'],
    ['/history', 'Fuel plan'],
    ['/gear', 'Garage'],
    ['/power-meter-analyzer', 'Labs'],
    ['/account', 'Account'],
    ['/athlete', 'Account'],
  ])('marks %s under %s', (pathname, expectedLabel) => {
    expect(getActivePrimaryNavItem(pathname)?.label).toBe(expectedLabel);
  });
});

describe('section navigation grouping', () => {
  it('keeps bottles and saved plans inside nutrition planning', () => {
    expect(getSectionNavItems('nutrition').map((item) => item.label)).toEqual([
      'Build plan',
      'Bottles',
      'Saved plans',
    ]);
  });

  it('exposes no sub-nav for the consolidated account section', () => {
    expect(getSectionNavItems('account')).toEqual([]);
  });

  it('places the power meter tool inside labs', () => {
    expect(getSectionNavItems('labs').map((item) => item.label)).toEqual([
      'Power meter',
    ]);
  });
});

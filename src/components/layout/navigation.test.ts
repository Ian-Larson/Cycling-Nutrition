import { describe, expect, it } from 'vitest';
import {
  getActivePrimaryNavItem,
  getSectionNavItems,
  primaryNavItems,
} from './navigation';

describe('primary navigation grouping', () => {
  it('condenses the tab bar to the main app functions', () => {
    expect(primaryNavItems.map((item) => item.label)).toEqual([
      'Nutrition Plan',
      'Gear',
      'Labs',
      'Account',
    ]);
  });

  it.each([
    ['/', 'Nutrition Plan'],
    ['/inventory', 'Nutrition Plan'],
    ['/history', 'Nutrition Plan'],
    ['/gear', 'Gear'],
    ['/power-meter-analyzer', 'Labs'],
    ['/account', 'Account'],
    ['/athlete', 'Account'],
  ])('marks %s under %s', (pathname, expectedLabel) => {
    expect(getActivePrimaryNavItem(pathname)?.label).toBe(expectedLabel);
  });
});

describe('section navigation grouping', () => {
  it('keeps inventory and saved plans inside nutrition planning', () => {
    expect(getSectionNavItems('nutrition').map((item) => item.label)).toEqual([
      'Build plan',
      'Inventory',
      'Saved plans',
    ]);
  });

  it('keeps athlete preferences inside account', () => {
    expect(getSectionNavItems('account').map((item) => item.label)).toEqual([
      'Sync',
      'Athlete',
    ]);
  });

  it('places the power meter tool inside labs', () => {
    expect(getSectionNavItems('labs').map((item) => item.label)).toEqual([
      'Power meter',
    ]);
  });
});

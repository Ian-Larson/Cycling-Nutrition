import { describe, expect, it } from 'vitest';
import {
  getActivePrimaryNavItem,
  primaryNavItems,
} from './navigation';

describe('primary navigation grouping', () => {
  it('condenses the tab bar to the main app functions', () => {
    expect(primaryNavItems.map((item) => item.label)).toEqual([
      'Fuel plan',
      'Garage',
      'Performance',
      'Labs',
      'Account',
    ]);
  });

  it.each([
    ['/', 'Fuel plan'],
    ['/history', 'Fuel plan'],
    ['/gear', 'Garage'],
    ['/performance', 'Performance'],
    ['/power-meter-analyzer', 'Labs'],
    ['/account', 'Account'],
    ['/athlete', 'Account'],
  ])('marks %s under %s', (pathname, expectedLabel) => {
    expect(getActivePrimaryNavItem(pathname)?.label).toBe(expectedLabel);
  });
});

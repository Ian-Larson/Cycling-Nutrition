import { describe, it, expect } from 'vitest';
import { SERVICE_TYPES, getServiceType } from './service-types';

describe('SERVICE_TYPES', () => {
  it('exposes the four v1 presets with sensible defaults', () => {
    const keys = SERVICE_TYPES.map((t) => t.key);
    expect(keys).toEqual(['chain_wax', 'chain', 'brake_pads', 'tires']);
    expect(SERVICE_TYPES.find((t) => t.key === 'chain_wax')!.defaultIntervalMi).toBe(250);
    expect(SERVICE_TYPES.find((t) => t.key === 'chain')!.defaultIntervalMi).toBe(2000);
  });

  it('getServiceType returns the preset for a known key', () => {
    expect(getServiceType('tires').label).toBe('Tires');
  });
});

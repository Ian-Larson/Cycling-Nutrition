import { describe, it, expect } from 'vitest';
import {
  FIXED_BIKE_SLOTS,
  GEAR_PART_CATEGORIES,
  GEAR_SERVICE_TYPES,
  getBikeSlot,
  getGearPartCategory,
  getGearServiceType,
  isPartCategoryCompatibleWithSlot,
} from './constants';

describe('gear constants', () => {
  it('exposes the supported part categories in v2 order', () => {
    expect(GEAR_PART_CATEGORIES.map((category) => category.key)).toEqual([
      'chain',
      'tire',
      'brake_pad',
      'cassette',
      'chainring',
    ]);
  });

  it('exposes the fixed bike slots in v2 order', () => {
    expect(FIXED_BIKE_SLOTS.map((slot) => slot.key)).toEqual([
      'chain',
      'front_tire',
      'rear_tire',
      'cassette',
      'front_brake_pads',
      'rear_brake_pads',
      'chainrings',
    ]);
  });

  it('matches part categories to their compatible slots', () => {
    expect(isPartCategoryCompatibleWithSlot('chain', 'chain')).toBe(true);
    expect(isPartCategoryCompatibleWithSlot('tire', 'front_tire')).toBe(true);
    expect(isPartCategoryCompatibleWithSlot('tire', 'rear_tire')).toBe(true);
    expect(isPartCategoryCompatibleWithSlot('brake_pad', 'front_brake_pads')).toBe(true);
    expect(isPartCategoryCompatibleWithSlot('brake_pad', 'rear_brake_pads')).toBe(true);
    expect(isPartCategoryCompatibleWithSlot('cassette', 'cassette')).toBe(true);
    expect(isPartCategoryCompatibleWithSlot('chainring', 'chainrings')).toBe(true);
    expect(isPartCategoryCompatibleWithSlot('cassette', 'front_tire')).toBe(false);
  });

  it('exposes service defaults and lookup helpers', () => {
    expect(GEAR_SERVICE_TYPES.map((serviceType) => serviceType.key)).toEqual([
      'chain_wax',
      'chain_clean',
      'tire_inspection',
      'sealant_check',
      'brake_pad_check',
      'cassette_check',
      'chainring_check',
      'other',
    ]);
    expect(getGearServiceType('chain_wax').defaultIntervalMi).toBe(250);
    expect(getGearServiceType('tire_inspection').defaultIntervalDays).toBe(30);
    expect(getGearPartCategory('tire').label).toBe('Tire');
    expect(getBikeSlot('front_tire').label).toBe('Front tire');
    expect(getBikeSlot('custom:my_slot').label).toBe('my_slot');
    expect(isPartCategoryCompatibleWithSlot('cassette', 'custom:anything')).toBe(true);
  });
});

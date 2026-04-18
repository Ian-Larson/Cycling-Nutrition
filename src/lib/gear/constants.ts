import type {
  BikeSlotKey,
  GearPartCategory,
  GearServiceTypeKey,
} from '@/types/gear';

export interface GearPartCategoryDefinition {
  key: GearPartCategory;
  label: string;
}

export interface BikeSlotDefinition {
  key: BikeSlotKey;
  label: string;
  compatibleCategories: readonly GearPartCategory[];
}

export interface GearServiceTypeDefinition {
  key: GearServiceTypeKey;
  label: string;
  defaultIntervalMi?: number;
  defaultIntervalDays?: number;
}

const ALL_PART_CATEGORIES: readonly GearPartCategory[] = [
  'chain',
  'tire',
  'brake_pad',
  'cassette',
  'chainring',
];

export const GEAR_PART_CATEGORIES = [
  { key: 'chain', label: 'Chain' },
  { key: 'tire', label: 'Tire' },
  { key: 'brake_pad', label: 'Brake pads' },
  { key: 'cassette', label: 'Cassette' },
  { key: 'chainring', label: 'Chainring' },
] as const satisfies readonly GearPartCategoryDefinition[];

export const FIXED_BIKE_SLOTS = [
  { key: 'chain', label: 'Chain', compatibleCategories: ['chain'] },
  { key: 'front_tire', label: 'Front tire', compatibleCategories: ['tire'] },
  { key: 'rear_tire', label: 'Rear tire', compatibleCategories: ['tire'] },
  { key: 'cassette', label: 'Cassette', compatibleCategories: ['cassette'] },
  {
    key: 'front_brake_pads',
    label: 'Front brake pads',
    compatibleCategories: ['brake_pad'],
  },
  {
    key: 'rear_brake_pads',
    label: 'Rear brake pads',
    compatibleCategories: ['brake_pad'],
  },
  { key: 'chainrings', label: 'Chainrings', compatibleCategories: ['chainring'] },
] as const satisfies readonly BikeSlotDefinition[];

export const GEAR_SERVICE_TYPES = [
  { key: 'chain_wax', label: 'Chain wax', defaultIntervalMi: 250 },
  { key: 'chain_clean', label: 'Chain clean', defaultIntervalMi: 500 },
  { key: 'tire_inspection', label: 'Tire inspection', defaultIntervalDays: 30 },
  { key: 'sealant_check', label: 'Sealant check', defaultIntervalDays: 90 },
  { key: 'brake_pad_check', label: 'Brake pad check', defaultIntervalMi: 1500 },
  { key: 'cassette_check', label: 'Cassette check', defaultIntervalMi: 2500 },
  { key: 'chainring_check', label: 'Chainring check', defaultIntervalMi: 2500 },
  { key: 'other', label: 'Other' },
] as const satisfies readonly GearServiceTypeDefinition[];

export function getGearPartCategory(key: GearPartCategory): GearPartCategoryDefinition {
  const category = GEAR_PART_CATEGORIES.find((candidate) => candidate.key === key);
  if (!category) throw new Error(`Unknown gear part category: ${key}`);
  return category;
}

export function getBikeSlot(key: BikeSlotKey): BikeSlotDefinition {
  if (key.startsWith('custom:')) {
    const label = key.slice('custom:'.length).trim() || 'Custom slot';
    return {
      key,
      label,
      compatibleCategories: ALL_PART_CATEGORIES,
    };
  }

  const slot = FIXED_BIKE_SLOTS.find((candidate) => candidate.key === key);
  if (!slot) throw new Error(`Unknown bike slot: ${key}`);
  return slot;
}

export function getGearServiceType(key: GearServiceTypeKey): GearServiceTypeDefinition {
  const service = GEAR_SERVICE_TYPES.find((candidate) => candidate.key === key);
  if (!service) throw new Error(`Unknown gear service type: ${key}`);
  return service;
}

export function isPartCategoryCompatibleWithSlot(
  category: GearPartCategory,
  slotKey: BikeSlotKey
): boolean {
  return getBikeSlot(slotKey).compatibleCategories.includes(category);
}

export interface Bike {
  id: string;
  name: string;
  stravaGearId: string | null;
  cachedOdometerMi: number | null;
  odometerSyncedAtIso: string | null;
  isPrimary: boolean;
  createdAt: number;
  updatedAt: number;
}

export type GearPartCategory = 'chain' | 'tire' | 'brake_pad' | 'cassette' | 'chainring';

export interface TireAttributes {
  category: 'tire';
  widthMm: number;
  diameter?: string;
  tubelessReady?: boolean;
}

export interface ChainAttributes {
  category: 'chain';
  speedCount?: number;
}

export interface BrakePadAttributes {
  category: 'brake_pad';
  compound?: string;
  padShape?: string;
}

export interface CassetteAttributes {
  category: 'cassette';
  range: string;
  speedCount?: number;
}

export interface ChainringAttributes {
  category: 'chainring';
  toothCount: number;
  position?: string;
  mount?: string;
}

export type GearPartAttributes =
  | TireAttributes
  | ChainAttributes
  | BrakePadAttributes
  | CassetteAttributes
  | ChainringAttributes;

export interface GearPartCatalogItem {
  id: string;
  category: GearPartCategory;
  brand?: string;
  model: string;
  weightGrams?: number;
  attributes: GearPartAttributes;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type GearPartInstanceStatus = 'spare' | 'installed' | 'removed' | 'retired';

export interface GearPartInstance {
  id: string;
  catalogItemId: string;
  label?: string;
  status: GearPartInstanceStatus;
  acquiredDateIso?: string;
  retiredDateIso?: string;
  initialMileageMi?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type FixedBikeSlotKey =
  | 'chain'
  | 'front_tire'
  | 'rear_tire'
  | 'cassette'
  | 'front_brake_pads'
  | 'rear_brake_pads'
  | 'chainrings';

export type BikeSlotKey = FixedBikeSlotKey | `custom:${string}`;

export interface GearInstallRecord {
  id: string;
  bikeId: string;
  partInstanceId: string;
  slotKey: BikeSlotKey;
  installedAtMileageMi: number;
  installedDateIso: string;
  removedAtMileageMi?: number;
  removedDateIso?: string;
  removeReason?: 'swapped' | 'worn' | 'damaged' | 'sold' | 'other';
  createdAt: number;
  updatedAt: number;
}

export type GearServiceTypeKey =
  | 'chain_wax'
  | 'chain_clean'
  | 'tire_inspection'
  | 'sealant_check'
  | 'brake_pad_check'
  | 'cassette_check'
  | 'chainring_check'
  | 'other';

export interface GearServiceEvent {
  id: string;
  bikeId: string;
  partInstanceId?: string;
  slotKey?: BikeSlotKey;
  typeKey: GearServiceTypeKey;
  dateIso: string;
  mileageMi?: number;
  intervalMi?: number;
  intervalDays?: number;
  nextDueMileageMi?: number;
  nextDueDateIso?: string;
  materialsNote?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type LegacyServiceTypeKey = 'chain_wax' | 'chain' | 'brake_pads' | 'tires';

export interface LegacyServiceEntry {
  id: string;
  bikeId: string;
  typeKey: LegacyServiceTypeKey;
  dateIso: string;
  mileageMi: number;
  intervalMi: number;
  serviceAtMi: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type ServiceTypeKey = LegacyServiceTypeKey;
export type ServiceEntry = LegacyServiceEntry;

export type ServiceTypeKey = 'chain_wax' | 'chain' | 'brake_pads' | 'tires';

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

export interface ServiceEntry {
  id: string;
  bikeId: string;
  typeKey: ServiceTypeKey;
  dateIso: string;
  mileageMi: number;
  intervalMi: number;
  serviceAtMi: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

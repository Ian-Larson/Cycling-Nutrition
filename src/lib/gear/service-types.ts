import type { ServiceTypeKey } from '@/types/gear';

export interface ServiceTypePreset {
  key: ServiceTypeKey;
  label: string;
  defaultIntervalMi: number;
}

export const SERVICE_TYPES = [
  { key: 'chain_wax',  label: 'Chain wax',  defaultIntervalMi: 250 },
  { key: 'chain',      label: 'Chain',      defaultIntervalMi: 2000 },
  { key: 'brake_pads', label: 'Brake pads', defaultIntervalMi: 1500 },
  { key: 'tires',      label: 'Tires',      defaultIntervalMi: 2500 },
] as const satisfies readonly ServiceTypePreset[];

export function getServiceType(key: ServiceTypeKey): ServiceTypePreset {
  const preset = SERVICE_TYPES.find((t) => t.key === key);
  if (!preset) throw new Error(`Unknown service type: ${key}`);
  return preset;
}

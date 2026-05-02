import type { RideCharacteristics } from './ride';
import type { BottleInventory } from './bottle';
import type { FuelingPrescription } from '@/lib/fueling/types';

export type FuelPlanWarningType =
  | 'concentration_limit'
  | 'insufficient_capacity'
  | 'refuel_suggested';

export interface FuelPlanWarning {
  type: FuelPlanWarningType;
  message: string;
}

export interface BottleAllocation {
  capacityMl: number;
  productId: string;
  mixGrams: number;
  mixScoops?: number;
  carbsTotal: number;
  isWaterOnly?: boolean;
}

export interface SolidAllocation {
  productId: string;
  quantity: number;
  carbsTotal: number;
  timingIntervalMinutes: number;
}

export interface ConsumptionGuideItem {
  timeOffsetMinutes: number;
  action: string;
  carbsConsumed: number;
  cumulativeCarbs: number;
}

export interface FuelPlan {
  id: string;
  createdAt: number;
  title?: string;
  ride: RideCharacteristics;
  bottlePool: BottleInventory;
  selectedDrinkMixId: string | null;
  selectedSolidIds: string[];
  solidOverrides?: Record<string, number>;
  prescription: FuelingPrescription;
}

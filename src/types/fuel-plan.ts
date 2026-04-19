import type { RideCharacteristics } from './ride';

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
  title?: string;
  rideCharacteristics: RideCharacteristics;
  bottles: BottleAllocation[];
  solids: SolidAllocation[];
  consumptionGuide: ConsumptionGuideItem[];
  warnings?: FuelPlanWarning[];
  summary: {
    totalCarbsPlanned: number;
    totalCaloriesPlanned: number;
    totalCarbsNeeded: number;
    hydrationMl: number;
    sodiumMgTotal?: number;
    sodiumMgPerHour?: number;
  };
  createdAt: number;
}

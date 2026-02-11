export type ProductType = 'drink_mix' | 'gel' | 'chews' | 'bar' | 'other';

export interface NutritionInfo {
  carbsGrams: number;
  sodiumMg?: number;
  caffeineMg?: number;
}

export interface ServingInfo {
  servingSizeGrams?: number;
  servingSizeMl?: number;
  scoopSizeGrams?: number;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  type: ProductType;
  nutrition: NutritionInfo;
  serving: ServingInfo;
  createdAt: number;
  updatedAt: number;
}

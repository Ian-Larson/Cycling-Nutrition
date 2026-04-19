import type { BottleInventory, Product } from '@/types';

export const DEFAULT_BOTTLE_COUNTS: BottleInventory = {
  550: 1,
  750: 1,
  950: 0,
};

export const DEFAULT_PRODUCTS: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Maurten 320',
    brand: 'Maurten',
    type: 'drink_mix',
    isAvailable: true,
    nutrition: { carbsGrams: 80, calories: 320 },
    serving: { servingSizeGrams: 80, servingSizeMl: 500, scoopSizeGrams: 40 },
  },
  {
    name: 'SIS Beta Fuel',
    brand: 'Science in Sport',
    type: 'drink_mix',
    isAvailable: true,
    nutrition: { carbsGrams: 80, calories: 320 },
    serving: { servingSizeGrams: 82, servingSizeMl: 500, scoopSizeGrams: 41 },
  },
  {
    name: 'GU Energy Gel',
    brand: 'GU',
    type: 'gel',
    isAvailable: true,
    nutrition: { carbsGrams: 22, calories: 100, caffeineMg: 20 },
    serving: {},
  },
  {
    name: 'Clif Bloks',
    brand: 'Clif',
    type: 'chews',
    isAvailable: true,
    nutrition: { carbsGrams: 24, calories: 100 },
    serving: {},
  },
  {
    name: 'PF 30 Chew',
    brand: 'Precision Fuel & Hydration',
    type: 'chews',
    isAvailable: true,
    nutrition: { carbsGrams: 30, calories: 120 },
    serving: {},
  },
  {
    name: 'Carb & Electrolyte Drink Mix 60',
    brand: 'Precision Fuel & Hydration',
    type: 'drink_mix',
    isAvailable: true,
    nutrition: { carbsGrams: 60, calories: 240 },
    serving: { servingSizeGrams: 60, servingSizeMl: 500, scoopSizeGrams: 30 },
  },
  {
    name: 'Thirst Quencher Powder',
    brand: 'Gatorade',
    type: 'drink_mix',
    isAvailable: true,
    nutrition: { carbsGrams: 36, calories: 140 },
    serving: { servingSizeGrams: 51, servingSizeMl: 591 },
  },
];

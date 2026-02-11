import type { Bottle, Product } from '@/types';

export const DEFAULT_BOTTLES: Omit<Bottle, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: '750ml Standard', capacityMl: 750, isAvailable: true },
  { name: '550ml Small', capacityMl: 550, isAvailable: true },
];

export const DEFAULT_PRODUCTS: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Maurten 320',
    brand: 'Maurten',
    type: 'drink_mix',
    nutrition: { carbsGrams: 80 },
    serving: { servingSizeGrams: 80, servingSizeMl: 500, scoopSizeGrams: 40 },
  },
  {
    name: 'SIS Beta Fuel',
    brand: 'Science in Sport',
    type: 'drink_mix',
    nutrition: { carbsGrams: 80 },
    serving: { servingSizeGrams: 82, servingSizeMl: 500, scoopSizeGrams: 41 },
  },
  {
    name: 'GU Energy Gel',
    brand: 'GU',
    type: 'gel',
    nutrition: { carbsGrams: 22, caffeineMg: 20 },
    serving: {},
  },
  {
    name: 'Clif Bloks',
    brand: 'Clif',
    type: 'chews',
    nutrition: { carbsGrams: 24 },
    serving: {},
  },
];

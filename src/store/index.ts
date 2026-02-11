import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { Bottle, Product, FuelPlan } from '@/types';
import { DEFAULT_BOTTLES, DEFAULT_PRODUCTS } from '@/lib/defaults';

export type TemperatureUnit = 'celsius' | 'fahrenheit';

interface Settings {
  temperatureUnit: TemperatureUnit;
}

interface AppState {
  bottles: Bottle[];
  products: Product[];
  fuelPlans: FuelPlan[];
  settings: Settings;
  _initialized: boolean;

  addBottle: (bottle: Omit<Bottle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBottle: (id: string, updates: Partial<Bottle>) => void;
  deleteBottle: (id: string) => void;

  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  saveFuelPlan: (plan: Omit<FuelPlan, 'id' | 'createdAt'>) => void;
  deleteFuelPlan: (id: string) => void;

  updateSettings: (settings: Partial<Settings>) => void;

  initializeDefaults: () => void;
}

export const useStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      bottles: [],
      products: [],
      fuelPlans: [],
      settings: { temperatureUnit: 'celsius' },
      _initialized: false,

      addBottle: (bottle) =>
        set((state) => {
          state.bottles.push({
            ...bottle,
            id: nanoid(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }),

      updateBottle: (id, updates) =>
        set((state) => {
          const index = state.bottles.findIndex((b) => b.id === id);
          if (index !== -1) {
            state.bottles[index] = {
              ...state.bottles[index],
              ...updates,
              updatedAt: Date.now(),
            };
          }
        }),

      deleteBottle: (id) =>
        set((state) => {
          state.bottles = state.bottles.filter((b) => b.id !== id);
        }),

      addProduct: (product) =>
        set((state) => {
          state.products.push({
            ...product,
            id: nanoid(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }),

      updateProduct: (id, updates) =>
        set((state) => {
          const index = state.products.findIndex((p) => p.id === id);
          if (index !== -1) {
            state.products[index] = {
              ...state.products[index],
              ...updates,
              updatedAt: Date.now(),
            };
          }
        }),

      deleteProduct: (id) =>
        set((state) => {
          state.products = state.products.filter((p) => p.id !== id);
        }),

      saveFuelPlan: (plan) =>
        set((state) => {
          state.fuelPlans.push({
            ...plan,
            id: nanoid(),
            createdAt: Date.now(),
          });
        }),

      deleteFuelPlan: (id) =>
        set((state) => {
          state.fuelPlans = state.fuelPlans.filter((p) => p.id !== id);
        }),

      updateSettings: (updates) =>
        set((state) => {
          Object.assign(state.settings, updates);
        }),

      initializeDefaults: () => {
        const state = get();
        if (state._initialized) return;

        set((draft) => {
          draft._initialized = true;

          if (draft.bottles.length === 0) {
            DEFAULT_BOTTLES.forEach((b) => {
              draft.bottles.push({
                ...b,
                id: nanoid(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            });
          }

          if (draft.products.length === 0) {
            DEFAULT_PRODUCTS.forEach((p) => {
              draft.products.push({
                ...p,
                id: nanoid(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            });
          }
        });
      },
    })),
    {
      name: 'cycling-nutrition-storage',
    }
  )
);

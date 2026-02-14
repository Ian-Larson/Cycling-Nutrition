import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { Bottle, Product, FuelPlan } from '@/types';
import { DEFAULT_BOTTLES, DEFAULT_PRODUCTS } from '@/lib/defaults';

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface AthleteProfile {
  name?: string;
  ftpWatts?: number;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  sweatRateLph?: number;
  heavySweater: boolean;
  gutTrainingTargetGph: number;
}

export interface Settings {
  temperatureUnit: TemperatureUnit;
  athleteProfile: AthleteProfile;
}

type SettingsUpdate = Partial<Omit<Settings, 'athleteProfile'>> & {
  athleteProfile?: Partial<AthleteProfile>;
};

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

  updateSettings: (settings: SettingsUpdate) => void;
  updateAthleteProfile: (updates: Partial<AthleteProfile>) => void;

  initializeDefaults: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  temperatureUnit: 'celsius',
  athleteProfile: {
    heavySweater: false,
    gutTrainingTargetGph: 65,
  },
};

function normalizePositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeAge(value: unknown): number | undefined {
  const parsed = normalizePositiveNumber(value);
  if (parsed === undefined) return undefined;
  const rounded = Math.round(parsed);
  return rounded >= 10 && rounded <= 120 ? rounded : undefined;
}

function normalizeGutTrainingTarget(
  targetValue: unknown,
  legacyGutTrainedValue: unknown
): number {
  const parsedTarget =
    typeof targetValue === 'number' && Number.isFinite(targetValue)
      ? targetValue
      : undefined;

  if (parsedTarget !== undefined) {
    return Math.round(Math.min(Math.max(parsedTarget, 50), 110));
  }

  if (legacyGutTrainedValue === true) {
    return 90;
  }

  return 65;
}

function normalizeSettings(value: unknown): Settings {
  const incoming = value as Partial<Settings> | undefined;
  const incomingProfile = incoming?.athleteProfile as
    | (Partial<AthleteProfile> & { gutTrained?: boolean })
    | undefined;

  return {
    temperatureUnit:
      incoming?.temperatureUnit === 'fahrenheit' ? 'fahrenheit' : 'celsius',
    athleteProfile: {
      name: normalizeOptionalText(incomingProfile?.name),
      ftpWatts: normalizePositiveNumber(incomingProfile?.ftpWatts),
      heightCm: normalizePositiveNumber(incomingProfile?.heightCm),
      weightKg: normalizePositiveNumber(incomingProfile?.weightKg),
      age: normalizeAge(incomingProfile?.age),
      sweatRateLph: normalizePositiveNumber(incomingProfile?.sweatRateLph),
      heavySweater: incomingProfile?.heavySweater ?? false,
      gutTrainingTargetGph: normalizeGutTrainingTarget(
        incomingProfile?.gutTrainingTargetGph,
        incomingProfile?.gutTrained
      ),
    },
  };
}

export const useStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      bottles: [],
      products: [],
      fuelPlans: [],
      settings: {
        ...DEFAULT_SETTINGS,
        athleteProfile: { ...DEFAULT_SETTINGS.athleteProfile },
      },
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
          const { athleteProfile, ...rest } = updates;
          Object.assign(state.settings, rest);

          if (athleteProfile) {
            Object.assign(state.settings.athleteProfile, athleteProfile);
          }
        }),

      updateAthleteProfile: (updates) =>
        set((state) => {
          Object.assign(state.settings.athleteProfile, updates);
        }),

      initializeDefaults: () => {
        const state = get();
        if (state._initialized) return;

        set((draft) => {
          draft._initialized = true;
          draft.settings = normalizeSettings(draft.settings);

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
      merge: (persistedState, currentState) => {
        const incoming = (persistedState as Partial<AppState>) || {};

        return {
          ...currentState,
          ...incoming,
          settings: normalizeSettings(incoming.settings),
        };
      },
    }
  )
);

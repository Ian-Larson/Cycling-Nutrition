import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { Bottle, Product, FuelPlan, RideCharacteristics } from '@/types';
import { DEFAULT_BOTTLES, DEFAULT_PRODUCTS } from '@/lib/defaults';
import {
  normalizeAnthropometricsUnit,
  type AnthropometricsUnit,
} from '@/lib/athlete/anthropometrics';

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface AthleteProfile {
  name?: string;
  ftpWatts?: number;
  heightCm?: number;
  weightKg?: number;
  anthropometricsUnit: AnthropometricsUnit;
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

export interface PlannerDraft {
  ride: RideCharacteristics;
  selectedDrinkMixId?: string | null;
  selectedSolidIds?: string[];
  includeUnavailableBottles?: boolean;
  includeUnavailableProducts?: boolean;
  title?: string;
}

export interface AppReadiness {
  hasAvailableBottle: boolean;
  hasAvailableDrinkMix: boolean;
  availableSolidCount: number;
  kitReady: boolean;
  autoReady: boolean;
  profileCompletionPercent: number;
  missingProfileFields: string[];
}

interface AppState {
  bottles: Bottle[];
  products: Product[];
  fuelPlans: FuelPlan[];
  settings: Settings;
  plannerDraft: PlannerDraft | null;
  _initialized: boolean;

  addBottle: (bottle: Omit<Bottle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBottle: (id: string, updates: Partial<Bottle>) => void;
  deleteBottle: (id: string) => void;

  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  saveFuelPlan: (plan: Omit<FuelPlan, 'id' | 'createdAt'>) => void;
  deleteFuelPlan: (id: string) => void;
  setPlannerDraft: (draft: PlannerDraft | null) => void;
  consumePlannerDraft: () => PlannerDraft | null;

  updateSettings: (settings: SettingsUpdate) => void;
  updateAthleteProfile: (updates: Partial<AthleteProfile>) => void;
  getReadiness: () => AppReadiness;

  initializeDefaults: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  temperatureUnit: 'celsius',
  athleteProfile: {
    anthropometricsUnit: 'metric',
    heavySweater: false,
    gutTrainingTargetGph: 65,
  },
};

function normalizePositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function normalizeNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
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
      anthropometricsUnit: normalizeAnthropometricsUnit(
        incomingProfile?.anthropometricsUnit
      ),
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

export function normalizeProducts(
  value: unknown,
  fallback: Product[]
): Product[] {
  if (!Array.isArray(value)) return fallback;

  return value.map((product) => {
    const incoming = product as Partial<Product> & {
      nutrition?: Partial<Product['nutrition']>;
    };
    const carbsGrams = normalizeNonNegativeNumber(incoming.nutrition?.carbsGrams) ?? 0;

    return {
      ...(incoming as Product),
      isAvailable: incoming.isAvailable ?? true,
      nutrition: {
        ...incoming.nutrition,
        carbsGrams,
        calories:
          normalizeNonNegativeNumber(incoming.nutrition?.calories) ??
          carbsGrams * 4,
        sodiumMg: normalizeNonNegativeNumber(incoming.nutrition?.sodiumMg),
        caffeineMg: normalizeNonNegativeNumber(incoming.nutrition?.caffeineMg),
      },
    };
  });
}

function estimateCaloriesFromCarbs(product: Product | undefined, carbsGrams: number): number {
  if (!Number.isFinite(carbsGrams) || carbsGrams <= 0) return 0;
  if (!product) return Math.round(carbsGrams * 4);

  const servingCarbs = product.nutrition.carbsGrams;
  const servingCalories = product.nutrition.calories;

  if (servingCarbs > 0 && Number.isFinite(servingCalories)) {
    return Math.round((servingCalories / servingCarbs) * carbsGrams);
  }

  return Math.round(carbsGrams * 4);
}

function normalizeFuelPlans(
  value: unknown,
  fallback: FuelPlan[],
  products: Product[]
): FuelPlan[] {
  if (!Array.isArray(value)) return fallback;

  const productMap = new Map(products.map((product) => [product.id, product]));

  return value.map((plan) => {
    const incoming = plan as FuelPlan;
    const refuelMultiplier =
      ((incoming.rideCharacteristics?.refuelStops ?? 0) || 0) + 1;
    const bottleCaloriesPerFill = (incoming.bottles ?? []).reduce((sum, allocation) => {
      if (allocation.isWaterOnly) return sum;
      return (
        sum +
        estimateCaloriesFromCarbs(
          productMap.get(allocation.productId),
          allocation.carbsTotal
        )
      );
    }, 0);
    const totalSolidCalories = (incoming.solids ?? []).reduce((sum, allocation) => {
      return (
        sum +
        estimateCaloriesFromCarbs(
          productMap.get(allocation.productId),
          allocation.carbsTotal
        )
      );
    }, 0);

    return {
      ...incoming,
      summary: {
        ...incoming.summary,
        totalCaloriesPlanned:
          normalizeNonNegativeNumber(incoming.summary?.totalCaloriesPlanned) ??
          bottleCaloriesPerFill * refuelMultiplier + totalSolidCalories,
      },
    };
  });
}

function normalizePlannerDraft(value: unknown): PlannerDraft | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as Partial<PlannerDraft>;
  const ride = draft.ride as Partial<RideCharacteristics> | undefined;

  if (!ride || typeof ride !== 'object') return null;
  if (
    typeof ride.durationMinutes !== 'number' ||
    !Number.isFinite(ride.durationMinutes) ||
    ride.durationMinutes <= 0
  ) {
    return null;
  }
  if (
    typeof ride.carbTargetGramsPerHour !== 'number' ||
    !Number.isFinite(ride.carbTargetGramsPerHour) ||
    ride.carbTargetGramsPerHour < 0
  ) {
    return null;
  }
  if (
    !['recovery', 'endurance', 'tempo', 'threshold', 'race'].includes(
      String(ride.intensity)
    )
  ) {
    return null;
  }
  if (!['cool', 'moderate', 'warm', 'hot'].includes(String(ride.heatFactor))) {
    return null;
  }

  return {
    ...draft,
    ride: ride as RideCharacteristics,
    selectedDrinkMixId:
      typeof draft.selectedDrinkMixId === 'string' || draft.selectedDrinkMixId === null
        ? draft.selectedDrinkMixId
        : null,
    selectedSolidIds: Array.isArray(draft.selectedSolidIds)
      ? draft.selectedSolidIds.filter((id): id is string => typeof id === 'string')
      : [],
    includeUnavailableBottles: Boolean(draft.includeUnavailableBottles),
    includeUnavailableProducts: Boolean(draft.includeUnavailableProducts),
    title: typeof draft.title === 'string' ? draft.title : undefined,
  };
}

export function getReadinessFromState(
  state: Pick<AppState, 'bottles' | 'products' | 'settings'>
): AppReadiness {
  const hasAvailableBottle = state.bottles.some((bottle) => bottle.isAvailable);
  const hasAvailableDrinkMix = state.products.some(
    (product) => product.type === 'drink_mix' && product.isAvailable
  );
  const availableSolidCount = state.products.filter(
    (product) => product.type !== 'drink_mix' && product.isAvailable
  ).length;

  const profile = state.settings.athleteProfile;
  const profileChecks: Array<{ label: string; complete: boolean }> = [
    { label: 'FTP', complete: typeof profile.ftpWatts === 'number' && profile.ftpWatts > 0 },
    { label: 'Weight', complete: typeof profile.weightKg === 'number' && profile.weightKg > 0 },
    { label: 'Age', complete: typeof profile.age === 'number' && profile.age > 0 },
    {
      label: 'Sweat Rate',
      complete: typeof profile.sweatRateLph === 'number' && profile.sweatRateLph > 0,
    },
    {
      label: 'Gut Target',
      complete:
        typeof profile.gutTrainingTargetGph === 'number' &&
        profile.gutTrainingTargetGph >= 50 &&
        profile.gutTrainingTargetGph <= 110,
    },
  ];

  const completedFields = profileChecks.filter((field) => field.complete).length;
  const profileCompletionPercent = Math.round(
    (completedFields / profileChecks.length) * 100
  );

  return {
    hasAvailableBottle,
    hasAvailableDrinkMix,
    availableSolidCount,
    kitReady: hasAvailableBottle && hasAvailableDrinkMix,
    autoReady: profileChecks[0].complete,
    profileCompletionPercent,
    missingProfileFields: profileChecks
      .filter((field) => !field.complete)
      .map((field) => field.label),
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
      plannerDraft: null,
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
            isAvailable: product.isAvailable ?? true,
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

      setPlannerDraft: (draft) =>
        set((state) => {
          state.plannerDraft = draft;
        }),

      consumePlannerDraft: () => {
        const current = get().plannerDraft;
        if (!current) return null;

        set((state) => {
          state.plannerDraft = null;
        });

        return current;
      },

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

      getReadiness: () => getReadinessFromState(get()),

      initializeDefaults: () => {
        const state = get();
        if (state._initialized) return;

        set((draft) => {
          draft._initialized = true;
          draft.settings = normalizeSettings(draft.settings);
          draft.products = normalizeProducts(draft.products, []);
          draft.fuelPlans = normalizeFuelPlans(
            draft.fuelPlans,
            [],
            draft.products
          );

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
        const products = normalizeProducts(incoming.products, currentState.products);

        return {
          ...currentState,
          ...incoming,
          products,
          fuelPlans: normalizeFuelPlans(
            incoming.fuelPlans,
            currentState.fuelPlans,
            products
          ),
          settings: normalizeSettings(incoming.settings),
          plannerDraft: normalizePlannerDraft(incoming.plannerDraft),
        };
      },
    }
  )
);

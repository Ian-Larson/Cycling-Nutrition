import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type {
  Bottle,
  Product,
  FuelPlan,
  RideCharacteristics,
  Bike,
  ServiceEntry,
} from '@/types';
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
  engineVersion: 'v2' | 'v3';
  athleteProfile: AthleteProfile;
}

type SettingsUpdate = Partial<Omit<Settings, 'athleteProfile'>> & {
  athleteProfile?: Partial<AthleteProfile>;
};

export interface PlannerDraft {
  ride: RideCharacteristics;
  selectedBottleIds?: string[];
  selectedDrinkMixId?: string | null;
  selectedSolidIds?: string[];
  includeUnavailableBottles?: boolean;
  includeUnavailableProducts?: boolean;
  title?: string;
}

export interface AppDataSnapshot {
  bottles: Bottle[];
  products: Product[];
  fuelPlans: FuelPlan[];
  settings: Settings;
  plannerDraft: PlannerDraft | null;
  bikes: Bike[];
  serviceEntries: ServiceEntry[];
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

export interface AppState {
  bottles: Bottle[];
  products: Product[];
  fuelPlans: FuelPlan[];
  settings: Settings;
  plannerDraft: PlannerDraft | null;
  bikes: Bike[];
  serviceEntries: ServiceEntry[];
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

  addBike: (
    bike: Omit<
      Bike,
      'id' | 'createdAt' | 'updatedAt' | 'isPrimary' | 'odometerSyncedAtIso'
    >
  ) => void;
  updateBike: (id: string, updates: Partial<Bike>) => void;
  deleteBike: (id: string) => void;
  setPrimaryBike: (id: string) => void;
  upsertBikesFromStrava: (
    incoming: {
      stravaGearId: string;
      name: string;
      odometerMi: number;
      isPrimary: boolean;
    }[]
  ) => void;
  setBikeOdometer: (bikeId: string, odometerMi: number) => void;

  addServiceEntry: (
    entry: Omit<
      ServiceEntry,
      'id' | 'createdAt' | 'updatedAt' | 'serviceAtMi'
    >
  ) => void;
  updateServiceEntry: (id: string, updates: Partial<ServiceEntry>) => void;
  deleteServiceEntry: (id: string) => void;

  updateSettings: (settings: SettingsUpdate) => void;
  updateAthleteProfile: (updates: Partial<AthleteProfile>) => void;
  replaceAppData: (data: Partial<AppDataSnapshot>) => void;
  getReadiness: () => AppReadiness;

  initializeDefaults: () => void;
}

export const DEFAULT_SETTINGS: Settings = {
  temperatureUnit: 'celsius',
  engineVersion: 'v2',
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

export function normalizeSettings(value: unknown): Settings {
  const incoming = value as Partial<Settings> | undefined;
  const incomingProfile = incoming?.athleteProfile as
    | (Partial<AthleteProfile> & { gutTrained?: boolean })
    | undefined;

  return {
    temperatureUnit:
      incoming?.temperatureUnit === 'fahrenheit' ? 'fahrenheit' : 'celsius',
    engineVersion:
      (incoming as Partial<Settings>)?.engineVersion === 'v3' ? 'v3' : 'v2',
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

export function normalizeBottles(
  value: unknown,
  fallback: Bottle[]
): Bottle[] {
  if (!Array.isArray(value)) return fallback;

  const normalized = value.flatMap((bottle) => {
    const incoming = bottle as Partial<Bottle>;
    if (
      typeof incoming.id !== 'string' ||
      typeof incoming.name !== 'string' ||
      typeof incoming.capacityMl !== 'number' ||
      !Number.isFinite(incoming.capacityMl) ||
      incoming.capacityMl <= 0
    ) {
      return [];
    }

    return [
      {
        id: incoming.id,
        name: incoming.name,
        capacityMl: Math.round(incoming.capacityMl),
        isAvailable: incoming.isAvailable ?? true,
        createdAt:
          normalizeNonNegativeNumber(incoming.createdAt) ?? Date.now(),
        updatedAt:
          normalizeNonNegativeNumber(incoming.updatedAt) ?? Date.now(),
      },
    ];
  });

  return normalized.length > 0 ? normalized : fallback;
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

export function normalizeFuelPlans(
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

export function normalizePlannerDraft(value: unknown): PlannerDraft | null {
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
    selectedBottleIds: Array.isArray(draft.selectedBottleIds)
      ? draft.selectedBottleIds.filter((id): id is string => typeof id === 'string')
      : [],
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

export function getAppDataFromState(
  state: Pick<
    AppState,
    | 'bottles'
    | 'products'
    | 'fuelPlans'
    | 'settings'
    | 'plannerDraft'
    | 'bikes'
    | 'serviceEntries'
  >
): AppDataSnapshot {
  return {
    bottles: state.bottles,
    products: state.products,
    fuelPlans: state.fuelPlans,
    settings: state.settings,
    plannerDraft: state.plannerDraft,
    bikes: state.bikes,
    serviceEntries: state.serviceEntries,
  };
}

export function normalizeAppData(
  value: unknown,
  fallback: AppDataSnapshot
): AppDataSnapshot {
  const incoming = value as Partial<AppDataSnapshot> | undefined;
  const bottles = normalizeBottles(incoming?.bottles, fallback.bottles);
  const products = normalizeProducts(incoming?.products, fallback.products);

  return {
    bottles,
    products,
    fuelPlans: normalizeFuelPlans(
      incoming?.fuelPlans,
      fallback.fuelPlans,
      products
    ),
    settings:
      incoming?.settings === undefined
        ? fallback.settings
        : normalizeSettings(incoming.settings),
    plannerDraft:
      incoming?.plannerDraft === undefined
        ? fallback.plannerDraft
        : normalizePlannerDraft(incoming.plannerDraft),
    bikes: Array.isArray(incoming?.bikes) ? incoming.bikes : fallback.bikes,
    serviceEntries: Array.isArray(incoming?.serviceEntries)
      ? incoming.serviceEntries
      : fallback.serviceEntries,
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
      bikes: [],
      serviceEntries: [],
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

      addBike: (bike) =>
        set((state) => {
          const isFirstBike = state.bikes.length === 0;
          state.bikes.push({
            ...bike,
            id: nanoid(),
            isPrimary: isFirstBike,
            odometerSyncedAtIso: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }),

      updateBike: (id, updates) =>
        set((state) => {
          const index = state.bikes.findIndex((b) => b.id === id);
          if (index !== -1) {
            const {
              id: _ignoredId,
              createdAt: _ignoredCreatedAt,
              ...rest
            } = updates;
            void _ignoredId;
            void _ignoredCreatedAt;
            state.bikes[index] = {
              ...state.bikes[index],
              ...rest,
              updatedAt: Date.now(),
            };
          }
        }),

      deleteBike: (id) =>
        set((state) => {
          const deleted = state.bikes.find((b) => b.id === id);
          state.bikes = state.bikes.filter((b) => b.id !== id);
          state.serviceEntries = state.serviceEntries.filter(
            (entry) => entry.bikeId !== id
          );
          if (deleted?.isPrimary && state.bikes.length > 0) {
            state.bikes[0].isPrimary = true;
            state.bikes[0].updatedAt = Date.now();
          }
        }),

      setPrimaryBike: (id) =>
        set((state) => {
          state.bikes.forEach((bike) => {
            const nextPrimary = bike.id === id;
            if (bike.isPrimary !== nextPrimary) {
              bike.isPrimary = nextPrimary;
              bike.updatedAt = Date.now();
            }
          });
        }),

      upsertBikesFromStrava: (incoming) =>
        set((state) => {
          const nowIso = new Date().toISOString();
          const storeHasPrimary = state.bikes.some((b) => b.isPrimary);
          let claimedPrimaryThisOp = false;

          incoming.forEach((candidate) => {
            const existing = state.bikes.find(
              (b) => b.stravaGearId === candidate.stravaGearId
            );
            if (existing) {
              existing.cachedOdometerMi = candidate.odometerMi;
              existing.odometerSyncedAtIso = nowIso;
              existing.updatedAt = Date.now();
              return;
            }

            const canClaimPrimary =
              candidate.isPrimary &&
              !storeHasPrimary &&
              !claimedPrimaryThisOp &&
              state.bikes.length === 0;

            if (canClaimPrimary) {
              claimedPrimaryThisOp = true;
            }

            state.bikes.push({
              id: nanoid(),
              name: candidate.name,
              stravaGearId: candidate.stravaGearId,
              cachedOdometerMi: candidate.odometerMi,
              odometerSyncedAtIso: nowIso,
              isPrimary: canClaimPrimary,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          });
        }),

      setBikeOdometer: (bikeId, odometerMi) =>
        set((state) => {
          const bike = state.bikes.find((b) => b.id === bikeId);
          if (!bike) return;
          bike.cachedOdometerMi = odometerMi;
          bike.odometerSyncedAtIso = new Date().toISOString();
          bike.updatedAt = Date.now();
        }),

      addServiceEntry: (entry) =>
        set((state) => {
          state.serviceEntries.push({
            ...entry,
            id: nanoid(),
            serviceAtMi: entry.mileageMi + entry.intervalMi,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }),

      updateServiceEntry: (id, updates) =>
        set((state) => {
          const index = state.serviceEntries.findIndex((e) => e.id === id);
          if (index === -1) return;
          const {
            id: _ignoredId,
            createdAt: _ignoredCreatedAt,
            ...rest
          } = updates;
          void _ignoredId;
          void _ignoredCreatedAt;
          const merged = {
            ...state.serviceEntries[index],
            ...rest,
            updatedAt: Date.now(),
          };
          if (rest.mileageMi !== undefined || rest.intervalMi !== undefined) {
            merged.serviceAtMi = merged.mileageMi + merged.intervalMi;
          }
          state.serviceEntries[index] = merged;
        }),

      deleteServiceEntry: (id) =>
        set((state) => {
          state.serviceEntries = state.serviceEntries.filter(
            (e) => e.id !== id
          );
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

      replaceAppData: (data) =>
        set((state) => {
          const normalized = normalizeAppData(data, getAppDataFromState(state));
          state.bottles = normalized.bottles;
          state.products = normalized.products;
          state.fuelPlans = normalized.fuelPlans;
          state.settings = normalized.settings;
          state.plannerDraft = normalized.plannerDraft;
          state.bikes = normalized.bikes;
          state.serviceEntries = normalized.serviceEntries;
          state._initialized = true;
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
          bikes: Array.isArray(incoming.bikes) ? incoming.bikes : currentState.bikes,
          serviceEntries: Array.isArray(incoming.serviceEntries)
            ? incoming.serviceEntries
            : currentState.serviceEntries,
        };
      },
    }
  )
);

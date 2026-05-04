import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type {
  BottleInventory,
  BottleSize,
  Product,
  FuelPlan,
  RideCharacteristics,
  Bike,
  ServiceEntry,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearPartInstanceStatus,
  GearServiceEvent,
  BikeSlotKey,
} from '@/types';
import type {
  FtpHistoryEntry,
  WeightHistoryEntry,
} from '@/types/performance';
import {
  BOTTLE_SIZES,
  EMPTY_BOTTLE_INVENTORY,
  cloneBottleInventory,
} from '@/types/bottle';
import { DEFAULT_PRODUCTS } from '@/lib/defaults';
import {
  normalizeAnthropometricsUnit,
  type AnthropometricsUnit,
} from '@/lib/athlete/anthropometrics';
import { isPartCategoryCompatibleWithSlot } from '@/lib/gear/constants';
import {
  normalizeGearInstallRecords,
  normalizeGearPartCatalog,
  normalizeGearPartInstances,
  normalizeGearServiceEvents,
} from '@/lib/gear/normalizers';

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface AthleteProfile {
  name?: string;
  ftpWatts?: number;
  heightCm?: number;
  weightKg?: number;
  anthropometricsUnit: AnthropometricsUnit;
  age?: number;
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
  ride?: RideCharacteristics;
  selectedBottleCounts?: BottleInventory;
  selectedDrinkMixId?: string | null;
  selectedSolidIds?: string[];
  includeUnavailableProducts?: boolean;
  title?: string;
}

export type GarageSectionKey = 'active' | 'service' | 'shelf';

export type GarageSectionsOpen = Record<GarageSectionKey, boolean>;

export const DEFAULT_GARAGE_SECTIONS_OPEN: GarageSectionsOpen = {
  active: true,
  service: true,
  shelf: true,
};

export interface AppDataSnapshot {
  products: Product[];
  fuelPlans: FuelPlan[];
  settings: Settings;
  plannerDraft: PlannerDraft | null;
  bikes: Bike[];
  serviceEntries: ServiceEntry[];
  gearPartCatalog: GearPartCatalogItem[];
  gearPartInstances: GearPartInstance[];
  gearInstallRecords: GearInstallRecord[];
  gearServiceEvents: GearServiceEvent[];
  gearSelectedBikeId: string | null;
  ftpHistory: FtpHistoryEntry[];
  weightHistory: WeightHistoryEntry[];
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
  products: Product[];
  fuelPlans: FuelPlan[];
  settings: Settings;
  plannerDraft: PlannerDraft | null;
  bikes: Bike[];
  serviceEntries: ServiceEntry[];
  gearPartCatalog: GearPartCatalogItem[];
  gearPartInstances: GearPartInstance[];
  gearInstallRecords: GearInstallRecord[];
  gearServiceEvents: GearServiceEvent[];
  gearSelectedBikeId: string | null;
  gearSectionsOpen: GarageSectionsOpen;
  ftpHistory: FtpHistoryEntry[];
  weightHistory: WeightHistoryEntry[];
  _initialized: boolean;

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
  setGearSelectedBikeId: (bikeId: string | null) => void;
  setGearSectionOpen: (section: GarageSectionKey, open: boolean) => void;
  toggleGearSection: (section: GarageSectionKey) => void;

  addServiceEntry: (
    entry: Omit<
      ServiceEntry,
      'id' | 'createdAt' | 'updatedAt' | 'serviceAtMi'
    >
  ) => void;
  updateServiceEntry: (id: string, updates: Partial<ServiceEntry>) => void;
  deleteServiceEntry: (id: string) => void;

  addGearPartCatalogItem: (
    item: Omit<GearPartCatalogItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => string;
  updateGearPartCatalogItem: (
    id: string,
    updates: Partial<GearPartCatalogItem>
  ) => void;
  deleteGearPartCatalogItem: (id: string) => void;
  addGearPartInstances: (input: {
    catalogItemId: string;
    quantity: number;
    labelPrefix?: string;
    acquiredDateIso?: string;
    initialMileageMi?: number;
    notes?: string;
  }) => string[];
  updateGearPartInstance: (
    id: string,
    updates: Partial<GearPartInstance>
  ) => void;
  deleteGearPartInstance: (id: string) => void;
  installGearPart: (input: {
    bikeId: string;
    partInstanceId: string;
    slotKey: BikeSlotKey;
    installedAtMileageMi: number;
    installedDateIso: string;
  }) => string;
  removeGearPart: (input: {
    installRecordId: string;
    removedAtMileageMi: number;
    removedDateIso: string;
    removeReason?: GearInstallRecord['removeReason'];
    nextStatus: Extract<GearPartInstanceStatus, 'removed' | 'retired'>;
  }) => void;
  deleteGearInstallRecord: (installRecordId: string) => void;
  undoGearInstallRemoval: (installRecordId: string) => void;
  retireGearPart: (instanceId: string, retiredDateIso: string) => void;
  logGearServiceEvent: (
    event: Omit<
      GearServiceEvent,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'nextDueMileageMi'
      | 'nextDueDateIso'
    > & {
      nextDueMileageMi?: number;
      nextDueDateIso?: string;
    }
  ) => string;
  updateGearServiceEvent: (
    id: string,
    updates: Partial<GearServiceEvent>
  ) => void;
  deleteGearServiceEvent: (id: string) => void;

  updateSettings: (settings: SettingsUpdate) => void;
  updateAthleteProfile: (updates: Partial<AthleteProfile>) => void;

  addFtpEntry: (entry: Omit<FtpHistoryEntry, 'id'>) => void;
  editFtpEntry: (id: string, updates: Partial<Omit<FtpHistoryEntry, 'id'>>) => void;
  removeFtpEntry: (id: string) => void;

  addWeightEntry: (entry: Omit<WeightHistoryEntry, 'id'>) => void;
  editWeightEntry: (id: string, updates: Partial<Omit<WeightHistoryEntry, 'id'>>) => void;
  removeWeightEntry: (id: string) => void;

  replaceAppData: (data: Partial<AppDataSnapshot>) => void;
  getReadiness: () => AppReadiness;

  initializeDefaults: () => void;
}

export const DEFAULT_SETTINGS: Settings = {
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

function addDaysIso(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function assertPositiveCount(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive integer.');
  }
}

function isActiveGearInstall(record: GearInstallRecord): boolean {
  return (
    record.removedAtMileageMi === undefined &&
    record.removedDateIso === undefined
  );
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
    athleteProfile: {
      name: normalizeOptionalText(incomingProfile?.name),
      ftpWatts: normalizePositiveNumber(incomingProfile?.ftpWatts),
      heightCm: normalizePositiveNumber(incomingProfile?.heightCm),
      weightKg: normalizePositiveNumber(incomingProfile?.weightKg),
      anthropometricsUnit: normalizeAnthropometricsUnit(
        incomingProfile?.anthropometricsUnit
      ),
      age: normalizeAge(incomingProfile?.age),
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

function clampCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(Math.max(Math.round(value), 0), 99);
}

function nearestBottleSize(capacityMl: number): BottleSize {
  let closest: BottleSize = 750;
  let diff = Number.POSITIVE_INFINITY;
  for (const size of BOTTLE_SIZES) {
    const current = Math.abs(size - capacityMl);
    if (current < diff) {
      diff = current;
      closest = size;
    }
  }
  return closest;
}

export function normalizeBottleCounts(value: unknown): BottleInventory {
  const inventory: BottleInventory = cloneBottleInventory(EMPTY_BOTTLE_INVENTORY);

  if (Array.isArray(value)) {
    // Legacy shape: array of Bottle records. Bucket by nearest supported size.
    for (const entry of value) {
      const incoming = entry as { capacityMl?: unknown; isAvailable?: unknown };
      if (
        typeof incoming.capacityMl !== 'number' ||
        !Number.isFinite(incoming.capacityMl) ||
        incoming.capacityMl <= 0
      ) {
        continue;
      }
      if (incoming.isAvailable === false) continue;
      const size = nearestBottleSize(incoming.capacityMl);
      inventory[size] += 1;
    }
    return inventory;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const size of BOTTLE_SIZES) {
      const raw = record[String(size)];
      inventory[size] = clampCount(raw);
    }
    return inventory;
  }

  return inventory;
}

export function normalizeFuelPlans(
  value: unknown,
  fallback: FuelPlan[]
): FuelPlan[] {
  if (!Array.isArray(value)) return fallback;
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as Partial<FuelPlan>;
    if (!candidate.id || !candidate.prescription || !candidate.ride) return [];
    return [candidate as FuelPlan];
  });
}

export function normalizePlannerDraft(value: unknown): PlannerDraft | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as Partial<PlannerDraft>;
  const rawRide = draft.ride as Partial<RideCharacteristics> | undefined;

  let normalizedRide: RideCharacteristics | undefined;
  if (rawRide !== undefined) {
    if (!rawRide || typeof rawRide !== 'object') return null;
    if (
      typeof rawRide.durationMinutes !== 'number' ||
      !Number.isFinite(rawRide.durationMinutes) ||
      rawRide.durationMinutes <= 0
    ) {
      return null;
    }
    if (
      typeof rawRide.carbTargetGramsPerHour !== 'number' ||
      !Number.isFinite(rawRide.carbTargetGramsPerHour) ||
      rawRide.carbTargetGramsPerHour < 0
    ) {
      return null;
    }
    if (
      !['recovery', 'endurance', 'tempo', 'threshold', 'race'].includes(
        String(rawRide.intensity)
      )
    ) {
      return null;
    }
    if (!['cool', 'moderate', 'warm', 'hot'].includes(String(rawRide.heatFactor))) {
      return null;
    }
    normalizedRide = rawRide as RideCharacteristics;
  }

  return {
    ...draft,
    ride: normalizedRide,
    selectedBottleCounts: normalizeBottleCounts(
      (draft as { selectedBottleCounts?: unknown }).selectedBottleCounts
    ),
    selectedDrinkMixId:
      typeof draft.selectedDrinkMixId === 'string' || draft.selectedDrinkMixId === null
        ? draft.selectedDrinkMixId
        : null,
    selectedSolidIds: Array.isArray(draft.selectedSolidIds)
      ? draft.selectedSolidIds.filter((id): id is string => typeof id === 'string')
      : [],
    includeUnavailableProducts: Boolean(draft.includeUnavailableProducts),
    title: typeof draft.title === 'string' ? draft.title : undefined,
  };
}

export function getAppDataFromState(
  state: Pick<
    AppState,
    | 'products'
    | 'fuelPlans'
    | 'settings'
    | 'plannerDraft'
    | 'bikes'
    | 'serviceEntries'
    | 'gearPartCatalog'
    | 'gearPartInstances'
    | 'gearInstallRecords'
    | 'gearServiceEvents'
    | 'gearSelectedBikeId'
    | 'ftpHistory'
    | 'weightHistory'
  >
): AppDataSnapshot {
  return {
    products: state.products,
    fuelPlans: state.fuelPlans,
    settings: state.settings,
    plannerDraft: state.plannerDraft,
    bikes: state.bikes,
    serviceEntries: [],
    gearPartCatalog: state.gearPartCatalog,
    gearPartInstances: state.gearPartInstances,
    gearInstallRecords: state.gearInstallRecords,
    gearServiceEvents: state.gearServiceEvents,
    gearSelectedBikeId: state.gearSelectedBikeId,
    ftpHistory: state.ftpHistory,
    weightHistory: state.weightHistory,
  };
}

export function normalizeAppData(
  value: unknown,
  fallback: AppDataSnapshot
): AppDataSnapshot {
  const incoming = value as Partial<AppDataSnapshot> | undefined;
  const products = normalizeProducts(incoming?.products, fallback.products);

  return {
    products,
    fuelPlans: normalizeFuelPlans(
      incoming?.fuelPlans,
      fallback.fuelPlans
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
    serviceEntries: [],
    gearPartCatalog:
      incoming?.gearPartCatalog === undefined
        ? fallback.gearPartCatalog
        : normalizeGearPartCatalog(incoming.gearPartCatalog),
    gearPartInstances:
      incoming?.gearPartInstances === undefined
        ? fallback.gearPartInstances
        : normalizeGearPartInstances(incoming.gearPartInstances),
    gearInstallRecords:
      incoming?.gearInstallRecords === undefined
        ? fallback.gearInstallRecords
        : normalizeGearInstallRecords(incoming.gearInstallRecords),
    gearServiceEvents:
      incoming?.gearServiceEvents === undefined
        ? fallback.gearServiceEvents
        : normalizeGearServiceEvents(incoming.gearServiceEvents),
    gearSelectedBikeId:
      typeof incoming?.gearSelectedBikeId === 'string'
        ? incoming.gearSelectedBikeId
        : incoming?.gearSelectedBikeId === null
          ? null
          : fallback.gearSelectedBikeId,
    ftpHistory: Array.isArray(incoming?.ftpHistory)
      ? (incoming.ftpHistory as FtpHistoryEntry[])
      : fallback.ftpHistory,
    weightHistory: Array.isArray(incoming?.weightHistory)
      ? (incoming.weightHistory as WeightHistoryEntry[])
      : fallback.weightHistory,
  };
}

export function getReadinessFromState(
  state: Pick<AppState, 'products' | 'settings'>
): AppReadiness {
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
    hasAvailableBottle: false,
    hasAvailableDrinkMix,
    availableSolidCount,
    kitReady: hasAvailableDrinkMix,
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
      products: [],
      fuelPlans: [],
      settings: {
        ...DEFAULT_SETTINGS,
        athleteProfile: { ...DEFAULT_SETTINGS.athleteProfile },
      },
      plannerDraft: null,
      bikes: [],
      serviceEntries: [],
      gearPartCatalog: [],
      gearPartInstances: [],
      gearInstallRecords: [],
      gearServiceEvents: [],
      gearSelectedBikeId: null,
      gearSectionsOpen: { ...DEFAULT_GARAGE_SECTIONS_OPEN },
      ftpHistory: [],
      weightHistory: [],
      _initialized: false,

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

      setGearSelectedBikeId: (bikeId) =>
        set((state) => {
          state.gearSelectedBikeId = bikeId;
        }),

      setGearSectionOpen: (section, open) =>
        set((state) => {
          state.gearSectionsOpen[section] = open;
        }),

      toggleGearSection: (section) =>
        set((state) => {
          state.gearSectionsOpen[section] = !state.gearSectionsOpen[section];
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

      addGearPartCatalogItem: (item) => {
        const id = nanoid();
        const now = Date.now();
        set((state) => {
          state.gearPartCatalog.push({
            ...item,
            id,
            createdAt: now,
            updatedAt: now,
          });
        });
        return id;
      },

      updateGearPartCatalogItem: (id, updates) =>
        set((state) => {
          const index = state.gearPartCatalog.findIndex((item) => item.id === id);
          if (index === -1) return;
          const {
            id: _ignoredId,
            createdAt: _ignoredCreatedAt,
            ...rest
          } = updates;
          void _ignoredId;
          void _ignoredCreatedAt;
          state.gearPartCatalog[index] = {
            ...state.gearPartCatalog[index],
            ...rest,
            id: state.gearPartCatalog[index].id,
            createdAt: state.gearPartCatalog[index].createdAt,
            updatedAt: Date.now(),
          };
        }),

      deleteGearPartCatalogItem: (id) =>
        set((state) => {
          const deletedInstanceIds = new Set(
            state.gearPartInstances
              .filter((instance) => instance.catalogItemId === id)
              .map((instance) => instance.id)
          );

          state.gearPartCatalog = state.gearPartCatalog.filter(
            (item) => item.id !== id
          );
          state.gearPartInstances = state.gearPartInstances.filter(
            (instance) => instance.catalogItemId !== id
          );
          state.gearInstallRecords = state.gearInstallRecords.filter(
            (record) => !deletedInstanceIds.has(record.partInstanceId)
          );
          state.gearServiceEvents = state.gearServiceEvents.filter(
            (event) =>
              !event.partInstanceId ||
              !deletedInstanceIds.has(event.partInstanceId)
          );
        }),

      addGearPartInstances: (input) => {
        assertPositiveCount(input.quantity);
        const catalogItem = get().gearPartCatalog.find(
          (item) => item.id === input.catalogItemId
        );
        if (!catalogItem) {
          throw new Error('Gear part catalog item not found.');
        }

        const now = Date.now();
        const ids = Array.from({ length: input.quantity }, () => nanoid());
        set((state) => {
          ids.forEach((id, index) => {
            state.gearPartInstances.push({
              id,
              catalogItemId: input.catalogItemId,
              label: input.labelPrefix
                ? `${input.labelPrefix} ${index + 1}`
                : undefined,
              status: 'spare',
              acquiredDateIso: input.acquiredDateIso,
              initialMileageMi: input.initialMileageMi,
              notes: input.notes,
              createdAt: now,
              updatedAt: now,
            });
          });
        });
        return ids;
      },

      updateGearPartInstance: (id, updates) =>
        set((state) => {
          const index = state.gearPartInstances.findIndex(
            (instance) => instance.id === id
          );
          if (index === -1) return;
          const {
            id: _ignoredId,
            createdAt: _ignoredCreatedAt,
            ...rest
          } = updates;
          void _ignoredId;
          void _ignoredCreatedAt;
          state.gearPartInstances[index] = {
            ...state.gearPartInstances[index],
            ...rest,
            id: state.gearPartInstances[index].id,
            createdAt: state.gearPartInstances[index].createdAt,
            updatedAt: Date.now(),
          };
        }),

      deleteGearPartInstance: (id) => {
        const { gearPartInstances, gearInstallRecords } = get();
        const instance = gearPartInstances.find((i) => i.id === id);
        if (!instance) return;
        if (instance.status === 'installed') {
          const hasActive = gearInstallRecords.some(
            (r) => r.partInstanceId === id && isActiveGearInstall(r)
          );
          if (hasActive) {
            throw new Error(
              'Cannot delete an installed part. Remove it from the bike first.'
            );
          }
        }
        set((state) => {
          state.gearPartInstances = state.gearPartInstances.filter(
            (i) => i.id !== id
          );
          state.gearInstallRecords = state.gearInstallRecords.filter(
            (r) => r.partInstanceId !== id
          );
        });
      },

      installGearPart: (input) => {
        const state = get();
        const bike = state.bikes.find((candidate) => candidate.id === input.bikeId);
        if (!bike) {
          throw new Error('Bike not found.');
        }

        const instance = state.gearPartInstances.find(
          (candidate) => candidate.id === input.partInstanceId
        );
        if (!instance) {
          throw new Error('Gear part instance not found.');
        }
        if (instance.status === 'retired') {
          throw new Error('Retired gear part instances cannot be installed.');
        }
        const alreadyActive = state.gearInstallRecords.some(
          (record) =>
            record.partInstanceId === instance.id &&
            isActiveGearInstall(record)
        );
        if (alreadyActive) {
          throw new Error(
            'Gear part instance already has an active install record.'
          );
        }

        const catalogItem = state.gearPartCatalog.find(
          (candidate) => candidate.id === instance.catalogItemId
        );
        if (!catalogItem) {
          throw new Error('Gear part catalog item not found.');
        }
        if (
          !isPartCategoryCompatibleWithSlot(catalogItem.category, input.slotKey)
        ) {
          throw new Error(
            `Gear part category ${catalogItem.category} is not compatible with slot ${input.slotKey}.`
          );
        }

        const occupiedSlot = state.gearInstallRecords.some(
          (record) =>
            record.bikeId === input.bikeId &&
            record.slotKey === input.slotKey &&
            isActiveGearInstall(record)
        );
        if (occupiedSlot) {
          throw new Error('Gear slot is already occupied.');
        }

        const id = nanoid();
        const now = Date.now();
        set((draft) => {
          const draftInstance = draft.gearPartInstances.find(
            (candidate) => candidate.id === input.partInstanceId
          );
          if (draftInstance) {
            draftInstance.status = 'installed';
            draftInstance.retiredDateIso = undefined;
            draftInstance.updatedAt = now;
          }

          draft.gearInstallRecords.push({
            id,
            bikeId: input.bikeId,
            partInstanceId: input.partInstanceId,
            slotKey: input.slotKey,
            installedAtMileageMi: input.installedAtMileageMi,
            installedDateIso: input.installedDateIso,
            createdAt: now,
            updatedAt: now,
          });
        });
        return id;
      },

      removeGearPart: (input) => {
        const current = get();
        const record = current.gearInstallRecords.find(
          (candidate) =>
            candidate.id === input.installRecordId &&
            isActiveGearInstall(candidate)
        );
        if (!record) {
          throw new Error('Active gear install record not found.');
        }
        if (input.removedAtMileageMi < record.installedAtMileageMi) {
          throw new Error('Removal mileage cannot be before install mileage.');
        }

        const instance = current.gearPartInstances.find(
          (candidate) => candidate.id === record.partInstanceId
        );
        if (!instance) {
          throw new Error('Gear part instance not found.');
        }

        const now = Date.now();
        set((state) => {
          const draftRecord = state.gearInstallRecords.find(
            (candidate) => candidate.id === input.installRecordId
          );
          const draftInstance = state.gearPartInstances.find(
            (candidate) => candidate.id === record.partInstanceId
          );

          if (draftRecord) {
            draftRecord.removedAtMileageMi = input.removedAtMileageMi;
            draftRecord.removedDateIso = input.removedDateIso;
            draftRecord.removeReason = input.removeReason;
            draftRecord.updatedAt = now;
          }

          if (draftInstance) {
            draftInstance.status = input.nextStatus;
            if (input.nextStatus === 'retired') {
              draftInstance.retiredDateIso = input.removedDateIso;
            } else {
              draftInstance.retiredDateIso = undefined;
            }
            draftInstance.updatedAt = now;
          }
        });
      },

      deleteGearInstallRecord: (installRecordId) => {
        const current = get();
        const record = current.gearInstallRecords.find(
          (candidate) => candidate.id === installRecordId
        );
        if (!record) return;
        const now = Date.now();
        set((state) => {
          state.gearInstallRecords = state.gearInstallRecords.filter(
            (candidate) => candidate.id !== installRecordId
          );
          const hasOtherRecords = state.gearInstallRecords.some(
            (candidate) => candidate.partInstanceId === record.partInstanceId
          );
          if (!hasOtherRecords) {
            const draftInstance = state.gearPartInstances.find(
              (candidate) => candidate.id === record.partInstanceId
            );
            if (draftInstance) {
              draftInstance.status = 'spare';
              draftInstance.retiredDateIso = undefined;
              draftInstance.updatedAt = now;
            }
          }
        });
      },

      undoGearInstallRemoval: (installRecordId) => {
        const current = get();
        const record = current.gearInstallRecords.find(
          (candidate) => candidate.id === installRecordId
        );
        if (!record) return;
        if (isActiveGearInstall(record)) return;

        const conflict = current.gearInstallRecords.some(
          (candidate) =>
            candidate.id !== record.id &&
            candidate.partInstanceId === record.partInstanceId &&
            isActiveGearInstall(candidate)
        );
        if (conflict) {
          throw new Error(
            'Cannot restore this removal — the part already has an active install record.'
          );
        }

        const now = Date.now();
        set((state) => {
          const draftRecord = state.gearInstallRecords.find(
            (candidate) => candidate.id === installRecordId
          );
          if (draftRecord) {
            draftRecord.removedAtMileageMi = undefined;
            draftRecord.removedDateIso = undefined;
            draftRecord.removeReason = undefined;
            draftRecord.updatedAt = now;
          }
          const draftInstance = state.gearPartInstances.find(
            (candidate) => candidate.id === record.partInstanceId
          );
          if (draftInstance) {
            draftInstance.status = 'installed';
            draftInstance.retiredDateIso = undefined;
            draftInstance.updatedAt = now;
          }
        });
      },

      retireGearPart: (instanceId, retiredDateIso) => {
        const current = get();
        const instance = current.gearPartInstances.find(
          (candidate) => candidate.id === instanceId
        );
        if (!instance) {
          throw new Error('Gear part instance not found.');
        }

        const activeRecord = current.gearInstallRecords.find(
          (candidate) =>
            candidate.partInstanceId === instanceId &&
            isActiveGearInstall(candidate)
        );
        const now = Date.now();

        set((state) => {
          const draftInstance = state.gearPartInstances.find(
            (candidate) => candidate.id === instanceId
          );
          if (draftInstance) {
            draftInstance.status = 'retired';
            draftInstance.retiredDateIso = retiredDateIso;
            draftInstance.updatedAt = now;
          }

          if (activeRecord) {
            const draftRecord = state.gearInstallRecords.find(
              (candidate) => candidate.id === activeRecord.id
            );
            if (draftRecord) {
              draftRecord.removedAtMileageMi = activeRecord.installedAtMileageMi;
              draftRecord.removedDateIso = retiredDateIso;
              draftRecord.updatedAt = now;
            }
          }
        });
      },

      logGearServiceEvent: (event) => {
        const id = nanoid();
        const now = Date.now();
        const nextDueMileageMi =
          event.nextDueMileageMi ??
          (typeof event.mileageMi === 'number' &&
          Number.isFinite(event.mileageMi) &&
          typeof event.intervalMi === 'number' &&
          Number.isFinite(event.intervalMi)
            ? event.mileageMi + event.intervalMi
            : undefined);
        const nextDueDateIso =
          event.nextDueDateIso ??
          (typeof event.intervalDays === 'number' &&
          Number.isFinite(event.intervalDays)
            ? addDaysIso(event.dateIso, event.intervalDays)
            : undefined);

        set((state) => {
          state.gearServiceEvents.push({
            ...event,
            id,
            nextDueMileageMi,
            nextDueDateIso,
            createdAt: now,
            updatedAt: now,
          });
        });
        return id;
      },

      updateGearServiceEvent: (id, updates) =>
        set((state) => {
          const index = state.gearServiceEvents.findIndex(
            (event) => event.id === id
          );
          if (index === -1) return;
          const {
            id: _ignoredId,
            createdAt: _ignoredCreatedAt,
            ...rest
          } = updates;
          void _ignoredId;
          void _ignoredCreatedAt;
          state.gearServiceEvents[index] = {
            ...state.gearServiceEvents[index],
            ...rest,
            id: state.gearServiceEvents[index].id,
            createdAt: state.gearServiceEvents[index].createdAt,
            updatedAt: Date.now(),
          };
        }),

      deleteGearServiceEvent: (id) =>
        set((state) => {
          state.gearServiceEvents = state.gearServiceEvents.filter(
            (event) => event.id !== id
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
          const today = new Date().toISOString().slice(0, 10);
          const previous = state.settings.athleteProfile;

          if (
            typeof updates.ftpWatts === 'number' &&
            updates.ftpWatts > 0 &&
            updates.ftpWatts !== previous.ftpWatts
          ) {
            state.ftpHistory.push({
              id: nanoid(),
              recordedAt: today,
              ftpWatts: updates.ftpWatts,
            });
          }

          if (
            typeof updates.weightKg === 'number' &&
            updates.weightKg > 0 &&
            updates.weightKg !== previous.weightKg
          ) {
            state.weightHistory.push({
              id: nanoid(),
              recordedAt: today,
              weightKg: updates.weightKg,
            });
          }

          Object.assign(state.settings.athleteProfile, updates);
        }),

      addFtpEntry: (entry) =>
        set((state) => {
          state.ftpHistory.push({
            ...entry,
            id: nanoid(),
          });
        }),

      editFtpEntry: (id, updates) =>
        set((state) => {
          const index = state.ftpHistory.findIndex((e) => e.id === id);
          if (index !== -1) {
            state.ftpHistory[index] = {
              ...state.ftpHistory[index],
              ...updates,
              id: state.ftpHistory[index].id,
            };
          }
        }),

      removeFtpEntry: (id) =>
        set((state) => {
          state.ftpHistory = state.ftpHistory.filter((e) => e.id !== id);
        }),

      addWeightEntry: (entry) =>
        set((state) => {
          state.weightHistory.push({
            ...entry,
            id: nanoid(),
          });
        }),

      editWeightEntry: (id, updates) =>
        set((state) => {
          const index = state.weightHistory.findIndex((e) => e.id === id);
          if (index !== -1) {
            state.weightHistory[index] = {
              ...state.weightHistory[index],
              ...updates,
              id: state.weightHistory[index].id,
            };
          }
        }),

      removeWeightEntry: (id) =>
        set((state) => {
          state.weightHistory = state.weightHistory.filter((e) => e.id !== id);
        }),

      replaceAppData: (data) =>
        set((state) => {
          const normalized = normalizeAppData(data, getAppDataFromState(state));
          state.products = normalized.products;
          state.fuelPlans = normalized.fuelPlans;
          state.settings = normalized.settings;
          state.plannerDraft = normalized.plannerDraft;
          state.bikes = normalized.bikes;
          state.serviceEntries = [];
          state.gearPartCatalog = normalized.gearPartCatalog;
          state.gearPartInstances = normalized.gearPartInstances;
          state.gearInstallRecords = normalized.gearInstallRecords;
          state.gearServiceEvents = normalized.gearServiceEvents;
          state.gearSelectedBikeId = normalized.gearSelectedBikeId;
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
          draft.fuelPlans = normalizeFuelPlans(draft.fuelPlans, []);
          draft.serviceEntries = [];
          draft.gearPartCatalog = normalizeGearPartCatalog(draft.gearPartCatalog);
          draft.gearPartInstances = normalizeGearPartInstances(
            draft.gearPartInstances
          );
          draft.gearInstallRecords = normalizeGearInstallRecords(
            draft.gearInstallRecords
          );
          draft.gearServiceEvents = normalizeGearServiceEvents(
            draft.gearServiceEvents
          );

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
      version: 2,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState;
        }
        if (version < 2) {
          const source = persistedState as Record<string, unknown>;
          const { bottleCounts: _b, ...rest } = source;
          void _b;
          return { ...rest, fuelPlans: [] };
        }
        return persistedState;
      },
      merge: (persistedState, currentState) => {
        const incoming = (persistedState as Partial<AppState>) || {};
        const products = normalizeProducts(incoming.products, currentState.products);

        return {
          ...currentState,
          ...incoming,
          products,
          fuelPlans: normalizeFuelPlans(
            incoming.fuelPlans,
            currentState.fuelPlans
          ),
          settings: normalizeSettings(incoming.settings),
          plannerDraft: normalizePlannerDraft(incoming.plannerDraft),
          bikes: Array.isArray(incoming.bikes) ? incoming.bikes : currentState.bikes,
          serviceEntries: [],
          gearPartCatalog: normalizeGearPartCatalog(
            incoming.gearPartCatalog ?? currentState.gearPartCatalog
          ),
          gearPartInstances: normalizeGearPartInstances(
            incoming.gearPartInstances ?? currentState.gearPartInstances
          ),
          gearInstallRecords: normalizeGearInstallRecords(
            incoming.gearInstallRecords ?? currentState.gearInstallRecords
          ),
          gearServiceEvents: normalizeGearServiceEvents(
            incoming.gearServiceEvents ?? currentState.gearServiceEvents
          ),
          gearSelectedBikeId:
            typeof incoming.gearSelectedBikeId === 'string'
              ? incoming.gearSelectedBikeId
              : incoming.gearSelectedBikeId === null
                ? null
                : currentState.gearSelectedBikeId,
          gearSectionsOpen: normalizeGearSectionsOpen(
            incoming.gearSectionsOpen
          ),
        };
      },
    }
  )
);

function normalizeGearSectionsOpen(value: unknown): GarageSectionsOpen {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_GARAGE_SECTIONS_OPEN };
  }
  const incoming = value as Partial<Record<GarageSectionKey, unknown>>;
  return {
    active:
      typeof incoming.active === 'boolean'
        ? incoming.active
        : DEFAULT_GARAGE_SECTIONS_OPEN.active,
    service:
      typeof incoming.service === 'boolean'
        ? incoming.service
        : DEFAULT_GARAGE_SECTIONS_OPEN.service,
    shelf:
      typeof incoming.shelf === 'boolean'
        ? incoming.shelf
        : DEFAULT_GARAGE_SECTIONS_OPEN.shelf,
  };
}

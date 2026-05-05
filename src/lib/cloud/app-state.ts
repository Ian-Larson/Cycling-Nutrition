import {
  DEFAULT_ONBOARDING,
  getAppDataFromState,
  normalizeAppData,
  type AppDataSnapshot,
  type AppState,
} from '@/store';

export const APP_STATE_SCHEMA_VERSION = 3;

export interface SerializedAppState {
  schemaVersion: typeof APP_STATE_SCHEMA_VERSION;
  clientUpdatedAt: string;
  data: AppDataSnapshot;
}

export type ParsedSerializedAppState =
  | { ok: true; snapshot: SerializedAppState }
  | { ok: false; error: string };

type SerializeAppStateInput = Pick<
  AppState,
  | 'products'
  | 'fuelPlans'
  | 'settings'
  | 'plannerDraft'
  | 'bikes'
  | 'serviceEntries'
> &
  Partial<
    Pick<
      AppState,
      | 'onboarding'
      | 'gearPartCatalog'
      | 'gearPartInstances'
      | 'gearInstallRecords'
      | 'gearServiceEvents'
      | 'gearSelectedBikeId'
      | 'ftpHistory'
      | 'weightHistory'
    >
  >;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withGearHubStateDefaults(
  state: SerializeAppStateInput
): Pick<
    AppState,
    | 'products'
    | 'fuelPlans'
    | 'settings'
    | 'plannerDraft'
    | 'onboarding'
    | 'bikes'
    | 'serviceEntries'
    | 'gearPartCatalog'
    | 'gearPartInstances'
    | 'gearInstallRecords'
    | 'gearServiceEvents'
    | 'gearSelectedBikeId'
    | 'ftpHistory'
    | 'weightHistory'
  > {
  return {
    ...state,
    onboarding: state.onboarding ?? { ...DEFAULT_ONBOARDING },
    gearPartCatalog: state.gearPartCatalog ?? [],
    gearPartInstances: state.gearPartInstances ?? [],
    gearInstallRecords: state.gearInstallRecords ?? [],
    gearServiceEvents: state.gearServiceEvents ?? [],
    gearSelectedBikeId: state.gearSelectedBikeId ?? null,
    ftpHistory: state.ftpHistory ?? [],
    weightHistory: state.weightHistory ?? [],
  };
}

export function serializeAppState(
  state: SerializeAppStateInput,
  now = new Date()
): SerializedAppState {
  return {
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    clientUpdatedAt: now.toISOString(),
    data: cloneJson(getAppDataFromState(withGearHubStateDefaults(state))),
  };
}

export function parseSerializedAppState(
  value: unknown,
  fallback: AppDataSnapshot
): ParsedSerializedAppState {
  if (!value || typeof value !== 'object') {
    return { ok: false, error: 'Cloud snapshot is not an object.' };
  }

  const incoming = value as Partial<SerializedAppState>;
  if (
    incoming.schemaVersion !== APP_STATE_SCHEMA_VERSION &&
    incoming.schemaVersion !== 2 &&
    incoming.schemaVersion !== 1
  ) {
    return {
      ok: false,
      error: `Unsupported cloud snapshot version: ${String(incoming.schemaVersion)}`,
    };
  }

  if (typeof incoming.clientUpdatedAt !== 'string') {
    return { ok: false, error: 'Cloud snapshot is missing clientUpdatedAt.' };
  }

  if (!incoming.data || typeof incoming.data !== 'object') {
    return { ok: false, error: 'Cloud snapshot is missing app data.' };
  }

  return {
    ok: true,
    snapshot: {
      schemaVersion: APP_STATE_SCHEMA_VERSION,
      clientUpdatedAt: incoming.clientUpdatedAt,
      data: normalizeAppData(incoming.data, fallback),
    },
  };
}

import {
  getAppDataFromState,
  normalizeAppData,
  type AppDataSnapshot,
  type AppState,
} from '@/store';

export const APP_STATE_SCHEMA_VERSION = 1;

export interface SerializedAppState {
  schemaVersion: typeof APP_STATE_SCHEMA_VERSION;
  clientUpdatedAt: string;
  data: AppDataSnapshot;
}

export type ParsedSerializedAppState =
  | { ok: true; snapshot: SerializedAppState }
  | { ok: false; error: string };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function serializeAppState(
  state: Pick<
    AppState,
    'bottles' | 'products' | 'fuelPlans' | 'settings' | 'plannerDraft'
  >,
  now = new Date()
): SerializedAppState {
  return {
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    clientUpdatedAt: now.toISOString(),
    data: cloneJson(getAppDataFromState(state)),
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
  if (incoming.schemaVersion !== APP_STATE_SCHEMA_VERSION) {
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

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  APP_STATE_SCHEMA_VERSION,
  parseSerializedAppState,
  serializeAppState,
  type SerializedAppState,
} from './app-state';
import type { AppDataSnapshot, AppState } from '@/store';

export type CloudSyncStatus =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'conflict'
  | 'error';

export interface CloudUserStateRecord {
  schemaVersion: number;
  appState: unknown;
  clientUpdatedAt: string;
  updatedAt?: string;
}

export interface CloudStateRepository {
  fetchUserState: (userId: string) => Promise<CloudUserStateRecord | null>;
  upsertUserState: (
    userId: string,
    snapshot: SerializedAppState
  ) => Promise<void>;
}

export type InitialCloudSyncResult =
  | { kind: 'uploaded-local'; snapshot: SerializedAppState }
  | { kind: 'applied-cloud'; snapshot: SerializedAppState };

interface InitialCloudSyncOptions {
  userId: string;
  repository: CloudStateRepository;
  getLocalState: () => Pick<
    AppState,
    | 'bottleCounts'
    | 'products'
    | 'fuelPlans'
    | 'settings'
    | 'plannerDraft'
    | 'bikes'
    | 'serviceEntries'
  >;
  replaceAppData: (data: AppDataSnapshot) => void;
  saveBackup?: (snapshot: SerializedAppState) => void;
  now?: () => Date;
}

export class SupabaseCloudStateRepository implements CloudStateRepository {
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async fetchUserState(userId: string): Promise<CloudUserStateRecord | null> {
    const { data, error } = await this.supabase
      .from('user_state')
      .select('schema_version, app_state, client_updated_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) return null;

    return {
      schemaVersion: Number(data.schema_version),
      appState: data.app_state,
      clientUpdatedAt: String(data.client_updated_at),
      updatedAt:
        typeof data.updated_at === 'string' ? data.updated_at : undefined,
    };
  }

  async upsertUserState(
    userId: string,
    snapshot: SerializedAppState
  ): Promise<void> {
    const { error } = await this.supabase.from('user_state').upsert(
      {
        user_id: userId,
        schema_version: snapshot.schemaVersion,
        app_state: snapshot.data,
        client_updated_at: snapshot.clientUpdatedAt,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function initializeUserCloudState({
  userId,
  repository,
  getLocalState,
  replaceAppData,
  saveBackup,
  now = () => new Date(),
}: InitialCloudSyncOptions): Promise<InitialCloudSyncResult> {
  const localSnapshot = serializeAppState(getLocalState(), now());
  const cloudRecord = await repository.fetchUserState(userId);

  if (!cloudRecord) {
    await repository.upsertUserState(userId, localSnapshot);
    return {
      kind: 'uploaded-local',
      snapshot: localSnapshot,
    };
  }

  const parsed = parseSerializedAppState(
    {
      schemaVersion: cloudRecord.schemaVersion,
      clientUpdatedAt: cloudRecord.clientUpdatedAt,
      data: cloudRecord.appState,
    },
    localSnapshot.data
  );

  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  saveBackup?.(localSnapshot);
  replaceAppData(parsed.snapshot.data);

  return {
    kind: 'applied-cloud',
    snapshot: parsed.snapshot,
  };
}

export function createCloudBackupStorageKey(userId: string, now = new Date()): string {
  return `cycling-nutrition-cloud-backup:${userId}:${now.toISOString()}`;
}

export function saveCloudRestoreBackup(
  userId: string,
  snapshot: SerializedAppState,
  storage: Storage | undefined =
    typeof window === 'undefined' ? undefined : window.localStorage
): void {
  if (!storage) return;

  try {
    storage.setItem(
      createCloudBackupStorageKey(userId),
      JSON.stringify(snapshot)
    );
  } catch {
    // Backups are a safety net only. Sync should not fail if storage is full.
  }
}

export function createDebouncedCloudWriter<T>({
  delayMs,
  write,
}: {
  delayMs: number;
  write: (value: T) => void | Promise<void>;
}) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let pendingValue: T | undefined;

  const cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    pendingValue = undefined;
  };

  const flush = async () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }

    if (pendingValue === undefined) return;
    const value = pendingValue;
    pendingValue = undefined;
    await write(value);
  };

  const schedule = (value: T) => {
    pendingValue = value;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      void flush();
    }, delayMs);
  };

  return {
    schedule,
    flush,
    cancel,
  };
}

export function buildSnapshotFromCloudRecord(
  record: CloudUserStateRecord,
  fallback: AppDataSnapshot
): SerializedAppState {
  const parsed = parseSerializedAppState(
    {
      schemaVersion: record.schemaVersion,
      clientUpdatedAt: record.clientUpdatedAt,
      data: record.appState,
    },
    fallback
  );

  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  return parsed.snapshot;
}

export function createEmptyCloudSnapshot(
  fallback: AppDataSnapshot,
  now = new Date()
): SerializedAppState {
  return {
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    clientUpdatedAt: now.toISOString(),
    data: fallback,
  };
}

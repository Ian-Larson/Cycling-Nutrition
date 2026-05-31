import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ONBOARDING,
  DEFAULT_SETTINGS,
  type AppDataSnapshot,
  type AppState,
} from '@/store';
import { serializeAppState, type SerializedAppState } from './app-state';
import {
  createCloudBackupStorageKey,
  createDebouncedCloudWriter,
  initializeUserCloudState,
  saveCloudRestoreBackup,
  type CloudStateRepository,
  type CloudUserStateRecord,
} from './sync';
import { listCloudBackupStorageKeys } from '@/lib/storage/local-storage';

function makeAppData(productCount: number): AppDataSnapshot {
  return {
    products: Array.from({ length: productCount }, (_, i) => ({
      id: `product-${i}`,
      name: `Product ${i}`,
      type: 'gel' as const,
      isAvailable: true,
      nutrition: { carbsGrams: 25, calories: 100 },
      serving: {},
      createdAt: 0,
      updatedAt: 0,
    })),
    fuelPlans: [],
    settings: DEFAULT_SETTINGS,
    plannerDraft: null,
    onboarding: { ...DEFAULT_ONBOARDING },
    bikes: [],
    serviceEntries: [],
    gearPartCatalog: [],
    gearPartInstances: [],
    gearInstallRecords: [],
    gearServiceEvents: [],
    gearSelectedBikeId: null,
    ftpHistory: [],
    weightHistory: [],
  };
}

function makeAppState(data: AppDataSnapshot): Pick<
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
> {
  return data;
}

class FakeRepository implements CloudStateRepository {
  public fetched: CloudUserStateRecord | null = null;
  public upserts: Array<{ userId: string; snapshot: SerializedAppState }> = [];

  async fetchUserState(): Promise<CloudUserStateRecord | null> {
    return this.fetched;
  }

  async upsertUserState(
    userId: string,
    snapshot: SerializedAppState
  ): Promise<void> {
    this.upserts.push({ userId, snapshot });
  }
}

class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.entries.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }
}

describe('cloud sync initialization', () => {
  it('uploads local state when no cloud row exists', async () => {
    const repo = new FakeRepository();
    const localData = makeAppData(1);

    const result = await initializeUserCloudState({
      userId: 'user-1',
      repository: repo,
      getLocalState: () => makeAppState(localData),
      replaceAppData: vi.fn(),
      now: () => new Date('2026-04-16T12:00:00Z'),
    });

    expect(result.kind).toBe('uploaded-local');
    expect(repo.upserts).toHaveLength(1);
    expect(repo.upserts[0].snapshot.data.products).toHaveLength(1);
  });

  it('applies cloud state and saves a local backup when a cloud row exists', async () => {
    const repo = new FakeRepository();
    const localData = makeAppData(1);
    const cloudData = makeAppData(2);
    const cloudSnapshot = serializeAppState(makeAppState(cloudData));
    const replaceAppData = vi.fn();
    const saveBackup = vi.fn();

    repo.fetched = {
      schemaVersion: cloudSnapshot.schemaVersion,
      appState: cloudSnapshot.data,
      clientUpdatedAt: cloudSnapshot.clientUpdatedAt,
    };

    const result = await initializeUserCloudState({
      userId: 'user-1',
      repository: repo,
      getLocalState: () => makeAppState(localData),
      replaceAppData,
      saveBackup,
    });

    expect(result.kind).toBe('applied-cloud');
    expect(replaceAppData).toHaveBeenCalledWith(cloudSnapshot.data);
    expect(saveBackup).toHaveBeenCalledTimes(1);
    expect(repo.upserts).toHaveLength(0);
  });

  it('bounds local restore backups when saving a cloud overwrite backup', () => {
    const storage = new MemoryStorage();
    const oldestBackup = createCloudBackupStorageKey(
      'user-1',
      new Date('2026-05-01T00:00:00.000Z')
    );
    const retainedBackups = [
      createCloudBackupStorageKey('user-1', new Date('2026-05-02T00:00:00.000Z')),
      createCloudBackupStorageKey('user-1', new Date('2026-05-03T00:00:00.000Z')),
    ];
    storage.setItem(oldestBackup, 'oldest');
    for (const key of retainedBackups) {
      storage.setItem(key, key);
    }
    storage.setItem('unrelated-key', 'keep');

    saveCloudRestoreBackup(
      'user-1',
      serializeAppState(makeAppState(makeAppData(1))),
      storage
    );

    expect(storage.getItem(oldestBackup)).toBeNull();
    expect(storage.getItem('unrelated-key')).toBe('keep');
    expect(listCloudBackupStorageKeys(storage, 'user-1')).toHaveLength(3);
  });
});

describe('debounced cloud writer', () => {
  it('keeps only the latest pending write', async () => {
    vi.useFakeTimers();
    const writes: string[] = [];
    const writer = createDebouncedCloudWriter<string>({
      delayMs: 100,
      write: (value) => {
        writes.push(value);
      },
    });

    writer.schedule('first');
    writer.schedule('second');
    await vi.advanceTimersByTimeAsync(99);
    expect(writes).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(writes).toEqual(['second']);
    vi.useRealTimers();
  });
});

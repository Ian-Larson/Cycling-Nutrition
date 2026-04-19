import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type AppDataSnapshot, type AppState } from '@/store';
import { serializeAppState, type SerializedAppState } from './app-state';
import {
  createDebouncedCloudWriter,
  initializeUserCloudState,
  type CloudStateRepository,
  type CloudUserStateRecord,
} from './sync';

function makeAppData(bottleCount: number): AppDataSnapshot {
  return {
    bottleCounts: { 550: 0, 750: bottleCount, 950: 0 },
    products: [],
    fuelPlans: [],
    settings: DEFAULT_SETTINGS,
    plannerDraft: null,
    bikes: [],
    serviceEntries: [],
    gearPartCatalog: [],
    gearPartInstances: [],
    gearInstallRecords: [],
    gearServiceEvents: [],
  };
}

function makeAppState(data: AppDataSnapshot): Pick<
  AppState,
  | 'bottleCounts'
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
    expect(repo.upserts[0].snapshot.data.bottleCounts[750]).toBe(1);
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
    expect(replaceAppData).toHaveBeenCalledWith(cloudData);
    expect(saveBackup).toHaveBeenCalledTimes(1);
    expect(repo.upserts).toHaveLength(0);
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

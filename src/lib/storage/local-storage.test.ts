import { describe, expect, it, vi } from 'vitest';
import {
  createCloudBackupStorageKey,
  createQuotaResilientStorage,
  listCloudBackupStorageKeys,
  pruneCloudRestoreBackups,
} from './local-storage';

class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();
  public failNextSetForKey: string | null = null;
  public failEverySetForKey: string | null = null;

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
    if (this.failEverySetForKey === key) {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    }

    if (this.failNextSetForKey === key) {
      this.failNextSetForKey = null;
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    }

    this.entries.set(key, value);
  }
}

describe('cloud restore backup storage', () => {
  it('lists backup keys newest first', () => {
    const storage = new MemoryStorage();
    const older = createCloudBackupStorageKey(
      'user-1',
      new Date('2026-05-01T00:00:00.000Z')
    );
    const newer = createCloudBackupStorageKey(
      'user-1',
      new Date('2026-05-02T00:00:00.000Z')
    );
    storage.setItem(older, 'older');
    storage.setItem('other-key', 'untouched');
    storage.setItem(newer, 'newer');

    expect(listCloudBackupStorageKeys(storage, 'user-1')).toEqual([
      newer,
      older,
    ]);
  });

  it('prunes stale backups without removing unrelated local data', () => {
    const storage = new MemoryStorage();
    const keys = [
      createCloudBackupStorageKey('user-1', new Date('2026-05-01T00:00:00.000Z')),
      createCloudBackupStorageKey('user-1', new Date('2026-05-02T00:00:00.000Z')),
      createCloudBackupStorageKey('user-1', new Date('2026-05-03T00:00:00.000Z')),
    ];
    for (const key of keys) {
      storage.setItem(key, key);
    }
    storage.setItem('cycling-nutrition-storage', 'app-state');

    expect(pruneCloudRestoreBackups(storage, { userId: 'user-1', keep: 2 })).toBe(
      1
    );

    expect(storage.getItem(keys[0])).toBeNull();
    expect(storage.getItem(keys[1])).toBe(keys[1]);
    expect(storage.getItem(keys[2])).toBe(keys[2]);
    expect(storage.getItem('cycling-nutrition-storage')).toBe('app-state');
  });
});

describe('quota-resilient local storage', () => {
  it('prunes stale cloud backups and retries app-state writes after quota errors', () => {
    const storage = new MemoryStorage();
    const older = createCloudBackupStorageKey(
      'user-1',
      new Date('2026-05-01T00:00:00.000Z')
    );
    const newer = createCloudBackupStorageKey(
      'user-1',
      new Date('2026-05-02T00:00:00.000Z')
    );
    storage.setItem(older, 'older');
    storage.setItem(newer, 'newer');
    storage.setItem('unrelated-key', 'keep me');
    storage.failNextSetForKey = 'cycling-nutrition-storage';

    createQuotaResilientStorage(storage).setItem(
      'cycling-nutrition-storage',
      'next-state'
    );

    expect(storage.getItem('cycling-nutrition-storage')).toBe('next-state');
    expect(storage.getItem('unrelated-key')).toBe('keep me');
    expect(listCloudBackupStorageKeys(storage)).toEqual([newer]);
  });

  it('does not throw into the UI if storage is still full after cleanup', () => {
    const storage = new MemoryStorage();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    storage.failEverySetForKey = 'cycling-nutrition-storage';

    expect(() =>
      createQuotaResilientStorage(storage).setItem(
        'cycling-nutrition-storage',
        'next-state'
      )
    ).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();

    warn.mockRestore();
  });
});

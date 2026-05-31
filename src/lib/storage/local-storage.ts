import type { StateStorage } from 'zustand/middleware';

export const CLOUD_BACKUP_STORAGE_PREFIX = 'cycling-nutrition-cloud-backup:';
export const LOCAL_RESTORE_BACKUP_KEEP_COUNT = 3;
const QUOTA_RECOVERY_BACKUP_KEEP_COUNT = 1;

type KeyedStorage = Pick<Storage, 'key' | 'length' | 'removeItem'>;

function getCloudBackupTimestamp(key: string): number {
  const timestamp = key.slice(-24);
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createCloudBackupStorageKey(
  userId: string,
  now = new Date()
): string {
  return `${CLOUD_BACKUP_STORAGE_PREFIX}${userId}:${now.toISOString()}`;
}

export function listCloudBackupStorageKeys(
  storage: Pick<Storage, 'key' | 'length'>,
  userId?: string
): string[] {
  const prefix =
    userId === undefined
      ? CLOUD_BACKUP_STORAGE_PREFIX
      : `${CLOUD_BACKUP_STORAGE_PREFIX}${userId}:`;
  const keys: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) {
      keys.push(key);
    }
  }

  return keys.sort(
    (a, b) => getCloudBackupTimestamp(b) - getCloudBackupTimestamp(a)
  );
}

export function pruneCloudRestoreBackups(
  storage: KeyedStorage,
  options: { keep?: number; userId?: string } = {}
): number {
  const keep = Math.max(0, options.keep ?? LOCAL_RESTORE_BACKUP_KEEP_COUNT);
  const staleKeys = listCloudBackupStorageKeys(storage, options.userId).slice(keep);

  for (const key of staleKeys) {
    storage.removeItem(key);
  }

  return staleKeys.length;
}

export function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014
    );
  }

  if (error instanceof Error) {
    return /quota|exceed/i.test(`${error.name} ${error.message}`);
  }

  return false;
}

export function createQuotaResilientStorage(storage: Storage): StateStorage {
  return {
    getItem: (name) => storage.getItem(name),
    removeItem: (name) => storage.removeItem(name),
    setItem: (name, value) => {
      try {
        storage.setItem(name, value);
        return;
      } catch (error) {
        if (!isQuotaExceededError(error)) {
          throw error;
        }
      }

      pruneCloudRestoreBackups(storage, {
        keep: QUOTA_RECOVERY_BACKUP_KEEP_COUNT,
      });

      try {
        storage.setItem(name, value);
      } catch (retryError) {
        if (!isQuotaExceededError(retryError)) {
          throw retryError;
        }

        console.warn(
          'Unable to persist app state locally because browser storage is full.',
          retryError
        );
      }
    },
  };
}

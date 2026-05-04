import { Button } from '@/components/ui';
import type { SyncState } from '@/hooks/use-strava-activity-sync';

interface SyncButtonProps {
  state: SyncState;
  imported: number;
  lastSyncedAt: string | null;
  rateLimitedUntil: string | null;
  error: string | null;
  onSync: () => void;
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SyncButton({
  state,
  imported,
  lastSyncedAt,
  rateLimitedUntil,
  error,
  onSync,
}: SyncButtonProps) {
  const isSyncing = state === 'syncing';
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={isSyncing}
        onClick={onSync}
      >
        {isSyncing ? `Syncing ${imported}…` : 'Sync rides'}
      </Button>
      <div className="text-xs text-ink-600">
        {state === 'rate_limited' && rateLimitedUntil && (
          <span>Strava paused us until {formatClock(rateLimitedUntil)}</span>
        )}
        {state === 'error' && error && <span>Sync failed — {error}</span>}
        {state === 'idle' && lastSyncedAt && (
          <span>Last synced {formatRelative(lastSyncedAt)}</span>
        )}
      </div>
    </div>
  );
}

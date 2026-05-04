import { Button, Card, CardContent } from '@/components/ui';
import type { SyncState } from '@/hooks/use-strava-activity-sync';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const BACKFILL_PRESETS = [
  { label: '90 days', days: 90 },
  { label: '6 months', days: 180 },
  { label: '1 year', days: 365 },
  { label: 'All', days: null },
] as const;

type Mode =
  | { kind: 'reauth'; onReconnect: () => void }
  | {
      kind: 'backfill';
      onStart: (options: { since: string }) => void | Promise<void>;
    }
  | {
      kind: 'sync';
      state: SyncState;
      imported: number;
      lastSyncedAt: string | null;
      rateLimitedUntil: string | null;
      error: string | null;
      onSync: () => void;
    };

type DataStatusFooterProps = Mode;

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
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

function computeSince(days: number | null): string {
  if (days === null) return new Date(0).toISOString();
  return new Date(Date.now() - days * MS_PER_DAY).toISOString();
}

export function DataStatusFooter(props: DataStatusFooterProps) {
  return (
    <Card>
      <CardContent className="md:px-5 md:py-4">
        <div className="section-kicker uppercase tracking-wider text-ink-500">
          Data status
        </div>
        <div className="mt-2">
          <FooterBody {...props} />
        </div>
      </CardContent>
    </Card>
  );
}

function FooterBody(props: DataStatusFooterProps) {
  if (props.kind === 'reauth') {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-900">
            Reconnect Strava to import rides
          </p>
          <p className="text-sm text-ink-600">
            Domestique needs activity-read access to pull power data.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={props.onReconnect}>
          Reconnect Strava
        </Button>
      </div>
    );
  }

  if (props.kind === 'backfill') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-ink-700">
          Pick a window to import rides from Strava.
        </p>
        <div className="flex flex-wrap gap-2">
          {BACKFILL_PRESETS.map((p) => (
            <Button
              key={p.label}
              variant="secondary"
              size="sm"
              onClick={() => props.onStart({ since: computeSince(p.days) })}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const { state, imported, lastSyncedAt, rateLimitedUntil, error, onSync } =
    props;
  const isSyncing = state === 'syncing';

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="text-sm text-ink-600">
        {state === 'rate_limited' && rateLimitedUntil ? (
          <span>Strava paused us until {formatClock(rateLimitedUntil)}</span>
        ) : state === 'error' && error ? (
          <span>Sync failed. {error}</span>
        ) : isSyncing ? (
          <span>Importing {imported} rides…</span>
        ) : lastSyncedAt ? (
          <span>Last synced {formatRelative(lastSyncedAt)}</span>
        ) : (
          <span>Up to date</span>
        )}
      </p>
      <Button
        variant="secondary"
        size="sm"
        disabled={isSyncing}
        onClick={onSync}
      >
        {isSyncing ? 'Syncing…' : 'Sync now'}
      </Button>
    </div>
  );
}

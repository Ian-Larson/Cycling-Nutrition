import { clsx } from 'clsx';
import type { Bike } from '@/types/gear';

interface BikePillRowProps {
  bikes: Bike[];
  selectedBikeId: string | null;
  onSelect: (bikeId: string | null) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastSyncedAt: number | null;
  stravaError: string | null;
}

function formatSyncedAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'synced just now';
  if (diffMin < 60) return `synced ${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `synced ${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `synced ${diffDay}d ago`;
}

export function BikePillRow({
  bikes,
  selectedBikeId,
  onSelect,
  onRefresh,
  isRefreshing,
  lastSyncedAt,
  stravaError,
}: BikePillRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        {bikes.length === 0 ? (
          <p className="text-sm text-ink-600">
            No bikes yet. Connect Strava or add one manually.{' '}
            <a
              href="/account#strava"
              className="font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Go to Account
            </a>
          </p>
        ) : (
          <div
            className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1 pb-1"
            role="group"
            aria-label="Select bike"
          >
            <button
              type="button"
              onClick={() => onSelect(null)}
              aria-pressed={selectedBikeId === null}
              className={clsx(
                'shrink-0 whitespace-nowrap rounded-full border border-[color:var(--border-soft)] px-3.5 py-1.5 text-sm font-medium transition-colors',
                selectedBikeId === null
                  ? 'bg-brand-100 text-brand-900'
                  : 'bg-white text-ink-700 hover:bg-shell-50'
              )}
            >
              All bikes
            </button>
            {bikes.map((bike) => {
              const active = bike.id === selectedBikeId;
              return (
                <button
                  key={bike.id}
                  type="button"
                  onClick={() => onSelect(bike.id)}
                  aria-pressed={active}
                  className={clsx(
                    'shrink-0 whitespace-nowrap rounded-full border border-[color:var(--border-soft)] px-3.5 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-brand-100 text-brand-900'
                      : 'bg-white text-ink-700 hover:bg-shell-50'
                  )}
                >
                  {bike.name}
                  {bike.isPrimary ? (
                    <span className="ml-1.5 text-xs text-ink-500">·primary</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh Strava bikes"
          title="Refresh from Strava"
          className={clsx(
            'shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white text-ink-700 transition-colors',
            'hover:bg-shell-50 disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <span
            aria-hidden
            className={clsx('text-base leading-none', isRefreshing && 'animate-spin')}
          >
            ↻
          </span>
        </button>
      </div>
      {stravaError ? (
        <p className="text-xs text-rose-700">{stravaError}</p>
      ) : lastSyncedAt ? (
        <p className="text-xs text-ink-500">{formatSyncedAgo(lastSyncedAt)}</p>
      ) : null}
    </div>
  );
}

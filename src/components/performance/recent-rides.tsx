import { DividedRowList } from '@/components/ui';
import type { Activity } from '@/types/activity';

const MAX_RIDES = 5;

interface RecentRidesProps {
  activities: Activity[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatDistance(meters: number | null): string {
  if (meters === null) return '—';
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatWatts(label: string, watts: number | null): string | null {
  if (watts === null) return null;
  return `${label} ${Math.round(watts)} W`;
}

function formatKj(kj: number | null): string | null {
  if (kj === null) return null;
  return `${Math.round(kj)} kJ`;
}

export function RecentRides({ activities }: RecentRidesProps) {
  const items = activities.slice(0, MAX_RIDES);

  return (
    <section aria-labelledby="recent-rides-title">
      <h2
        id="recent-rides-title"
        className="section-kicker mb-2 uppercase tracking-wider text-ink-500"
      >
        Recent rides
      </h2>
      <DividedRowList
        items={items}
        getKey={(a) => a.stravaId}
        renderItem={(a) => (
          <a
            href={`https://www.strava.com/activities/${a.stravaId}`}
            target="_blank"
            rel="noreferrer noopener"
            className="grid gap-2 px-3 py-3 text-sm tabular-nums transition-colors hover:bg-shell-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-200 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-3 md:px-4"
          >
            <span className="text-xs uppercase tracking-wider text-ink-500">
              {formatDate(a.startedAt)}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink-900">
                {a.name}
              </span>
              <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-600">
                {[
                  formatWatts('NP', a.npWatts),
                  formatWatts('Avg', a.avgWatts),
                  formatKj(a.kj),
                ]
                  .filter((value): value is string => Boolean(value))
                  .map((value) => (
                    <span key={value}>{value}</span>
                  ))}
                {!a.hasPower && (
                  <span className="text-ink-500">No power</span>
                )}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600 sm:justify-end">
              <span>{formatDistance(a.distanceM)}</span>
              <span>{formatDuration(a.durationS)}</span>
            </span>
            <span className="sr-only">Opens in Strava in a new tab.</span>
          </a>
        )}
      />
    </section>
  );
}

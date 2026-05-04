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
            className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-sm tabular-nums transition-colors hover:bg-shell-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-200 md:px-4"
          >
            <span className="text-xs uppercase tracking-wider text-ink-500">
              {formatDate(a.startedAt)}
            </span>
            <span className="truncate text-ink-900">{a.name}</span>
            <span className="flex items-center gap-3 text-xs text-ink-600">
              <span>{formatDistance(a.distanceM)}</span>
              <span className="text-ink-400" aria-hidden>
                ·
              </span>
              <span>{formatDuration(a.durationS)}</span>
            </span>
          </a>
        )}
      />
    </section>
  );
}

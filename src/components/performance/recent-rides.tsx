import type { Activity } from '@/types/activity';

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

export function RecentRides({ activities }: RecentRidesProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink-300 bg-shell-50 p-6 text-center text-sm text-ink-600">
        No rides synced yet.
      </div>
    );
  }
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-ink-500 mb-2">
        Recent rides
      </h2>
      <ul className="divide-y divide-[color:var(--border-soft)]">
        {activities.map((a) => (
          <li
            key={a.stravaId}
            className="flex items-center justify-between py-2.5 text-sm tabular-nums"
          >
            <div className="min-w-0">
              <div className="text-ink-900 truncate">{a.name}</div>
              <div className="text-xs text-ink-500">{formatDate(a.startedAt)}</div>
            </div>
            <div className="text-ink-700 ml-4 flex items-center gap-4">
              <span>{formatDuration(a.durationS)}</span>
              <span>{a.npWatts !== null ? `${a.npWatts} W` : '—'}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

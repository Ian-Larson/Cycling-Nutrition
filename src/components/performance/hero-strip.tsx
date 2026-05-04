import { Link } from 'react-router-dom';

interface HeroStripProps {
  currentWkg: number | undefined;
  delta90d: number | undefined;
  ftpWatts: number | undefined;
  weightKg: number | undefined;
}

export function HeroStrip({
  currentWkg,
  delta90d,
  ftpWatts,
  weightKg,
}: HeroStripProps) {
  if (currentWkg === undefined) {
    return (
      <div className="rounded-md border border-dashed border-ink-300 bg-shell-50 p-6 text-center">
        <p className="text-sm text-ink-700">
          Log your FTP and weight to see your w/kg.
        </p>
        <Link
          to="/account#athlete"
          className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          Go to Account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-6">
      <div>
        <div className="font-display text-6xl font-bold tabular-nums leading-none text-ink-900">
          {currentWkg.toFixed(1)}
        </div>
        <div className="text-xs uppercase tracking-wider text-ink-500 mt-1">
          W/kg at FTP
        </div>
      </div>
      <div className="space-y-1">
        {delta90d !== undefined && (
          <div className="text-sm font-medium text-ink-700">
            {delta90d >= 0
              ? `↑ +${delta90d.toFixed(1)}`
              : `↓ ${Math.abs(delta90d).toFixed(1)}`}{' '}
            <span className="text-ink-500">vs 90d ago</span>
          </div>
        )}
        <div className="text-sm text-ink-600 tabular-nums">
          {ftpWatts ? `${ftpWatts} W` : '—'} · {weightKg ? `${weightKg} kg` : '—'}
        </div>
      </div>
    </div>
  );
}

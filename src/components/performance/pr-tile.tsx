import type { DurationRecord } from '@/lib/performance/records';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatRelativeOrAbsolute(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / MS_PER_DAY);
  if (days < 0) return formatAbsolute(iso);
  if (days === 0) return 'today';
  if (days < 30) return `${days}d ago`;
  return formatAbsolute(iso);
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface PrTileProps {
  label: string;
  record: DurationRecord | null;
}

export function PrTile({ label, record }: PrTileProps) {
  const className = [
    'block w-full text-left',
    'rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)]',
    'shadow-[var(--shadow-soft)]',
    'px-4 py-3 md:px-5 md:py-4',
  ].join(' ');

  if (!record) {
    return (
      <div className={className} aria-label={`${label} — no record yet`}>
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          {label}
        </div>
        <div
          aria-hidden
          className="mt-3 text-3xl font-bold tabular-nums leading-none text-ink-300"
        >
          —
        </div>
        <div className="mt-3 text-xs text-ink-500">No qualifying ride yet</div>
      </div>
    );
  }

  const href = `https://www.strava.com/activities/${record.stravaId}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={[
        className,
        'transition-shadow duration-200 hover:shadow-[0_12px_28px_-20px_rgba(34,43,51,0.28)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
      ].join(' ')}
      title={record.name}
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        {typeof record.wkg === 'number' && (
          <span className="text-[1.75rem] font-bold tabular-nums leading-none tracking-tight text-ink-900">
            {record.wkg.toFixed(2)}
          </span>
        )}
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          w/kg
        </span>
      </div>
      <div className="mt-1 text-sm tabular-nums text-ink-700">
        {record.watts} W
      </div>
      <div className="mt-3 truncate text-xs text-ink-600" title={record.name}>
        {record.name}
      </div>
      <div className="text-[11px] tabular-nums text-ink-500">
        {formatRelativeOrAbsolute(record.startedAt)}
      </div>
      <span className="sr-only">Opens in Strava in a new tab.</span>
    </a>
  );
}

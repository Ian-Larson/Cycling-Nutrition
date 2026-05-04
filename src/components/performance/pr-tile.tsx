import type { DurationRecord } from '@/lib/performance/records';

interface PrTileProps {
  label: string;
  record: DurationRecord | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PrTile({ label, record }: PrTileProps) {
  return (
    <div className="rounded-md border border-ink-200 bg-shell-50 p-4">
      <div className="text-xs uppercase tracking-wider text-ink-500">{label}</div>
      {record ? (
        <>
          {typeof record.wkg === 'number' && (
            <div className="font-display text-3xl font-bold tabular-nums leading-none text-ink-900 mt-2">
              {record.wkg.toFixed(1)}
            </div>
          )}
          <div className="text-sm text-ink-700 tabular-nums mt-1">
            {record.watts} W
          </div>
          <div className="text-xs text-ink-500 truncate mt-2">
            {record.name}
          </div>
          <div className="text-xs text-ink-500">
            {formatDate(record.startedAt)}
          </div>
        </>
      ) : (
        <div className="font-display text-3xl font-bold text-ink-400 mt-2">—</div>
      )}
    </div>
  );
}

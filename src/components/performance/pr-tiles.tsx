import { Alert } from '@/components/ui';
import { PrTile } from './pr-tile';
import type { PrTile as PrTileData } from '@/hooks/use-performance-records';

const LABELS: Record<number, string> = {
  300: '5 min',
  1200: '20 min',
  3600: '1 hour',
};

interface PrTilesProps {
  tiles: PrTileData[];
  isLoading?: boolean;
  error?: string | null;
}

export function PrTiles({ tiles, isLoading = false, error = null }: PrTilesProps) {
  return (
    <section aria-labelledby="pr-section-title">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2
          id="pr-section-title"
          className="section-kicker uppercase tracking-wider text-ink-500"
        >
          Power records
        </h2>
        <span className="text-xs text-ink-500">
          {isLoading ? 'Checking rides' : 'Best in this period'}
        </span>
      </div>
      {error ? (
        <Alert variant="error" title="Power records unavailable">
          {error}
        </Alert>
      ) : isLoading ? (
        <div className="space-y-2">
          <p className="text-sm text-ink-600">Loading power records</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-hidden>
            {tiles.map((t) => (
              <div
                key={t.durationSeconds}
                className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-4 py-3 shadow-[var(--shadow-soft)] md:px-5 md:py-4"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  {LABELS[t.durationSeconds] ?? `${t.durationSeconds}s`}
                </div>
                <div className="mt-3 h-8 w-20 animate-pulse rounded-md bg-shell-200" />
                <div className="mt-3 text-xs text-ink-500">
                  Checking effort
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tiles.map((t) => (
            <PrTile
              key={t.durationSeconds}
              label={LABELS[t.durationSeconds] ?? `${t.durationSeconds}s`}
              record={t.record}
            />
          ))}
        </div>
      )}
    </section>
  );
}

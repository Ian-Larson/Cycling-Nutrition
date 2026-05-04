import { PrTile } from './pr-tile';
import type { PrTile as PrTileData } from '@/hooks/use-performance-records';

const LABELS: Record<number, string> = {
  300: '5 min',
  1200: '20 min',
  3600: '1 hour',
};

interface PrTilesProps {
  tiles: PrTileData[];
}

export function PrTiles({ tiles }: PrTilesProps) {
  return (
    <section aria-labelledby="pr-section-title">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2
          id="pr-section-title"
          className="section-kicker uppercase tracking-wider text-ink-500"
        >
          Power records
        </h2>
        <span className="text-xs text-ink-500">Best in this period</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <PrTile
            key={t.durationSeconds}
            label={LABELS[t.durationSeconds] ?? `${t.durationSeconds}s`}
            record={t.record}
          />
        ))}
      </div>
    </section>
  );
}

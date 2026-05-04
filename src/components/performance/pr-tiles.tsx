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
    <section>
      <h2 className="text-xs uppercase tracking-wider text-ink-500 mb-2">
        Power records
      </h2>
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

import { GearDueRow } from './gear-due-list';
import type { GearDueItem } from '@/lib/gear/derive-gear-due';
import type { Bike } from '@/types/gear';

interface GearDuePreviewBandProps {
  items: GearDueItem[];
  bikes: Bike[];
  onLogService: (item: GearDueItem) => void;
  onViewAll: () => void;
  selectedBikeId: string | null;
}

export function GearDuePreviewBand({
  items,
  bikes,
  onLogService,
  onViewAll,
  selectedBikeId,
}: GearDuePreviewBandProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm leading-5 text-ink-500">Nothing due.</p>
    );
  }

  const top = items.slice(0, 2);

  return (
    <section aria-label="Due now" className="surface-note space-y-2 p-3 md:p-4">
      <header className="flex items-center justify-between">
        <p className="section-kicker text-[0.68rem] text-ink-700">
          Due now · {items.length}
        </p>
        {items.length > 2 ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            View all {items.length}
          </button>
        ) : null}
      </header>
      <ul className="space-y-2">
        {top.map((item) => (
          <li key={item.id}>
            <GearDueRow
              item={item}
              bikes={bikes}
              showBikeName={selectedBikeId === null}
              onLogService={onLogService}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

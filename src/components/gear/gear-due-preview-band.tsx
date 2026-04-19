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
  const attention = items.filter(
    (item) => item.urgency === 'overdue' || item.urgency === 'soon'
  );
  if (attention.length === 0) {
    return (
      <p className="text-sm leading-5 text-ink-500">Nothing due soon.</p>
    );
  }

  const overdueCount = attention.filter((i) => i.urgency === 'overdue').length;
  const soonCount = attention.length - overdueCount;
  const top = attention.slice(0, 2);

  return (
    <section
      aria-label="Service attention"
      className="surface-note space-y-2 p-3 md:p-4"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.68rem]">
          {overdueCount > 0 ? (
            <span className="section-kicker text-rose-700">
              Overdue · {overdueCount}
            </span>
          ) : null}
          {overdueCount > 0 && soonCount > 0 ? (
            <span aria-hidden className="text-ink-400">·</span>
          ) : null}
          {soonCount > 0 ? (
            <span className="section-kicker text-amber-700">
              Due soon · {soonCount}
            </span>
          ) : null}
        </div>
        {attention.length > 2 ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            View all {attention.length}
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

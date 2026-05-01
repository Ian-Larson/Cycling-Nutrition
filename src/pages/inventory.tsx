import { useStore } from '@/store';
import { PageIntro } from '@/components/layout/page-intro';
import { SectionNav } from '@/components/layout/section-nav';
import { BOTTLE_SIZES } from '@/types/bottle';
import type { BottleSize } from '@/types/bottle';

function BottleCounter({
  size,
  count,
  onIncrement,
  onDecrement,
}: {
  size: BottleSize;
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-white px-3 py-3">
      <p className="font-semibold text-ink-900">{size}ml</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={count <= 0}
          onClick={onDecrement}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-shell-50 text-lg font-medium text-ink-700 transition-colors hover:bg-shell-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Remove one ${size}ml bottle`}
        >
          −
        </button>
        <span className="w-6 text-center text-xl font-semibold tabular-nums text-ink-900">
          {count}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-shell-50 text-lg font-medium text-ink-700 transition-colors hover:bg-shell-100"
          aria-label={`Add one ${size}ml bottle`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function InventoryPage() {
  const bottleCounts = useStore((s) => s.bottleCounts);
  const incrementBottleCount = useStore((s) => s.incrementBottleCount);

  return (
    <div className="page-shell space-y-4 md:space-y-6">
      <PageIntro
        title="Bottles"
        description={
          <>
            Set how many of each bottle size you own. The planner pulls from
            this when you build a ride.
          </>
        }
      />

      <SectionNav section="nutrition" />

      <section className="space-y-3 md:space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {BOTTLE_SIZES.map((size: BottleSize) => (
            <BottleCounter
              key={size}
              size={size}
              count={bottleCounts[size]}
              onIncrement={() => incrementBottleCount(size, 1)}
              onDecrement={() => incrementBottleCount(size, -1)}
            />
          ))}
        </div>

        <p className="text-xs leading-5 text-ink-500">
          Manage fuel directly in the Fuel inventory panel on the Fuel plan
          page.
        </p>
      </section>
    </div>
  );
}

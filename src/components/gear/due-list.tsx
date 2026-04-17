import { getServiceType } from '@/lib/gear/service-types';
import type { Bike, ServiceTypeKey } from '@/types/gear';
import type { DueItem } from '@/lib/gear/derive-due';
import { Card, CardContent } from '@/components/ui';
import { clsx } from 'clsx';

interface DueListProps {
  items: DueItem[];
  bikes: Bike[];
  onLog?: (bikeId: string, typeKey: ServiceTypeKey) => void;
}

function formatMi(n: number): string {
  return `${Math.round(n).toLocaleString()} mi`;
}

export function DueList({ items, bikes, onLog }: DueListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-ink-600">
            Nothing due yet — log a service to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  const bikeName = (id: string) =>
    bikes.find((b) => b.id === id)?.name ?? 'Unknown bike';

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const preset = getServiceType(item.typeKey);
        const colorClass =
          item.urgency === 'overdue'
            ? 'text-rose-700'
            : item.urgency === 'soon'
              ? 'text-amber-700'
              : 'text-ink-700';

        const headline =
          item.urgency === 'overdue'
            ? `${formatMi(Math.abs(item.remainingMi))} overdue`
            : `${formatMi(item.remainingMi)} remaining`;

        return (
          <Card key={`${item.bikeId}-${item.typeKey}`}>
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {preset.label} · {bikeName(item.bikeId)}
                  </p>
                  <p className={clsx('text-xs', colorClass)}>
                    {headline}
                    <span className="text-ink-500">
                      {' · '}
                      {item.lastEntry.intervalMi} mi interval
                    </span>
                  </p>
                </div>
                {onLog ? (
                  <button
                    type="button"
                    onClick={() => onLog(item.bikeId, item.typeKey)}
                    className="shrink-0 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-xs font-medium text-ink-900 transition-colors hover:bg-shell-50"
                  >
                    Mark done ▸
                  </button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

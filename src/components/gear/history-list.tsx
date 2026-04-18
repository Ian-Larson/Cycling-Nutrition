import { SERVICE_TYPES, getServiceType } from '@/lib/gear/service-types';
import type { Bike, ServiceEntry } from '@/types/gear';
import { Card, CardContent } from '@/components/ui';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';

interface HistoryListProps {
  entries: ServiceEntry[];
  bikes: Bike[];
}

function formatDate(dateIso: string): string {
  const d = new Date(dateIso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatMi(n: number): string {
  return Math.round(n).toLocaleString();
}

export function HistoryList({ entries, bikes }: HistoryListProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-5 md:py-6">
          <p className="text-sm leading-5 text-ink-600">No service history yet.</p>
        </CardContent>
      </Card>
    );
  }

  const bikeName = (id: string) =>
    bikes.find((b) => b.id === id)?.name ?? 'Unknown bike';

  return (
    <div className="flex flex-col gap-3">
      {SERVICE_TYPES.map((preset) => {
        const group = entries
          .filter((e) => e.typeKey === preset.key)
          .slice()
          .sort((a, b) => b.dateIso.localeCompare(a.dateIso));

        if (group.length === 0) return null;

        const { label } = getServiceType(preset.key);

        return (
          <Card key={preset.key}>
            <Collapsible>
              <CollapsibleTrigger className="px-4 py-3 text-sm font-semibold text-ink-900 md:px-5 md:py-3.5">
                <span>
                  {label} ({group.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-1.5 border-t border-[color:var(--border-soft)] px-4 py-3 md:px-5">
                {group.map((entry) => (
                  <p key={entry.id} className="text-sm leading-5 text-ink-700">
                    {formatDate(entry.dateIso)}
                    <span className="text-ink-500">{' · '}</span>
                    {formatMi(entry.mileageMi)} mi → {formatMi(entry.serviceAtMi)}
                    <span className="text-ink-500">{' · '}</span>
                    {bikeName(entry.bikeId)}
                  </p>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}

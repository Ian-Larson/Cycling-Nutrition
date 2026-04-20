import { clsx } from 'clsx';
import { DividedRowList } from '@/components/ui';
import { OverflowMenu } from './overflow-menu';
import type { ActiveSetupRow, GearUrgency } from '@/lib/gear/derive-active-setup';
import type { BikeSlotKey } from '@/types/gear';

interface ActiveSetupListProps {
  rows: ActiveSetupRow[];
  onInstall: (slotKey: BikeSlotKey) => void;
  onRemove: (row: ActiveSetupRow) => void;
  onService: (row: ActiveSetupRow) => void;
}

function urgencyLabel(urgency: GearUrgency): string {
  if (urgency === 'overdue') return 'Overdue';
  if (urgency === 'soon') return 'Due soon';
  if (urgency === 'ok') return 'On track';
  return 'No schedule';
}

function urgencyClass(urgency: GearUrgency): string {
  if (urgency === 'overdue') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (urgency === 'soon') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (urgency === 'ok') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return 'border-[color:var(--border-soft)] bg-shell-50 text-ink-600';
}

function formatMilesShort(miles: number | null): string | null {
  if (miles === null || !Number.isFinite(miles)) return null;
  const rounded = Math.max(0, Math.round(miles));
  return `${rounded.toLocaleString()} mi`;
}

function formatRelativeDate(dateIso: string, now: Date = new Date()): string {
  const target = new Date(`${dateIso}T00:00:00`);
  if (!Number.isFinite(target.getTime())) return dateIso;
  const diffMs = now.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.round(diffDays / 30.44);
  if (diffMonths < 12) return `${diffMonths} mo ago`;
  const diffYears = Math.round(diffMonths / 12);
  return `${diffYears}y ago`;
}

function partIdentifier(row: ActiveSetupRow): string {
  if (row.instance?.label) return row.instance.label;
  const brandModel = [row.catalogItem?.brand, row.catalogItem?.model]
    .filter((piece): piece is string => Boolean(piece))
    .join(' ');
  return brandModel || 'Installed part';
}

function formatPartSummary(row: ActiveSetupRow): string {
  const pieces: string[] = [partIdentifier(row)];
  const miles = formatMilesShort(row.milesSinceInstall);
  if (miles !== null) pieces.push(miles);
  if (row.latestService) {
    pieces.push(`serviced ${formatRelativeDate(row.latestService.dateIso)}`);
  } else {
    pieces.push('no service logged');
  }
  return pieces.join(' · ');
}

function UrgencyPill({ urgency }: { urgency: GearUrgency }) {
  return (
    <span
      className={clsx(
        'shrink-0 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide',
        urgencyClass(urgency)
      )}
    >
      {urgencyLabel(urgency)}
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-3 w-3">
      <path
        d="M7.5 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ActiveSetupList({
  rows,
  onInstall,
  onRemove,
  onService,
}: ActiveSetupListProps) {
  return (
    <DividedRowList
      items={rows}
      getKey={(row) => row.slotKey}
      renderItem={(row) =>
        row.installRecord ? (
          <div className="flex items-start justify-between gap-2 px-3 py-2 md:px-4 md:py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold leading-6 text-ink-900">
                  {row.slotLabel}
                </span>
                <UrgencyPill urgency={row.urgency} />
              </div>
              <p className="mt-0.5 truncate text-xs leading-5 text-ink-600">
                {formatPartSummary(row)}
              </p>
            </div>
            <div className="-mr-1 shrink-0 pt-0.5">
              <OverflowMenu
                label={`${row.slotLabel} actions`}
                items={[
                  { label: 'Log service', onSelect: () => onService(row) },
                  { label: 'Remove', onSelect: () => onRemove(row), tone: 'danger' },
                ]}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onInstall(row.slotKey)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-shell-50 focus:outline-none focus-visible:bg-shell-50 md:px-4 md:py-2.5"
          >
            <span className="truncate text-sm font-medium leading-6 text-ink-500">
              {row.slotLabel}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-brand-700 transition-colors">
              Install
              <ChevronIcon />
            </span>
          </button>
        )
      }
    />
  );
}

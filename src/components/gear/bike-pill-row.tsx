import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { Chip } from '@/components/ui';
import type { GearUrgency } from '@/lib/gear/derive-active-setup';
import type { Bike } from '@/types/gear';

interface BikePillRowProps {
  bikes: Bike[];
  selectedBikeId: string | null;
  onSelect: (bikeId: string | null) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastSyncedAt: number | null;
  stravaError: string | null;
  /** Worst urgency per bike id; null for clean. */
  perBikeUrgency: Record<string, GearUrgency | null>;
  /** Worst urgency across the whole garage; powers the All-bikes pill dot. */
  worstAcrossGarage: GearUrgency | null;
}

function formatSyncedAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'synced just now';
  if (diffMin < 60) return `synced ${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `synced ${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `synced ${diffDay}d ago`;
}

function urgencyDotClass(urgency: GearUrgency | null): string | null {
  if (urgency === 'overdue') return 'bg-error-500';
  if (urgency === 'soon') return 'bg-warning-500';
  return null;
}

function urgencyAriaSuffix(urgency: GearUrgency | null): string {
  if (urgency === 'overdue') return ', service overdue';
  if (urgency === 'soon') return ', service due soon';
  return '';
}

interface PillStatusDotProps {
  urgency: GearUrgency | null;
}

function PillStatusDot({ urgency }: PillStatusDotProps) {
  const dotClass = urgencyDotClass(urgency);
  if (dotClass === null) return null;
  return (
    <span
      aria-hidden
      className={clsx(
        'ml-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ring-2 ring-shell-100',
        dotClass
      )}
    />
  );
}

export function BikePillRow({
  bikes,
  selectedBikeId,
  onSelect,
  onRefresh,
  isRefreshing,
  lastSyncedAt,
  stravaError,
  perBikeUrgency,
  worstAcrossGarage,
}: BikePillRowProps) {
  const syncLabel = stravaError
    ? stravaError
    : lastSyncedAt
      ? formatSyncedAgo(lastSyncedAt)
      : 'Not synced yet';

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="section-kicker text-[0.68rem]">Bike</p>
          <p
            className={clsx(
              'text-sm leading-5',
              stravaError ? 'text-error-700' : 'text-ink-600'
            )}
          >
            {syncLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh Strava bikes"
          title="Refresh from Strava"
          className={clsx(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border-soft)] bg-white text-ink-700 transition-colors',
            'hover:bg-shell-50 disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <span
            aria-hidden
            className={clsx('text-base leading-none', isRefreshing && 'animate-spin')}
          >
            ↻
          </span>
        </button>
      </div>

      {bikes.length === 0 ? (
        <p className="text-sm leading-5 text-ink-600">
          No bikes yet. Connect Strava or add one manually.{' '}
          <Link
            to="/account#strava"
            className="font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            Account
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select bike">
          <Chip
            selected={selectedBikeId === null}
            onClick={() => onSelect(null)}
            aria-label={`All bikes${urgencyAriaSuffix(worstAcrossGarage)}`}
          >
            <span>All bikes</span>
            <PillStatusDot urgency={worstAcrossGarage} />
          </Chip>
          {bikes.map((bike) => {
            const urgency = perBikeUrgency[bike.id] ?? null;
            return (
              <Chip
                key={bike.id}
                selected={bike.id === selectedBikeId}
                onClick={() => onSelect(bike.id)}
                title={bike.name}
                aria-label={`${bike.name}${
                  bike.isPrimary ? ', primary' : ''
                }${urgencyAriaSuffix(urgency)}`}
              >
                <span className="inline-block max-w-[13rem] truncate align-bottom">
                  {bike.name}
                </span>
                {bike.isPrimary ? (
                  <span aria-hidden className="ml-1.5 text-xs text-ink-500">
                    ·primary
                  </span>
                ) : null}
                <PillStatusDot urgency={urgency} />
              </Chip>
            );
          })}
        </div>
      )}
    </div>
  );
}

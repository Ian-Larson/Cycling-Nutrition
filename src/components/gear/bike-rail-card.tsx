import { clsx } from 'clsx';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, CardContent, SpecRow } from '@/components/ui';
import { EditBikeWeightDialog } from './edit-bike-weight-dialog';
import { EditBikeNameDialog } from './edit-bike-name-dialog';
import { BikeSwitcher } from './bike-switcher';
import {
  formatCassetteRange,
  formatChainringTeeth,
  formatGearRatioRange,
  formatMileage,
  formatWeightKg,
  getCassetteCogRange,
  getInstalledChainring,
} from '@/lib/gear/bike-system';
import type {
  Bike,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
} from '@/types/gear';
import type { GearUrgency } from '@/lib/gear/derive-active-setup';

interface BikeRailCardProps {
  bikes: Bike[];
  selectedBike: Bike | null;
  selectedBikeId: string | null;
  perBikeUrgency: Record<string, GearUrgency | null>;
  worstAcrossGarage: GearUrgency | null;
  installRecords: GearInstallRecord[];
  instances: GearPartInstance[];
  catalog: GearPartCatalogItem[];
  onSelectBike: (bikeId: string | null) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastSyncedAt: number | null;
  stravaError: string | null;
}

function urgencyDotClass(urgency: GearUrgency | null): string | null {
  if (urgency === 'overdue') return 'bg-error-500';
  if (urgency === 'soon') return 'bg-warning-500';
  return null;
}

function formatSyncedAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'Synced just now';
  if (diffMin < 60) return `Synced ${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `Synced ${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `Synced ${diffDay}d ago`;
}

interface AllBikesSummaryProps {
  bikes: Bike[];
  perBikeUrgency: Record<string, GearUrgency | null>;
  onSelectBike: (bikeId: string) => void;
}

function AllBikesSummary({ bikes, perBikeUrgency, onSelectBike }: AllBikesSummaryProps) {
  if (bikes.length === 0) {
    return (
      <p className="text-sm leading-5 text-ink-600">
        No bikes yet. Connect Strava or add one manually.{' '}
        <Link
          to="/account#strava"
          className="font-medium text-brand-700 underline-offset-2 hover:underline"
        >
          Account
        </Link>
      </p>
    );
  }

  return (
    <ul className="-mx-1 divide-y divide-[color:var(--border-soft)]">
      {bikes.map((bike) => {
        const urgency = perBikeUrgency[bike.id] ?? null;
        const dot = urgencyDotClass(urgency);
        const odometer = formatMileage(bike.cachedOdometerMi);
        return (
          <li key={bike.id}>
            <button
              type="button"
              onClick={() => onSelectBike(bike.id)}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-shell-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink-900">
                  {bike.name}
                  {bike.isPrimary ? (
                    <span className="ml-1.5 text-xs font-normal text-ink-500">
                      ·primary
                    </span>
                  ) : null}
                </span>
              </span>
              {dot ? (
                <span
                  aria-hidden
                  className={clsx('h-2 w-2 shrink-0 rounded-full', dot)}
                />
              ) : null}
              <span className="shrink-0 text-xs text-ink-500 tabular-nums">
                {odometer ?? '— mi'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function BikeRailCard({
  bikes,
  selectedBike,
  selectedBikeId,
  perBikeUrgency,
  worstAcrossGarage,
  installRecords,
  instances,
  catalog,
  onSelectBike,
  onRefresh,
  isRefreshing,
  lastSyncedAt,
  stravaError,
}: BikeRailCardProps) {
  const [weightOpen, setWeightOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);

  const inputs = useMemo(
    () => (selectedBike ? { bike: selectedBike, installRecords, instances, catalog } : null),
    [selectedBike, installRecords, instances, catalog]
  );
  const chainring = useMemo(
    () => (inputs ? getInstalledChainring(inputs) : null),
    [inputs]
  );
  const cassetteCogs = useMemo(
    () => (inputs ? getCassetteCogRange(inputs) : null),
    [inputs]
  );

  const odometer = selectedBike ? formatMileage(selectedBike.cachedOdometerMi) : null;
  const weight = selectedBike ? formatWeightKg(selectedBike.totalWeightGrams) : null;
  const ratio = formatGearRatioRange(chainring, cassetteCogs);
  const cassette = formatCassetteRange(cassetteCogs);
  const crankset = formatChainringTeeth(chainring);

  const selectedBikeUrgency = selectedBike
    ? perBikeUrgency[selectedBike.id] ?? null
    : null;

  const syncLabel = stravaError
    ? stravaError
    : lastSyncedAt
      ? formatSyncedAgo(lastSyncedAt)
      : 'Not synced yet';

  return (
    <>
      <Card className="overflow-visible">
        <CardContent className="space-y-3 px-4 py-3.5 md:px-5 md:py-4">
          <div className="flex items-start justify-between gap-2">
            <BikeSwitcher
              bikes={bikes}
              selectedBikeId={selectedBikeId}
              selectedBikeName={selectedBike?.name ?? ''}
              selectedBikeUrgency={selectedBikeUrgency}
              perBikeUrgency={perBikeUrgency}
              worstAcrossGarage={worstAcrossGarage}
              syncLabel={syncLabel}
              syncIsError={Boolean(stravaError)}
              onSelect={onSelectBike}
              onRename={() => setNameOpen(true)}
            />
            <div className="flex shrink-0 items-center gap-2">
              {selectedBike?.isPrimary ? (
                <Badge
                  variant="brand"
                  size="sm"
                  className="font-semibold uppercase tracking-wide"
                >
                  Default
                </Badge>
              ) : null}
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label="Refresh from Strava"
                title="Refresh from Strava"
                className={clsx(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-500 transition-colors',
                  'hover:bg-shell-50 hover:text-ink-700',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                <span
                  aria-hidden
                  className={clsx('text-sm leading-none', isRefreshing && 'animate-spin')}
                >
                  ↻
                </span>
              </button>
            </div>
          </div>

          {selectedBike ? (
            <div className="space-y-1.5 pt-0.5">
              <SpecRow
                label="Odometer"
                value={odometer ?? '—'}
                muted={odometer === null}
              />
              <SpecRow
                label="Weight"
                value={weight ?? 'Set'}
                muted={weight === null}
                onEdit={() => setWeightOpen(true)}
                editAriaLabel="Edit bike weight"
              />
              <SpecRow
                label="Gear range"
                value={ratio ?? '—'}
                muted={ratio === null}
              />
              <SpecRow
                label="Crankset"
                value={crankset ?? '—'}
                muted={crankset === null}
              />
              <SpecRow
                label="Cassette"
                value={cassette ?? '—'}
                muted={cassette === null}
              />
            </div>
          ) : (
            <AllBikesSummary
              bikes={bikes}
              perBikeUrgency={perBikeUrgency}
              onSelectBike={onSelectBike}
            />
          )}
        </CardContent>
      </Card>
      {selectedBike ? (
        <>
          <EditBikeWeightDialog
            open={weightOpen}
            bike={selectedBike}
            onClose={() => setWeightOpen(false)}
          />
          <EditBikeNameDialog
            open={nameOpen}
            bike={selectedBike}
            onClose={() => setNameOpen(false)}
          />
        </>
      ) : null}
    </>
  );
}

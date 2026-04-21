import { useMemo, useState } from 'react';
import { Badge, Card, CardContent, SpecRow } from '@/components/ui';
import { EditBikeWeightDialog } from './edit-bike-weight-dialog';
import { EditBikeNameDialog } from './edit-bike-name-dialog';
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

interface BikeSystemCardProps {
  bike: Bike;
  installRecords: GearInstallRecord[];
  instances: GearPartInstance[];
  catalog: GearPartCatalogItem[];
}

export function BikeSystemCard({ bike, installRecords, instances, catalog }: BikeSystemCardProps) {
  const [weightOpen, setWeightOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const inputs = useMemo(
    () => ({ bike, installRecords, instances, catalog }),
    [bike, installRecords, instances, catalog]
  );
  const chainring = useMemo(() => getInstalledChainring(inputs), [inputs]);
  const cassetteCogs = useMemo(() => getCassetteCogRange(inputs), [inputs]);

  const odometer = formatMileage(bike.cachedOdometerMi);
  const weight = formatWeightKg(bike.totalWeightGrams);
  const ratio = formatGearRatioRange(chainring, cassetteCogs);
  const cassette = formatCassetteRange(cassetteCogs);
  const crankset = formatChainringTeeth(chainring);

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="space-y-2.5 px-4 py-3.5 md:px-5 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setNameOpen(true)}
              aria-label={`Rename ${bike.name}`}
              className="group -mx-1.5 -my-0.5 inline-flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-shell-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              <span className="truncate font-heading text-sm font-semibold tracking-tight text-ink-900">
                {bike.name}
              </span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 text-ink-400 transition-colors group-hover:text-ink-600"
              >
                <path
                  d="M4 14.5 14 4.5l2 2L6 16.5H4v-2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {bike.isPrimary ? (
              <Badge
                variant="brand"
                size="sm"
                className="shrink-0 font-semibold uppercase tracking-wide"
              >
                Default
              </Badge>
            ) : null}
          </div>
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
        </CardContent>
      </Card>
      <EditBikeWeightDialog
        open={weightOpen}
        bike={bike}
        onClose={() => setWeightOpen(false)}
      />
      <EditBikeNameDialog
        open={nameOpen}
        bike={bike}
        onClose={() => setNameOpen(false)}
      />
    </>
  );
}

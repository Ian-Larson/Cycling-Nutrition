import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui';
import { SystemSpecRow } from './system-spec-row';
import { EditBikeWeightDialog } from './edit-bike-weight-dialog';
import {
  formatDrivetrainSpeeds,
  formatGearRatioRange,
  formatMileage,
  formatOdometerSynced,
  formatWeightKg,
  getCassetteCogRange,
  getInstalledChainring,
} from '@/lib/gear/bike-system';
import type {
  Bike,
  CassetteAttributes,
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
  const [editOpen, setEditOpen] = useState(false);
  const inputs = useMemo(
    () => ({ bike, installRecords, instances, catalog }),
    [bike, installRecords, instances, catalog]
  );
  const chainring = useMemo(() => getInstalledChainring(inputs), [inputs]);
  const cassetteCogs = useMemo(() => getCassetteCogRange(inputs), [inputs]);

  const cassetteItem = useMemo(() => {
    for (const install of installRecords) {
      if (install.bikeId !== bike.id || install.removedDateIso !== undefined) continue;
      const instance = instances.find((i) => i.id === install.partInstanceId);
      if (!instance) continue;
      const item = catalog.find((c) => c.id === instance.catalogItemId);
      if (!item || item.attributes.category !== 'cassette') continue;
      return item;
    }
    return null;
  }, [bike.id, catalog, installRecords, instances]);

  const mileage = formatMileage(bike.cachedOdometerMi);
  const weight = formatWeightKg(bike.totalWeightGrams);
  const ratio = formatGearRatioRange(chainring, cassetteCogs);
  const speeds = cassetteItem
    ? formatDrivetrainSpeeds(
        chainring,
        (cassetteItem.attributes as CassetteAttributes).speedCount
      )
    : null;
  const synced = formatOdometerSynced(bike.odometerSyncedAtIso);

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="space-y-2.5 px-4 py-3.5 md:px-5 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="section-kicker text-[0.68rem]">Bike system</p>
            {bike.isPrimary ? (
              <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-700">
                Default
              </span>
            ) : null}
          </div>
          <div className="space-y-1.5 pt-0.5">
            <SystemSpecRow
              label="Mileage"
              value={mileage ?? '—'}
              muted={mileage === null}
            />
            <SystemSpecRow
              label="Weight"
              value={weight ?? 'Set'}
              muted={weight === null}
              action={
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  aria-label="Edit bike weight"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-shell-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                >
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-3.5 w-3.5">
                    <path
                      d="M4 14.5 14 4.5l2 2L6 16.5H4v-2Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              }
            />
            <SystemSpecRow
              label="Gear range"
              value={ratio ?? '—'}
              muted={ratio === null}
            />
            <SystemSpecRow
              label="Drivetrain"
              value={speeds ?? '—'}
              muted={speeds === null}
            />
            <SystemSpecRow label="Odometer synced" value={synced} />
          </div>
        </CardContent>
      </Card>
      <EditBikeWeightDialog
        open={editOpen}
        bike={bike}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}

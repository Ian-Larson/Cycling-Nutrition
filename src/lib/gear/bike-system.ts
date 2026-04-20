import type {
  Bike,
  CassetteAttributes,
  ChainringAttributes,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
} from '@/types/gear';

export interface BikeSystemInputs {
  bike: Bike;
  installRecords: GearInstallRecord[];
  instances: GearPartInstance[];
  catalog: GearPartCatalogItem[];
}

/**
 * An install record counts as "active" when it has no removedDateIso.
 * Only active installs for this bike contribute to the system summary.
 */
function activeInstallsForBike(
  bikeId: string,
  installRecords: GearInstallRecord[]
): GearInstallRecord[] {
  return installRecords.filter(
    (record) => record.bikeId === bikeId && record.removedDateIso === undefined
  );
}

function catalogForInstall(
  install: GearInstallRecord,
  instances: GearPartInstance[],
  catalog: GearPartCatalogItem[]
): GearPartCatalogItem | null {
  const instance = instances.find((i) => i.id === install.partInstanceId);
  if (!instance) return null;
  return catalog.find((c) => c.id === instance.catalogItemId) ?? null;
}

export interface ChainringSummary {
  drivetrainType: '1x' | '2x';
  outerRing: number;
  innerRing?: number;
}

export function getInstalledChainring(inputs: BikeSystemInputs): ChainringSummary | null {
  for (const install of activeInstallsForBike(inputs.bike.id, inputs.installRecords)) {
    const item = catalogForInstall(install, inputs.instances, inputs.catalog);
    if (!item || item.attributes.category !== 'chainring') continue;
    const attrs = item.attributes as ChainringAttributes;
    if (!Number.isFinite(attrs.outerRing) || attrs.outerRing <= 0) continue;
    return {
      drivetrainType: attrs.drivetrainType,
      outerRing: attrs.outerRing,
      innerRing:
        attrs.drivetrainType === '2x' &&
        typeof attrs.innerRing === 'number' &&
        Number.isFinite(attrs.innerRing) &&
        attrs.innerRing > 0
          ? attrs.innerRing
          : undefined,
    };
  }
  return null;
}

/**
 * Extract cassette smallest/largest cog counts. Prefers numeric attribute
 * fields when present (to support an upcoming shape change), falls back
 * to parsing the legacy `range: string` format like "11-36".
 */
export function getCassetteCogRange(
  inputs: BikeSystemInputs
): { smallest: number; largest: number } | null {
  for (const install of activeInstallsForBike(inputs.bike.id, inputs.installRecords)) {
    const item = catalogForInstall(install, inputs.instances, inputs.catalog);
    if (!item || item.attributes.category !== 'cassette') continue;
    const attrs = item.attributes as CassetteAttributes & {
      smallestCog?: number;
      largestCog?: number;
    };

    if (
      typeof attrs.smallestCog === 'number' &&
      typeof attrs.largestCog === 'number' &&
      Number.isFinite(attrs.smallestCog) &&
      Number.isFinite(attrs.largestCog) &&
      attrs.smallestCog > 0 &&
      attrs.largestCog > 0
    ) {
      return {
        smallest: Math.min(attrs.smallestCog, attrs.largestCog),
        largest: Math.max(attrs.smallestCog, attrs.largestCog),
      };
    }

    const parsed = parseCassetteRange(attrs.range);
    if (parsed) return parsed;
  }
  return null;
}

export function parseCassetteRange(
  range: string | undefined | null
): { smallest: number; largest: number } | null {
  if (!range) return null;
  const match = /^\s*(\d{1,2})\s*[-–]\s*(\d{2,3})\s*t?\s*$/i.exec(range);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
  return { smallest: Math.min(a, b), largest: Math.max(a, b) };
}

/**
 * Easiest ratio = smallest-available-ring / largest cog.
 * Hardest ratio = outerRing / smallest cog.
 * For 2x with an innerRing, the easiest side uses innerRing; for 1x (or
 * 2x missing innerRing) it uses outerRing.
 */
export function formatGearRatioRange(
  chainring: ChainringSummary | null,
  cassetteCogs: { smallest: number; largest: number } | null
): string | null {
  if (!chainring || !cassetteCogs) return null;
  const smallRing =
    chainring.drivetrainType === '2x' && chainring.innerRing !== undefined
      ? chainring.innerRing
      : chainring.outerRing;
  const largeRing = chainring.outerRing;
  const easiest = smallRing / cassetteCogs.largest;
  const hardest = largeRing / cassetteCogs.smallest;
  if (!Number.isFinite(easiest) || !Number.isFinite(hardest)) return null;
  if (Math.abs(easiest - hardest) < 0.005) {
    return easiest.toFixed(2);
  }
  return `${easiest.toFixed(2)}–${hardest.toFixed(2)}`;
}

export function formatDrivetrainSpeeds(
  chainring: ChainringSummary | null,
  cassetteSpeedCount: number | undefined
): string | null {
  if (!chainring) return null;
  if (!cassetteSpeedCount || !Number.isFinite(cassetteSpeedCount)) return null;
  const front = chainring.drivetrainType === '2x' ? 2 : 1;
  return `${front} × ${cassetteSpeedCount}`;
}

export function formatCassetteRange(
  cassetteCogs: { smallest: number; largest: number } | null
): string | null {
  if (!cassetteCogs) return null;
  return `${cassetteCogs.smallest}–${cassetteCogs.largest}T`;
}

export function formatChainringTeeth(chainring: ChainringSummary | null): string | null {
  if (!chainring) return null;
  if (chainring.drivetrainType === '2x' && chainring.innerRing !== undefined) {
    return `${chainring.outerRing}/${chainring.innerRing}T`;
  }
  return `${chainring.outerRing}T`;
}

export function formatWeightKg(grams: number | null | undefined): string | null {
  if (grams === null || grams === undefined || !Number.isFinite(grams)) return null;
  if (grams <= 0) return null;
  return `${(grams / 1000).toFixed(2)} kg`;
}

export function formatMileage(miles: number | null | undefined): string | null {
  if (miles === null || miles === undefined || !Number.isFinite(miles)) return null;
  return `${Math.round(miles).toLocaleString()} mi`;
}

export function formatOdometerSynced(
  iso: string | null | undefined,
  now: number = Date.now()
): string {
  if (!iso) return 'Never synced';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 'Never synced';
  const diffMs = now - ts;
  if (diffMs < 0) return 'just now';
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

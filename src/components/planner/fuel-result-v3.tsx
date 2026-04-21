import { Card, CardContent, CardHeader, SpecRow, DividedRowList } from '@/components/ui';
import { formatTime } from '@/lib/calculator/timing';
import {
  formatPercent,
  formatCarbsGrams,
  formatCarbsPerHour,
  formatFluidMl,
  formatFluidPerHour,
  formatGPerKg,
  formatSodiumMg,
  formatSodiumPerHour,
  formatMgPerL,
} from '@/lib/fueling/format';
import type { Product } from '@/types';
import type {
  FuelingPrescription,
  Warning,
  WarningSeverity,
  TimelineItem,
  PostRidePrescription,
} from '@/lib/fueling/types';

interface FuelResultV3Props {
  prescription: FuelingPrescription;
  products: Product[];
  section?: 'all' | 'pack' | 'guide' | 'metrics';
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function severityClasses(severity: WarningSeverity): {
  border: string;
  bg: string;
  text: string;
  badge: string;
} {
  switch (severity) {
    case 'error':
      return {
        border: 'border-rose-300',
        bg: 'bg-rose-50',
        text: 'text-rose-900',
        badge: 'bg-rose-200 text-rose-900',
      };
    case 'warn':
      return {
        border: 'border-amber-300',
        bg: 'bg-amber-50',
        text: 'text-amber-900',
        badge: 'bg-amber-200 text-amber-900',
      };
    default:
      return {
        border: 'border-[color:var(--border-soft)]',
        bg: 'bg-[var(--surface-soft)]',
        text: 'text-ink-800',
        badge: 'bg-shell-200 text-ink-800',
      };
  }
}

function PurposePill({ purpose }: { purpose: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium capitalize text-brand-800">
      {purpose.replace(/_/g, ' ')}
    </span>
  );
}

function HeatPill({ heat }: { heat: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-shell-100 px-2.5 py-1 text-xs font-medium capitalize text-ink-700">
      {heat}
    </span>
  );
}

function WarningsCard({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <h3 className="section-title text-lg">Heads up</h3>
      </CardHeader>
      <CardContent className="space-y-2">
        {warnings.map((w, i) => {
          const s = severityClasses(w.severity);
          return (
            <div
              key={`${w.code}-${i}`}
              className={`flex items-start gap-2.5 rounded-2xl border ${s.border} ${s.bg} ${s.text} px-3 py-2.5 md:px-4 md:py-3`}
            >
              <span
                className={`mt-0.5 inline-flex shrink-0 items-center rounded-full ${s.badge} px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide`}
              >
                {w.severity}
              </span>
              <div className="min-w-0">
                <p className="text-sm leading-6">{w.message}</p>
                <p className="text-[0.7rem] leading-5 opacity-70">{w.code}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ContextCard({ prescription }: { prescription: FuelingPrescription }) {
  const { contextSummary, confidence } = prescription;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-title">Ride snapshot</h3>
          <div className="flex flex-wrap items-center gap-2">
            <PurposePill purpose={contextSummary.purpose} />
            <HeatPill heat={contextSummary.effectiveHeat} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1.5">
          <SpecRow
            label="Duration"
            value={formatDuration(contextSummary.durationMinutes)}
          />
          <SpecRow
            label="IF"
            value={contextSummary.intensityFactor.toFixed(2)}
          />
          <SpecRow label="TSS" value={String(Math.round(contextSummary.tss))} />
          <SpecRow
            label="Confidence"
            value={formatPercent(confidence.score)}
            muted={confidence.score < 0.5}
          />
        </div>
        {confidence.missing.length > 0 && (
          <p className="pt-1 text-xs leading-5 text-ink-500">
            Inferring: {confidence.missing.join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PreRideCard({ prescription }: { prescription: FuelingPrescription }) {
  const pre = prescription.pre;
  const carbLoad = prescription.carbLoad;

  if (!pre && !carbLoad) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
          <h3 className="section-title">Pre-ride</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-ink-600">
            No pre-ride fueling needed for this session.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <h3 className="section-title">Pre-ride</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {pre && (
          <div className="space-y-1.5">
            <SpecRow
              label="Carbs"
              value={formatCarbsGrams(pre.carbsGrams)}
              accent
            />
            <SpecRow label="Per kg" value={formatGPerKg(pre.carbsGPerKg)} />
            <SpecRow label="Window" value={`${pre.windowHoursBefore} h before`} />
            {pre.proteinGrams !== undefined && (
              <SpecRow
                label="Protein"
                value={formatCarbsGrams(pre.proteinGrams)}
              />
            )}
            {pre.caffeineMg !== undefined && (
              <SpecRow
                label="Caffeine"
                value={
                  pre.caffeineTimingMinutesBefore !== undefined
                    ? `${pre.caffeineMg} mg · ${pre.caffeineTimingMinutesBefore} min before`
                    : `${pre.caffeineMg} mg`
                }
              />
            )}
          </div>
        )}
        {carbLoad && (
          <div className="rounded-xl border border-brand-200 bg-[color:color-mix(in_oklch,var(--color-brand-50)_58%,white)] px-3 py-2.5">
            <p className="section-kicker text-[0.68rem] text-brand-700">
              Carb load
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-900">
              {carbLoad.targetGPerKgPerDay.toFixed(1)} g/kg/day × {carbLoad.days} days
            </p>
            <p className="mt-0.5 text-xs leading-5 text-ink-600">
              Hourly ceiling {carbLoad.hourlyCeilingGPerKg.toFixed(1)} g/kg.
            </p>
          </div>
        )}
        {pre && pre.notes.length > 0 && (
          <ul className="space-y-1 text-xs leading-5 text-ink-600">
            {pre.notes.map((note, i) => (
              <li key={i}>• {note}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DuringStatsCard({ prescription }: { prescription: FuelingPrescription }) {
  const { during } = prescription;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <h3 className="section-title">During ride</h3>
        <p className="section-copy hidden md:block">
          Strategy: <span className="capitalize">{during.strategy.replace(/-/g, ' ')}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-2xl border border-brand-200 bg-[color:color-mix(in_oklch,var(--color-brand-50)_55%,white)] px-4 py-3 md:px-5 md:py-4">
          <p className="section-kicker text-[0.68rem] text-brand-700">Carbs / hour</p>
          <p className="mt-1 font-heading text-3xl font-semibold leading-none text-brand-800 tabular-nums">
            {formatCarbsPerHour(during.carbsGPerHour)}
          </p>
          <p className="mt-1 text-xs leading-5 text-brand-700/80">
            {formatCarbsGrams(during.totalCarbsGrams)} total over the ride
          </p>
        </div>
        <div className="space-y-1.5">
          <SpecRow label="Fluid" value={formatFluidPerHour(during.hydrationMlPerHour)} />
          <SpecRow
            label="Total fluid"
            value={formatFluidMl(during.totalHydrationMl)}
          />
          <SpecRow label="Sodium" value={formatSodiumPerHour(during.sodiumMgPerHour)} />
          <SpecRow
            label="Bottle [Na]"
            value={formatMgPerL(during.sodiumMgPerLiterTargetInBottles)}
          />
          <SpecRow
            label="Concentration"
            value={`${(during.bottleConcentrationGPerMl * 100).toFixed(1)} g/100ml`}
          />
          {during.caffeineMg !== undefined && during.caffeineMg > 0 && (
            <SpecRow
              label="Caffeine (solids)"
              value={`${Math.round(during.caffeineMg)} mg`}
            />
          )}
        </div>
        {during.usesMultiTransportableCarbs && (
          <p className="text-xs leading-5 text-ink-600">
            Glucose:fructose mix recommended above 60 g/h.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FluidShortfallNote({ shortfallMl }: { shortfallMl: number }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm leading-5 text-amber-900 md:leading-6">
      <p className="font-semibold">
        Plan a refill stop for ~{shortfallMl.toLocaleString()} ml extra fluid
      </p>
      <p className="mt-1">
        Your bottles can't carry the full hydration target. Add a refill stop, carry extra,
        or dial down the fluid plan.
      </p>
    </div>
  );
}

function BringList({
  prescription,
  products,
}: {
  prescription: FuelingPrescription;
  products: Product[];
}) {
  const { packList } = prescription;
  if (!packList) return null;

  const hasBottles = packList.bottles.length > 0;
  const hasSolids = packList.solids.length > 0;
  const shortfall = packList.fluidShortfallMl ?? 0;

  if (!hasBottles && !hasSolids && shortfall <= 0) return null;

  return (
    <div className="space-y-3">
      {shortfall > 0 ? <FluidShortfallNote shortfallMl={shortfall} /> : null}
      {hasBottles && (
        <DividedRowList
          items={packList.bottles}
          getKey={(_, i) => `bottle-${i}`}
          header={<p className="section-kicker text-[0.68rem]">Bottles</p>}
          renderItem={(alloc, i) => {
            const product = alloc.productId
              ? products.find((p) => p.id === alloc.productId)
              : null;
            const scoopsLabel =
              alloc.isWaterOnly
                ? 'Water'
                : alloc.mixScoops !== undefined
                  ? `${alloc.mixScoops} ${alloc.mixScoops === 1 ? 'scoop' : 'scoops'}`
                  : `${alloc.mixGrams} g`;
            return (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 md:px-4">
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="shrink-0 text-sm font-semibold text-ink-900">
                    Bottle {i + 1}
                  </span>
                  <span className="truncate text-xs text-ink-600">
                    {alloc.capacityMl} ml
                    {alloc.isWaterOnly ? '' : ` · ${product?.name ?? 'Mix'}`}
                  </span>
                </div>
                <span className="shrink-0 font-sans text-sm font-semibold tabular-nums text-brand-700">
                  {scoopsLabel}
                </span>
              </div>
            );
          }}
        />
      )}
      {hasSolids && (
        <DividedRowList
          items={packList.solids}
          getKey={(alloc, i) => `${alloc.productId}-${i}`}
          header={<p className="section-kicker text-[0.68rem]">Solids</p>}
          renderItem={(alloc) => {
            const product = products.find((p) => p.id === alloc.productId);
            return (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 md:px-4">
                <span className="truncate text-sm font-semibold text-ink-900">
                  {product?.name ?? 'Solid'}
                </span>
                <span className="shrink-0 font-sans text-sm font-semibold tabular-nums text-brand-700">
                  ×{alloc.quantity}
                </span>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}

function PostRideCard({ post }: { post: PostRidePrescription | undefined }) {
  if (!post) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-title">Post-ride</h3>
          <span className="inline-flex items-center rounded-full bg-shell-100 px-2.5 py-0.5 text-[0.7rem] font-medium capitalize text-ink-700">
            {post.mode}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <p className="section-kicker text-[0.68rem]">Window 1 · 0–2h</p>
          <SpecRow
            label="Carbs"
            value={formatCarbsGrams(post.window1.carbsGrams)}
            accent
          />
          <SpecRow
            label="Protein"
            value={formatCarbsGrams(post.window1.proteinGrams)}
          />
          {post.window1.fluidsMl !== undefined && (
            <SpecRow label="Fluid" value={formatFluidMl(post.window1.fluidsMl)} />
          )}
          {post.window1.sodiumMg !== undefined && (
            <SpecRow
              label="Sodium"
              value={formatSodiumMg(post.window1.sodiumMg)}
            />
          )}
        </div>
        {post.window2 && (
          <div className="space-y-1.5 border-t border-[color:var(--border-soft)] pt-3">
            <p className="section-kicker text-[0.68rem]">Window 2 · 2–4h</p>
            <SpecRow
              label="Carbs"
              value={formatCarbsGrams(post.window2.carbsGrams)}
              accent
            />
            <SpecRow
              label="Protein"
              value={formatCarbsGrams(post.window2.proteinGrams)}
            />
          </div>
        )}
        {(post.recommendRecoveryDrink || post.notes.length > 0) && (
          <ul className="space-y-1 text-xs leading-5 text-ink-600">
            {post.recommendRecoveryDrink && (
              <li>• Recovery drink recommended.</li>
            )}
            {post.notes.map((note, i) => (
              <li key={i}>• {note}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DailyCard({ prescription }: { prescription: FuelingPrescription }) {
  const daily = prescription.daily;
  if (!daily) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <h3 className="section-title">Daily targets</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          <SpecRow
            label="Carbs"
            value={formatCarbsGrams(daily.carbsGramsTotal)}
            accent
          />
          <SpecRow label="Carbs / kg" value={formatGPerKg(daily.carbsGPerKg)} />
          <SpecRow
            label="Protein"
            value={formatCarbsGrams(daily.proteinGramsTotal)}
          />
          <SpecRow
            label="Protein / kg"
            value={`${daily.proteinGPerKg.toFixed(2)} g/kg`}
          />
          <SpecRow
            label="Caffeine max"
            value={`${Math.round(daily.caffeineMgCeiling)} mg`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineCard({ items }: { items: TimelineItem[] | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <DividedRowList
      items={items}
      getKey={(item, i) => `${item.offsetMinutesFromStart}-${i}`}
      header={
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="section-title">Ride guide</h3>
          <p className="text-xs leading-5 text-ink-500">
            {items.length} {items.length === 1 ? 'cue' : 'cues'}
          </p>
        </div>
      }
      renderItem={(item) => {
        const offset = item.offsetMinutesFromStart;
        const label =
          offset < 0
            ? `T-${formatTime(Math.abs(offset))}`
            : formatTime(offset);
        const phaseBadge =
          item.phase === 'pre'
            ? 'bg-shell-100 text-ink-700 border-[color:var(--border-soft)]'
            : item.phase === 'post'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-brand-100 text-brand-800 border-brand-200';
        return (
          <div className="flex items-start gap-3 px-3 py-2 md:px-4 md:py-2.5">
            <span
              className={`shrink-0 rounded-md border px-2 py-1 font-sans text-xs font-semibold tabular-nums ${phaseBadge}`}
            >
              {label}
            </span>
            <p className="min-w-0 flex-1 text-sm leading-6 text-ink-900">
              {item.action}
            </p>
            <p className="shrink-0 text-right text-xs font-semibold leading-6 tabular-nums text-ink-600">
              {item.cumulativeCarbs} g
            </p>
          </div>
        );
      }}
    />
  );
}

export function FuelResultV3({
  prescription,
  products,
  section = 'all',
}: FuelResultV3Props) {
  const showMetrics = section === 'all' || section === 'metrics';
  const showPack = section === 'all' || section === 'pack';
  const showGuide = section === 'all' || section === 'guide';

  return (
    <div className="space-y-3 md:space-y-4">
      {showPack && <BringList prescription={prescription} products={products} />}
      {showGuide && <PreRideCard prescription={prescription} />}
      {showGuide && <TimelineCard items={prescription.timeline} />}
      {showGuide && <PostRideCard post={prescription.post} />}
      {showMetrics && <WarningsCard warnings={prescription.warnings} />}
      {showMetrics && <ContextCard prescription={prescription} />}
      {showMetrics && <DuringStatsCard prescription={prescription} />}
      {showMetrics && <DailyCard prescription={prescription} />}
    </div>
  );
}

import { Card, CardContent, CardHeader } from '@/components/ui';
import { formatTime } from '@/lib/calculator/timing';
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

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="surface-note p-3.5 md:p-4">
      <p className="page-stat-label">{label}</p>
      <p className={`page-stat-value ${accent ? 'text-brand-700' : ''}`}>{value}</p>
    </div>
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
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          <StatCard
            label="Duration"
            value={formatDuration(contextSummary.durationMinutes)}
          />
          <StatCard label="IF" value={contextSummary.intensityFactor.toFixed(2)} />
          <StatCard label="TSS" value={String(Math.round(contextSummary.tss))} />
          <StatCard
            label="Confidence"
            value={`${Math.round(confidence.score * 100)}%`}
          />
        </div>
        {confidence.missing.length > 0 && (
          <p className="text-sm leading-5 text-ink-600 md:leading-6">
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
        {carbLoad && (
          <div className="rounded-2xl border border-brand-200 bg-[color:color-mix(in_oklch,var(--color-brand-50)_58%,white)] px-3 py-3 md:px-4 md:py-4">
            <p className="section-kicker text-[0.68rem] text-brand-700">
              Carb load
            </p>
            <p className="mt-2 font-semibold text-ink-900">
              {carbLoad.targetGPerKgPerDay.toFixed(1)} g/kg/day × {carbLoad.days} days
            </p>
            <p className="mt-1 text-sm leading-6 text-ink-600">
              Hourly ceiling {carbLoad.hourlyCeilingGPerKg.toFixed(1)} g/kg.
            </p>
          </div>
        )}
        {pre && (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              <StatCard
                label="Carbs"
                value={`${pre.carbsGrams} g`}
                accent
              />
              <StatCard
                label="Per kg"
                value={`${pre.carbsGPerKg.toFixed(1)} g/kg`}
              />
              <StatCard
                label="Window"
                value={`${pre.windowHoursBefore}h before`}
              />
              {pre.proteinGrams !== undefined && (
                <StatCard label="Protein" value={`${pre.proteinGrams} g`} />
              )}
            </div>
            {pre.caffeineMg !== undefined && (
              <div className="surface-note p-3.5 md:p-4">
                <p className="section-kicker text-[0.68rem]">Caffeine stack</p>
                <p className="mt-2 font-semibold text-ink-900">
                  {pre.caffeineMg} mg
                  {pre.caffeineTimingMinutesBefore !== undefined
                    ? ` • ${pre.caffeineTimingMinutesBefore} min before start`
                    : ''}
                </p>
              </div>
            )}
            {pre.notes.length > 0 && (
              <ul className="space-y-1 text-sm leading-6 text-ink-700">
                {pre.notes.map((note, i) => (
                  <li key={i}>• {note}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DuringCard({
  prescription,
  products,
}: {
  prescription: FuelingPrescription;
  products: Product[];
}) {
  const { during, packList } = prescription;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <h3 className="section-title">During ride</h3>
        <p className="section-copy hidden md:block">
          Strategy: <span className="capitalize">{during.strategy.replace(/-/g, ' ')}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          <StatCard label="Carbs" value={`${during.carbsGPerHour} g/h`} accent />
          <StatCard label="Fluid" value={`${during.hydrationMlPerHour} ml/h`} />
          <StatCard label="Sodium" value={`${during.sodiumMgPerHour} mg/h`} />
          <StatCard
            label="Total carbs"
            value={`${during.totalCarbsGrams} g`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
          <StatCard
            label="Total fluid"
            value={`${during.totalHydrationMl} ml`}
          />
          <StatCard
            label="Bottle [Na]"
            value={`${during.sodiumMgPerLiterTargetInBottles} mg/L`}
          />
          <StatCard
            label="Concentration"
            value={`${(during.bottleConcentrationGPerMl * 100).toFixed(1)} g/100ml`}
          />
        </div>
        {during.usesMultiTransportableCarbs && (
          <p className="text-sm leading-6 text-ink-700">
            Glucose:fructose mix recommended above 60 g/h.
          </p>
        )}
        {during.caffeineMg !== undefined && during.caffeineMg > 0 && (
          <div className="surface-note p-3.5 md:p-4">
            <p className="section-kicker text-[0.68rem]">In-ride caffeine</p>
            <p className="mt-2 font-semibold text-ink-900">
              {Math.round(during.caffeineMg)} mg from solids
            </p>
          </div>
        )}

        {packList && packList.bottles.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h4 className="section-title text-lg">
                Bring {packList.bottles.length === 1 ? '1 bottle' : `${packList.bottles.length} bottles`}
              </h4>
              <p className="text-sm leading-5 text-ink-600">
                Fill each as shown below
              </p>
            </div>
            {packList.fluidShortfallMl && packList.fluidShortfallMl > 0 ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm leading-5 text-amber-900 md:leading-6">
                <p className="font-semibold">
                  Plan a refill stop for ~{packList.fluidShortfallMl.toLocaleString()} ml extra fluid
                </p>
                <p className="mt-1">
                  Your two bottles can't carry the full hydration target for this ride. Add a refill
                  stop, top up from a hydration pack, or dial down the fluid plan.
                </p>
              </div>
            ) : null}
            {packList.bottles.map((alloc, i) => {
              const product = alloc.productId
                ? products.find((p) => p.id === alloc.productId)
                : null;
              return (
                <div
                  key={i}
                  className="grid gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-white px-3 py-3 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-4 md:px-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-shell-100 font-sans text-sm font-semibold text-ink-900">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <p className="font-semibold text-ink-900">
                      Bottle {i + 1}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-ink-600">
                      {alloc.capacityMl} ml •{' '}
                      {alloc.isWaterOnly
                        ? 'Water only'
                        : (product?.name ?? 'Mix')}
                    </p>
                    {!alloc.isWaterOnly && (
                      <p className="text-sm leading-6 text-ink-600">
                        {alloc.carbsTotal} g carbs
                        {alloc.mixScoops !== undefined
                          ? ` • ~${alloc.mixScoops} scoops`
                          : ''}
                        {alloc.sodiumMgTotal
                          ? ` • ${alloc.sodiumMgTotal} mg Na`
                          : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-left md:text-right">
                    {alloc.isWaterOnly ? (
                      <p className="font-sans text-sm font-semibold text-ink-900">
                        Water
                      </p>
                    ) : (
                      <p className="font-sans text-[1.05rem] font-semibold leading-none text-brand-700">
                        {alloc.mixGrams} g mix
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {packList && packList.solids.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h4 className="section-title text-lg">Bring solids</h4>
              <p className="text-sm leading-5 text-ink-600">
                Carry and eat on schedule
              </p>
            </div>
            {packList.solids.map((alloc, i) => {
              const product = products.find((p) => p.id === alloc.productId);
              return (
                <div
                  key={`${alloc.productId}-${i}`}
                  className="grid gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-white px-3 py-3 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-4 md:px-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-shell-100 font-sans text-sm font-semibold text-ink-900">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <p className="font-semibold text-ink-900">
                      {product?.name ?? 'Solid'}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-ink-600">
                      {alloc.carbsTotal} g carbs • every ~{alloc.timingIntervalMinutes} min
                      {alloc.caffeineMgTotal
                        ? ` • ${alloc.caffeineMgTotal} mg caffeine`
                        : ''}
                    </p>
                  </div>
                  <p className="font-sans text-[1.05rem] font-semibold leading-none text-brand-700 md:text-right">
                    ×{alloc.quantity}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PostRideCard({ post }: { post: PostRidePrescription | undefined }) {
  if (!post) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-title">Post-ride</h3>
          <span className="inline-flex items-center rounded-full bg-shell-100 px-2.5 py-1 text-xs font-medium capitalize text-ink-700">
            {post.mode}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <h4 className="section-title text-lg">Window 1 · 0–2h</h4>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            <StatCard label="Carbs" value={`${post.window1.carbsGrams} g`} accent />
            <StatCard label="Protein" value={`${post.window1.proteinGrams} g`} />
            {post.window1.fluidsMl !== undefined && (
              <StatCard label="Fluid" value={`${post.window1.fluidsMl} ml`} />
            )}
            {post.window1.sodiumMg !== undefined && (
              <StatCard label="Sodium" value={`${post.window1.sodiumMg} mg`} />
            )}
          </div>
        </div>
        {post.window2 && (
          <div className="space-y-2">
            <h4 className="section-title text-lg">Window 2 · 2–4h</h4>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              <StatCard
                label="Carbs"
                value={`${post.window2.carbsGrams} g`}
                accent
              />
              <StatCard
                label="Protein"
                value={`${post.window2.proteinGrams} g`}
              />
            </div>
          </div>
        )}
        {post.recommendRecoveryDrink && (
          <p className="text-sm leading-6 text-ink-700">
            Recovery drink recommended.
          </p>
        )}
        {post.notes.length > 0 && (
          <ul className="space-y-1 text-sm leading-6 text-ink-700">
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
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
          <StatCard
            label="Carbs"
            value={`${daily.carbsGramsTotal} g`}
            accent
          />
          <StatCard
            label="Protein"
            value={`${daily.proteinGramsTotal} g`}
          />
          <StatCard
            label="Caffeine max"
            value={`${daily.caffeineMgCeiling} mg`}
          />
          <StatCard
            label="Carbs / kg"
            value={`${daily.carbsGPerKg.toFixed(1)} g/kg`}
          />
          <StatCard
            label="Protein / kg"
            value={`${daily.proteinGPerKg.toFixed(2)} g/kg`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineCard({ items }: { items: TimelineItem[] | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
        <h3 className="section-title">Ride guide</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, i) => {
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
            <div
              key={`${offset}-${i}`}
              className="grid gap-2.5 rounded-2xl border border-[color:var(--border-soft)] bg-white px-3 py-3 md:grid-cols-[auto_1fr_auto] md:items-start md:gap-3 md:px-4 md:py-4"
            >
              <div
                className={`rounded-lg border px-3 py-2 font-sans text-sm font-semibold ${phaseBadge}`}
              >
                {label}
              </div>
              <p className="text-sm leading-6 text-ink-900">{item.action}</p>
              <p className="text-sm leading-6 text-ink-600 md:text-right">
                {item.cumulativeCarbs} g total
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
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
      {showMetrics && <WarningsCard warnings={prescription.warnings} />}
      {showMetrics && <ContextCard prescription={prescription} />}
      {showPack && <PreRideCard prescription={prescription} />}
      {showPack && (
        <DuringCard
          prescription={prescription}
          products={products}
        />
      )}
      {showPack && <PostRideCard post={prescription.post} />}
      {showMetrics && <DailyCard prescription={prescription} />}
      {showGuide && <TimelineCard items={prescription.timeline} />}
    </div>
  );
}

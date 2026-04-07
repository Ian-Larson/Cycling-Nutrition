import { Card, CardContent, CardHeader, Stepper } from '@/components/ui';
import { formatTime } from '@/lib/calculator/timing';
import { NeedsIntensityBar } from './needs-intensity-bar';
import type { FuelPlan, Bottle, Product } from '@/types';

interface FuelResultProps {
  plan: Omit<FuelPlan, 'id' | 'createdAt'>;
  bottles: Bottle[];
  products: Product[];
  onSolidQuantityChange?: (productId: string, quantity: number) => void;
  onBottleCountChange?: (count: number) => void;
  section?: 'all' | 'pack' | 'guide' | 'metrics';
}

function TargetBar({ planned, needed }: { planned: number; needed: number }) {
  const delta = planned - needed;
  const absDelta = Math.abs(delta);
  const pct = needed > 0 ? Math.min((planned / needed) * 100, 120) : 0;

  let barColor = 'bg-emerald-500';
  let textColor = 'text-emerald-700';
  if (absDelta > 10) {
    barColor = 'bg-rose-600';
    textColor = 'text-rose-700';
  } else if (absDelta > 5) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-700';
  }

  const sign = delta >= 0 ? '+' : '';

  return (
    <div className="surface-note p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-kicker text-[0.68rem]">Target Delta</p>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            {planned}g planned against {needed}g target.
          </p>
        </div>
        <p className={`font-sans text-[1.55rem] font-semibold uppercase leading-none ${textColor}`}>
          {sign}
          {delta}g
        </p>
      </div>
      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-shell-200">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function FuelResult({
  plan,
  bottles,
  products,
  onSolidQuantityChange,
  onBottleCountChange,
  section = 'all',
}: FuelResultProps) {
  const carbsPerHour =
    plan.rideCharacteristics.durationMinutes > 0
      ? Math.round(
          (plan.summary.totalCarbsPlanned /
            plan.rideCharacteristics.durationMinutes) *
            60
        )
      : 0;

  const refuelStops = plan.rideCharacteristics.refuelStops || 0;
  const autoMetrics = plan.rideCharacteristics.autoMetrics;
  const currentBottleCount = plan.bottles.length;
  const availableBottleCount = bottles.filter((b) => b.isAvailable).length;

  const showPack = section === 'all' || section === 'pack';
  const showGuide = section === 'all' || section === 'guide';
  const showMetrics = section === 'all' || section === 'metrics';

  return (
    <div className="space-y-4">
      {showMetrics && plan.warnings && plan.warnings.length > 0 && (
        <Card className="overflow-hidden border-amber-300 bg-[color:color-mix(in_oklch,white_72%,rgb(254_243_199))]">
          <CardHeader className="space-y-2 bg-white/35">
            <p className="section-kicker text-[0.68rem] text-amber-800">Watchouts</p>
            <h3 className="section-title text-lg text-amber-900">Before you roll out</h3>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.warnings.map((warning, i) => (
              <p key={i} className="text-sm leading-6 text-amber-900">
                {warning.message}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {showMetrics && (
        <TargetBar
          planned={plan.summary.totalCarbsPlanned}
          needed={plan.summary.totalCarbsNeeded}
        />
      )}

      {showMetrics && (
        <Card className="overflow-hidden">
          <CardHeader className="space-y-2 bg-white/55">
            <p className="section-kicker">Metrics</p>
            <h3 className="section-title">Ride summary</h3>
            <p className="section-copy">
              Use these numbers to sanity-check the plan. The pack list and guide
              below are the action version.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="surface-note p-4">
                <p className="page-stat-label">Duration</p>
                <p className="page-stat-value">{formatDuration(plan.rideCharacteristics.durationMinutes)}</p>
              </div>
              <div className="surface-note p-4">
                <p className="page-stat-label">Hydration</p>
                <p className="page-stat-value">{plan.summary.hydrationMl}ml</p>
              </div>
              <div className="surface-note p-4">
                <p className="page-stat-label">Total Carbs</p>
                <p className="page-stat-value text-brand-700">{plan.summary.totalCarbsPlanned}g</p>
              </div>
              <div className="surface-note p-4">
                <p className="page-stat-label">Carbs / Hour</p>
                <p className="page-stat-value">{carbsPerHour}g</p>
              </div>
              {plan.summary.sodiumMgPerHour !== undefined && (
                <div className="surface-note p-4">
                  <p className="page-stat-label">Sodium / Hour</p>
                  <p className="page-stat-value">{plan.summary.sodiumMgPerHour}mg</p>
                </div>
              )}
              {plan.summary.sodiumMgTotal !== undefined && (
                <div className="surface-note p-4">
                  <p className="page-stat-label">Total Sodium</p>
                  <p className="page-stat-value">{plan.summary.sodiumMgTotal}mg</p>
                </div>
              )}
            </div>

            {autoMetrics?.needsScore !== undefined && autoMetrics?.needsLevel && (
              <div className="surface-note p-4">
                <NeedsIntensityBar
                  score={autoMetrics.needsScore}
                  level={autoMetrics.needsLevel}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showPack && (
        <Card className="overflow-hidden">
          <CardHeader className="space-y-2 bg-white/55">
            <p className="section-kicker">Pack List</p>
            <h3 className="section-title">Pack before rollout</h3>
            <p className="section-copy">
              Pack these quantities before you leave. Bottle amounts are shown per fill.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <TargetBar
              planned={plan.summary.totalCarbsPlanned}
              needed={plan.summary.totalCarbsNeeded}
            />

            {plan.bottles.length > 0 && (
              <div className="space-y-3">
                {plan.bottles.map((alloc, i) => {
                  const bottle = bottles.find((b) => b.id === alloc.bottleId);
                  const product = products.find((p) => p.id === alloc.productId);
                  const concentration =
                    bottle && bottle.capacityMl > 0
                      ? alloc.carbsTotal / bottle.capacityMl
                      : 0;

                  return (
                    <div
                      key={`${alloc.bottleId}-${i}`}
                      className="grid gap-4 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-white px-4 py-4 md:grid-cols-[auto_1fr_auto] md:items-center"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-shell-100 font-sans text-[1.35rem] font-semibold uppercase text-ink-900">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <p className="font-semibold text-ink-900">
                          {bottle?.name || `Bottle ${i + 1}`}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-ink-600">
                          {bottle?.capacityMl}ml • {alloc.isWaterOnly ? 'Water only' : product?.name}
                        </p>
                        {!alloc.isWaterOnly && (
                          <p className="text-sm leading-6 text-ink-600">
                            {alloc.carbsTotal}g carbs • ~{alloc.mixScoops} scoops •{' '}
                            {(concentration * 100).toFixed(1)}g per 100ml
                          </p>
                        )}
                      </div>
                      <div className="text-left md:text-right">
                        {alloc.isWaterOnly ? (
                          <>
                            <p className="font-sans text-[1.3rem] font-semibold uppercase leading-none text-ink-900">
                              Water
                            </p>
                            <p className="mt-2 text-sm leading-6 text-ink-600">
                              Carry plain water in this bottle.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-sans text-[1.55rem] font-semibold uppercase leading-none text-brand-700">
                              {alloc.mixGrams}g mix
                            </p>
                            <p className="mt-2 text-sm leading-6 text-ink-600">
                              Add to {bottle?.capacityMl}ml bottle
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {onBottleCountChange && (
                  <div className="surface-note flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="section-kicker text-[0.68rem]">Bottle Count</p>
                      <p className="mt-2 text-sm leading-6 text-ink-700">
                        Adjust how many available bottles this plan should use.
                      </p>
                    </div>
                    <Stepper
                      value={currentBottleCount}
                      onChange={onBottleCountChange}
                      min={1}
                      max={availableBottleCount}
                    />
                  </div>
                )}
              </div>
            )}

            {plan.solids.length > 0 && (
              <div className="space-y-3">
                <div>
                  <p className="section-kicker text-[0.68rem]">Solid Fuel</p>
                  <h4 className="section-title text-lg">Pack these extras</h4>
                </div>
                {plan.solids.map((alloc, i) => {
                  const product = products.find((p) => p.id === alloc.productId);
                  return (
                    <div
                      key={`${alloc.productId}-${i}`}
                      className="grid gap-4 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-white px-4 py-4 md:grid-cols-[auto_1fr_auto] md:items-center"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-shell-100 font-sans text-[1.35rem] font-semibold uppercase text-ink-900">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <p className="font-semibold text-ink-900">
                          {product?.name || 'Solid fuel'}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-ink-600">
                          {alloc.carbsTotal}g carbs total • aim for one every ~
                          {alloc.timingIntervalMinutes} minutes
                        </p>
                      </div>
                      {onSolidQuantityChange ? (
                        <Stepper
                          value={alloc.quantity}
                          onChange={(qty) => onSolidQuantityChange(alloc.productId, qty)}
                          min={0}
                          max={10}
                        />
                      ) : (
                        <div className="text-left md:text-right">
                          <p className="font-sans text-[1.55rem] font-semibold uppercase leading-none text-brand-700">
                            x{alloc.quantity}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-ink-600">
                            Pack this quantity
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {refuelStops > 0 && (
              <div className="surface-note border-brand-200 bg-[color:color-mix(in_oklch,var(--color-brand-50)_58%,white)] p-4">
                <p className="section-kicker text-[0.68rem]">Refills</p>
                <p className="mt-2 font-semibold text-ink-900">
                  Prepare {refuelStops + 1} total fill sets.
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-600">
                  Quantities above are per fill. Plan to refill bottles {refuelStops}{' '}
                  time{refuelStops > 1 ? 's' : ''} during the ride.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showGuide && plan.consumptionGuide.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="space-y-2 bg-white/55">
            <p className="section-kicker">During Ride Guide</p>
            <h3 className="section-title">Follow this sequence on the bike</h3>
            <p className="section-copy">
              These are the time-based actions to execute once the ride starts.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.consumptionGuide.map((item, i) => (
              <div
                key={`${item.timeOffsetMinutes}-${i}`}
                className="grid gap-3 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-white px-4 py-4 md:grid-cols-[auto_1fr_auto] md:items-start"
              >
                <div className="rounded-full bg-brand-600 px-4 py-2 font-sans text-[1rem] font-semibold uppercase tracking-[0.08em] text-shell-50">
                  {formatTime(item.timeOffsetMinutes)}
                </div>
                <p className="text-sm leading-6 text-ink-900">{item.action}</p>
                <p className="text-sm leading-6 text-ink-600 md:text-right">
                  {item.cumulativeCarbs}g total
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

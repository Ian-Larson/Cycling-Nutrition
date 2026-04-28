import { Card, CardContent, CardHeader, Stepper } from '@/components/ui';
import { formatTime } from '@/lib/calculator/timing';
import { NeedsIntensityBar } from './needs-intensity-bar';
import type { FuelPlan, Product } from '@/types';

interface FuelResultProps {
  plan: Omit<FuelPlan, 'id' | 'createdAt'>;
  products: Product[];
  /** All solids the rider selected in setup, even those the auto-plan allocated zero of. */
  availableSolids?: Product[];
  onSolidQuantityChange?: (productId: string, quantity: number) => void;
  section?: 'all' | 'pack' | 'guide' | 'metrics';
}

function TargetBar({ planned, needed }: { planned: number; needed: number }) {
  const delta = planned - needed;
  const absDelta = Math.abs(delta);
  const pct = needed > 0 ? Math.min((planned / needed) * 100, 120) : 0;

  let barColor = 'bg-success-500';
  let textColor = 'text-success-700';
  let statusLabel = 'On target';
  if (absDelta > 10) {
    barColor = 'bg-error-600';
    textColor = 'text-error-700';
    statusLabel = 'Off target';
  } else if (absDelta > 5) {
    barColor = 'bg-warning-500';
    textColor = 'text-warning-700';
    statusLabel = 'Close';
  }

  const sign = delta >= 0 ? '+' : '';

  return (
    <div className="surface-note p-3.5 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-kicker text-[0.68rem]">Target</p>
          <p className="mt-2 text-sm leading-6 text-ink-700 tabular-nums">
            Planned {planned}g • target {needed}g
          </p>
        </div>
        <p className={`font-sans text-[1.15rem] font-semibold leading-none tabular-nums ${textColor}`}>
          {sign}
          {delta}g
        </p>
      </div>
      <div
        className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-shell-200"
        role="img"
        aria-label={`${statusLabel}: planned ${planned} of ${needed} grams (${sign}${delta}g)`}
      >
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs leading-5 text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-success-500" />
          On target (within 5g)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-warning-500" />
          Close (within 10g)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-error-600" />
          Off target
        </span>
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
  products,
  availableSolids,
  onSolidQuantityChange,
  section = 'all',
}: FuelResultProps) {
  const totalCaloriesPlanned =
    plan.summary.totalCaloriesPlanned ??
    Math.round(plan.summary.totalCarbsPlanned * 4);
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

  const showPack = section === 'all' || section === 'pack';
  const showGuide = section === 'all' || section === 'guide';
  const showMetrics = section === 'all' || section === 'metrics';

  return (
    <div className="space-y-3 md:space-y-4">
      {showMetrics && plan.warnings && plan.warnings.length > 0 && (
        <Card className="overflow-hidden border-warning-200 bg-warning-50">
          <CardHeader className="space-y-2 bg-white/35">
            <h3 className="section-title text-lg text-warning-700">Warnings</h3>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.warnings.map((warning, i) => (
              <p
                key={i}
                className="flex items-start gap-1.5 text-sm leading-6 text-warning-700"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                  className="mt-1 h-3.5 w-3.5 shrink-0"
                >
                  <path
                    d="M8 1.75 14.5 13.5h-13L8 1.75Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 6.5v3.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="8" cy="11.5" r="0.85" fill="currentColor" />
                </svg>
                <span>{warning.message}</span>
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
          <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
            <h3 className="section-title">Stats</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 md:gap-3 xl:grid-cols-5">
              <div className="surface-note p-3.5 md:p-4">
                <p className="page-stat-label">Duration</p>
                <p className="page-stat-value">{formatDuration(plan.rideCharacteristics.durationMinutes)}</p>
              </div>
              <div className="surface-note p-3.5 md:p-4">
                <p className="page-stat-label">Hydration</p>
                <p className="page-stat-value">{plan.summary.hydrationMl}ml</p>
              </div>
              <div className="surface-note p-3.5 md:p-4">
                <p className="page-stat-label">Total Carbs</p>
                <p className="page-stat-value text-brand-700">{plan.summary.totalCarbsPlanned}g</p>
              </div>
              <div className="surface-note p-3.5 md:p-4">
                <p className="page-stat-label">Calories</p>
                <p className="page-stat-value">{totalCaloriesPlanned} kcal</p>
              </div>
              <div className="surface-note p-3.5 md:p-4">
                <p className="page-stat-label">Carbs / Hour</p>
                <p className="page-stat-value">{carbsPerHour}g</p>
              </div>
              {plan.summary.sodiumMgPerHour !== undefined && (
                <div className="surface-note p-3.5 md:p-4">
                  <p className="page-stat-label">Sodium / Hour</p>
                  <p className="page-stat-value">{plan.summary.sodiumMgPerHour}mg</p>
                </div>
              )}
              {plan.summary.sodiumMgTotal !== undefined && (
                <div className="surface-note p-3.5 md:p-4">
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
          <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
            <h3 className="section-title">Pack list</h3>
            <p className="section-copy hidden md:block">Amounts are shown per fill.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <TargetBar
              planned={plan.summary.totalCarbsPlanned}
              needed={plan.summary.totalCarbsNeeded}
            />

            {plan.bottles.length > 0 && (
              <div className="space-y-3">
                {plan.bottles.map((alloc, i) => {
                  const product = products.find((p) => p.id === alloc.productId);
                  const concentration = alloc.capacityMl > 0
                    ? alloc.carbsTotal / alloc.capacityMl
                    : 0;
                  const fillCount = refuelStops + 1;

                  return (
                    <div
                      key={i}
                      className="grid gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-white px-3 py-3 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-4 md:px-4 md:py-4"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-shell-100 font-sans text-sm font-semibold text-ink-900 tabular-nums md:h-10 md:w-10">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <p className="font-semibold text-ink-900">
                          Bottle {i + 1} of {plan.bottles.length}
                          {refuelStops > 0 && (
                            <span className="ml-2 text-xs font-medium text-brand-700 tabular-nums">
                              &times;{fillCount} fills
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-ink-600 tabular-nums">
                          {alloc.capacityMl}ml • {alloc.isWaterOnly ? 'Water only' : product?.name}
                        </p>
                        {!alloc.isWaterOnly && (
                          <p className="text-sm leading-6 text-ink-600 tabular-nums">
                            {alloc.carbsTotal}g carbs • ~{alloc.mixScoops} scoops •{' '}
                            {(concentration * 100).toFixed(1)}g per 100ml
                          </p>
                        )}
                      </div>
                      <div className="text-left md:text-right">
                        {alloc.isWaterOnly ? (
                          <>
                            <p className="font-sans text-[1.05rem] font-semibold leading-none text-ink-900">
                              Water
                            </p>
                            <p className="mt-2 text-sm leading-6 text-ink-600">
                              Carry plain water.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-sans text-[1.15rem] font-semibold leading-none text-brand-700 tabular-nums">
                              {alloc.mixGrams}g mix
                            </p>
                            <p className="mt-2 text-sm leading-6 text-ink-600 tabular-nums">
                              Add to {alloc.capacityMl}ml bottle
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(() => {
              const editable = Boolean(onSolidQuantityChange && availableSolids);
              const solidsByProductId = new Map(
                plan.solids.map((alloc) => [alloc.productId, alloc])
              );

              const rows = editable
                ? availableSolids!.map((product) => {
                    const alloc = solidsByProductId.get(product.id);
                    return {
                      product,
                      quantity: alloc?.quantity ?? 0,
                      carbsTotal: alloc?.carbsTotal ?? 0,
                      timingIntervalMinutes:
                        alloc?.timingIntervalMinutes ?? 0,
                    };
                  })
                : plan.solids.map((alloc) => ({
                    product: products.find((p) => p.id === alloc.productId),
                    quantity: alloc.quantity,
                    carbsTotal: alloc.carbsTotal,
                    timingIntervalMinutes: alloc.timingIntervalMinutes,
                  }));

              if (rows.length === 0) return null;

              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="section-title text-lg">Solids</h4>
                    {editable && (
                      <p className="text-xs leading-5 text-ink-500">
                        Tap +/− to adjust — the plan rebalances automatically.
                      </p>
                    )}
                  </div>
                  {rows.map((row, i) => {
                    const productId = row.product?.id ?? '';
                    const isEmpty = row.quantity === 0;
                    return (
                      <div
                        key={`${productId}-${i}`}
                        className={`grid gap-3 rounded-2xl border bg-white px-3 py-3 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-4 md:px-4 md:py-4 ${
                          editable && isEmpty
                            ? 'border-dashed border-[color:var(--border-soft)] bg-shell-50/40'
                            : 'border-[color:var(--border-soft)]'
                        }`}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-shell-100 font-sans text-sm font-semibold text-ink-900 tabular-nums md:h-10 md:w-10">
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div>
                          <p
                            className={`font-semibold ${
                              isEmpty && editable
                                ? 'text-ink-700'
                                : 'text-ink-900'
                            }`}
                          >
                            {row.product?.name || 'Solid fuel'}
                          </p>
                          {row.quantity > 0 ? (
                            <p className="mt-1 text-sm leading-6 text-ink-600 tabular-nums">
                              {row.carbsTotal}g carbs total • aim for one every ~
                              {row.timingIntervalMinutes} minutes
                            </p>
                          ) : (
                            <p className="mt-1 text-sm leading-6 text-ink-500 tabular-nums">
                              {row.product
                                ? `${row.product.nutrition.carbsGrams}g carbs each • not in plan`
                                : 'Not in plan'}
                            </p>
                          )}
                        </div>
                        {onSolidQuantityChange && productId ? (
                          <Stepper
                            value={row.quantity}
                            onChange={(qty) =>
                              onSolidQuantityChange(productId, qty)
                            }
                            min={0}
                            max={20}
                          />
                        ) : (
                          <div className="text-left md:text-right">
                            <p className="font-sans text-[1.15rem] font-semibold leading-none text-brand-700 tabular-nums">
                              x{row.quantity}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-ink-600">
                              Quantity
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {refuelStops > 0 && (
              <div className="surface-note border-brand-200 bg-[color:color-mix(in_oklch,var(--color-brand-50)_58%,white)] p-4">
                <p className="section-kicker text-[0.68rem]">Refills</p>
                <p className="mt-2 font-semibold text-ink-900 tabular-nums">
                  Prepare {refuelStops + 1} fill set{refuelStops === 0 ? '' : 's'}.
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-600">
                  Amounts above are per fill.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showGuide && plan.consumptionGuide.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
            <h3 className="section-title">Ride guide</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.consumptionGuide.map((item, i) => (
              <div
                key={`${item.timeOffsetMinutes}-${i}`}
                className="grid gap-2.5 rounded-2xl border border-[color:var(--border-soft)] bg-white px-3 py-3 md:grid-cols-[auto_1fr_auto] md:items-start md:gap-3 md:px-4 md:py-4"
              >
                <div className="rounded-lg border border-brand-200 bg-brand-100 px-3 py-2 font-sans text-sm font-semibold text-brand-800 tabular-nums">
                  {formatTime(item.timeOffsetMinutes)}
                </div>
                <p className="text-sm leading-6 text-ink-900">{item.action}</p>
                <p className="text-sm leading-6 text-ink-600 tabular-nums md:text-right">
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

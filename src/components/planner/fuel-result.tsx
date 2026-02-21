import {
  Card,
  CardHeader,
  CardContent,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Stepper,
} from '@/components/ui';
import { formatTime } from '@/lib/calculator/timing';
import { NeedsIntensityBar } from './needs-intensity-bar';
import type { FuelPlan, Bottle, Product } from '@/types';

interface FuelResultProps {
  plan: Omit<FuelPlan, 'id' | 'createdAt'>;
  bottles: Bottle[];
  products: Product[];
  onSolidQuantityChange?: (productId: string, quantity: number) => void;
  onBottleCountChange?: (count: number) => void;
}

function TargetBar({ planned, needed }: { planned: number; needed: number }) {
  const delta = planned - needed;
  const absDelta = Math.abs(delta);
  const pct = needed > 0 ? Math.min((planned / needed) * 100, 120) : 0;

  let barColor = 'bg-emerald-500';
  let textColor = 'text-emerald-700';
  if (absDelta > 10) {
    barColor = 'bg-red-500';
    textColor = 'text-red-700';
  } else if (absDelta > 5) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-700';
  }

  const sign = delta >= 0 ? '+' : '';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{planned}g planned / {needed}g target</span>
        <span className={`font-medium ${textColor}`}>
          {sign}{delta}g
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function FuelResult({
  plan,
  bottles,
  products,
  onSolidQuantityChange,
  onBottleCountChange,
}: FuelResultProps) {
  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

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

  return (
    <div className="space-y-4">
      {plan.warnings && plan.warnings.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-3">
            {plan.warnings.map((warning, i) => (
              <p key={i} className="text-amber-800 text-sm">
                {warning.message}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Target progress bar */}
      <TargetBar
        planned={plan.summary.totalCarbsPlanned}
        needed={plan.summary.totalCarbsNeeded}
      />

      <Card>
        <CardHeader>
          <h3 className="font-semibold">Summary</h3>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Duration</dt>
              <dd className="text-lg font-bold">
                {formatDuration(plan.rideCharacteristics.durationMinutes)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Hydration</dt>
              <dd className="text-lg font-bold">{plan.summary.hydrationMl}ml</dd>
            </div>
            <div>
              <dt className="text-gray-500">Total Carbs</dt>
              <dd className="text-lg font-bold text-brand-600">
                {plan.summary.totalCarbsPlanned}g
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Carbs/Hour</dt>
              <dd className="text-lg font-bold">{carbsPerHour}g/hr</dd>
            </div>
            {plan.summary.sodiumMgPerHour !== undefined && (
              <div>
                <dt className="text-gray-500">Sodium / Hour</dt>
                <dd className="text-lg font-bold">
                  {plan.summary.sodiumMgPerHour}mg/hr
                </dd>
              </div>
            )}
            {plan.summary.sodiumMgTotal !== undefined && (
              <div>
                <dt className="text-gray-500">Total Sodium</dt>
                <dd className="text-lg font-bold">
                  {plan.summary.sodiumMgTotal}mg
                </dd>
              </div>
            )}
          </dl>
          {autoMetrics?.needsScore !== undefined && autoMetrics?.needsLevel && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <NeedsIntensityBar
                score={autoMetrics.needsScore}
                level={autoMetrics.needsLevel}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {plan.bottles.length > 0 && (
        <Collapsible defaultOpen>
          <Card>
            <CardHeader>
              <CollapsibleTrigger className="px-0 py-0 rounded-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <h3 className="font-semibold">Bottles</h3>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-3">
                {plan.bottles.map((alloc, i) => {
                  const bottle = bottles.find((b) => b.id === alloc.bottleId);
                  const product = products.find((p) => p.id === alloc.productId);
                  const concentration =
                    bottle && bottle.capacityMl > 0
                      ? alloc.carbsTotal / bottle.capacityMl
                      : 0;
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {bottle?.name || `Bottle ${i + 1}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {bottle?.capacityMl}ml • {product?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        {alloc.isWaterOnly ? (
                          <p className="text-lg font-bold text-blue-500">Water only</p>
                        ) : (
                          <>
                            <p className="text-lg font-bold text-brand-600">
                              {alloc.mixGrams}g
                            </p>
                            <p className="text-sm text-gray-500">
                              ~{alloc.mixScoops} scoops • {alloc.carbsTotal}g carbs •{' '}
                              {(concentration * 100).toFixed(1)}g/100ml
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {onBottleCountChange && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-600">Bottles</span>
                    <Stepper
                      value={currentBottleCount}
                      onChange={onBottleCountChange}
                      min={1}
                      max={availableBottleCount}
                    />
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {plan.solids.length > 0 && (
        <Collapsible defaultOpen>
          <Card>
            <CardHeader>
              <CollapsibleTrigger className="px-0 py-0 rounded-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <h3 className="font-semibold">Solids</h3>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-3">
                {plan.solids.map((alloc, i) => {
                  const product = products.find((p) => p.id === alloc.productId);
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {product?.name || 'Solid fuel'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {alloc.carbsTotal}g carbs • every ~{alloc.timingIntervalMinutes}min
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
                        <p className="text-lg font-bold text-brand-600">
                          x{alloc.quantity}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {refuelStops > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-3">
            <p className="text-blue-800 text-sm font-medium">
              Prepare {refuelStops + 1} sets of mix (amounts shown are per fill)
            </p>
            <p className="text-blue-700 text-xs mt-1">
              Refill your bottles {refuelStops} time{refuelStops > 1 ? 's' : ''} during the ride
            </p>
          </CardContent>
        </Card>
      )}

      {plan.consumptionGuide.length > 0 && (
        <Collapsible defaultOpen={false}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger className="px-0 py-0 rounded-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <div>
                  <h3 className="font-semibold">Consumption Guide</h3>
                  <p className="text-xs text-gray-500">
                    {plan.consumptionGuide.length} fueling events
                  </p>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2">
                  {plan.consumptionGuide.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 text-sm py-2 border-b border-gray-100 last:border-0"
                    >
                      <span className="font-mono text-gray-500 w-14 shrink-0">
                        {formatTime(item.timeOffsetMinutes)}
                      </span>
                      <span className="flex-1">{item.action}</span>
                      <span className="text-gray-500 shrink-0">
                        {item.cumulativeCarbs}g total
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}

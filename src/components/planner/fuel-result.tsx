import { Card, CardHeader, CardContent } from '@/components/ui';
import { formatTime } from '@/lib/calculator/timing';
import { NeedsIntensityBar } from './needs-intensity-bar';
import type { FuelPlan, Bottle, Product } from '@/types';

interface FuelResultProps {
  plan: Omit<FuelPlan, 'id' | 'createdAt'>;
  bottles: Bottle[];
  products: Product[];
}

export function FuelResult({ plan, bottles, products }: FuelResultProps) {
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

  const nonWaterConcentrations = plan.bottles
    .filter((alloc) => !alloc.isWaterOnly)
    .map((alloc) => {
      const bottle = bottles.find((b) => b.id === alloc.bottleId);
      if (!bottle || bottle.capacityMl <= 0) return 0;
      return alloc.carbsTotal / bottle.capacityMl;
    });
  const concentrationVariance =
    nonWaterConcentrations.length > 1
      ? Math.max(...nonWaterConcentrations) - Math.min(...nonWaterConcentrations)
      : 0;
  const hasBalancedConcentrations =
    nonWaterConcentrations.length >= 2 && concentrationVariance <= 0.01;

  return (
    <div className="space-y-4">
      {plan.warnings && plan.warnings.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4">
            {plan.warnings.map((warning, i) => (
              <p key={i} className="text-amber-800 text-sm">
                <span className="font-semibold">Warning:</span> {warning.message}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bottles</h3>
              {hasBalancedConcentrations && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  Balanced concentration
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                          {concentration.toFixed(3)} g/ml
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {plan.solids.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Recommended Solids</h3>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      Every ~{alloc.timingIntervalMinutes}min
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-brand-600">
                      x{alloc.quantity}
                    </p>
                    <p className="text-sm text-gray-500">
                      {alloc.carbsTotal}g carbs
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
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
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Consumption Guide</h3>
          </CardHeader>
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
        </Card>
      )}
    </div>
  );
}

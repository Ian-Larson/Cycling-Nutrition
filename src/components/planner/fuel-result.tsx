import { Card, CardHeader, CardContent } from '@/components/ui';
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

  return (
    <div className="space-y-4">
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
          </dl>
        </CardContent>
      </Card>

      {plan.bottles.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Bottles</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.bottles.map((alloc, i) => {
              const bottle = bottles.find((b) => b.id === alloc.bottleId);
              const product = products.find((p) => p.id === alloc.productId);
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
                    <p className="text-lg font-bold text-brand-600">
                      {alloc.mixGrams}g
                    </p>
                    <p className="text-sm text-gray-500">
                      ~{alloc.mixScoops} scoops • {alloc.carbsTotal}g carbs
                    </p>
                  </div>
                </div>
              );
            })}
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
                    {item.timeOffsetMinutes}min
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

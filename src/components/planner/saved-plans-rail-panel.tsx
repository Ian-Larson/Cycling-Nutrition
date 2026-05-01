import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { FuelResult } from '@/components/planner/fuel-result';
import {
  formatDateTime,
  formatDuration,
  getFuelResultPlan,
} from '@/lib/planner/planner-summaries';
import type { FuelPlan, Product } from '@/types';
import { NutritionRailPanel } from './nutrition-rail';

interface SavedPlansRailPanelProps {
  plans: FuelPlan[];
  products: Product[];
  onReusePlan: (plan: FuelPlan) => void;
  onDeletePlan: (planId: string) => void;
}

export function SavedPlansRailPanel({
  plans,
  products,
  onReusePlan,
  onDeletePlan,
}: SavedPlansRailPanelProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    [plans]
  );

  useEffect(() => {
    if (!confirmingDeleteId) return;
    const timer = window.setTimeout(() => setConfirmingDeleteId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmingDeleteId]);

  return (
    <NutritionRailPanel
      title="Saved plans"
      summary={plans.length === 0 ? 'No saved plans' : `${plans.length} saved`}
    >
      {sortedPlans.length === 0 ? (
        <p className="rounded-xl border border-[color:var(--border-soft)] bg-shell-50 px-3 py-3 text-sm leading-5 text-ink-600">
          Saved plans will appear here after you build and save one.
        </p>
      ) : (
        <div className="space-y-2.5">
          {sortedPlans.map((plan) => {
            const isConfirming = confirmingDeleteId === plan.id;
            const isExpanded = expandedPlanId === plan.id;
            const totalCalories =
              plan.summary.totalCaloriesPlanned ??
              Math.round(plan.summary.totalCarbsPlanned * 4);

            return (
              <article
                key={plan.id}
                className="overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-white"
              >
                <div className="space-y-2 px-3 py-3">
                  <div className="space-y-1">
                    <p className="section-kicker text-[0.66rem] text-ink-500">
                      {formatDateTime(plan.createdAt)}
                    </p>
                    <h3 className="truncate text-sm font-semibold text-ink-900">
                      {plan.title ||
                        `${formatDuration(plan.rideCharacteristics.durationMinutes)} ${plan.rideCharacteristics.intensity} plan`}
                    </h3>
                    <p className="text-xs leading-5 text-ink-600">
                      {plan.summary.totalCarbsPlanned}g carbs · {totalCalories}{' '}
                      kcal · {plan.summary.hydrationMl}ml
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      onClick={() => onReusePlan(plan)}
                    >
                      Reuse
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedPlanId((current) =>
                          current === plan.id ? null : plan.id
                        )
                      }
                    >
                      {isExpanded ? 'Hide' : 'Details'}
                    </Button>
                    {isConfirming ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="col-span-2 w-full"
                        onClick={() => onDeletePlan(plan.id)}
                      >
                        Confirm delete
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="col-span-2 w-full"
                        onClick={() => setConfirmingDeleteId(plan.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded ? (
                  <div className="border-t border-[color:var(--border-soft)] p-3">
                    <FuelResult plan={getFuelResultPlan(plan)} products={products} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </NutritionRailPanel>
  );
}

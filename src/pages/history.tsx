import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import { Card, CardContent, Button } from '@/components/ui';
import { PageIntro } from '@/components/layout/page-intro';
import { SectionNav } from '@/components/layout/section-nav';
import { FuelResult } from '@/components/planner/fuel-result';
import type { FuelPlan } from '@/types';

function getFuelResultPlan(plan: FuelPlan): Omit<FuelPlan, 'id' | 'createdAt'> {
  const { id, createdAt, ...rest } = plan;
  void id;
  void createdAt;
  return rest;
}

export function HistoryPage() {
  const navigate = useNavigate();
  const fuelPlans = useStore((s) => s.fuelPlans);
  const deleteFuelPlan = useStore((s) => s.deleteFuelPlan);
  const setPlannerDraft = useStore((s) => s.setPlannerDraft);
  const products = useStore((s) => s.products);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!confirmingDeleteId) return;
    const timer = setTimeout(() => setConfirmingDeleteId(null), 4000);
    return () => clearTimeout(timer);
  }, [confirmingDeleteId]);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const sortedPlans = [...fuelPlans].sort((a, b) => b.createdAt - a.createdAt);

  const toggleExpanded = (planId: string) => {
    setExpandedPlanIds((previous) => {
      const next = new Set(previous);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const handleDeletePlan = (planId: string) => {
    deleteFuelPlan(planId);
    setConfirmingDeleteId((current) => (current === planId ? null : current));
    setExpandedPlanIds((previous) => {
      if (!previous.has(planId)) {
        return previous;
      }
      const next = new Set(previous);
      next.delete(planId);
      return next;
    });
  };

  const handleReusePlan = (plan: FuelPlan) => {
    // Derive bottle counts from the saved allocation's capacityMl
    const selectedBottleCounts = { 550: 0, 750: 0, 950: 0 } as Record<number, number>;
    for (const alloc of plan.bottles) {
      const cap = alloc.capacityMl;
      selectedBottleCounts[cap] = (selectedBottleCounts[cap] ?? 0) + 1;
    }

    const selectedDrinkMixId =
      plan.bottles.find((allocation) => !allocation.isWaterOnly)?.productId ?? null;
    const selectedSolidIds = plan.solids.map((solid) => solid.productId);

    const usedProductIds = [
      ...(selectedDrinkMixId ? [selectedDrinkMixId] : []),
      ...selectedSolidIds,
    ];
    const includeUnavailableProducts = usedProductIds.some((productId) => {
      const product = products.find((candidate) => candidate.id === productId);
      return product ? !product.isAvailable : false;
    });

    setPlannerDraft({
      ride: plan.rideCharacteristics,
      selectedBottleCounts: {
        550: selectedBottleCounts[550] ?? 0,
        750: selectedBottleCounts[750] ?? 0,
        950: selectedBottleCounts[950] ?? 0,
      },
      selectedDrinkMixId,
      selectedSolidIds,
      includeUnavailableProducts,
      title: plan.title,
    });

    navigate('/?reuse=1');
  };

  return (
    <div className="page-shell max-w-6xl space-y-4 md:space-y-6">
      <PageIntro
        title="Saved plans"
        description={
          <>
            Reuse a saved plan.
          </>
        }
      />

      <SectionNav section="nutrition" />

      <div role="status" aria-live="polite" className="sr-only">
        {confirmingDeleteId
          ? 'Confirm delete within 4 seconds or the request will cancel.'
          : ''}
      </div>

      {sortedPlans.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center md:py-12">
            <p className="text-ink-600">No plans saved yet.</p>
            <div className="mt-4">
              <Button className="w-full sm:w-auto" onClick={() => navigate('/')}>
                Create plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 md:space-y-3.5">
          {sortedPlans.map((plan) => {
            const totalCaloriesPlanned =
              plan.summary.totalCaloriesPlanned ??
              Math.round(plan.summary.totalCarbsPlanned * 4);
            const bottleNames = plan.bottles
              .map((b, i) => `Bottle ${i + 1} (${b.capacityMl}ml)`)
              .join(', ');

            const isConfirming = confirmingDeleteId === plan.id;
            const isExpanded = expandedPlanIds.has(plan.id);
            const planDetails = getFuelResultPlan(plan);

            return (
              <Card key={plan.id} className="overflow-hidden">
                <CardContent className="space-y-3 py-3.5 md:px-4 md:py-4 lg:px-5">
                  <div className="space-y-3 md:grid md:grid-cols-[minmax(0,1fr)_11rem] md:items-start md:gap-4 md:space-y-0">
                    <div className="space-y-2 md:space-y-2.5">
                      <p className="section-kicker text-[0.66rem] text-ink-500">
                        {formatDate(plan.createdAt)}
                      </p>
                      <div className="space-y-1.5">
                        {plan.title ? (
                          <p className="font-sans text-[1rem] font-semibold leading-tight text-ink-900 md:text-[1.12rem]">
                            {plan.title}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-ink-600 md:leading-6">
                          <span className="font-medium capitalize text-ink-900">
                            {formatDuration(plan.rideCharacteristics.durationMinutes)}
                          </span>
                          <span aria-hidden>•</span>
                          <span className="capitalize">
                            {plan.rideCharacteristics.intensity} ride
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:hidden">
                        <div className="surface-note px-3 py-2.5">
                          <p className="page-stat-label">Carbs</p>
                          <p className="font-sans text-[1.02rem] font-semibold leading-none text-brand-700 tabular-nums">
                            {plan.summary.totalCarbsPlanned}g
                          </p>
                        </div>
                        <div className="surface-note px-3 py-2.5">
                          <p className="page-stat-label">Calories</p>
                          <p className="font-sans text-[1.02rem] font-semibold leading-none text-ink-900 tabular-nums">
                            {totalCaloriesPlanned} kcal
                          </p>
                        </div>
                        <div className="surface-note px-3 py-2.5">
                          <p className="page-stat-label">Hydration</p>
                          <p className="font-sans text-[1.02rem] font-semibold leading-none text-ink-900 tabular-nums">
                            {plan.summary.hydrationMl}ml
                          </p>
                        </div>
                        {plan.summary.sodiumMgPerHour !== undefined && (
                          <div className="surface-note px-3 py-2.5">
                            <p className="page-stat-label">Sodium / Hour</p>
                            <p className="font-sans text-[1.02rem] font-semibold leading-none text-ink-900 tabular-nums">
                              {plan.summary.sodiumMgPerHour}mg
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="hidden md:flex md:flex-wrap md:gap-2">
                        <div className="surface-note min-w-[7.25rem] px-3 py-2">
                          <p className="page-stat-label">Carbs</p>
                          <p className="font-sans text-[0.98rem] font-semibold leading-none text-brand-700">
                            {plan.summary.totalCarbsPlanned}g
                          </p>
                        </div>
                        <div className="surface-note min-w-[7.75rem] px-3 py-2">
                          <p className="page-stat-label">Calories</p>
                          <p className="font-sans text-[0.98rem] font-semibold leading-none text-ink-900 tabular-nums">
                            {totalCaloriesPlanned} kcal
                          </p>
                        </div>
                        <div className="surface-note min-w-[7.75rem] px-3 py-2">
                          <p className="page-stat-label">Hydration</p>
                          <p className="font-sans text-[0.98rem] font-semibold leading-none text-ink-900 tabular-nums">
                            {plan.summary.hydrationMl}ml
                          </p>
                        </div>
                        {plan.summary.sodiumMgPerHour !== undefined && (
                          <div className="surface-note min-w-[8.25rem] px-3 py-2">
                            <p className="page-stat-label">Sodium / Hour</p>
                            <p className="font-sans text-[0.98rem] font-semibold leading-none text-ink-900 tabular-nums">
                              {plan.summary.sodiumMgPerHour}mg
                            </p>
                          </div>
                        )}
                      </div>

                      {bottleNames && (
                        <p className="hidden text-sm leading-5 text-ink-600 md:block">
                          Bottles: {bottleNames}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleReusePlan(plan)}
                      >
                        Reuse
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => toggleExpanded(plan.id)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? 'Hide' : 'Details'}
                        </Button>
                        {isConfirming ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeletePlan(plan.id)}
                            className="relative w-full overflow-hidden"
                          >
                            Confirm?
                            <span
                              aria-hidden
                              className="absolute bottom-0 left-0 h-0.5 bg-white/50 animate-[shrink_4s_linear_forwards] motion-reduce:hidden"
                            />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setConfirmingDeleteId(plan.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-[color:var(--border-soft)] pt-3 md:pt-4">
                      <FuelResult
                        plan={planDetails}
                        products={products}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

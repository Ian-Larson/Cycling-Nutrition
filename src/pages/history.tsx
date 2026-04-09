import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import { Card, CardContent, Button } from '@/components/ui';
import { PageIntro } from '@/components/layout/page-intro';
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
  const bottles = useStore((s) => s.bottles);
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
    const selectedBottleIds = Array.from(
      new Set(plan.bottles.map((allocation) => allocation.bottleId))
    );
    const selectedDrinkMixId =
      plan.bottles.find((allocation) => !allocation.isWaterOnly)?.productId ?? null;
    const selectedSolidIds = plan.solids.map((solid) => solid.productId);

    const includeUnavailableBottles = plan.bottles.some((allocation) => {
      const bottle = bottles.find((candidate) => candidate.id === allocation.bottleId);
      return bottle ? !bottle.isAvailable : false;
    });

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
      selectedBottleIds,
      selectedDrinkMixId,
      selectedSolidIds,
      includeUnavailableBottles,
      includeUnavailableProducts,
      title: plan.title,
    });

    navigate('/?step=2');
  };

  return (
    <div className="page-shell space-y-4 md:space-y-6">
      <PageIntro
        eyebrow="History"
        title="Saved plans"
        description={
          <>
            Open or reuse a saved plan.
          </>
        }
        meta={
          <div className="page-stat-grid">
            <div className="page-stat">
              <p className="page-stat-label">Plans</p>
              <p className="page-stat-value">{sortedPlans.length}</p>
              <p className="page-stat-copy">Newest first</p>
            </div>
          </div>
        }
      />

      {sortedPlans.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center md:py-12">
            <p className="text-ink-600">No saved plans.</p>
            <div className="mt-4">
              <Button className="w-full sm:w-auto" onClick={() => navigate('/')}>
                Planner
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {sortedPlans.map((plan) => {
            const totalCaloriesPlanned =
              plan.summary.totalCaloriesPlanned ??
              Math.round(plan.summary.totalCarbsPlanned * 4);
            const bottleNames = plan.bottles
              .map((b) => bottles.find((bt) => bt.id === b.bottleId)?.name)
              .filter(Boolean)
              .join(', ');

            const isConfirming = confirmingDeleteId === plan.id;
            const isExpanded = expandedPlanIds.has(plan.id);
            const planDetails = getFuelResultPlan(plan);

            return (
              <Card key={plan.id} className="overflow-hidden">
                <CardContent className="space-y-3 py-3.5 md:space-y-4 md:py-5">
                  <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2.5 md:space-y-3">
                      <p className="section-kicker text-[0.66rem] text-ink-500">
                        {formatDate(plan.createdAt)}
                      </p>
                      {plan.title ? (
                        <>
                          <p className="font-sans text-[1rem] font-semibold leading-tight text-ink-900 md:text-[1.25rem]">
                            {plan.title}
                          </p>
                          <p className="text-sm leading-5 capitalize text-ink-600 md:leading-6">
                            {formatDuration(plan.rideCharacteristics.durationMinutes)} •{' '}
                            {plan.rideCharacteristics.intensity} ride
                          </p>
                        </>
                      ) : (
                        <p className="font-sans text-[1rem] font-semibold leading-tight capitalize text-ink-900 md:text-[1.25rem]">
                          {formatDuration(plan.rideCharacteristics.durationMinutes)} •{' '}
                          {plan.rideCharacteristics.intensity} ride
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        <div className="surface-note px-3 py-2.5 md:px-4 md:py-3">
                          <p className="page-stat-label">Carbs</p>
                          <p className="font-sans text-[1.05rem] font-semibold leading-none text-brand-700">
                            {plan.summary.totalCarbsPlanned}g
                          </p>
                        </div>
                        <div className="surface-note px-3 py-2.5 md:px-4 md:py-3">
                          <p className="page-stat-label">Calories</p>
                          <p className="font-sans text-[1.05rem] font-semibold leading-none text-ink-900">
                            {totalCaloriesPlanned} kcal
                          </p>
                        </div>
                        <div className="surface-note px-3 py-2.5 md:px-4 md:py-3">
                          <p className="page-stat-label">Hydration</p>
                          <p className="font-sans text-[1.05rem] font-semibold leading-none text-ink-900">
                            {plan.summary.hydrationMl}ml
                          </p>
                        </div>
                        {plan.summary.sodiumMgPerHour !== undefined && (
                          <div className="surface-note px-3 py-2.5 md:px-4 md:py-3">
                            <p className="page-stat-label">Sodium / Hour</p>
                            <p className="font-sans text-[1.05rem] font-semibold leading-none text-ink-900">
                              {plan.summary.sodiumMgPerHour}mg
                            </p>
                          </div>
                        )}
                      </div>
                      {bottleNames && (
                        <p className="text-sm leading-5 text-ink-600 md:leading-6">
                          Bottles: {bottleNames}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center lg:justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="col-span-2 w-full md:col-span-1 md:w-auto"
                        onClick={() => handleReusePlan(plan)}
                      >
                        Reuse
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full md:w-auto"
                        onClick={() => toggleExpanded(plan.id)}
                      >
                        {isExpanded ? 'Hide details' : 'Details'}
                      </Button>
                      {isConfirming ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeletePlan(plan.id)}
                          className="relative w-full overflow-hidden md:w-auto"
                        >
                          Confirm?
                          <span className="absolute bottom-0 left-0 h-0.5 bg-white/50 animate-[shrink_4s_linear_forwards]" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full md:w-auto"
                          onClick={() => setConfirmingDeleteId(plan.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-[color:var(--border-soft)] pt-3 md:pt-4">
                      <FuelResult
                        plan={planDetails}
                        bottles={bottles}
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

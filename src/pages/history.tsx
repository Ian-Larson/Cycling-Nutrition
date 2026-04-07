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
      selectedDrinkMixId,
      selectedSolidIds,
      includeUnavailableBottles,
      includeUnavailableProducts,
      title: plan.title,
    });

    navigate('/?step=2');
  };

  return (
    <div className="page-shell space-y-6">
      <PageIntro
        eyebrow="History"
        title="Reuse proven plans"
        description={
          <>
            Save strong setups, then reopen them as a starting point for the next
            ride. Open details when you want the full pack and timing brief again.
          </>
        }
        meta={
          <div className="page-stat-grid">
            <div className="page-stat">
              <p className="page-stat-label">Saved Plans</p>
              <p className="page-stat-value">{sortedPlans.length}</p>
              <p className="page-stat-copy">Newest plans appear first.</p>
            </div>
          </div>
        }
      />

      {sortedPlans.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-ink-600">No saved fuel plans yet.</p>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              Create a plan on the Planner page and save it to see it here
            </p>
            <div className="mt-4">
              <Button onClick={() => navigate('/')}>Go to Planner</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedPlans.map((plan) => {
            const bottleNames = plan.bottles
              .map((b) => bottles.find((bt) => bt.id === b.bottleId)?.name)
              .filter(Boolean)
              .join(', ');

            const isConfirming = confirmingDeleteId === plan.id;
            const isExpanded = expandedPlanIds.has(plan.id);
            const planDetails = getFuelResultPlan(plan);

            return (
              <Card key={plan.id} className="overflow-hidden">
                <CardContent className="space-y-4 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <p className="section-kicker text-[0.68rem] text-ink-500">
                        {formatDate(plan.createdAt)}
                      </p>
                      <p className="font-sans text-[1.65rem] font-semibold uppercase leading-none tracking-[0.06em] text-ink-900">
                        {plan.title ? `${plan.title} • ` : ''}
                        {formatDuration(plan.rideCharacteristics.durationMinutes)}{' '}
                        {plan.rideCharacteristics.intensity} ride
                      </p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="surface-note px-4 py-3">
                          <p className="page-stat-label">Carbs</p>
                          <p className="font-sans text-[1.25rem] font-semibold uppercase leading-none text-brand-700">
                            {plan.summary.totalCarbsPlanned}g
                          </p>
                        </div>
                        <div className="surface-note px-4 py-3">
                          <p className="page-stat-label">Hydration</p>
                          <p className="font-sans text-[1.25rem] font-semibold uppercase leading-none text-ink-900">
                            {plan.summary.hydrationMl}ml
                          </p>
                        </div>
                        {plan.summary.sodiumMgPerHour !== undefined && (
                          <div className="surface-note px-4 py-3">
                            <p className="page-stat-label">Sodium / Hour</p>
                            <p className="font-sans text-[1.25rem] font-semibold uppercase leading-none text-ink-900">
                              {plan.summary.sodiumMgPerHour}mg
                            </p>
                          </div>
                        )}
                      </div>
                      {bottleNames && (
                        <p className="text-sm leading-6 text-ink-600">
                          Bottles: {bottleNames}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReusePlan(plan)}
                      >
                        Reuse
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(plan.id)}
                      >
                        {isExpanded ? 'Hide details' : 'View details'}
                      </Button>
                      {isConfirming ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeletePlan(plan.id)}
                          className="relative overflow-hidden"
                        >
                          Confirm?
                          <span className="absolute bottom-0 left-0 h-0.5 bg-white/50 animate-[shrink_4s_linear_forwards]" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingDeleteId(plan.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-[color:var(--border-soft)] pt-4">
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

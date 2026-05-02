import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import { Card, CardContent, Button } from '@/components/ui';
import { PageIntro } from '@/components/layout/page-intro';
import { FuelResultV3 } from '@/components/planner/fuel-result-v3';
import { buildPlannerDraftFromSavedPlan } from '@/lib/planner/saved-plan-draft';
import {
  formatDateTime,
  formatDuration,
} from '@/lib/planner/planner-summaries';
import type { FuelPlan } from '@/types';

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
      if (!previous.has(planId)) return previous;
      const next = new Set(previous);
      next.delete(planId);
      return next;
    });
  };

  const handleReusePlan = (plan: FuelPlan) => {
    setPlannerDraft(buildPlannerDraftFromSavedPlan(plan, products));
    navigate('/?reuse=1');
  };

  return (
    <div className="page-shell space-y-4 md:space-y-6">
      <PageIntro
        title="Saved plans"
        description={<>Reuse a saved plan.</>}
      />

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
            const isConfirming = confirmingDeleteId === plan.id;
            const isExpanded = expandedPlanIds.has(plan.id);
            const during = plan.prescription.during;

            return (
              <Card key={plan.id} className="overflow-hidden">
                <CardContent className="space-y-3 py-3.5 md:px-4 md:py-4 lg:px-5">
                  <div className="space-y-3 md:grid md:grid-cols-[minmax(0,1fr)_11rem] md:items-start md:gap-4 md:space-y-0">
                    <div className="space-y-2 md:space-y-2.5">
                      <p className="section-kicker text-[0.66rem] text-ink-500">
                        {formatDateTime(plan.createdAt)}
                      </p>
                      <div className="space-y-1.5">
                        {plan.title ? (
                          <p className="font-sans text-[1rem] font-semibold leading-tight text-ink-900 md:text-[1.12rem]">
                            {plan.title}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-ink-600 md:leading-6">
                          <span className="font-medium capitalize text-ink-900">
                            {formatDuration(plan.ride.durationMinutes)}
                          </span>
                          <span aria-hidden>•</span>
                          <span className="capitalize">
                            {plan.ride.intensity} ride
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:hidden">
                        <div className="surface-note px-3 py-2.5">
                          <p className="page-stat-label">Carbs</p>
                          <p className="font-sans text-[1.02rem] font-semibold leading-none text-brand-700 tabular-nums">
                            {during.totalCarbsGrams}g
                          </p>
                        </div>
                        <div className="surface-note px-3 py-2.5">
                          <p className="page-stat-label">Hydration</p>
                          <p className="font-sans text-[1.02rem] font-semibold leading-none text-ink-900 tabular-nums">
                            {during.totalHydrationMl}ml
                          </p>
                        </div>
                        <div className="surface-note px-3 py-2.5">
                          <p className="page-stat-label">Sodium / Hour</p>
                          <p className="font-sans text-[1.02rem] font-semibold leading-none text-ink-900 tabular-nums">
                            {during.sodiumMgPerHour}mg
                          </p>
                        </div>
                        <div className="surface-note px-3 py-2.5">
                          <p className="page-stat-label">Carbs / Hour</p>
                          <p className="font-sans text-[1.02rem] font-semibold leading-none text-ink-900 tabular-nums">
                            {during.carbsGPerHour}g
                          </p>
                        </div>
                      </div>

                      <div className="hidden md:flex md:flex-wrap md:gap-2">
                        <div className="surface-note min-w-[7.25rem] px-3 py-2">
                          <p className="page-stat-label">Carbs</p>
                          <p className="font-sans text-[0.98rem] font-semibold leading-none text-brand-700">
                            {during.totalCarbsGrams}g
                          </p>
                        </div>
                        <div className="surface-note min-w-[7.75rem] px-3 py-2">
                          <p className="page-stat-label">Hydration</p>
                          <p className="font-sans text-[0.98rem] font-semibold leading-none text-ink-900 tabular-nums">
                            {during.totalHydrationMl}ml
                          </p>
                        </div>
                        <div className="surface-note min-w-[8.25rem] px-3 py-2">
                          <p className="page-stat-label">Sodium / Hour</p>
                          <p className="font-sans text-[0.98rem] font-semibold leading-none text-ink-900 tabular-nums">
                            {during.sodiumMgPerHour}mg
                          </p>
                        </div>
                      </div>
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
                      <FuelResultV3
                        section="all"
                        prescription={plan.prescription}
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

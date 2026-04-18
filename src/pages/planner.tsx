import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Toast,
} from '@/components/ui';
import { PageIntro } from '@/components/layout/page-intro';
import { SectionNav } from '@/components/layout/section-nav';
import { DebugCopyButton } from '@/components/planner/debug-copy-button';
import { FuelResult } from '@/components/planner/fuel-result';
import { FuelResultV3 } from '@/components/planner/fuel-result-v3';
import { RideForm, type RideFormSnapshot } from '@/components/planner/ride-form';
import { SetupCard } from '@/components/planner/setup-card';
import { calculateFuelPlan, recalculatePlan, type CalculatorInput } from '@/lib/calculator';
import { useFuelingEngine } from '@/hooks/use-fueling-engine';
import type { FuelingPrescription } from '@/lib/fueling';
import { useStore } from '@/store';
import type { Bottle, FuelPlan, Product, RideCharacteristics } from '@/types';
import type { PlannerDraft } from '@/store';

type PlannerStep = 1 | 2 | 3;
type ResultTab = 'pack' | 'guide' | 'metrics';

function parseInitialStep(stepParam: string | null): PlannerStep {
  if (stepParam === '2') return 2;
  if (stepParam === '3') return 3;
  return 1;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getPlanTitleSuggestion(ride: RideCharacteristics): string {
  const intensity = `${ride.intensity[0].toUpperCase()}${ride.intensity.slice(1)}`;
  return `${formatDuration(ride.durationMinutes)} ${intensity} Plan`;
}

function estimateCaloriesForCarbs(
  caloriesPerServing: number | undefined,
  carbsPerServing: number | undefined,
  carbsGrams: number
): number {
  if (!Number.isFinite(carbsGrams) || carbsGrams <= 0) return 0;

  if (
    typeof caloriesPerServing === 'number' &&
    Number.isFinite(caloriesPerServing) &&
    typeof carbsPerServing === 'number' &&
    Number.isFinite(carbsPerServing) &&
    carbsPerServing > 0
  ) {
    return Math.round((caloriesPerServing / carbsPerServing) * carbsGrams);
  }

  return Math.round(carbsGrams * 4);
}

function isPlannerDraftShape(value: unknown): value is PlannerDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<PlannerDraft>;
  const ride = draft.ride as Partial<RideCharacteristics> | undefined;

  if (!ride || typeof ride !== 'object') return false;
  if (
    typeof ride.durationMinutes !== 'number' ||
    !Number.isFinite(ride.durationMinutes) ||
    ride.durationMinutes <= 0
  ) {
    return false;
  }
  if (
    typeof ride.carbTargetGramsPerHour !== 'number' ||
    !Number.isFinite(ride.carbTargetGramsPerHour) ||
    ride.carbTargetGramsPerHour < 0
  ) {
    return false;
  }
  if (
    !['recovery', 'endurance', 'tempo', 'threshold', 'race'].includes(
      String(ride.intensity)
    )
  ) {
    return false;
  }
  if (!['cool', 'moderate', 'warm', 'hot'].includes(String(ride.heatFactor))) {
    return false;
  }

  return true;
}

function getRideFormSnapshotFromRide(
  ride: RideCharacteristics
): Partial<RideFormSnapshot> {
  return {
    planningMode: ride.planningMode ?? 'manual',
    durationMinutes: ride.durationMinutes,
    intensity: ride.intensity,
    heatFactor: ride.heatFactor,
    carbTarget: ride.carbTargetGramsPerHour,
    refuelStops: ride.refuelStops ?? 0,
    autoInputPair: ride.autoMetrics?.inputPair ?? 'duration_if',
    autoDurationInput:
      ride.autoMetrics?.userProvidedDurationMinutes !== undefined
        ? String(Math.round(ride.autoMetrics.userProvidedDurationMinutes))
        : String(ride.durationMinutes),
    autoIfInput:
      ride.autoMetrics?.userProvidedIntensityFactor !== undefined
        ? String(ride.autoMetrics.userProvidedIntensityFactor)
        : String(ride.autoMetrics?.intensityFactor ?? 0.8),
    autoTssInput:
      ride.autoMetrics?.userProvidedTss !== undefined
        ? String(Math.round(ride.autoMetrics.userProvidedTss))
        : String(Math.round(ride.autoMetrics?.tss ?? 120)),
    autoCarbOverrideInput: ride.autoMetrics?.carbOverrideApplied
      ? String(ride.carbTargetGramsPerHour)
      : '',
  };
}

function getDefaultSelectedBottleIds(
  bottles: Bottle[],
  draft: PlannerDraft | null
): string[] {
  if (draft?.selectedBottleIds) {
    return draft.selectedBottleIds.filter((id) =>
      bottles.some((bottle) => bottle.id === id)
    );
  }

  return bottles.filter((bottle) => bottle.isAvailable).map((bottle) => bottle.id);
}

function getDefaultSelectedDrinkMixId(
  products: Product[],
  draft: PlannerDraft | null
): string | null {
  if (draft?.selectedDrinkMixId !== undefined) {
    return draft.selectedDrinkMixId;
  }

  return (
    products.find(
      (product) => product.type === 'drink_mix' && product.isAvailable
    )?.id ?? null
  );
}

function getDefaultSelectedSolidIds(
  products: Product[],
  draft: PlannerDraft | null
): string[] {
  if (draft?.selectedSolidIds) {
    return draft.selectedSolidIds.filter((id) =>
      products.some((product) => product.id === id && product.type !== 'drink_mix')
    );
  }

  return products
    .filter((product) => product.type !== 'drink_mix' && product.isAvailable)
    .map((product) => product.id);
}

const STEP_LABELS: Array<{ step: PlannerStep; label: string }> = [
  { step: 1, label: 'Setup' },
  { step: 2, label: 'Ride data' },
  { step: 3, label: 'Plan' },
];

export function PlannerPage() {
  const [searchParams] = useSearchParams();
  const bottles = useStore((s) => s.bottles);
  const products = useStore((s) => s.products);
  const saveFuelPlan = useStore((s) => s.saveFuelPlan);
  const plannerDraft = useStore((s) => s.plannerDraft);
  const setPlannerDraft = useStore((s) => s.setPlannerDraft);
  const [initialDraft] = useState<PlannerDraft | null>(() =>
    isPlannerDraftShape(plannerDraft) ? plannerDraft : null
  );

  const [step, setStep] = useState<PlannerStep>(
    initialDraft ? 2 : parseInitialStep(searchParams.get('step'))
  );
  const [resultTab, setResultTab] = useState<ResultTab>('pack');
  const [plan, setPlan] = useState<Omit<FuelPlan, 'id' | 'createdAt'> | null>(
    null
  );
  const [v3Prescription, setV3Prescription] =
    useState<FuelingPrescription | null>(null);
  const fuelingEngine = useFuelingEngine();
  const isV3 = fuelingEngine.version === 'v3';
  const [planTitle, setPlanTitle] = useState(initialDraft?.title ?? '');
  const [rideFormSnapshot, setRideFormSnapshot] = useState<RideFormSnapshot>();
  const [rideFormCanCalculate, setRideFormCanCalculate] = useState(false);
  const [rideFormSubmitTrigger, setRideFormSubmitTrigger] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedBottleIds, setSelectedBottleIds] = useState<string[]>(
    getDefaultSelectedBottleIds(bottles, initialDraft)
  );
  const [selectedDrinkMixId, setSelectedDrinkMixId] = useState<string | null>(
    getDefaultSelectedDrinkMixId(products, initialDraft)
  );
  const [selectedSolidIds, setSelectedSolidIds] = useState<string[]>(
    getDefaultSelectedSolidIds(products, initialDraft)
  );

  const [rideFormInitialSnapshot, setRideFormInitialSnapshot] = useState<
    Partial<RideFormSnapshot> | undefined
  >(initialDraft ? getRideFormSnapshotFromRide(initialDraft.ride) : undefined);
  const [rideFormInstanceKey, setRideFormInstanceKey] = useState(0);

  const lastInputRef = useRef<CalculatorInput | null>(null);

  useEffect(() => {
    if (plannerDraft) {
      setPlannerDraft(null);
    }
  }, [plannerDraft, setPlannerDraft]);

  const bottleOptions = useMemo(
    () =>
      [...bottles].sort(
        (a, b) =>
          Number(b.isAvailable) - Number(a.isAvailable) ||
          a.capacityMl - b.capacityMl ||
          a.name.localeCompare(b.name)
      ),
    [bottles]
  );

  const drinkMixOptions = useMemo(
    () =>
      [...products.filter((product) => product.type === 'drink_mix')].sort(
        (a, b) =>
          Number(b.isAvailable) - Number(a.isAvailable) ||
          a.name.localeCompare(b.name)
      ),
    [products]
  );

  const solidOptions = useMemo(
    () =>
      [...products.filter((product) => product.type !== 'drink_mix')].sort(
        (a, b) =>
          Number(b.isAvailable) - Number(a.isAvailable) ||
          a.name.localeCompare(b.name)
      ),
    [products]
  );

  const selectedBottlePool = useMemo(
    () =>
      bottleOptions.filter((bottle) => selectedBottleIds.includes(bottle.id)),
    [bottleOptions, selectedBottleIds]
  );

  const effectiveSelectedBottleIds = useMemo(
    () => selectedBottlePool.map((bottle) => bottle.id),
    [selectedBottlePool]
  );

  const effectiveSelectedSolidIds = useMemo(
    () =>
      selectedSolidIds.filter((id) =>
        solidOptions.some((product) => product.id === id)
      ),
    [selectedSolidIds, solidOptions]
  );

  const effectiveSelectedDrinkMixId = useMemo(() => {
    if (selectedDrinkMixId === null) return null;
    return drinkMixOptions.some((mix) => mix.id === selectedDrinkMixId)
      ? selectedDrinkMixId
      : null;
  }, [drinkMixOptions, selectedDrinkMixId]);

  const selectedDrinkMix =
    drinkMixOptions.find((mix) => mix.id === effectiveSelectedDrinkMixId) ?? null;
  const canCalculate = selectedBottlePool.length > 0 && Boolean(selectedDrinkMix);
  const fuelBreakdown = useMemo(() => {
    if (!plan) return null;

    const refuelMultiplier = (plan.rideCharacteristics.refuelStops || 0) + 1;
    const drinksPerFillCarbs = plan.bottles.reduce((sum, allocation) => {
      return allocation.isWaterOnly ? sum : sum + allocation.carbsTotal;
    }, 0);
    const drinksPerFillCalories = plan.bottles.reduce((sum, allocation) => {
      if (allocation.isWaterOnly) return sum;

      const product = products.find((candidate) => candidate.id === allocation.productId);
      return (
        sum +
        estimateCaloriesForCarbs(
          product?.nutrition.calories,
          product?.nutrition.carbsGrams,
          allocation.carbsTotal
        )
      );
    }, 0);
    const solidsCarbs = plan.solids.reduce(
      (sum, allocation) => sum + allocation.carbsTotal,
      0
    );
    const solidsCalories = plan.solids.reduce((sum, allocation) => {
      const product = products.find((candidate) => candidate.id === allocation.productId);
      return (
        sum +
        estimateCaloriesForCarbs(
          product?.nutrition.calories,
          product?.nutrition.carbsGrams,
          allocation.carbsTotal
        )
      );
    }, 0);

    const drinksCarbs = drinksPerFillCarbs * refuelMultiplier;
    const drinksCalories = drinksPerFillCalories * refuelMultiplier;

    return {
      drinks: { carbs: drinksCarbs, calories: drinksCalories },
      solids: { carbs: solidsCarbs, calories: solidsCalories },
      total: {
        carbs: drinksCarbs + solidsCarbs,
        calories: drinksCalories + solidsCalories,
      },
    };
  }, [plan, products]);

  const handleCalculate = (ride: RideCharacteristics) => {
    if (!canCalculate || !selectedDrinkMix) return;

    const availableSolids = solidOptions.filter((product) =>
      effectiveSelectedSolidIds.includes(product.id)
    );

    const input: CalculatorInput = {
      ride,
      availableBottles: selectedBottlePool,
      drinkMix: selectedDrinkMix,
      availableSolids,
    };

    const result = calculateFuelPlan(input);
    lastInputRef.current = input;
    setPlan(result);

    if (isV3) {
      const prescription = fuelingEngine.buildV3({
        ride,
        selectedBottles: selectedBottlePool,
        selectedDrinkMix,
        selectedSolids: availableSolids,
      });
      setV3Prescription(prescription);
    } else {
      setV3Prescription(null);
    }

    setPlanTitle((current) => current || getPlanTitleSuggestion(ride));
    setStep(3);
    setResultTab('pack');
  };

  const handleSolidQuantityChange = (productId: string, quantity: number) => {
    if (!plan || !lastInputRef.current) return;

    const solidOverrides = plan.solids.map((solid) => ({
      productId: solid.productId,
      quantity: solid.productId === productId ? quantity : solid.quantity,
    }));

    const updated = recalculatePlan(lastInputRef.current, plan, { solidOverrides });
    setPlan(updated);
  };

  const handleBottleCountChange = (count: number) => {
    if (!plan || !lastInputRef.current) return;

    const solidOverrides = plan.solids.map((solid) => ({
      productId: solid.productId,
      quantity: solid.quantity,
    }));

    const updated = recalculatePlan(lastInputRef.current, plan, {
      solidOverrides,
      bottleCount: count,
    });
    setPlan(updated);
  };

  const handleSavePlan = () => {
    if (!plan) return;

    saveFuelPlan({
      ...plan,
      title: planTitle.trim() || undefined,
    });
    setToastMessage('Plan saved to history.');
  };

  const handleResetPlan = () => {
    setPlan(null);
    setV3Prescription(null);
    setPlanTitle('');
    setResultTab('pack');
    setStep(1);
    setRideFormInitialSnapshot(rideFormSnapshot);
    setRideFormInstanceKey((current) => current + 1);
  };

  const dismissToast = useCallback(() => setToastMessage(null), []);

  const handleStepSelect = (targetStep: PlannerStep) => {
    if (targetStep === step) return;

    if (targetStep < step) {
      setStep(targetStep);
      return;
    }

    if (targetStep === 2) {
      if (canCalculate) {
        setStep(2);
      }
      return;
    }

    if (targetStep === 3) {
      if (step === 2 && canCalculate && rideFormCanCalculate) {
        setRideFormSubmitTrigger((current) => current + 1);
      }
    }
  };

  const canOpenStep = (targetStep: PlannerStep) => {
    if (targetStep <= step) return true;
    if (targetStep === 2) return canCalculate;
    if (targetStep === 3) {
      return step === 2 && canCalculate && rideFormCanCalculate;
    }
    return false;
  };

  return (
    <>
      <div className="page-shell space-y-5 md:space-y-6">
        <PageIntro
          title="Fuel plan"
          description={
            <>
              Choose bottles and fuel, then enter ride data.
            </>
          }
        />

        <SectionNav section="nutrition" />

        <section className="grid grid-cols-3 gap-2 md:gap-3" aria-label="Plan steps">
          {STEP_LABELS.map((item) => {
            const isActive = item.step === step;
            const isComplete = item.step < step;
            const isDisabled = !canOpenStep(item.step);

            return (
              <button
                key={item.step}
                type="button"
                disabled={isDisabled}
                aria-current={isActive ? 'step' : undefined}
                onClick={() => handleStepSelect(item.step)}
                className={`min-h-[4rem] rounded-lg border px-3 py-2 text-left transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2 focus:ring-offset-shell-100 disabled:cursor-not-allowed md:min-h-[4.25rem] md:px-4 md:py-2.5 ${
                  isActive
                    ? 'border-brand-500 bg-brand-500 text-white shadow-[0_12px_26px_-16px_rgba(248,98,46,0.74)]'
                    : isComplete
                      ? 'border-brand-200 bg-white text-ink-900 hover:bg-brand-50'
                      : 'border-[color:var(--border-soft)] bg-white text-ink-600 hover:bg-shell-50 disabled:text-ink-400 disabled:hover:bg-white'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[0.7rem] font-semibold opacity-80 md:text-xs">
                    Step {item.step}
                  </span>
                  {isComplete ? (
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        isActive
                          ? 'bg-white/18 text-white'
                          : 'bg-brand-100 text-brand-700'
                      }`}
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-3.5 w-3.5"
                        aria-hidden
                      >
                        <path
                          d="M5.5 10.5 8.5 13.5 14.5 6.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block font-sans text-sm font-semibold leading-none md:text-base">
                  {item.label}
                </span>
              </button>
            );
          })}
        </section>

        {step === 1 && (
          <SetupCard
            bottles={bottleOptions}
            drinkMixes={drinkMixOptions}
            solidProducts={solidOptions}
            selectedBottleIds={effectiveSelectedBottleIds}
            selectedDrinkMixId={effectiveSelectedDrinkMixId}
            selectedSolidIds={effectiveSelectedSolidIds}
            onBottleIdsChange={setSelectedBottleIds}
            onDrinkMixChange={setSelectedDrinkMixId}
            onSolidChange={setSelectedSolidIds}
          />
        )}

        {step === 2 && (
          <section className="space-y-4 md:space-y-5">
            <div className="space-y-2 border-b border-[color:var(--border-soft)] pb-4 md:pb-5">
              <h2 className="section-title">Ride data</h2>
              <p className="section-copy hidden md:block">
                Manual sets carbs. Auto uses workload.
              </p>
            </div>
            {!canCalculate && (
              <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-800 md:rounded-[1.15rem] md:px-5 md:py-4">
                Select at least one bottle and one mix in setup.
              </div>
            )}
            <RideForm
              key={rideFormInstanceKey}
              initialSnapshot={rideFormInitialSnapshot}
              onCalculate={handleCalculate}
              onSnapshotChange={setRideFormSnapshot}
              onCanCalculateChange={setRideFormCanCalculate}
              showCalculateButton={false}
              submitTrigger={rideFormSubmitTrigger}
              disabled={!canCalculate}
            />
          </section>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {plan ? (
              <>
                <Card className="overflow-hidden">
                  <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
                    <h2 className="section-title">Review plan</h2>
                    <p className="section-copy hidden md:block">Save a title to reuse it later.</p>
                  </CardHeader>
                  <CardContent className="space-y-3 md:space-y-4">
                    <Input
                      id="plan-title"
                      label="Plan name"
                      value={planTitle}
                      onChange={(event) => setPlanTitle(event.target.value)}
                      placeholder="Optional"
                    />

                    <div className="grid gap-2 sm:flex sm:flex-wrap">
                      <Button
                        type="button"
                        className="w-full sm:w-auto"
                        onClick={handleSavePlan}
                      >
                        Save plan
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={handleResetPlan}
                      >
                        Reset
                      </Button>
                    </div>

                    {fuelBreakdown && (
                      <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_srgb,var(--color-shell-100)_90%,white)] p-3 md:rounded-[1.05rem] md:p-4">
                        <div className="mb-2.5 md:mb-3">
                          <h3 className="section-title text-lg">Fuel breakdown</h3>
                        </div>
                        <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-2 text-[0.82rem] md:gap-x-4 md:text-sm">
                          <p className="page-stat-label">Source</p>
                          <p className="page-stat-label text-right">Carbs</p>
                          <p className="page-stat-label text-right">Calories</p>

                          <p className="rounded-lg bg-white/78 px-2.5 py-2 text-ink-900 md:px-3">Drinks</p>
                          <p className="rounded-lg bg-white/78 px-2.5 py-2 text-right tabular-nums text-ink-700 md:px-3">
                            {fuelBreakdown.drinks.carbs} g
                          </p>
                          <p className="rounded-lg bg-white/78 px-2.5 py-2 text-right tabular-nums text-ink-700 md:px-3">
                            {fuelBreakdown.drinks.calories} kcal
                          </p>

                          <p className="rounded-lg bg-white/78 px-2.5 py-2 text-ink-900 md:px-3">Solids</p>
                          <p className="rounded-lg bg-white/78 px-2.5 py-2 text-right tabular-nums text-ink-700 md:px-3">
                            {fuelBreakdown.solids.carbs} g
                          </p>
                          <p className="rounded-lg bg-white/78 px-2.5 py-2 text-right tabular-nums text-ink-700 md:px-3">
                            {fuelBreakdown.solids.calories} kcal
                          </p>
                        </div>
                        <div className="my-3 border-t border-[color:var(--border-soft)]" />
                        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 rounded-lg bg-[color:color-mix(in_srgb,var(--color-shell-50)_72%,white)] text-[0.82rem] font-semibold text-ink-900 md:gap-x-4 md:text-sm">
                          <p className="px-2.5 py-2.5 md:px-3 md:py-3">Total</p>
                          <p className="px-2.5 py-2.5 text-right tabular-nums md:px-3 md:py-3">
                            {fuelBreakdown.total.carbs} g
                          </p>
                          <p className="px-2.5 py-2.5 text-right tabular-nums md:px-3 md:py-3">
                            {fuelBreakdown.total.calories} kcal
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                      <button
                        type="button"
                        onClick={() => setResultTab('pack')}
                        className={`rounded-lg border px-2 py-2.5 text-[0.78rem] font-medium md:px-4 md:py-2 md:text-sm ${
                          resultTab === 'pack'
                            ? 'border-brand-300 bg-brand-100 text-brand-800'
                            : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                        }`}
                      >
                        Pack
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultTab('guide')}
                        className={`rounded-lg border px-2 py-2.5 text-[0.78rem] font-medium md:px-4 md:py-2 md:text-sm ${
                          resultTab === 'guide'
                            ? 'border-brand-300 bg-brand-100 text-brand-800'
                            : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                        }`}
                      >
                        Ride guide
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultTab('metrics')}
                        className={`rounded-lg border px-2 py-2.5 text-[0.78rem] font-medium md:px-4 md:py-2 md:text-sm ${
                          resultTab === 'metrics'
                            ? 'border-brand-300 bg-brand-100 text-brand-800'
                            : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                        }`}
                      >
                        Stats
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {isV3 && v3Prescription ? (
                  <FuelResultV3
                    section={resultTab}
                    prescription={v3Prescription}
                    bottles={bottles}
                    products={products}
                  />
                ) : (
                  <FuelResult
                    section={resultTab}
                    plan={plan}
                    bottles={bottles}
                    products={products}
                    onSolidQuantityChange={handleSolidQuantityChange}
                    onBottleCountChange={handleBottleCountChange}
                  />
                )}
                {isV3 && !v3Prescription && (
                  <Card>
                    <CardContent className="py-6 text-center text-ink-600">
                      <p className="font-semibold text-ink-900">
                        v3 engine needs your weight
                      </p>
                      <p className="mt-1 text-sm leading-6">
                        Set weight on the Athlete page to unlock the science-backed
                        prescription. Showing the v2 plan below.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {import.meta.env.DEV && (
                  <DebugCopyButton
                    plan={plan}
                    bottles={bottles}
                    products={products}
                    selectedBottleIds={effectiveSelectedBottleIds}
                    selectedDrinkMixId={effectiveSelectedDrinkMixId}
                    selectedSolidIds={effectiveSelectedSolidIds}
                  />
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-ink-500">
                  Create a plan in step 2.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {toastMessage && <Toast message={toastMessage} onDismiss={dismissToast} />}
    </>
  );
}

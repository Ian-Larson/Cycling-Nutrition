import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Tab,
  TabList,
  Tabs,
  Toast,
} from '@/components/ui';
import { PageIntro } from '@/components/layout/page-intro';
import { SectionNav } from '@/components/layout/section-nav';
import { DebugCopyButton } from '@/components/planner/debug-copy-button';
import { FuelResult } from '@/components/planner/fuel-result';
import { FuelResultV3 } from '@/components/planner/fuel-result-v3';
import { RideForm, type RideFormSnapshot } from '@/components/planner/ride-form';
import { SetupCard } from '@/components/planner/setup-card';
import { StepNavigation } from '@/components/planner/step-navigation';
import { calculateFuelPlan, recalculatePlan, type CalculatorInput } from '@/lib/calculator';
import { useFuelingEngine } from '@/hooks/use-fueling-engine';
import type { FuelingPrescription } from '@/lib/fueling';
import { useStore } from '@/store';
import { BOTTLE_SIZES, totalBottleCount, cloneBottleInventory } from '@/types/bottle';
import type { BottleInventory, BottleSize } from '@/types/bottle';
import type { FuelPlan, Product, RideCharacteristics } from '@/types';
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

  if (ride === undefined) return true;
  if (typeof ride !== 'object') return false;
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

function initSelectedBottleCounts(
  inventory: BottleInventory,
  draft: PlannerDraft | null
): BottleInventory {
  if (draft?.selectedBottleCounts) {
    // Cap each size by current inventory
    return BOTTLE_SIZES.reduce(
      (acc, size) => {
        acc[size] = Math.min(
          draft.selectedBottleCounts![size] ?? 0,
          inventory[size]
        );
        return acc;
      },
      { 550: 0, 750: 0, 950: 0 } as BottleInventory
    );
  }
  return cloneBottleInventory(inventory);
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
  const [searchParams, setSearchParams] = useSearchParams();
  const bottleCounts = useStore((s) => s.bottleCounts);
  const products = useStore((s) => s.products);
  const saveFuelPlan = useStore((s) => s.saveFuelPlan);
  const setPlannerDraft = useStore((s) => s.setPlannerDraft);
  const [initialDraft] = useState<PlannerDraft | null>(() => {
    const current = useStore.getState().plannerDraft;
    return isPlannerDraftShape(current) ? current : null;
  });
  const [isReusedDraft] = useState(() => searchParams.get('reuse') === '1');

  const [step, setStep] = useState<PlannerStep>(() => {
    if (isReusedDraft) return 1;
    return initialDraft?.ride ? 2 : parseInitialStep(searchParams.get('step'));
  });
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
  const [toastMessage, setToastMessage] = useState<string | null>(
    isReusedDraft ? 'Plan loaded. Review setup, then continue.' : null
  );

  useEffect(() => {
    if (!isReusedDraft) return;
    if (!searchParams.has('reuse')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('reuse');
    setSearchParams(next, { replace: true });
  }, [isReusedDraft, searchParams, setSearchParams]);

  const [selectedBottleCounts, setSelectedBottleCounts] = useState<BottleInventory>(
    () => initSelectedBottleCounts(bottleCounts, initialDraft)
  );
  const [selectedDrinkMixId, setSelectedDrinkMixId] = useState<string | null>(
    getDefaultSelectedDrinkMixId(products, initialDraft)
  );
  const [selectedSolidIds, setSelectedSolidIds] = useState<string[]>(
    getDefaultSelectedSolidIds(products, initialDraft)
  );
  const [persistedRide, setPersistedRide] = useState<
    RideCharacteristics | undefined
  >(initialDraft?.ride);

  const [rideFormInitialSnapshot, setRideFormInitialSnapshot] = useState<
    Partial<RideFormSnapshot> | undefined
  >(initialDraft?.ride ? getRideFormSnapshotFromRide(initialDraft.ride) : undefined);
  const [rideFormInstanceKey, setRideFormInstanceKey] = useState(0);

  const lastInputRef = useRef<CalculatorInput | null>(null);
  const draftInitializedRef = useRef(false);
  const [draftSavedFlash, setDraftSavedFlash] = useState(false);

  useEffect(() => {
    setPlannerDraft({
      ride: persistedRide,
      selectedBottleCounts,
      selectedDrinkMixId,
      selectedSolidIds,
      title: planTitle || undefined,
    });
    if (!draftInitializedRef.current) {
      draftInitializedRef.current = true;
      return;
    }
    const showTimer = setTimeout(() => setDraftSavedFlash(true), 0);
    const hideTimer = setTimeout(() => setDraftSavedFlash(false), 1600);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [
    persistedRide,
    selectedBottleCounts,
    selectedDrinkMixId,
    selectedSolidIds,
    planTitle,
    setPlannerDraft,
  ]);

  const handleBottleCountChange = (size: BottleSize, count: number) => {
    setSelectedBottleCounts((prev) => ({
      ...prev,
      [size]: Math.max(0, Math.min(count, bottleCounts[size])),
    }));
  };

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

  // Expand bottle counts into a flat BottleSlot[] for the calculator
  const selectedBottleSlots = useMemo(
    () =>
      BOTTLE_SIZES.flatMap((size) =>
        Array.from({ length: selectedBottleCounts[size] }, () => ({ capacityMl: size }))
      ),
    [selectedBottleCounts]
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
  const canCalculate = totalBottleCount(selectedBottleCounts) > 0 && Boolean(selectedDrinkMix);

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
      availableBottles: selectedBottleSlots,
      drinkMix: selectedDrinkMix,
      availableSolids,
    };

    const result = calculateFuelPlan(input);
    lastInputRef.current = input;
    setPlan(result);
    setPersistedRide(ride);

    if (isV3) {
      const prescription = fuelingEngine.buildV3({
        ride,
        selectedBottles: selectedBottleSlots,
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
      <div className="page-shell max-w-6xl space-y-5 md:space-y-6">
        <PageIntro
          title="Fuel plan"
          description={
            <>
              Choose bottles and fuel, then enter ride data.
            </>
          }
        />

        <SectionNav section="nutrition" />

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <StepNavigation
            steps={STEP_LABELS}
            current={step}
            canOpen={canOpenStep}
            onSelect={handleStepSelect}
          />
          <div
            aria-live="polite"
            className="min-h-[1.25rem] text-right text-xs text-ink-500"
          >
            {step !== 3 && (
              <span
                className={`inline-flex items-center gap-1 transition-opacity duration-300 ${
                  draftSavedFlash ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                  className="h-3.5 w-3.5 text-success-700"
                >
                  <path
                    d="m3.5 8.5 2.8 2.8L12.5 5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Draft saved
              </span>
            )}
          </div>
        </div>

        {step === 1 && (
          <>
            <SetupCard
              bottleCounts={bottleCounts}
              selectedBottleCounts={selectedBottleCounts}
              drinkMixes={drinkMixOptions}
              solidProducts={solidOptions}
              selectedDrinkMixId={effectiveSelectedDrinkMixId}
              selectedSolidIds={effectiveSelectedSolidIds}
              onBottleCountChange={handleBottleCountChange}
              onDrinkMixChange={setSelectedDrinkMixId}
              onSolidChange={setSelectedSolidIds}
            />
            {canCalculate && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleStepSelect(2)}
                  aria-label="Go to ride data"
                >
                  Next
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4">
                    <path d="M7.5 5 13 10l-5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
              </div>
            )}
          </>
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
              <Alert variant="warning">
                Select at least one bottle and one mix in setup.
              </Alert>
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
            {canCalculate && rideFormCanCalculate && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleStepSelect(3)}
                  aria-label="Build plan"
                >
                  Next
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4">
                    <path d="M7.5 5 13 10l-5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
              </div>
            )}
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
                      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:color-mix(in_srgb,var(--color-shell-100)_90%,white)] p-3 md:p-4">
                        <div className="mb-2.5 md:mb-3">
                          <h3 className="section-title text-lg">Fuel breakdown</h3>
                        </div>
                        <table className="w-full table-fixed border-collapse text-[0.82rem] md:text-sm">
                          <colgroup>
                            <col />
                            <col className="w-[5.5rem] md:w-[6.5rem]" />
                            <col className="w-[6rem] md:w-[7rem]" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th scope="col" className="page-stat-label px-2.5 pb-2 text-left md:px-3">
                                Source
                              </th>
                              <th scope="col" className="page-stat-label px-2.5 pb-2 text-right md:px-3">
                                Carbs
                              </th>
                              <th scope="col" className="page-stat-label px-2.5 pb-2 text-right md:px-3">
                                Calories
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="rounded-l-lg bg-white/78 px-2.5 py-2 text-ink-900 md:px-3">
                                Drinks
                              </td>
                              <td className="bg-white/78 px-2.5 py-2 text-right tabular-nums text-ink-700 md:px-3">
                                {fuelBreakdown.drinks.carbs} g
                              </td>
                              <td className="rounded-r-lg bg-white/78 px-2.5 py-2 text-right tabular-nums text-ink-700 md:px-3">
                                {fuelBreakdown.drinks.calories} kcal
                              </td>
                            </tr>
                            <tr>
                              <td className="pt-2" />
                              <td className="pt-2" />
                              <td className="pt-2" />
                            </tr>
                            <tr>
                              <td className="rounded-l-lg bg-white/78 px-2.5 py-2 text-ink-900 md:px-3">
                                Solids
                              </td>
                              <td className="bg-white/78 px-2.5 py-2 text-right tabular-nums text-ink-700 md:px-3">
                                {fuelBreakdown.solids.carbs} g
                              </td>
                              <td className="rounded-r-lg bg-white/78 px-2.5 py-2 text-right tabular-nums text-ink-700 md:px-3">
                                {fuelBreakdown.solids.calories} kcal
                              </td>
                            </tr>
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={3} className="pt-3">
                                <div className="border-t border-[color:var(--border-soft)]" />
                              </td>
                            </tr>
                            <tr className="font-semibold text-ink-900">
                              <td className="rounded-l-lg bg-[color:color-mix(in_srgb,var(--color-shell-50)_72%,white)] px-2.5 py-2.5 md:px-3 md:py-3">
                                Total
                              </td>
                              <td className="bg-[color:color-mix(in_srgb,var(--color-shell-50)_72%,white)] px-2.5 py-2.5 text-right tabular-nums md:px-3 md:py-3">
                                {fuelBreakdown.total.carbs} g
                              </td>
                              <td className="rounded-r-lg bg-[color:color-mix(in_srgb,var(--color-shell-50)_72%,white)] px-2.5 py-2.5 text-right tabular-nums md:px-3 md:py-3">
                                {fuelBreakdown.total.calories} kcal
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    <Tabs
                      value={resultTab}
                      onChange={(v) => setResultTab(v as typeof resultTab)}
                    >
                      <TabList
                        label="Fuel plan view"
                        className="grid w-full grid-cols-3 gap-1.5 md:gap-2"
                      >
                        <Tab value="pack">Pack</Tab>
                        <Tab value="guide">Ride guide</Tab>
                        <Tab value="metrics">Stats</Tab>
                      </TabList>
                    </Tabs>
                  </CardContent>
                </Card>

                {isV3 && v3Prescription ? (
                  <FuelResultV3
                    section={resultTab}
                    prescription={v3Prescription}
                    products={products}
                  />
                ) : (
                  <FuelResult
                    section={resultTab}
                    plan={plan}
                    products={products}
                    onSolidQuantityChange={handleSolidQuantityChange}
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
                    products={products}
                    selectedBottleCounts={selectedBottleCounts}
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

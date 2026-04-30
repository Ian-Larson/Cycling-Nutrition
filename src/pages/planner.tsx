import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
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
import { InventoryRailPanel } from '@/components/planner/inventory-rail-panel';
import { NutritionRail } from '@/components/planner/nutrition-rail';
import { NutritionWorkspaceLayout } from '@/components/planner/nutrition-workspace-layout';
import { PlanningStepPanel } from '@/components/planner/planning-step-panel';
import { RideForm, type RideFormSnapshot } from '@/components/planner/ride-form';
import { SavedPlansRailPanel } from '@/components/planner/saved-plans-rail-panel';
import { SetupCard } from '@/components/planner/setup-card';
import { calculateFuelPlan, recalculatePlan, type CalculatorInput } from '@/lib/calculator';
import { useFuelingEngine } from '@/hooks/use-fueling-engine';
import type { FuelingPrescription } from '@/lib/fueling';
import { buildPlannerDraftFromSavedPlan } from '@/lib/planner/saved-plan-draft';
import {
  formatRideSummary,
  formatSetupSummary,
  getPlanTitleSuggestion,
  isRideSnapshotEquivalentToRide,
} from '@/lib/planner/planner-summaries';
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

export function PlannerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const bottleCounts = useStore((s) => s.bottleCounts);
  const products = useStore((s) => s.products);
  const fuelPlans = useStore((s) => s.fuelPlans);
  const saveFuelPlan = useStore((s) => s.saveFuelPlan);
  const deleteFuelPlan = useStore((s) => s.deleteFuelPlan);
  const setPlannerDraft = useStore((s) => s.setPlannerDraft);
  const updateProduct = useStore((s) => s.updateProduct);
  const incrementBottleCount = useStore((s) => s.incrementBottleCount);
  const [initialDraft] = useState<PlannerDraft | null>(() => {
    const current = useStore.getState().plannerDraft;
    return isPlannerDraftShape(current) ? current : null;
  });
  const [isReusedDraft] = useState(() => searchParams.get('reuse') === '1');

  const [activeStep, setActiveStep] = useState<PlannerStep>(() => {
    if (isReusedDraft) return 1;
    return initialDraft?.ride ? 2 : parseInitialStep(searchParams.get('step'));
  });
  const [planIsStale, setPlanIsStale] = useState(false);
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

  const markPlanStale = useCallback(() => {
    setPlanIsStale((current) => (plan ? true : current));
  }, [plan]);

  const handleRideSnapshotChange = useCallback(
    (snapshot: RideFormSnapshot) => {
      setRideFormSnapshot(snapshot);
      if (
        plan &&
        !isRideSnapshotEquivalentToRide(snapshot, plan.rideCharacteristics)
      ) {
        setPlanIsStale(true);
      }
    },
    [plan]
  );

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
    markPlanStale();
    setSelectedBottleCounts((prev) => ({
      ...prev,
      [size]: Math.max(0, Math.min(count, bottleCounts[size])),
    }));
  };

  const handleDrinkMixChange = (id: string | null) => {
    markPlanStale();
    setSelectedDrinkMixId(id);
  };

  const handleSolidSelectionChange = (ids: string[]) => {
    markPlanStale();
    setSelectedSolidIds(ids);
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

  const selectedSolidProducts = useMemo(
    () =>
      effectiveSelectedSolidIds
        .map((id) => solidOptions.find((product) => product.id === id))
        .filter((product): product is Product => product !== undefined),
    [effectiveSelectedSolidIds, solidOptions]
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
    setPlanIsStale(false);
    setActiveStep(3);
    setResultTab('pack');
  };

  const handleSolidQuantityChange = (productId: string, quantity: number) => {
    if (!plan || !lastInputRef.current) return;

    // Merge current plan quantities with the change. Including products the
    // auto-plan didn't allocate lets the rider pull a previously-zero product
    // into the plan via the stepper.
    const overridesByProductId = new Map<string, number>();
    plan.solids.forEach((solid) => {
      overridesByProductId.set(solid.productId, solid.quantity);
    });
    overridesByProductId.set(productId, quantity);

    const solidOverrides = Array.from(overridesByProductId.entries()).map(
      ([id, qty]) => ({ productId: id, quantity: qty })
    );

    const updated = recalculatePlan(lastInputRef.current, plan, { solidOverrides });
    setPlan(updated);

    if (isV3 && lastInputRef.current.drinkMix) {
      const overridesRecord = Object.fromEntries(overridesByProductId);
      const rebuilt = fuelingEngine.buildV3({
        ride: lastInputRef.current.ride,
        selectedBottles: lastInputRef.current.availableBottles,
        selectedDrinkMix: lastInputRef.current.drinkMix,
        selectedSolids: lastInputRef.current.availableSolids,
        solidOverrides: overridesRecord,
      });
      setV3Prescription(rebuilt);
    }
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
    setPlanIsStale(false);
    setActiveStep(1);
    setRideFormInitialSnapshot(rideFormSnapshot);
    setRideFormInstanceKey((current) => current + 1);
  };

  const handleReuseSavedPlan = (savedPlan: FuelPlan) => {
    const draft = buildPlannerDraftFromSavedPlan(savedPlan, products);
    setPlannerDraft(draft);
    setSelectedBottleCounts(
      draft.selectedBottleCounts ?? cloneBottleInventory(bottleCounts)
    );
    setSelectedDrinkMixId(draft.selectedDrinkMixId ?? null);
    setSelectedSolidIds(draft.selectedSolidIds ?? []);
    setPersistedRide(draft.ride);
    setRideFormInitialSnapshot(
      draft.ride ? getRideFormSnapshotFromRide(draft.ride) : undefined
    );
    setRideFormInstanceKey((current) => current + 1);
    setPlan(null);
    setV3Prescription(null);
    setPlanIsStale(false);
    setPlanTitle(draft.title ?? '');
    setResultTab('pack');
    setActiveStep(2);
    setToastMessage('Saved plan loaded. Review ride data, then rebuild.');
  };

  const dismissToast = useCallback(() => setToastMessage(null), []);

  const canOpenStep = (targetStep: PlannerStep) => {
    if (targetStep === 1) return true;
    if (targetStep === 2) return canCalculate;
    if (targetStep === 3) {
      return Boolean(plan) || (canCalculate && rideFormCanCalculate);
    }
    return false;
  };

  const handleStepSelect = (targetStep: PlannerStep) => {
    if (!canOpenStep(targetStep)) return;
    setActiveStep((current) => (current === targetStep ? current : targetStep));
  };

  const handleBuildPlanRequest = () => {
    if (canCalculate && rideFormCanCalculate) {
      setActiveStep(3);
      setRideFormSubmitTrigger((current) => current + 1);
    }
  };

  const setupSummary = formatSetupSummary({
    selectedBottleCounts,
    selectedDrinkMix,
    selectedSolidIds: effectiveSelectedSolidIds,
  });
  const rideSummary = formatRideSummary(persistedRide);
  const setupComplete = canCalculate;
  const rideComplete = Boolean(persistedRide) && rideFormCanCalculate;
  const canOpenPlan = canOpenStep(3);

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

        <div
          aria-live="polite"
          className="min-h-[1.25rem] text-right text-xs text-ink-500"
        >
          {activeStep !== 3 && (
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

        <NutritionWorkspaceLayout
          main={
            <>
              <PlanningStepPanel
                step={1}
                title="Setup"
                summary={setupSummary}
                active={activeStep === 1}
                complete={setupComplete}
                onToggle={() => handleStepSelect(1)}
              >
                <SetupCard
                  variant="embedded"
                  bottleCounts={bottleCounts}
                  selectedBottleCounts={selectedBottleCounts}
                  drinkMixes={drinkMixOptions}
                  solidProducts={solidOptions}
                  selectedDrinkMixId={effectiveSelectedDrinkMixId}
                  selectedSolidIds={effectiveSelectedSolidIds}
                  onBottleCountChange={handleBottleCountChange}
                  onDrinkMixChange={handleDrinkMixChange}
                  onSolidChange={handleSolidSelectionChange}
                />
                {canCalculate ? (
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleStepSelect(2)}
                    >
                      Continue to ride data
                    </Button>
                  </div>
                ) : null}
              </PlanningStepPanel>

              <PlanningStepPanel
                step={2}
                title="Ride data"
                summary={rideSummary}
                active={activeStep === 2}
                complete={rideComplete}
                disabled={!canCalculate}
                disabledReason="Select bottles and drink mix first."
                keepMounted
                onToggle={() => handleStepSelect(2)}
              >
                <section className="space-y-4 md:space-y-5">
                  <RideForm
                    key={rideFormInstanceKey}
                    initialSnapshot={rideFormInitialSnapshot}
                    onCalculate={handleCalculate}
                    onSnapshotChange={handleRideSnapshotChange}
                    onCanCalculateChange={setRideFormCanCalculate}
                    showCalculateButton={false}
                    submitTrigger={rideFormSubmitTrigger}
                    disabled={!canCalculate}
                  />
                  {canCalculate && rideFormCanCalculate ? (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleBuildPlanRequest}
                      >
                        Build plan
                      </Button>
                    </div>
                  ) : null}
                </section>
              </PlanningStepPanel>

              <PlanningStepPanel
                step={3}
                title="Plan"
                summary={
                  plan
                    ? planIsStale
                      ? 'Review old result or rebuild'
                      : 'Plan ready'
                    : 'Build from ride data'
                }
                active={activeStep === 3}
                complete={Boolean(plan) && !planIsStale}
                stale={planIsStale}
                disabled={!canOpenPlan}
                disabledReason="Enter valid ride data first."
                onToggle={() => handleStepSelect(3)}
              >
                {planIsStale ? (
                  <Alert variant="warning" className="mb-4">
                    This result uses previous inputs. Rebuild to use the current
                    setup and ride data.
                  </Alert>
                ) : null}

                {plan ? (
                  <div className="space-y-4">
                    <Card className="overflow-hidden">
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
                            onClick={
                              planIsStale ? handleBuildPlanRequest : handleSavePlan
                            }
                          >
                            {planIsStale ? 'Rebuild plan' : 'Save plan'}
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
                              <h3 className="section-title text-lg">
                                Fuel breakdown
                              </h3>
                            </div>
                            <table className="w-full table-fixed border-collapse text-[0.82rem] md:text-sm">
                              <colgroup>
                                <col />
                                <col className="w-[5.5rem] md:w-[6.5rem]" />
                                <col className="w-[6rem] md:w-[7rem]" />
                              </colgroup>
                              <thead>
                                <tr>
                                  <th
                                    scope="col"
                                    className="page-stat-label px-2.5 pb-2 text-left md:px-3"
                                  >
                                    Source
                                  </th>
                                  <th
                                    scope="col"
                                    className="page-stat-label px-2.5 pb-2 text-right md:px-3"
                                  >
                                    Carbs
                                  </th>
                                  <th
                                    scope="col"
                                    className="page-stat-label px-2.5 pb-2 text-right md:px-3"
                                  >
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
                          onChange={(value) => setResultTab(value as ResultTab)}
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
                        availableSolids={selectedSolidProducts}
                        onSolidQuantityChange={handleSolidQuantityChange}
                      />
                    ) : (
                      <FuelResult
                        section={resultTab}
                        plan={plan}
                        products={products}
                        availableSolids={selectedSolidProducts}
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
                            Set weight on the Athlete page to unlock the
                            science-backed prescription. Showing the v2 plan
                            below.
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
                  </div>
                ) : (
                  <Card>
                    <CardContent className="space-y-3 py-8 text-center">
                      <p className="text-ink-600">
                        Build a plan from the current ride data.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleBuildPlanRequest}
                        disabled={!canCalculate || !rideFormCanCalculate}
                      >
                        Build plan
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </PlanningStepPanel>
            </>
          }
          rail={
            <NutritionRail>
              <InventoryRailPanel
                bottleCounts={bottleCounts}
                products={products}
                onIncrementBottle={(size, delta) => {
                  markPlanStale();
                  incrementBottleCount(size, delta);
                }}
                onToggleProductAvailability={(productId, isAvailable) => {
                  markPlanStale();
                  updateProduct(productId, { isAvailable });
                }}
              />
              <SavedPlansRailPanel
                plans={fuelPlans}
                products={products}
                onReusePlan={handleReuseSavedPlan}
                onDeletePlan={deleteFuelPlan}
              />
            </NutritionRail>
          }
        />
      </div>

      {toastMessage && <Toast message={toastMessage} onDismiss={dismissToast} />}
    </>
  );
}

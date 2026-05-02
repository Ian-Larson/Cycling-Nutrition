import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { DebugCopyButton } from '@/components/planner/debug-copy-button';
import { FuelResultV3 } from '@/components/planner/fuel-result-v3';
import { InventoryRailPanel } from '@/components/planner/inventory-rail-panel';
import { NutritionRail } from '@/components/planner/nutrition-rail';
import { NutritionWorkspaceLayout } from '@/components/planner/nutrition-workspace-layout';
import { PlanningStepPanel } from '@/components/planner/planning-step-panel';
import { RideForm, type RideFormSnapshot } from '@/components/planner/ride-form';
import { SavedPlansRailPanel } from '@/components/planner/saved-plans-rail-panel';
import { SetupCard } from '@/components/planner/setup-card';
import { useFuelPrescription } from '@/hooks/use-fuel-prescription';
import type { FuelingPrescription } from '@/lib/fueling';
import { buildPlannerDraftFromSavedPlan } from '@/lib/planner/saved-plan-draft';
import {
  formatRideSummary,
  formatSetupSummary,
  getPlanTitleSuggestion,
  isRideSnapshotEquivalentToRide,
} from '@/lib/planner/planner-summaries';
import { useStore } from '@/store';
import { BOTTLE_SIZES, totalBottleCount } from '@/types/bottle';
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

function initBottlePool(draft: PlannerDraft | null): BottleInventory {
  if (draft?.selectedBottleCounts) {
    return BOTTLE_SIZES.reduce(
      (acc, size) => {
        acc[size] = Math.max(0, draft.selectedBottleCounts![size] ?? 0);
        return acc;
      },
      { 550: 0, 750: 0, 950: 0 } as BottleInventory,
    );
  }
  return { 550: 0, 750: 0, 950: 0 };
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
  const products = useStore((s) => s.products);
  const fuelPlans = useStore((s) => s.fuelPlans);
  const saveFuelPlan = useStore((s) => s.saveFuelPlan);
  const deleteFuelPlan = useStore((s) => s.deleteFuelPlan);
  const setPlannerDraft = useStore((s) => s.setPlannerDraft);
  const updateProduct = useStore((s) => s.updateProduct);
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
  const [prescription, setPrescription] = useState<FuelingPrescription | null>(
    null
  );
  const fuelEngine = useFuelPrescription();
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

  const [bottlePool, setBottlePool] = useState<BottleInventory>(() =>
    initBottlePool(initialDraft)
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

  const draftInitializedRef = useRef(false);
  const [draftSavedFlash, setDraftSavedFlash] = useState(false);

  const markPlanStale = useCallback(() => {
    setPlanIsStale((current) => (prescription ? true : current));
  }, [prescription]);

  const handleRideSnapshotChange = useCallback(
    (snapshot: RideFormSnapshot) => {
      setRideFormSnapshot(snapshot);
      if (
        persistedRide &&
        !isRideSnapshotEquivalentToRide(snapshot, persistedRide)
      ) {
        setPlanIsStale(true);
      }
    },
    [persistedRide]
  );

  useEffect(() => {
    setPlannerDraft({
      ride: persistedRide,
      selectedBottleCounts: bottlePool,
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
    bottlePool,
    selectedDrinkMixId,
    selectedSolidIds,
    planTitle,
    setPlannerDraft,
  ]);

  const handleBottleCountChange = (size: BottleSize, count: number) => {
    markPlanStale();
    setBottlePool((prev) => ({ ...prev, [size]: Math.max(0, count) }));
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

  // Expand bottle pool into a flat BottleSlot[] for the engine
  const selectedBottleSlots = useMemo(
    () =>
      BOTTLE_SIZES.flatMap((size) =>
        Array.from({ length: bottlePool[size] }, () => ({ capacityMl: size }))
      ),
    [bottlePool]
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
  const canCalculate =
    totalBottleCount(bottlePool) > 0 &&
    Boolean(selectedDrinkMix) &&
    fuelEngine.weightReady;

  const handleCalculate = (ride: RideCharacteristics) => {
    if (!canCalculate || !selectedDrinkMix) return;

    const availableSolids = solidOptions.filter((product) =>
      effectiveSelectedSolidIds.includes(product.id)
    );

    const next = fuelEngine.build({
      ride,
      bottles: selectedBottleSlots,
      drinkMix: selectedDrinkMix,
      solids: availableSolids,
    });

    if (!next) return;

    setPrescription(next);
    setPersistedRide(ride);
    setPlanTitle((current) => current || getPlanTitleSuggestion(ride));
    setPlanIsStale(false);
    setActiveStep(3);
    setResultTab('pack');
  };

  const handleSolidQuantityChange = (productId: string, quantity: number) => {
    if (!prescription || !persistedRide || !selectedDrinkMix) return;

    const overridesByProductId = new Map<string, number>();
    prescription.packList?.solids.forEach((solid) => {
      overridesByProductId.set(solid.productId, solid.quantity);
    });
    overridesByProductId.set(productId, quantity);
    const solidOverrides = Object.fromEntries(overridesByProductId);

    const availableSolids = solidOptions.filter((product) =>
      effectiveSelectedSolidIds.includes(product.id)
    );

    const rebuilt = fuelEngine.build({
      ride: persistedRide,
      bottles: selectedBottleSlots,
      drinkMix: selectedDrinkMix,
      solids: availableSolids,
      solidOverrides,
    });

    if (rebuilt) setPrescription(rebuilt);
  };

  const handleSavePlan = () => {
    if (!prescription || !persistedRide) return;

    saveFuelPlan({
      title: planTitle.trim() || undefined,
      ride: persistedRide,
      bottlePool,
      selectedDrinkMixId: effectiveSelectedDrinkMixId,
      selectedSolidIds: effectiveSelectedSolidIds,
      prescription,
    });
    setToastMessage('Plan saved to history.');
  };

  const handleResetPlan = () => {
    setPrescription(null);
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
    setBottlePool(initBottlePool(draft));
    setSelectedDrinkMixId(draft.selectedDrinkMixId ?? null);
    setSelectedSolidIds(draft.selectedSolidIds ?? []);
    setPersistedRide(draft.ride);
    setRideFormInitialSnapshot(
      draft.ride ? getRideFormSnapshotFromRide(draft.ride) : undefined
    );
    setRideFormInstanceKey((current) => current + 1);
    setPrescription(savedPlan.prescription);
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
      return Boolean(prescription) || (canCalculate && rideFormCanCalculate);
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
    selectedBottleCounts: bottlePool,
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
          meta={
            <div aria-live="polite" className="text-xs text-ink-500">
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
          }
        />

        <NutritionWorkspaceLayout
          main={
            !fuelEngine.weightReady ? (
              <Card className="overflow-hidden">
                <CardContent className="space-y-3 py-8 text-center md:py-10">
                  <h2 className="text-lg font-semibold text-ink-900">
                    Set your weight to plan
                  </h2>
                  <p className="mx-auto max-w-prose text-sm leading-6 text-ink-600">
                    The fueling engine sizes your carbs, fluid, and sodium against rider mass. Set it once on Account.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/account#preferences"
                      className="inline-flex h-9 items-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-[var(--shadow-brand-glow-md)] transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
                    >
                      Set weight in Account
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
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
                  selectedBottleCounts={bottlePool}
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
                  prescription
                    ? planIsStale
                      ? 'Review old result or rebuild'
                      : 'Plan ready'
                    : 'Build from ride data'
                }
                active={activeStep === 3}
                complete={Boolean(prescription) && !planIsStale}
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

                {prescription ? (
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

                    <FuelResultV3
                      section={resultTab}
                      prescription={prescription}
                      products={products}
                      availableSolids={selectedSolidProducts}
                      onSolidQuantityChange={handleSolidQuantityChange}
                    />

                    {import.meta.env.DEV && (
                      <DebugCopyButton
                        prescription={prescription}
                        products={products}
                        selectedBottleCounts={bottlePool}
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
            )
          }
          rail={
            <NutritionRail>
              <InventoryRailPanel
                products={products}
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

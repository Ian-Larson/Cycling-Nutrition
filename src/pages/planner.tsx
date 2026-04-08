import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Toast,
  Toggle,
} from '@/components/ui';
import { PageIntro } from '@/components/layout/page-intro';
import { DebugCopyButton } from '@/components/planner/debug-copy-button';
import { FuelOptionsCard } from '@/components/planner/fuel-options-card';
import { FuelResult } from '@/components/planner/fuel-result';
import { RideForm, type RideFormSnapshot } from '@/components/planner/ride-form';
import { calculateFuelPlan, recalculatePlan, type CalculatorInput } from '@/lib/calculator';
import { getReadinessFromState, useStore } from '@/store';
import type { FuelPlan, RideCharacteristics } from '@/types';
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

const STEP_LABELS: Array<{ step: PlannerStep; label: string }> = [
  { step: 1, label: 'Setup' },
  { step: 2, label: 'Ride' },
  { step: 3, label: 'Plan' },
];

export function PlannerPage() {
  const [searchParams] = useSearchParams();
  const bottles = useStore((s) => s.bottles);
  const products = useStore((s) => s.products);
  const settings = useStore((s) => s.settings);
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
  const [planTitle, setPlanTitle] = useState(initialDraft?.title ?? '');
  const [rideFormSnapshot, setRideFormSnapshot] = useState<RideFormSnapshot>();
  const [rideFormCanCalculate, setRideFormCanCalculate] = useState(false);
  const [rideFormSubmitTrigger, setRideFormSubmitTrigger] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [includeUnavailableBottles, setIncludeUnavailableBottles] =
    useState(initialDraft?.includeUnavailableBottles ?? false);
  const [includeUnavailableProducts, setIncludeUnavailableProducts] =
    useState(initialDraft?.includeUnavailableProducts ?? false);
  const [selectedDrinkMixId, setSelectedDrinkMixId] = useState<string | null>(
    initialDraft?.selectedDrinkMixId ?? null
  );
  const [selectedSolidIds, setSelectedSolidIds] = useState<string[]>(
    initialDraft?.selectedSolidIds ?? []
  );

  const [rideFormInitialSnapshot, setRideFormInitialSnapshot] = useState<
    Partial<RideFormSnapshot> | undefined
  >(initialDraft ? getRideFormSnapshotFromRide(initialDraft.ride) : undefined);
  const [rideFormInstanceKey, setRideFormInstanceKey] = useState(0);

  const lastInputRef = useRef<CalculatorInput | null>(null);
  const readiness = useMemo(
    () => getReadinessFromState({ bottles, products, settings }),
    [bottles, products, settings]
  );

  useEffect(() => {
    if (plannerDraft) {
      setPlannerDraft(null);
    }
  }, [plannerDraft, setPlannerDraft]);

  const bottlePool = useMemo(
    () =>
      includeUnavailableBottles
        ? bottles
        : bottles.filter((bottle) => bottle.isAvailable),
    [bottles, includeUnavailableBottles]
  );

  const drinkMixPool = useMemo(
    () =>
      products.filter(
        (product) =>
          product.type === 'drink_mix' &&
          (includeUnavailableProducts || product.isAvailable)
      ),
    [products, includeUnavailableProducts]
  );

  const solidPool = useMemo(
    () =>
      products.filter(
        (product) =>
          product.type !== 'drink_mix' &&
          (includeUnavailableProducts || product.isAvailable)
      ),
    [products, includeUnavailableProducts]
  );

  const effectiveSelectedSolidIds = useMemo(
    () =>
      selectedSolidIds.filter((id) =>
        solidPool.some((product) => product.id === id)
      ),
    [selectedSolidIds, solidPool]
  );

  const canCalculate = bottlePool.length > 0 && drinkMixPool.length > 0;
  const selectedDrinkMix =
    drinkMixPool.find((mix) => mix.id === selectedDrinkMixId) ?? drinkMixPool[0];
  const availableBottleCount = bottles.filter((bottle) => bottle.isAvailable).length;
  const availableDrinkMixCount = products.filter(
    (product) => product.type === 'drink_mix' && product.isAvailable
  ).length;
  const availableSolidCount = products.filter(
    (product) => product.type !== 'drink_mix' && product.isAvailable
  ).length;
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

    const availableSolids = solidPool.filter((product) =>
      effectiveSelectedSolidIds.includes(product.id)
    );

    const input: CalculatorInput = {
      ride,
      availableBottles: bottlePool,
      drinkMix: selectedDrinkMix,
      availableSolids,
    };

    const result = calculateFuelPlan(input);
    lastInputRef.current = input;
    setPlan(result);
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

  const dismissToast = useCallback(() => setToastMessage(null), []);

  const triggerStepAction = () => {
    if (step === 1) {
      if (canCalculate) {
        setStep(2);
      }
      return;
    }

    if (step === 2) {
      if (canCalculate && rideFormCanCalculate) {
        setRideFormSubmitTrigger((current) => current + 1);
      }
      return;
    }

    if (step === 3) {
      handleSavePlan();
    }
  };

  const stepActionLabel =
    step === 1 ? 'Next: ride data' : step === 2 ? 'Create plan' : 'Save plan';

  const stepActionDisabled =
    step === 1
      ? !canCalculate
      : step === 2
        ? !(canCalculate && rideFormCanCalculate)
        : !plan;

  return (
    <>
      <div className="page-shell space-y-6">
        <PageIntro
          eyebrow="Planner"
          title="Fuel plan"
          description={
            <>
              Select fuel, enter ride data, and review the plan.
            </>
          }
          meta={
            <div className="page-stat-grid">
              <div className="page-stat">
                <p className="page-stat-label">Profile</p>
                <p className="page-stat-value">{readiness.profileCompletionPercent}%</p>
                <p className="page-stat-copy">
                  {readiness.autoReady ? 'FTP saved' : 'FTP needed'}
                </p>
              </div>
              <div className="page-stat">
                <p className="page-stat-label">Bottles</p>
                <p className="page-stat-value">{availableBottleCount}</p>
                <p className="page-stat-copy">Available now</p>
              </div>
              <div className="page-stat">
                <p className="page-stat-label">Fuel</p>
                <p className="page-stat-value">
                  {availableDrinkMixCount + availableSolidCount}
                </p>
                <p className="page-stat-copy">
                  {availableDrinkMixCount} drink mix{availableDrinkMixCount === 1 ? '' : 'es'}
                  {' '}and {availableSolidCount} solid option{availableSolidCount === 1 ? '' : 's'}.
                </p>
              </div>
            </div>
          }
        />

        <section className="grid gap-3 md:grid-cols-3">
            {STEP_LABELS.map((item) => {
              const isActive = item.step === step;
              const isComplete = item.step < step;
              return (
                <div
                  key={item.step}
                  className={`rounded-2xl border px-4 py-3 ${
                    isActive
                      ? 'border-brand-300 bg-brand-100 text-brand-900'
                      : isComplete
                        ? 'border-[color:var(--border-soft)] bg-white text-ink-900'
                        : 'border-[color:var(--border-soft)] bg-shell-100 text-ink-500'
                  }`}
                >
                  <p className="text-xs font-medium opacity-80">
                    Step {item.step}
                  </p>
                  <p className="mt-1 font-sans text-base font-semibold leading-none">
                    {item.label}
                  </p>
                </div>
              );
            })}
        </section>

        {step === 1 && (
          <div className="grid gap-5 xl:grid-cols-[0.92fr_1.28fr]">
            <Card className="overflow-hidden">
              <CardHeader className="space-y-2 bg-white/55">
                <p className="section-kicker">Setup</p>
                <h2 className="section-title">Available today</h2>
                <p className="section-copy">
                  Planner uses available items by default.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="surface-note p-4">
                    <p className="section-kicker text-[0.68rem]">Bottles</p>
                    <p
                      className={`mt-2 font-semibold ${
                        readiness.hasAvailableBottle ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {readiness.hasAvailableBottle
                        ? `${availableBottleCount} available`
                        : 'Add a bottle'}
                    </p>
                    <Link
                      to="/inventory"
                      className="mt-3 inline-flex rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-sm font-medium text-ink-700"
                    >
                      Inventory
                    </Link>
                  </div>
                  <div className="surface-note p-4">
                    <p className="section-kicker text-[0.68rem]">Bottle Mix</p>
                    <p
                      className={`mt-2 font-semibold ${
                        readiness.hasAvailableDrinkMix ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {readiness.hasAvailableDrinkMix
                        ? `${availableDrinkMixCount} available`
                        : 'Add a drink mix'}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink-600">
                      {selectedDrinkMix
                        ? `Selected: ${selectedDrinkMix.name}.`
                        : 'Select a mix below.'}
                    </p>
                  </div>
                  <div className="surface-note p-4">
                    <p className="section-kicker text-[0.68rem]">Auto Mode</p>
                    <p
                      className={`mt-2 font-semibold ${
                        readiness.autoReady ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {readiness.autoReady ? 'FTP saved' : 'Add FTP'}
                    </p>
                    <Link
                      to="/athlete?return=planner-step2"
                      className="mt-3 inline-flex rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-sm font-medium text-ink-700"
                    >
                      Athlete
                    </Link>
                  </div>
                </div>

                {readiness.missingProfileFields.length > 0 && (
                  <p className="text-sm leading-6 text-ink-600">
                    Missing: {readiness.missingProfileFields.join(', ')}
                  </p>
                )}

                <div className="surface-note p-4">
                  <p className="section-kicker text-[0.68rem]">Selected Fuel</p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    Drink mix: <span className="font-semibold text-ink-900">{selectedDrinkMix?.name ?? 'Not selected'}</span>
                  </p>
                  <p className="text-sm leading-6 text-ink-700">
                    Solids: <span className="font-semibold text-ink-900">
                      {effectiveSelectedSolidIds.length === 0
                        ? 'None'
                        : `${effectiveSelectedSolidIds.length} selected`}
                    </span>
                  </p>
                </div>

                <Collapsible
                  defaultOpen={includeUnavailableBottles || includeUnavailableProducts}
                  className="surface-note overflow-hidden"
                >
                  <CollapsibleTrigger className="px-4 py-3 md:px-5">
                    <div>
                      <p className="section-kicker text-[0.68rem]">Overrides</p>
                      <h3 className="section-title text-lg">Unavailable items</h3>
                      <p className="mt-2 text-sm leading-6 text-ink-600">
                        Use only if this plan needs items marked unavailable.
                      </p>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-[color:var(--border-soft)] px-4 py-4 md:px-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-[1.1rem] border border-[color:var(--border-soft)] bg-white px-4 py-3">
                        <div>
                          <p className="font-semibold text-ink-900">Use unavailable bottles</p>
                          <p className="text-sm leading-6 text-ink-600">
                            For this plan only.
                          </p>
                        </div>
                        <Toggle
                          checked={includeUnavailableBottles}
                          onChange={setIncludeUnavailableBottles}
                          label="Include unavailable bottles"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-[1.1rem] border border-[color:var(--border-soft)] bg-white px-4 py-3">
                        <div>
                          <p className="font-semibold text-ink-900">Use unavailable products</p>
                          <p className="text-sm leading-6 text-ink-600">
                            For this plan only.
                          </p>
                        </div>
                        <Toggle
                          checked={includeUnavailableProducts}
                          onChange={setIncludeUnavailableProducts}
                          label="Include unavailable products"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            <FuelOptionsCard
              drinkMixes={drinkMixPool}
              solidProducts={solidPool}
              selectedDrinkMixId={selectedDrinkMix?.id ?? null}
              selectedSolidIds={effectiveSelectedSolidIds}
              onDrinkMixChange={setSelectedDrinkMixId}
              onSolidChange={setSelectedSolidIds}
            />
          </div>
        )}

        {step === 2 && (
          <Card className="overflow-hidden">
            <CardHeader className="space-y-2 bg-white/55">
              <p className="section-kicker">Ride</p>
              <h2 className="section-title">Ride data</h2>
              <p className="section-copy">
                Manual sets carbs. Auto calculates from workload.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {!canCalculate && (
                <div className="surface-note border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Add one bottle and one drink mix, or enable unavailable items in setup.
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
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {plan ? (
              <>
                <Card className="overflow-hidden">
                  <CardHeader className="space-y-2 bg-white/55">
                    <p className="section-kicker">Plan</p>
                    <h2 className="section-title">Plan</h2>
                    <p className="section-copy">
                      Save a title if you want to reuse this plan.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      id="plan-title"
                      label="Name"
                      value={planTitle}
                      onChange={(event) => setPlanTitle(event.target.value)}
                      placeholder="Optional"
                    />

                    {fuelBreakdown && (
                      <div className="surface-note p-4">
                        <div className="mb-3">
                          <p className="section-kicker text-[0.68rem]">Breakdown</p>
                          <h3 className="section-title text-lg">Fuel sources</h3>
                        </div>
                        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 text-sm">
                          <p className="page-stat-label">Source</p>
                          <p className="page-stat-label text-right">Carbs</p>
                          <p className="page-stat-label text-right">Calories</p>

                          <p className="text-ink-900">Drinks</p>
                          <p className="text-right text-ink-700">
                            {fuelBreakdown.drinks.carbs}g
                          </p>
                          <p className="text-right text-ink-700">
                            {fuelBreakdown.drinks.calories} kcal
                          </p>

                          <p className="text-ink-900">Solids</p>
                          <p className="text-right text-ink-700">
                            {fuelBreakdown.solids.carbs}g
                          </p>
                          <p className="text-right text-ink-700">
                            {fuelBreakdown.solids.calories} kcal
                          </p>
                        </div>
                        <div className="my-3 border-t border-[color:var(--border-soft)]" />
                        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-sm font-semibold text-ink-900">
                          <p>Total</p>
                          <p className="text-right">{fuelBreakdown.total.carbs}g</p>
                          <p className="text-right">{fuelBreakdown.total.calories} kcal</p>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => setResultTab('pack')}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium ${
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
                        className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                          resultTab === 'guide'
                            ? 'border-brand-300 bg-brand-100 text-brand-800'
                            : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                        }`}
                      >
                        Ride Guide
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultTab('metrics')}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium ${
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

                <FuelResult
                  section={resultTab}
                  plan={plan}
                  bottles={bottles}
                  products={products}
                  onSolidQuantityChange={handleSolidQuantityChange}
                  onBottleCountChange={handleBottleCountChange}
                />

                {import.meta.env.DEV && (
                  <DebugCopyButton
                    plan={plan}
                    bottles={bottles}
                    products={products}
                    selectedDrinkMixId={selectedDrinkMix?.id ?? null}
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

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-[color:var(--border-soft)] bg-shell-50/96 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 md:px-6">
          <div className="hidden min-w-[10rem] lg:block">
            <p className="section-kicker text-[0.62rem]">Step</p>
            <p className="mt-1 text-sm leading-5 text-ink-700">{STEP_LABELS[step - 1]?.label}</p>
          </div>
          {step > 1 && (
            <Button
              variant="secondary"
              onClick={() =>
                setStep((current) => (current === 3 ? 2 : 1))
              }
            >
              Back
            </Button>
          )}
          <Button
            className="flex-1"
            size="lg"
            disabled={stepActionDisabled}
            onClick={triggerStepAction}
          >
            {stepActionLabel}
          </Button>
          {step === 3 && (
            <Button
              variant="secondary"
              onClick={() => {
                setPlan(null);
                setPlanTitle('');
                setResultTab('pack');
                setStep(1);
                setRideFormInitialSnapshot(rideFormSnapshot);
                setRideFormInstanceKey((current) => current + 1);
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {toastMessage && <Toast message={toastMessage} onDismiss={dismissToast} />}
    </>
  );
}

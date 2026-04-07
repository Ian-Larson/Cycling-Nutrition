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
  { step: 2, label: 'Ride Inputs' },
  { step: 3, label: 'Plan Output' },
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
    step === 1 ? 'Continue to Ride Inputs' : step === 2 ? 'Generate Fuel Plan' : 'Save Plan';

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
          eyebrow="Race-Day Fuel"
          title="Build a followable fuel plan"
          description={
            <>
              Move from kit check to on-bike instructions in three steps. The
              planner uses your current bottles, available nutrition, and athlete
              profile to generate a pack list you can actually follow.
            </>
          }
          meta={
            <div className="page-stat-grid">
              <div className="page-stat">
                <p className="page-stat-label">Profile</p>
                <p className="page-stat-value">{readiness.profileCompletionPercent}%</p>
                <p className="page-stat-copy">
                  {readiness.autoReady ? 'Auto mode ready' : 'Add FTP for auto mode'}
                </p>
              </div>
              <div className="page-stat">
                <p className="page-stat-label">Available Bottles</p>
                <p className="page-stat-value">{availableBottleCount}</p>
                <p className="page-stat-copy">Current ride-ready bottles in inventory.</p>
              </div>
              <div className="page-stat">
                <p className="page-stat-label">Nutrition Options</p>
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
                  className={`rounded-[1.35rem] border px-4 py-4 ${
                    isActive
                      ? 'border-brand-700 bg-brand-600 text-shell-50 shadow-[0_24px_44px_-28px_rgb(145_66_24_/_0.72)]'
                      : isComplete
                        ? 'border-[color:var(--border-soft)] bg-white text-ink-900'
                        : 'border-[color:var(--border-soft)] bg-shell-100 text-ink-500'
                  }`}
                >
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] opacity-80">
                    {isComplete ? 'Ready' : `Step 0${item.step}`}
                  </p>
                  <p className="mt-2 font-sans text-[1.4rem] font-semibold uppercase leading-none tracking-[0.06em]">
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
                <p className="section-kicker">Setup Readiness</p>
                <h2 className="section-title">Confirm today&apos;s kit</h2>
                <p className="section-copy">
                  The planner defaults to what is available right now, then lets
                  you override inventory only when you need to.
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
                        ? `${availableBottleCount} ready to plan`
                        : 'Add at least one bottle'}
                    </p>
                    <Link
                      to="/inventory"
                      className="mt-3 inline-flex rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-sm font-semibold text-ink-700"
                    >
                      Open inventory
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
                        ? `${availableDrinkMixCount} mix option${availableDrinkMixCount === 1 ? '' : 's'} available`
                        : 'Add one drink mix to continue'}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink-600">
                      {selectedDrinkMix
                        ? `Current default: ${selectedDrinkMix.name}.`
                        : 'No drink mix selected yet.'}
                    </p>
                  </div>
                  <div className="surface-note p-4">
                    <p className="section-kicker text-[0.68rem]">Auto Mode</p>
                    <p
                      className={`mt-2 font-semibold ${
                        readiness.autoReady ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {readiness.autoReady ? 'FTP connected' : 'FTP missing'}
                    </p>
                    <Link
                      to="/athlete?return=planner-step2"
                      className="mt-3 inline-flex rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-sm font-semibold text-ink-700"
                    >
                      Open athlete
                    </Link>
                  </div>
                </div>

                {readiness.missingProfileFields.length > 0 && (
                  <p className="text-sm leading-6 text-ink-600">
                    Missing profile fields: {readiness.missingProfileFields.join(', ')}
                  </p>
                )}

                <div className="surface-note p-4">
                  <p className="section-kicker text-[0.68rem]">Current Plan Shape</p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    Primary mix: <span className="font-semibold text-ink-900">{selectedDrinkMix?.name ?? 'Not selected'}</span>
                  </p>
                  <p className="text-sm leading-6 text-ink-700">
                    Solid fuel: <span className="font-semibold text-ink-900">
                      {effectiveSelectedSolidIds.length === 0
                        ? 'Bottle-only plan'
                        : `${effectiveSelectedSolidIds.length} option${effectiveSelectedSolidIds.length === 1 ? '' : 's'} selected`}
                    </span>
                  </p>
                </div>

                <Collapsible
                  defaultOpen={includeUnavailableBottles || includeUnavailableProducts}
                  className="surface-note overflow-hidden"
                >
                  <CollapsibleTrigger className="px-4 py-3 md:px-5">
                    <div>
                      <p className="section-kicker text-[0.68rem]">Advanced Scope</p>
                      <h3 className="section-title text-lg">Use gear outside inventory</h3>
                      <p className="mt-2 text-sm leading-6 text-ink-600">
                        Keep this closed for the fastest flow. Open it only when you are
                        packing bottles or products that are not marked available.
                      </p>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-[color:var(--border-soft)] px-4 py-4 md:px-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-[1.1rem] border border-[color:var(--border-soft)] bg-white px-4 py-3">
                        <div>
                          <p className="font-semibold text-ink-900">Include unavailable bottles</p>
                          <p className="text-sm leading-6 text-ink-600">
                            Override bottle availability for this plan only.
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
                          <p className="font-semibold text-ink-900">Include unavailable products</p>
                          <p className="text-sm leading-6 text-ink-600">
                            Useful when you are carrying fuel from outside your saved inventory.
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
              <p className="section-kicker">Ride Inputs</p>
              <h2 className="section-title">Define the ride load</h2>
              <p className="section-copy">
                Use manual mode when you already know the carb target. Use auto
                mode when you want the planner to derive it from workload.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {!canCalculate && (
                <div className="surface-note border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Setup is incomplete. Add at least one available bottle and drink mix
                  in Inventory, or enable plan overrides in Step 1.
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
                    <p className="section-kicker">Plan Output</p>
                    <h2 className="section-title">Review the ride brief</h2>
                    <p className="section-copy">
                      Save a short title if you want to reuse this setup later.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      id="plan-title"
                      label="Plan Title"
                      value={planTitle}
                      onChange={(event) => setPlanTitle(event.target.value)}
                      placeholder="Optional name for history"
                    />

                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => setResultTab('pack')}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold tracking-[0.04em] ${
                          resultTab === 'pack'
                            ? 'border-brand-700 bg-brand-600 text-shell-50'
                            : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                        }`}
                      >
                        Pack List
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultTab('guide')}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold tracking-[0.04em] ${
                          resultTab === 'guide'
                            ? 'border-brand-700 bg-brand-600 text-shell-50'
                            : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                        }`}
                      >
                        During Ride Guide
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultTab('metrics')}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold tracking-[0.04em] ${
                          resultTab === 'metrics'
                            ? 'border-brand-700 bg-brand-600 text-shell-50'
                            : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                        }`}
                      >
                        Metrics
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
                  Generate a plan in Step 2 to review it here.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-[color:var(--border-soft)] bg-shell-50/94 backdrop-blur-xl md:bottom-0">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 md:px-6">
          <div className="hidden min-w-[10rem] lg:block">
            <p className="section-kicker text-[0.62rem]">Current Step</p>
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
              New Plan
            </Button>
          )}
        </div>
      </div>

      {toastMessage && <Toast message={toastMessage} onDismiss={dismissToast} />}
    </>
  );
}

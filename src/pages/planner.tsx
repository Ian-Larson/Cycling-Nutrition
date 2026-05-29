import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Input,
  SegmentedControl,
  Select,
  Toast,
} from '@/components/ui';
import { PageIntro } from '@/components/layout/page-intro';
import { DebugCopyButton } from '@/components/planner/debug-copy-button';
import { FuelResultV3 } from '@/components/planner/fuel-result-v3';
import { InventoryRailPanel } from '@/components/planner/inventory-rail-panel';
import { NutritionRail } from '@/components/planner/nutrition-rail';
import { NutritionWorkspaceLayout } from '@/components/planner/nutrition-workspace-layout';
import { SavedPlansRailPanel } from '@/components/planner/saved-plans-rail-panel';
import { SetupCard } from '@/components/planner/setup-card';
import { useFuelPrescription } from '@/hooks/use-fuel-prescription';
import {
  formatNumberInputValue,
  kilogramsToPounds,
  poundsToKilograms,
  type AnthropometricsUnit,
} from '@/lib/athlete/anthropometrics';
import { buildPlannerDraftFromSavedPlan } from '@/lib/planner/saved-plan-draft';
import {
  buildOneSheetRide,
  getMissingPlanRequirements,
  normalizeSolidOverrides,
} from '@/lib/planner/one-sheet';
import { getPlanTitleSuggestion } from '@/lib/planner/planner-summaries';
import { useStore, type PlannerDraft } from '@/store';
import { BOTTLE_SIZES, totalBottleCount } from '@/types/bottle';
import type { BottleInventory, BottleSize } from '@/types/bottle';
import type { FuelPlan, HeatFactor, Product, RideCharacteristics } from '@/types';

const DEFAULT_DURATION_MINUTES = 120;
const DEFAULT_INTENSITY_FACTOR = 0.8;
const DEFAULT_HEAT_FACTOR: HeatFactor = 'moderate';

const HEAT_LABELS = {
  celsius: {
    cool: 'Cool (< 15 C)',
    moderate: 'Moderate (15-25 C)',
    warm: 'Warm (25-32 C)',
    hot: 'Hot (> 32 C)',
  },
  fahrenheit: {
    cool: 'Cool (< 60 F)',
    moderate: 'Moderate (60-77 F)',
    warm: 'Warm (77-90 F)',
    hot: 'Hot (> 90 F)',
  },
} as const;

function getQuickWeightDraft(
  weightKg: number | undefined,
  unit: AnthropometricsUnit
): string {
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg)) return '';
  return unit === 'imperial'
    ? formatNumberInputValue(kilogramsToPounds(weightKg), 1)
    : formatNumberInputValue(weightKg, 1);
}

function convertQuickWeightDraft(
  value: string,
  fromUnit: AnthropometricsUnit,
  toUnit: AnthropometricsUnit
): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  const next =
    fromUnit === 'imperial' && toUnit === 'metric'
      ? poundsToKilograms(parsed)
      : fromUnit === 'metric' && toUnit === 'imperial'
        ? kilogramsToPounds(parsed)
        : parsed;
  return formatNumberInputValue(next, 1);
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

function initBottlePool(draft: PlannerDraft | null): BottleInventory {
  if (draft?.selectedBottleCounts) {
    return BOTTLE_SIZES.reduce(
      (acc, size) => {
        acc[size] = Math.max(0, draft.selectedBottleCounts![size] ?? 0);
        return acc;
      },
      { 550: 0, 750: 0, 950: 0 } as BottleInventory
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

function getInitialIntensityFactor(draft: PlannerDraft | null): string {
  const value =
    draft?.ride?.autoMetrics?.userProvidedIntensityFactor ??
    draft?.ride?.autoMetrics?.intensityFactor ??
    DEFAULT_INTENSITY_FACTOR;
  return String(value);
}

function getInitialCarbTarget(draft: PlannerDraft | null): string {
  return String(draft?.ride?.carbTargetGramsPerHour ?? '');
}

function PlannerSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-b border-[color:var(--border-soft)] px-4 py-5 last:border-b-0 md:px-5 md:py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="section-title text-lg">{title}</h2>
        {summary ? (
          <p className="text-sm leading-5 text-ink-600 tabular-nums">
            {summary}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function parseNumber(value: string): number {
  return Number(value);
}

export function PlannerPage() {
  const [searchParams] = useSearchParams();
  const products = useStore((s) => s.products);
  const fuelPlans = useStore((s) => s.fuelPlans);
  const athleteProfile = useStore((s) => s.settings.athleteProfile);
  const temperatureUnit = useStore((s) => s.settings.temperatureUnit);
  const saveFuelPlan = useStore((s) => s.saveFuelPlan);
  const deleteFuelPlan = useStore((s) => s.deleteFuelPlan);
  const setPlannerDraft = useStore((s) => s.setPlannerDraft);
  const updateAthleteProfile = useStore((s) => s.updateAthleteProfile);
  const updateProduct = useStore((s) => s.updateProduct);
  const fuelEngine = useFuelPrescription();

  const [initialDraft] = useState<PlannerDraft | null>(() => {
    const current = useStore.getState().plannerDraft;
    return isPlannerDraftShape(current) ? current : null;
  });

  const [durationMinutes, setDurationMinutes] = useState(
    initialDraft?.ride?.durationMinutes ?? DEFAULT_DURATION_MINUTES
  );
  const [intensityFactorInput, setIntensityFactorInput] = useState(
    getInitialIntensityFactor(initialDraft)
  );
  const [heatFactor, setHeatFactor] = useState<HeatFactor>(
    initialDraft?.ride?.heatFactor ?? DEFAULT_HEAT_FACTOR
  );
  const [carbTargetInput, setCarbTargetInput] = useState(
    getInitialCarbTarget(initialDraft)
  );
  const [carbTargetIsCustom, setCarbTargetIsCustom] = useState(
    Boolean(initialDraft?.ride?.autoMetrics?.carbOverrideApplied)
  );
  const [refuelStops, setRefuelStops] = useState(
    initialDraft?.ride?.refuelStops ?? 0
  );
  const [bottlePool, setBottlePool] = useState<BottleInventory>(() =>
    initBottlePool(initialDraft)
  );
  const [selectedDrinkMixId, setSelectedDrinkMixId] = useState<string | null>(
    getDefaultSelectedDrinkMixId(products, initialDraft)
  );
  const [selectedSolidIds, setSelectedSolidIds] = useState<string[]>(
    getDefaultSelectedSolidIds(products, initialDraft)
  );
  const [solidOverrides, setSolidOverrides] = useState<
    Record<string, number> | undefined
  >(() => normalizeSolidOverrides(initialDraft?.solidOverrides));
  const [planTitle, setPlanTitle] = useState(initialDraft?.title ?? '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [draftSavedFlash, setDraftSavedFlash] = useState(false);
  const [quickWeightUnit, setQuickWeightUnit] = useState<AnthropometricsUnit>(
    athleteProfile.anthropometricsUnit ?? 'metric'
  );
  const [quickWeightInput, setQuickWeightInput] = useState(
    getQuickWeightDraft(
      athleteProfile.weightKg,
      athleteProfile.anthropometricsUnit ?? 'metric'
    )
  );
  const [quickWeightError, setQuickWeightError] = useState<string | undefined>();
  const previousDraftSignatureRef = useRef<string | null>(null);

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

  const intensityFactor = parseNumber(intensityFactorInput);
  const parsedCarbTarget = parseNumber(carbTargetInput);
  const customCarbTargetIsValid =
    !carbTargetIsCustom ||
    (Number.isFinite(parsedCarbTarget) &&
      parsedCarbTarget >= 0 &&
      parsedCarbTarget <= 120);
  const carbTargetError = customCarbTargetIsValid
    ? undefined
    : 'Enter carbs/hour from 0 to 120.';

  const recommendationInput = useMemo(
    () => ({
      durationMinutes,
      intensityFactor,
      heatFactor,
      ftpWatts: athleteProfile.ftpWatts,
      heavySweater: athleteProfile.heavySweater,
      gutTrainingTargetGph: athleteProfile.gutTrainingTargetGph,
      refuelStops,
    }),
    [
      athleteProfile.ftpWatts,
      athleteProfile.gutTrainingTargetGph,
      athleteProfile.heavySweater,
      durationMinutes,
      heatFactor,
      intensityFactor,
      refuelStops,
    ]
  );

  const recommendedRide = useMemo(() => {
    try {
      return buildOneSheetRide(recommendationInput);
    } catch {
      return null;
    }
  }, [recommendationInput]);

  const recommendedCarbTarget =
    recommendedRide?.autoMetrics?.autoCarbTargetGramsPerHour ??
    recommendedRide?.carbTargetGramsPerHour;

  const effectiveRide = useMemo(() => {
    if (carbTargetIsCustom && !customCarbTargetIsValid) return null;
    try {
      return buildOneSheetRide({
        ...recommendationInput,
        carbTargetOverrideGramsPerHour: carbTargetIsCustom
          ? parsedCarbTarget
          : undefined,
      });
    } catch {
      return null;
    }
  }, [
    carbTargetIsCustom,
    customCarbTargetIsValid,
    parsedCarbTarget,
    recommendationInput,
  ]);

  const missingRequirements = useMemo(() => {
    const missing = getMissingPlanRequirements({
      weightReady: fuelEngine.weightReady,
      durationMinutes,
      intensityFactor,
      bottleCount: totalBottleCount(bottlePool),
      hasDrinkMix: Boolean(selectedDrinkMix),
    });
    if (carbTargetError) missing.push(carbTargetError);
    return missing;
  }, [
    bottlePool,
    carbTargetError,
    durationMinutes,
    fuelEngine.weightReady,
    intensityFactor,
    selectedDrinkMix,
  ]);

  const prescription = useMemo(() => {
    if (missingRequirements.length > 0 || !effectiveRide || !selectedDrinkMix) {
      return null;
    }

    return fuelEngine.build({
      ride: effectiveRide,
      bottles: selectedBottleSlots,
      drinkMix: selectedDrinkMix,
      solids: selectedSolidProducts,
      solidOverrides,
    });
  }, [
    effectiveRide,
    fuelEngine,
    missingRequirements.length,
    selectedBottleSlots,
    selectedDrinkMix,
    selectedSolidProducts,
    solidOverrides,
  ]);

  useEffect(() => {
    const nextDraft: PlannerDraft = {
      ride: effectiveRide ?? recommendedRide ?? undefined,
      selectedBottleCounts: bottlePool,
      selectedDrinkMixId: effectiveSelectedDrinkMixId,
      selectedSolidIds: effectiveSelectedSolidIds,
      solidOverrides,
      title: planTitle || undefined,
    };
    const nextSignature = JSON.stringify(nextDraft);

    setPlannerDraft(nextDraft);
    if (previousDraftSignatureRef.current === null) {
      previousDraftSignatureRef.current = nextSignature;
      return;
    }
    if (previousDraftSignatureRef.current === nextSignature) return;

    previousDraftSignatureRef.current = nextSignature;
    const showTimer = setTimeout(() => setDraftSavedFlash(true), 0);
    const hideTimer = setTimeout(() => setDraftSavedFlash(false), 1600);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [
    bottlePool,
    effectiveRide,
    effectiveSelectedDrinkMixId,
    effectiveSelectedSolidIds,
    planTitle,
    recommendedRide,
    setPlannerDraft,
    solidOverrides,
  ]);

  const heatOptions = Object.entries(HEAT_LABELS[temperatureUnit]).map(
    ([value, label]) => ({ value, label })
  );

  const handleBottleCountChange = (size: BottleSize, count: number) => {
    setBottlePool((prev) => ({ ...prev, [size]: Math.max(0, count) }));
  };

  const handleSolidSelectionChange = (ids: string[]) => {
    setSelectedSolidIds(ids);
    setSolidOverrides((current) => {
      if (!current) return undefined;
      const allowed = new Set(ids);
      const next = Object.fromEntries(
        Object.entries(current).filter(([productId]) => allowed.has(productId))
      );
      return Object.keys(next).length > 0 ? next : undefined;
    });
  };

  const handleSolidQuantityChange = (productId: string, quantity: number) => {
    setSolidOverrides((current) => ({
      ...(current ?? {}),
      [productId]: quantity,
    }));
  };

  const handleSavePlan = () => {
    if (!prescription || !effectiveRide) return;

    saveFuelPlan({
      title: planTitle.trim() || undefined,
      ride: effectiveRide,
      bottlePool,
      selectedDrinkMixId: effectiveSelectedDrinkMixId,
      selectedSolidIds: effectiveSelectedSolidIds,
      solidOverrides,
      prescription,
    });
    setToastMessage('Plan saved to history.');
  };

  const handleResetPlan = () => {
    setDurationMinutes(DEFAULT_DURATION_MINUTES);
    setIntensityFactorInput(String(DEFAULT_INTENSITY_FACTOR));
    setHeatFactor(DEFAULT_HEAT_FACTOR);
    setCarbTargetIsCustom(false);
    setRefuelStops(0);
    setBottlePool({ 550: 0, 750: 0, 950: 0 });
    setSelectedDrinkMixId(getDefaultSelectedDrinkMixId(products, null));
    setSelectedSolidIds(getDefaultSelectedSolidIds(products, null));
    setSolidOverrides(undefined);
    setPlanTitle('');
  };

  const handleReuseSavedPlan = (savedPlan: FuelPlan) => {
    const draft = buildPlannerDraftFromSavedPlan(savedPlan, products);
    const ride = draft.ride;
    setPlannerDraft(draft);
    setBottlePool(initBottlePool(draft));
    setSelectedDrinkMixId(draft.selectedDrinkMixId ?? null);
    setSelectedSolidIds(draft.selectedSolidIds ?? []);
    setSolidOverrides(normalizeSolidOverrides(draft.solidOverrides));
    setPlanTitle(draft.title ?? '');
    if (ride) {
      setDurationMinutes(ride.durationMinutes);
      setIntensityFactorInput(
        String(
          ride.autoMetrics?.userProvidedIntensityFactor ??
            ride.autoMetrics?.intensityFactor ??
            DEFAULT_INTENSITY_FACTOR
        )
      );
      setHeatFactor(ride.heatFactor);
      setCarbTargetInput(String(ride.carbTargetGramsPerHour));
      setCarbTargetIsCustom(Boolean(ride.autoMetrics?.carbOverrideApplied));
      setRefuelStops(ride.refuelStops ?? 0);
    }
    setToastMessage('Saved plan loaded.');
  };

  const handleQuickWeightUnitChange = (unit: AnthropometricsUnit) => {
    setQuickWeightInput((current) =>
      convertQuickWeightDraft(current, quickWeightUnit, unit)
    );
    setQuickWeightUnit(unit);
    setQuickWeightError(undefined);
  };

  const handleQuickWeightSubmit = () => {
    const parsed = Number(quickWeightInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQuickWeightError('Enter a valid rider weight.');
      return;
    }
    const weightKg =
      quickWeightUnit === 'imperial' ? poundsToKilograms(parsed) : parsed;
    updateAthleteProfile({
      anthropometricsUnit: quickWeightUnit,
      weightKg,
    });
    setQuickWeightError(undefined);
    setToastMessage('Weight saved. Plan updated.');
  };

  const dismissToast = useCallback(() => setToastMessage(null), []);
  const showDebugCopy =
    import.meta.env.DEV && searchParams.get('debug') === '1';
  const bottleCount = totalBottleCount(bottlePool);
  const carbTargetDisplayValue =
    carbTargetIsCustom || recommendedCarbTarget === undefined
      ? carbTargetInput
      : String(recommendedCarbTarget);
  const requestedCarbTarget = Number(carbTargetDisplayValue);
  const effectivePlanTarget =
    prescription !== null ? Math.round(prescription.during.carbsGPerHour) : undefined;
  const targetWasCapped =
    effectivePlanTarget !== undefined &&
    Number.isFinite(requestedCarbTarget) &&
    Math.round(requestedCarbTarget) !== effectivePlanTarget;
  const rideSummary = [
    `${durationMinutes} min`,
    Number.isFinite(intensityFactor) ? `${intensityFactor.toFixed(2)} IF` : 'IF',
    effectivePlanTarget !== undefined
      ? `${effectivePlanTarget} g/h plan`
      : recommendedCarbTarget !== undefined
        ? `${carbTargetDisplayValue} g/h`
      : 'target',
  ].join(' · ');
  const carrySummary = [
    bottleCount === 1 ? '1 bottle' : `${bottleCount} bottles`,
    selectedDrinkMix?.name ?? 'No mix',
    `${effectiveSelectedSolidIds.length} solids`,
  ].join(' · ');
  const planSummary = prescription
    ? `${Math.round(prescription.during.carbsGPerHour / 2)} g carbs / 30 min`
    : undefined;

  return (
    <>
      <div className="page-shell space-y-5 md:space-y-6">
        <PageIntro
          title="Fuel plan"
          description="Enter duration and projected IF. The plan updates as you adjust."
          meta={
            <div aria-live="polite" className="text-xs text-ink-500">
              {draftSavedFlash && (
                <span className="inline-flex items-center gap-1 transition-opacity duration-300">
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
            <div className="overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-white shadow-[var(--shadow-soft)]">
              {!fuelEngine.weightReady ? (
                <PlannerSection title="Weight">
                  <Card className="overflow-hidden shadow-none">
                    <CardContent className="space-y-4 py-5 md:py-6">
                      <div className="space-y-2">
                        <h2 className="text-lg font-semibold text-ink-900">
                          Set your weight to plan
                        </h2>
                        <p className="max-w-prose text-sm leading-6 text-ink-600">
                          One number sizes carbs, fluid, and sodium.
                        </p>
                      </div>
                      <form
                        aria-label="Set rider weight"
                        className="space-y-4"
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleQuickWeightSubmit();
                        }}
                      >
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-end">
                          <Input
                            id="planner-quick-weight"
                            label={`Weight, ${quickWeightUnit === 'imperial' ? 'lb' : 'kg'}`}
                            type="number"
                            min="1"
                            inputMode="decimal"
                            value={quickWeightInput}
                            onChange={(event) => {
                              setQuickWeightInput(event.target.value);
                              setQuickWeightError(undefined);
                            }}
                            placeholder={quickWeightUnit === 'imperial' ? '160' : '72'}
                            error={quickWeightError}
                          />
                          <SegmentedControl
                            label="Weight unit"
                            options={[
                              { value: 'metric', label: 'kg' },
                              { value: 'imperial', label: 'lb' },
                            ]}
                            value={quickWeightUnit}
                            onChange={handleQuickWeightUnitChange}
                            className="w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Button type="submit">Use this weight</Button>
                          <Link
                            to="/account#athlete"
                            className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-ink-700 transition-colors hover:bg-shell-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 md:min-h-10"
                          >
                            Edit full profile
                          </Link>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </PlannerSection>
              ) : null}

              <PlannerSection title="Ride" summary={rideSummary}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Input
                    id="planner-duration"
                    label="Duration, min"
                    type="number"
                    min={30}
                    max={300}
                    step={5}
                    value={durationMinutes}
                    onChange={(event) =>
                      setDurationMinutes(Number(event.target.value))
                    }
                  />
                  <Input
                    id="planner-if"
                    label="Projected IF"
                    type="number"
                    min={0.4}
                    max={1.3}
                    step={0.01}
                    value={intensityFactorInput}
                    onChange={(event) => setIntensityFactorInput(event.target.value)}
                  />
                  <Select
                    label="Weather"
                    value={heatFactor}
                    onChange={(event) =>
                      setHeatFactor(event.target.value as HeatFactor)
                    }
                    options={heatOptions}
                  />
                  <div className="space-y-2">
                    <Input
                      id="planner-carbs"
                      label="Carbs/hour"
                      type="number"
                      min={0}
                      max={120}
                      step={5}
                      value={carbTargetDisplayValue}
                      onChange={(event) => {
                        setCarbTargetIsCustom(true);
                        setCarbTargetInput(event.target.value);
                      }}
                      error={carbTargetError}
                    />
                    <div className="flex min-h-5 items-center gap-2 text-xs text-ink-500">
                      {carbTargetIsCustom ? (
                        <>
                          <span>Custom target</span>
                          <button
                            type="button"
                            className="font-medium text-brand-700 underline-offset-2 hover:underline"
                            onClick={() => {
                              setCarbTargetIsCustom(false);
                              if (recommendedCarbTarget !== undefined) {
                                setCarbTargetInput(String(recommendedCarbTarget));
                              }
                            }}
                          >
                            Reset
                          </button>
                        </>
                      ) : (
                        <span>Suggested from ride and preference</span>
                      )}
                    </div>
                    {targetWasCapped && effectivePlanTarget !== undefined ? (
                      <p className="text-xs leading-5 text-warning-700">
                        Plan uses {effectivePlanTarget} g/h after your gut target cap.
                      </p>
                    ) : null}
                  </div>
                </div>

                {durationMinutes >= 120 ? (
                  <div className="max-w-xs pt-1">
                    <Select
                      label="Refills"
                      value={String(refuelStops)}
                      onChange={(event) => setRefuelStops(Number(event.target.value))}
                      options={[
                        { value: '0', label: 'No refill' },
                        { value: '1', label: '1 refill' },
                        { value: '2', label: '2 refills' },
                      ]}
                    />
                  </div>
                ) : null}
              </PlannerSection>

              <PlannerSection title="Carry" summary={carrySummary}>
                <SetupCard
                  variant="embedded"
                  selectedBottleCounts={bottlePool}
                  drinkMixes={drinkMixOptions}
                  solidProducts={solidOptions}
                  selectedDrinkMixId={effectiveSelectedDrinkMixId}
                  selectedSolidIds={effectiveSelectedSolidIds}
                  onBottleCountChange={handleBottleCountChange}
                  onDrinkMixChange={setSelectedDrinkMixId}
                  onSolidChange={handleSolidSelectionChange}
                />
              </PlannerSection>

              <PlannerSection title="Plan" summary={planSummary}>
                {prescription ? (
                  <div className="space-y-5">
                    <FuelResultV3
                      section="all"
                      prescription={prescription}
                      products={products}
                      availableSolids={selectedSolidProducts}
                      onSolidQuantityChange={handleSolidQuantityChange}
                    />

                    <section className="space-y-3 border-t border-[color:var(--border-soft)] pt-4">
                      <div className="space-y-1">
                        <h3 className="section-title">Save for later</h3>
                        <p className="text-sm leading-5 text-ink-600">
                          Optional. The prep list above is ready now.
                        </p>
                      </div>

                      <Input
                        id="plan-title"
                        label="Plan name"
                        value={planTitle}
                        onChange={(event) => setPlanTitle(event.target.value)}
                        placeholder={
                          effectiveRide
                            ? getPlanTitleSuggestion(effectiveRide)
                            : 'Optional'
                        }
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
                          Start over
                        </Button>
                      </div>
                    </section>

                    {showDebugCopy && (
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
                  <Alert variant="info" title="Plan needs a few inputs">
                    <ul className="list-disc space-y-1 pl-5">
                      {missingRequirements.map((requirement) => (
                        <li key={requirement}>{requirement}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
              </PlannerSection>
            </div>
          }
          rail={
            <NutritionRail>
              <InventoryRailPanel
                key={prescription ? 'inventory-plan-ready' : 'inventory-editing'}
                products={products}
                defaultOpen={!prescription}
                onToggleProductAvailability={(productId, isAvailable) => {
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

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SegmentedControl,
  Stepper,
  Toggle,
} from '@/components/ui';
import { useFuelPrescription } from '@/hooks/use-fuel-prescription';
import {
  formatNumberInputValue,
  kilogramsToPounds,
  poundsToKilograms,
  type AnthropometricsUnit,
} from '@/lib/athlete/anthropometrics';
import {
  formatCarbsGrams,
  formatCarbsPerHour,
  formatFluidMl,
  formatFluidPerHour,
} from '@/lib/fueling/format';
import type { FuelingPrescription } from '@/lib/fueling/types';
import { useAuth } from '@/lib/auth/auth-context';
import { useStore } from '@/store';
import type { Product, RideCharacteristics } from '@/types';
import { BOTTLE_SIZES, totalBottleCount, type BottleInventory } from '@/types/bottle';

type OnboardingStep = 'welcome' | 'connect' | 'rider' | 'ride' | 'bottles';
type CarbTargetStyle = 'conservative' | 'standard' | 'aggressive';
type SweatTendency = 'light' | 'average' | 'heavy';

const STEPS: OnboardingStep[] = ['welcome', 'connect', 'rider', 'ride', 'bottles'];

const CARB_TARGETS: Record<CarbTargetStyle, number> = {
  conservative: 55,
  standard: 75,
  aggressive: 90,
};

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Welcome',
  connect: 'Connect',
  rider: 'Rider',
  ride: 'Ride',
  bottles: 'Plan',
};

function stepNumber(step: OnboardingStep): number {
  return STEPS.indexOf(step) + 1;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
}

function getFirstDrinkMix(products: Product[], selectedId: string | null): Product | null {
  return (
    products.find((product) => product.id === selectedId && product.type === 'drink_mix') ??
    products.find((product) => product.type === 'drink_mix' && product.isAvailable) ??
    null
  );
}

function buildBottleSlots(bottlePool: BottleInventory) {
  return BOTTLE_SIZES.flatMap((size) =>
    Array.from({ length: bottlePool[size] }, () => ({ capacityMl: size }))
  );
}

function getWeightInputValue(
  weightKg: number | undefined,
  unit: AnthropometricsUnit
): string {
  const fallbackKg = weightKg ?? 72;
  return unit === 'imperial'
    ? formatNumberInputValue(kilogramsToPounds(fallbackKg), 1)
    : formatNumberInputValue(fallbackKg, 1);
}

function convertWeightInputUnit(
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

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink-700">{label}</p>
      {children}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[color:var(--border-soft)] bg-shell-100 px-3 py-3">
      <p className="text-xs font-semibold text-ink-500">{label}</p>
      <p
        className={`mt-1 font-sans text-lg font-semibold tabular-nums ${
          accent ? 'text-brand-700' : 'text-ink-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PlanPreview({
  prescription,
  drinkMix,
}: {
  prescription: FuelingPrescription | null;
  drinkMix: Product | null;
}) {
  if (!prescription) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-5">
        <p className="text-sm font-medium text-ink-900">Plan preview</p>
        <p className="mt-1 text-sm leading-6 text-ink-600">
          Add rider, ride, and bottle details to build the first plan.
        </p>
      </div>
    );
  }

  const firstDuring = prescription.timeline?.find((item) => item.phase === 'during');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink-900">Plan ready</h2>
        <Badge variant="success">First plan</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SummaryStat
          label="Carbs"
          value={formatCarbsPerHour(prescription.during.carbsGPerHour)}
          accent
        />
        <SummaryStat
          label="Total"
          value={formatCarbsGrams(prescription.during.totalCarbsGrams)}
        />
        <SummaryStat
          label="Fluid"
          value={formatFluidPerHour(prescription.during.hydrationMlPerHour)}
        />
        <SummaryStat
          label="Carry"
          value={formatFluidMl(
            prescription.packList?.bottles.reduce(
              (sum, bottle) => sum + bottle.capacityMl,
              0
            ) ?? 0
          )}
        />
      </div>

      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-shell-100">
        <div className="border-b border-[color:var(--border-soft)] px-3 py-2.5">
          <p className="text-sm font-semibold text-ink-900">Bottle allocation</p>
        </div>
        <div className="divide-y divide-[color:var(--border-soft)]">
          {prescription.packList?.bottles.map((bottle, index) => (
            <div
              key={`${bottle.capacityMl}-${index}`}
              className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
            >
              <span className="font-medium text-ink-900">
                Bottle {index + 1}, {bottle.capacityMl} ml
              </span>
              <span className="text-right tabular-nums text-ink-600">
                {bottle.isWaterOnly || !drinkMix
                  ? 'Water'
                  : `${Math.round(bottle.mixGrams)} g ${drinkMix.name}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {firstDuring ? (
        <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm leading-6 text-brand-900">
          First cue: Start sipping in the first 15 minutes.
        </div>
      ) : null}
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const products = useStore((s) => s.products);
  const settings = useStore((s) => s.settings);
  const updateAthleteProfile = useStore((s) => s.updateAthleteProfile);
  const saveFuelPlan = useStore((s) => s.saveFuelPlan);
  const setPlannerDraft = useStore((s) => s.setPlannerDraft);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const skipOnboarding = useStore((s) => s.skipOnboarding);
  const dismissOnboardingAccountStep = useStore((s) => s.dismissOnboardingAccountStep);
  const dismissOnboardingStravaStep = useStore((s) => s.dismissOnboardingStravaStep);
  const fuelEngine = useFuelPrescription();

  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [email, setEmail] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [weightUnit, setWeightUnit] = useState<AnthropometricsUnit>(
    settings.athleteProfile.anthropometricsUnit ?? 'metric'
  );
  const [weightInput, setWeightInput] = useState(
    getWeightInputValue(
      settings.athleteProfile.weightKg,
      settings.athleteProfile.anthropometricsUnit ?? 'metric'
    )
  );
  const [carbTargetStyle, setCarbTargetStyle] =
    useState<CarbTargetStyle>('standard');
  const [sweatTendency, setSweatTendency] = useState<SweatTendency>(
    settings.athleteProfile.heavySweater ? 'heavy' : 'average'
  );
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [intensity, setIntensity] =
    useState<RideCharacteristics['intensity']>('endurance');
  const [heatFactor, setHeatFactor] =
    useState<RideCharacteristics['heatFactor']>('moderate');
  const [bottlePool, setBottlePool] = useState<BottleInventory>({
    550: 0,
    750: 2,
    950: 0,
  });
  const [plainWaterAllowed, setPlainWaterAllowed] = useState(true);
  const [selectedDrinkMixId, setSelectedDrinkMixId] = useState<string | null>(
    () => products.find((product) => product.type === 'drink_mix' && product.isAvailable)?.id ?? null
  );

  const selectedDrinkMix = useMemo(
    () => getFirstDrinkMix(products, selectedDrinkMixId),
    [products, selectedDrinkMixId]
  );

  const drinkMixOptions = useMemo(
    () =>
      products
        .filter((product) => product.type === 'drink_mix')
        .map((product) => ({ value: product.id, label: product.name })),
    [products]
  );

  const ride: RideCharacteristics = useMemo(
    () => ({
      durationMinutes,
      intensity,
      heatFactor,
      carbTargetGramsPerHour: CARB_TARGETS[carbTargetStyle],
      planningMode: 'manual',
    }),
    [carbTargetStyle, durationMinutes, heatFactor, intensity]
  );

  const prescription = useMemo(() => {
    if (!selectedDrinkMix || totalBottleCount(bottlePool) === 0) return null;
    return fuelEngine.build({
      ride,
      bottles: buildBottleSlots(bottlePool),
      drinkMix: selectedDrinkMix,
      solids: [],
    });
  }, [bottlePool, fuelEngine, ride, selectedDrinkMix]);

  const progress = stepNumber(step);
  const parsedWeightInput = Number(weightInput);
  const parsedWeightKg =
    weightUnit === 'imperial'
      ? poundsToKilograms(parsedWeightInput)
      : parsedWeightInput;
  const weightValid = Number.isFinite(parsedWeightKg) && parsedWeightKg > 0;
  const signedIn = auth.authStatus === 'signedIn' && auth.user !== null;
  const canConnectStrava = signedIn && auth.stravaConnection === null;

  const goTo = (next: OnboardingStep) => setStep(next);
  const goBack = () => {
    const index = STEPS.indexOf(step);
    if (index <= 0) return;
    setStep(STEPS[index - 1]);
  };

  const handleSkip = () => {
    skipOnboarding();
    navigate('/', { replace: true });
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingEmail(true);
    setOtpCode('');
    await auth.signInWithEmail(email);
    setIsSubmittingEmail(false);
  };

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsVerifyingOtp(true);
    await auth.verifyEmailOtp(otpCode);
    setIsVerifyingOtp(false);
  };

  const handleUseDifferentEmail = () => {
    auth.cancelEmailVerification();
    setOtpCode('');
  };

  const handleConnectLater = () => {
    dismissOnboardingAccountStep();
    dismissOnboardingStravaStep();
    goTo('rider');
  };

  const handleRiderContinue = () => {
    if (!weightValid) return;
    updateAthleteProfile({
      weightKg: parsedWeightKg,
      anthropometricsUnit: weightUnit,
      heavySweater: sweatTendency === 'heavy',
      gutTrainingTargetGph: CARB_TARGETS[carbTargetStyle],
    });
    goTo('ride');
  };

  const handleWeightUnitChange = (nextUnit: AnthropometricsUnit) => {
    setWeightInput((current) =>
      convertWeightInputUnit(current, weightUnit, nextUnit)
    );
    setWeightUnit(nextUnit);
    updateAthleteProfile({ anthropometricsUnit: nextUnit });
  };

  const handleBottleCountChange = (size: keyof BottleInventory, value: number) => {
    setBottlePool((current) => ({
      ...current,
      [size]: Math.max(0, value),
    }));
  };

  const handleUsePlan = () => {
    if (!prescription || !selectedDrinkMix) return;

    const title = `${formatDuration(durationMinutes)} ${intensity} fuel plan`;
    saveFuelPlan({
      title,
      ride,
      bottlePool,
      selectedDrinkMixId: selectedDrinkMix.id,
      selectedSolidIds: [],
      prescription,
    });
    setPlannerDraft({
      ride,
      selectedBottleCounts: bottlePool,
      selectedDrinkMixId: selectedDrinkMix.id,
      selectedSolidIds: [],
      title,
    });
    completeOnboarding();
    navigate('/', { replace: true });
  };

  return (
    <div className="page-shell pb-24 md:pb-12">
      <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <section className="space-y-5">
          <div className="border-b border-[color:var(--border-soft)] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {progress} of {STEPS.length}
                </p>
                <h1 className="mt-2 max-w-[18ch] text-3xl font-bold tracking-[-0.035em] text-ink-900 md:text-[2.35rem] md:leading-[1.02]">
                  {step === 'welcome' ? 'Set up Domestique' : STEP_LABELS[step]}
                </h1>
              </div>
              {step === 'welcome' ? null : (
                <Button type="button" variant="ghost" size="sm" onClick={handleSkip}>
                  Skip for now
                </Button>
              )}
            </div>
            <div className="mt-4 grid grid-cols-5 gap-1.5" aria-hidden>
              {STEPS.map((candidate) => (
                <div
                  key={candidate}
                  className={`h-1.5 rounded-full ${
                    stepNumber(candidate) <= progress ? 'bg-brand-500' : 'bg-shell-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {step === 'welcome' ? (
            <Card>
              <CardContent className="space-y-5 py-6 md:py-8">
                <div className="max-w-prose space-y-3">
                  <p className="text-lg font-semibold text-ink-900">
                    Build your first fuel plan in about 2 minutes.
                  </p>
                  <p className="text-sm leading-6 text-ink-600">
                    A few ride and rider details let Domestique calculate bottle setup,
                    carb targets, and the first ride cue.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={() => goTo('connect')}>
                    Start setup
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleSkip}>
                    Skip for now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 'connect' ? (
            <Card>
              <CardContent className="space-y-5 py-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-ink-900">
                    Keep plans and rides connected
                  </h2>
                  <p className="max-w-prose text-sm leading-6 text-ink-600">
                    Sync keeps rides and plans backed up. Strava can prefill future
                    ride details.
                  </p>
                </div>

                {!auth.isSupabaseReady ? (
                  <Alert variant="warning">
                    Accounts are disabled in this build. You can still use local planning.
                  </Alert>
                ) : signedIn ? (
                  <Alert variant="success">
                    Signed in as {auth.user?.email}. Cloud backup can keep this plan.
                  </Alert>
                ) : auth.pendingEmailVerification ? (
                  <form onSubmit={handleOtpSubmit} className="space-y-3">
                    <Input
                      id="onboarding-otp"
                      label="6-digit code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{6}"
                      maxLength={6}
                      value={otpCode}
                      onChange={(event) =>
                        setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="123456"
                      disabled={isVerifyingOtp}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="submit"
                        disabled={isVerifyingOtp || otpCode.length !== 6}
                      >
                        {isVerifyingOtp ? 'Verifying…' : 'Verify and sign in'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleUseDifferentEmail}
                        disabled={isVerifyingOtp}
                      >
                        Use a different email
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form
                    onSubmit={handleEmailSubmit}
                    className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                  >
                    <Input
                      id="onboarding-email"
                      label="Email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      disabled={isSubmittingEmail}
                    />
                    <Button type="submit" disabled={isSubmittingEmail}>
                      {isSubmittingEmail ? 'Sending…' : 'Sign in'}
                    </Button>
                  </form>
                )}

                <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-ink-900">Strava</p>
                      <p className="text-sm leading-6 text-ink-600">
                        {auth.stravaConnection
                          ? 'Connected. Future rides can carry more context.'
                          : signedIn
                            ? 'Connect after sign-in to pull ride context later.'
                            : 'Sign in first, or continue locally.'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!canConnectStrava}
                      onClick={auth.connectStrava}
                    >
                      {auth.stravaConnection ? 'Connected' : 'Connect Strava'}
                    </Button>
                  </div>
                </div>

                {auth.authMessage || auth.stravaMessage ? (
                  <p aria-live="polite" className="text-sm text-ink-600">
                    {auth.authMessage ?? auth.stravaMessage}
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button type="button" variant="ghost" onClick={goBack}>
                    Back
                  </Button>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="secondary" onClick={handleConnectLater}>
                      Do this later
                    </Button>
                    <Button type="button" onClick={() => goTo('rider')}>
                      Continue
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 'rider' ? (
            <Card>
              <CardContent className="space-y-5 py-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-ink-900">
                    Your rider defaults
                  </h2>
                  <p className="max-w-prose text-sm leading-6 text-ink-600">
                    These set the first calculation. You can tune them later from Account.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-start">
                  <Input
                    id="onboarding-weight"
                    label={`Weight, ${weightUnit === 'imperial' ? 'lb' : 'kg'}`}
                    type="number"
                    min="1"
                    inputMode="decimal"
                    value={weightInput}
                    onChange={(event) => setWeightInput(event.target.value)}
                    error={weightValid ? undefined : 'Enter rider weight.'}
                  />
                  <FieldGroup label="Units">
                    <SegmentedControl
                      size="sm"
                      label="Weight unit"
                      options={[
                        { value: 'metric', label: 'kg' },
                        { value: 'imperial', label: 'lb' },
                      ]}
                      value={weightUnit}
                      onChange={handleWeightUnitChange}
                      className="w-full"
                    />
                  </FieldGroup>
                </div>
                <FieldGroup label="Carb target style">
                  <SegmentedControl
                    label="Carb target style"
                    options={[
                      { value: 'conservative', label: 'Conservative' },
                      { value: 'standard', label: 'Standard' },
                      { value: 'aggressive', label: 'Aggressive' },
                    ]}
                    value={carbTargetStyle}
                    onChange={setCarbTargetStyle}
                    className="w-full"
                  />
                </FieldGroup>
                <FieldGroup label="Sweat tendency">
                  <SegmentedControl
                    label="Sweat tendency"
                    options={[
                      { value: 'light', label: 'Light' },
                      { value: 'average', label: 'Average' },
                      { value: 'heavy', label: 'Heavy' },
                    ]}
                    value={sweatTendency}
                    onChange={setSweatTendency}
                    className="w-full"
                  />
                </FieldGroup>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button type="button" variant="ghost" onClick={goBack}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRiderContinue}
                    disabled={!weightValid}
                  >
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 'ride' ? (
            <Card>
              <CardContent className="space-y-5 py-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-ink-900">First ride</h2>
                  <p className="max-w-prose text-sm leading-6 text-ink-600">
                    Set the ride you are packing for now.
                  </p>
                </div>
                <div className="rounded-2xl border border-[color:var(--border-soft)] bg-shell-100 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Duration</p>
                      <p className="text-sm text-ink-600">{formatDuration(durationMinutes)}</p>
                    </div>
                    <Stepper
                      value={durationMinutes}
                      onChange={setDurationMinutes}
                      min={30}
                      max={480}
                      step={15}
                      label="Duration"
                      hideLabel
                      formatValue={(value) => `${value} min`}
                    />
                  </div>
                </div>
                <SegmentedControl
                  label="Intensity"
                  options={[
                    { value: 'recovery', label: 'Recovery' },
                    { value: 'endurance', label: 'Endurance' },
                    { value: 'tempo', label: 'Tempo' },
                    { value: 'threshold', label: 'Threshold' },
                    { value: 'race', label: 'Race' },
                  ]}
                  value={intensity}
                  onChange={setIntensity}
                  className="w-full"
                />
                <SegmentedControl
                  label="Heat"
                  options={[
                    { value: 'cool', label: 'Cool' },
                    { value: 'moderate', label: 'Moderate' },
                    { value: 'warm', label: 'Warm' },
                    { value: 'hot', label: 'Hot' },
                  ]}
                  value={heatFactor}
                  onChange={setHeatFactor}
                  className="w-full"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button type="button" variant="ghost" onClick={goBack}>
                    Back
                  </Button>
                  <Button type="button" onClick={() => goTo('bottles')}>
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 'bottles' ? (
            <Card>
              <CardContent className="space-y-5 py-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-ink-900">
                    Bottle setup
                  </h2>
                  <p className="max-w-prose text-sm leading-6 text-ink-600">
                    Match the plan to what you can actually carry.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {BOTTLE_SIZES.map((size) => (
                    <div
                      key={size}
                      className="rounded-2xl border border-[color:var(--border-soft)] bg-shell-100 px-3 py-3"
                    >
                      <p className="mb-2 text-sm font-semibold text-ink-900">
                        {size} ml
                      </p>
                      <Stepper
                        value={bottlePool[size]}
                        onChange={(value) => handleBottleCountChange(size, value)}
                        min={0}
                        max={6}
                        label={`${size} ml bottles`}
                        hideLabel
                      />
                    </div>
                  ))}
                </div>

                {drinkMixOptions.length > 0 ? (
                  <Select
                    id="onboarding-drink-mix"
                    label="Drink mix"
                    options={drinkMixOptions}
                    value={selectedDrinkMix?.id ?? ''}
                    onChange={(event) => setSelectedDrinkMixId(event.target.value)}
                  />
                ) : (
                  <Alert variant="warning">
                    No drink mix is saved yet. Add one later from Fuel Inventory.
                  </Alert>
                )}

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-shell-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      Plain water allowed
                    </p>
                    <p className="mt-1 text-sm leading-5 text-ink-600">
                      Use a water-only bottle if the mix target is already covered.
                    </p>
                  </div>
                  <Toggle
                    checked={plainWaterAllowed}
                    onChange={setPlainWaterAllowed}
                    label="Plain water allowed"
                  />
                </div>

                {!prescription ? (
                  <Alert variant="warning">
                    Add at least one bottle and one drink mix to build the plan.
                  </Alert>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button type="button" variant="ghost" onClick={goBack}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUsePlan}
                    disabled={!prescription}
                  >
                    Use this plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <aside className="lg:sticky lg:top-24">
          <Card>
            <CardContent className="space-y-4">
              <PlanPreview prescription={prescription} drinkMix={selectedDrinkMix} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Select,
} from '@/components/ui';
import { calculateAutoTarget } from '@/lib/calculator/auto-target';
import { useStore } from '@/store';
import type { AutoInputPair, RideCharacteristics } from '@/types';
import { NeedsIntensityBar } from './needs-intensity-bar';

interface RideFormProps {
  onCalculate: (ride: RideCharacteristics) => void;
  disabled?: boolean;
  showCalculateButton?: boolean;
  submitTrigger?: number;
  onCanCalculateChange?: (canCalculate: boolean) => void;
  onSnapshotChange?: (snapshot: RideFormSnapshot) => void;
  initialSnapshot?: Partial<RideFormSnapshot>;
}

export interface RideFormSnapshot {
  planningMode: NonNullable<RideCharacteristics['planningMode']>;
  durationMinutes: number;
  intensity: RideCharacteristics['intensity'];
  heatFactor: RideCharacteristics['heatFactor'];
  carbTarget: number;
  refuelStops: number;
  autoInputPair: AutoInputPair;
  autoDurationInput: string;
  autoIfInput: string;
  autoTssInput: string;
  autoCarbOverrideInput: string;
}

const HEAT_LABELS = {
  celsius: {
    cool: 'Cool (< 15°C)',
    moderate: 'Moderate (15–25°C)',
    warm: 'Warm (25–32°C)',
    hot: 'Hot (> 32°C)',
  },
  fahrenheit: {
    cool: 'Cool (< 60°F)',
    moderate: 'Moderate (60–77°F)',
    warm: 'Warm (77–90°F)',
    hot: 'Hot (> 90°F)',
  },
} as const;

const DURATION_PRESETS = [
  { label: '1h', value: 60 },
  { label: '1.5h', value: 90 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
  { label: '4h', value: 240 },
];

const CARB_PRESETS = [
  { label: '30', value: 30 },
  { label: '60', value: 60 },
  { label: '90', value: 90 },
  { label: '120', value: 120 },
];

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsedValue = Number(trimmed);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function getRequiredAutoInputs(inputPair: AutoInputPair): Array<'duration' | 'if' | 'tss'> {
  if (inputPair === 'duration_if') return ['duration', 'if'];
  if (inputPair === 'duration_tss') return ['duration', 'tss'];
  return ['if', 'tss'];
}

function getAutoPairLabel(inputPair: AutoInputPair): string {
  if (inputPair === 'duration_if') return 'Duration + IF';
  if (inputPair === 'duration_tss') return 'Duration + TSS';
  return 'IF + TSS';
}

export function RideForm({
  onCalculate,
  disabled,
  showCalculateButton = true,
  submitTrigger,
  onCanCalculateChange,
  onSnapshotChange,
  initialSnapshot,
}: RideFormProps) {
  const [durationMinutes, setDuration] = useState(initialSnapshot?.durationMinutes ?? 90);
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationInput, setDurationInput] = useState(
    String(initialSnapshot?.durationMinutes ?? 90)
  );
  const [intensity, setIntensity] = useState<RideCharacteristics['intensity']>(
    initialSnapshot?.intensity ?? 'endurance'
  );
  const [heatFactor, setHeatFactor] = useState<RideCharacteristics['heatFactor']>(
    initialSnapshot?.heatFactor ?? 'moderate'
  );
  const [carbTarget, setCarbTarget] = useState(initialSnapshot?.carbTarget ?? 60);
  const [editingCarbs, setEditingCarbs] = useState(false);
  const [carbTargetInput, setCarbTargetInput] = useState(
    String(initialSnapshot?.carbTarget ?? 60)
  );
  const [refuelStops, setRefuelStops] = useState(initialSnapshot?.refuelStops ?? 0);

  const [planningMode, setPlanningMode] =
    useState<NonNullable<RideCharacteristics['planningMode']>>(
      initialSnapshot?.planningMode ?? 'manual'
    );
  const [autoInputPair, setAutoInputPair] = useState<AutoInputPair>(
    initialSnapshot?.autoInputPair ?? 'duration_if'
  );
  const [autoDurationInput, setAutoDurationInput] = useState(
    initialSnapshot?.autoDurationInput ?? '120'
  );
  const [autoIfInput, setAutoIfInput] = useState(initialSnapshot?.autoIfInput ?? '0.80');
  const [autoTssInput, setAutoTssInput] = useState(initialSnapshot?.autoTssInput ?? '120');
  const [autoCarbOverrideInput, setAutoCarbOverrideInput] = useState(
    initialSnapshot?.autoCarbOverrideInput ?? ''
  );

  const temperatureUnit = useStore((s) => s.settings.temperatureUnit);
  const athleteProfile = useStore((s) => s.settings.athleteProfile);

  const hasFtp =
    typeof athleteProfile.ftpWatts === 'number' && athleteProfile.ftpWatts > 0;

  const heatOptions = Object.entries(HEAT_LABELS[temperatureUnit]).map(
    ([value, label]) => ({ value, label })
  );

  const autoPreview = useMemo(() => {
    if (!hasFtp) {
      return {
        error: 'Set your FTP in Athlete Profile to enable auto mode.',
      };
    }

    const parsedDuration = parseOptionalNumber(autoDurationInput);
    const parsedIf = parseOptionalNumber(autoIfInput);
    const parsedTss = parseOptionalNumber(autoTssInput);
    const parsedCarbOverride = parseOptionalNumber(autoCarbOverrideInput);

    const requiredInputs = getRequiredAutoInputs(autoInputPair);
    const missingRequired = requiredInputs.find((inputName) => {
      if (inputName === 'duration') return parsedDuration === undefined;
      if (inputName === 'if') return parsedIf === undefined;
      return parsedTss === undefined;
    });

    if (missingRequired) {
      return {
        error: `Enter ${getAutoPairLabel(autoInputPair)} to preview an auto recommendation.`,
      };
    }

    try {
      return {
        result: calculateAutoTarget({
          inputPair: autoInputPair,
          durationMinutes: parsedDuration,
          intensityFactor: parsedIf,
          tss: parsedTss,
          ftpWatts: athleteProfile.ftpWatts!,
          heatFactor,
          sweatRateLph: athleteProfile.sweatRateLph,
          heavySweater: athleteProfile.heavySweater,
          gutTrainingTargetGph: athleteProfile.gutTrainingTargetGph,
          carbTargetOverrideGramsPerHour: parsedCarbOverride,
        }),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Invalid auto inputs.',
      };
    }
  }, [
    autoInputPair,
    autoDurationInput,
    autoIfInput,
    autoTssInput,
    autoCarbOverrideInput,
    athleteProfile.ftpWatts,
    athleteProfile.sweatRateLph,
    athleteProfile.heavySweater,
    athleteProfile.gutTrainingTargetGph,
    hasFtp,
    heatFactor,
  ]);

  const effectiveDurationMinutes =
    planningMode === 'manual'
      ? durationMinutes
      : autoPreview.result?.durationMinutes || 0;

  const isAutoCalculateDisabled = !autoPreview.result || !hasFtp;

  const blurOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  };

  const setManualDuration = (nextMinutes: number) => {
    setDuration(nextMinutes);
    setDurationInput(String(nextMinutes));
    setEditingDuration(false);
  };

  const setManualCarbTarget = (nextCarbTarget: number) => {
    setCarbTarget(nextCarbTarget);
    setCarbTargetInput(String(nextCarbTarget));
    setEditingCarbs(false);
  };

  const commitDurationInput = () => {
    const parsed = parseOptionalNumber(durationInput);
    if (parsed === undefined) {
      setDurationInput(String(durationMinutes));
      setEditingDuration(false);
      return;
    }

    const normalized = Math.round(parsed);
    if (normalized < 30 || normalized > 300) {
      setDurationInput(String(durationMinutes));
      setEditingDuration(false);
      return;
    }

    setManualDuration(normalized);
  };

  const commitCarbTargetInput = () => {
    const parsed = parseOptionalNumber(carbTargetInput);
    if (parsed === undefined) {
      setCarbTargetInput(String(carbTarget));
      setEditingCarbs(false);
      return;
    }

    const normalized = Math.round(parsed);
    if (normalized < 30 || normalized > 120) {
      setCarbTargetInput(String(carbTarget));
      setEditingCarbs(false);
      return;
    }

    setManualCarbTarget(normalized);
  };

  const handleCalculateClick = useCallback(() => {
    if (planningMode === 'manual') {
      onCalculate({
        durationMinutes,
        intensity,
        heatFactor,
        carbTargetGramsPerHour: carbTarget,
        planningMode: 'manual',
        ...(refuelStops > 0 && durationMinutes >= 120 ? { refuelStops } : {}),
      });
      return;
    }

    if (!autoPreview.result) return;

    onCalculate({
      durationMinutes: autoPreview.result.durationMinutes,
      intensity: autoPreview.result.intensity,
      heatFactor,
      carbTargetGramsPerHour: autoPreview.result.carbTargetGramsPerHour,
      planningMode: 'auto',
      autoMetrics: autoPreview.result.autoMetrics,
      ...(refuelStops > 0 && autoPreview.result.durationMinutes >= 120
        ? { refuelStops }
        : {}),
    });
  }, [
    autoPreview.result,
    carbTarget,
    durationMinutes,
    heatFactor,
    intensity,
    onCalculate,
    planningMode,
    refuelStops,
  ]);

  const canCalculate =
    !disabled && (planningMode === 'manual' || !isAutoCalculateDisabled);

  useEffect(() => {
    onCanCalculateChange?.(canCalculate);
  }, [canCalculate, onCanCalculateChange]);

  useEffect(() => {
    onSnapshotChange?.({
      planningMode,
      durationMinutes,
      intensity,
      heatFactor,
      carbTarget,
      refuelStops,
      autoInputPair,
      autoDurationInput,
      autoIfInput,
      autoTssInput,
      autoCarbOverrideInput,
    });
  }, [
    planningMode,
    durationMinutes,
    intensity,
    heatFactor,
    carbTarget,
    refuelStops,
    autoInputPair,
    autoDurationInput,
    autoIfInput,
    autoTssInput,
    autoCarbOverrideInput,
    onSnapshotChange,
  ]);

  const previousSubmitTriggerRef = useRef<number | undefined>(submitTrigger);
  useEffect(() => {
    if (submitTrigger === undefined) return;

    if (previousSubmitTriggerRef.current !== submitTrigger && canCalculate) {
      handleCalculateClick();
    }

    previousSubmitTriggerRef.current = submitTrigger;
  }, [submitTrigger, canCalculate, handleCalculateClick]);

  const previewAutoMetrics = autoPreview.result?.autoMetrics;
  const tssPerHour =
    previewAutoMetrics && autoPreview.result
      ? Math.round(previewAutoMetrics.tss / (autoPreview.result.durationMinutes / 60))
      : undefined;

  const derivedAutoMetric = (() => {
    if (!previewAutoMetrics || !autoPreview.result) return '--';

    if (autoInputPair === 'duration_if') {
      return `${Math.round(previewAutoMetrics.tss)} TSS`;
    }

    if (autoInputPair === 'duration_tss') {
      return `${previewAutoMetrics.intensityFactor} IF`;
    }

    return `${autoPreview.result.durationMinutes} min`;
  })();

  const derivedAutoMetricLabel =
    autoInputPair === 'duration_if'
      ? 'Derived TSS'
      : autoInputPair === 'duration_tss'
        ? 'Derived IF'
        : 'Derived Duration';

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="section-kicker text-[0.68rem]">Planning Mode</p>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            className={`rounded-[1.35rem] border p-4 text-left transition-colors ${
              planningMode === 'manual'
                ? 'border-brand-700 bg-brand-600 text-shell-50 shadow-[0_20px_36px_-24px_rgb(145_66_24_/_0.72)]'
                : 'border-[color:var(--border-soft)] bg-white text-ink-800 hover:bg-shell-50'
            }`}
            onClick={() => setPlanningMode('manual')}
          >
            <p className="font-sans text-[1.2rem] font-semibold uppercase tracking-[0.08em]">
              Manual
            </p>
            <p
              className={`mt-2 text-sm leading-6 ${
                planningMode === 'manual' ? 'text-shell-50/88' : 'text-ink-600'
              }`}
            >
              You already know the ride target and want a fast pack list.
            </p>
          </button>
          <button
            type="button"
            className={`rounded-[1.35rem] border p-4 text-left transition-colors ${
              planningMode === 'auto'
                ? 'border-brand-700 bg-brand-600 text-shell-50 shadow-[0_20px_36px_-24px_rgb(145_66_24_/_0.72)]'
                : 'border-[color:var(--border-soft)] bg-white text-ink-800 hover:bg-shell-50'
            }`}
            onClick={() => setPlanningMode('auto')}
          >
            <p className="font-sans text-[1.2rem] font-semibold uppercase tracking-[0.08em]">
              Auto
            </p>
            <p
              className={`mt-2 text-sm leading-6 ${
                planningMode === 'auto' ? 'text-shell-50/88' : 'text-ink-600'
              }`}
            >
              Enter two workload inputs and let the planner derive the target.
            </p>
          </button>
        </div>
      </div>

      {planningMode === 'manual' ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface-note p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker text-[0.68rem]">Ride Time</p>
                  <p className="mt-2 font-sans text-[1.9rem] font-semibold uppercase leading-none text-ink-900">
                    Duration
                  </p>
                </div>
                {editingDuration ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      value={durationInput}
                      onChange={(event) => setDurationInput(event.target.value)}
                      onBlur={commitDurationInput}
                      onKeyDown={blurOnEnter}
                      className="w-20 rounded-[0.9rem] border border-brand-300 bg-white px-3 py-2 text-center text-sm font-semibold text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-300 focus:outline-none"
                    />
                    <span className="text-sm text-ink-500">min</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDurationInput(String(durationMinutes));
                      setEditingDuration(true);
                    }}
                    className="rounded-full border border-brand-200 bg-white px-4 py-2 font-sans text-[1.4rem] font-semibold uppercase tracking-[0.06em] text-brand-700"
                  >
                    {formatDuration(durationMinutes)}
                  </button>
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-600">
                Tap the value to type a custom duration, or use a common ride preset.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setManualDuration(preset.value)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold tracking-[0.03em] transition-all ${
                      durationMinutes === preset.value
                        ? 'border-brand-700 bg-brand-600 text-shell-50'
                        : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="surface-note p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker text-[0.68rem]">Fuel Target</p>
                  <p className="mt-2 font-sans text-[1.9rem] font-semibold uppercase leading-none text-ink-900">
                    Carbs
                  </p>
                </div>
                {editingCarbs ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      value={carbTargetInput}
                      onChange={(event) => setCarbTargetInput(event.target.value)}
                      onBlur={commitCarbTargetInput}
                      onKeyDown={blurOnEnter}
                      className="w-20 rounded-[0.9rem] border border-brand-300 bg-white px-3 py-2 text-center text-sm font-semibold text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-300 focus:outline-none"
                    />
                    <span className="text-sm text-ink-500">g/h</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCarbTargetInput(String(carbTarget));
                      setEditingCarbs(true);
                    }}
                    className="rounded-full border border-brand-200 bg-white px-4 py-2 font-sans text-[1.4rem] font-semibold uppercase tracking-[0.06em] text-brand-700"
                  >
                    {carbTarget} g/h
                  </button>
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-600">
                Use the lowest target you can follow consistently on the bike.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {CARB_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setManualCarbTarget(preset.value)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold tracking-[0.03em] transition-all ${
                      carbTarget === preset.value
                        ? 'border-brand-700 bg-brand-600 text-shell-50'
                        : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface-note p-4 md:p-5">
              <Select
                label="Intensity"
                value={intensity}
                onChange={(event) =>
                  setIntensity(event.target.value as RideCharacteristics['intensity'])
                }
                options={[
                  { value: 'recovery', label: 'Recovery' },
                  { value: 'endurance', label: 'Endurance' },
                  { value: 'tempo', label: 'Tempo' },
                  { value: 'threshold', label: 'Threshold' },
                  { value: 'race', label: 'Race' },
                ]}
              />
              <p className="mt-3 text-sm leading-6 text-ink-600">
                Intensity nudges hydration and timing expectations even in manual mode.
              </p>
            </div>
            <div className="surface-note p-4 md:p-5">
              <Select
                label="Weather"
                value={heatFactor}
                onChange={(event) =>
                  setHeatFactor(event.target.value as RideCharacteristics['heatFactor'])
                }
                options={heatOptions}
              />
              <p className="mt-3 text-sm leading-6 text-ink-600">
                Heat adjusts fluid and sodium needs. Pick the conditions you expect to ride in.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5 rounded-[1.5rem] border border-[color:var(--border-strong)] bg-[color:color-mix(in_oklch,var(--color-brand-50)_48%,white)] p-5">
          <div className="space-y-2">
            <p className="section-kicker text-[0.68rem]">Auto Recommendation</p>
            <h3 className="section-title text-lg">Pick two workload inputs</h3>
            <p className="section-copy">
              The planner derives the third value, then recommends carbs, hydration,
              and sodium from workload, weather, and your athlete profile.
            </p>
          </div>

          {!hasFtp && (
            <div className="surface-note border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Auto mode requires FTP in your athlete profile. Set it in{' '}
              <Link className="underline font-medium" to="/athlete?return=planner-step2">
                Athlete
              </Link>
              .
            </div>
          )}

          <div className="space-y-2">
            <p className="section-kicker text-[0.68rem]">Input Pair</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(['duration_if', 'duration_tss', 'if_tss'] as const).map((pair) => (
                <button
                  key={pair}
                  type="button"
                  onClick={() => setAutoInputPair(pair)}
                  className={`rounded-[1.15rem] border px-4 py-3 text-left text-sm font-semibold tracking-[0.04em] transition-colors ${
                    autoInputPair === pair
                      ? 'border-brand-700 bg-brand-600 text-shell-50'
                      : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                  }`}
                >
                  {getAutoPairLabel(pair)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(autoInputPair === 'duration_if' || autoInputPair === 'duration_tss') && (
              <div className="surface-note p-4">
                <Input
                  id="auto-duration"
                  type="number"
                  min={30}
                  max={300}
                  step={1}
                  label="Duration (minutes)"
                  value={autoDurationInput}
                  onChange={(event) => setAutoDurationInput(event.target.value)}
                />
                <p className="mt-3 text-sm leading-6 text-ink-600">
                  Use planned moving time, not total day-out time.
                </p>
              </div>
            )}

            {(autoInputPair === 'duration_if' || autoInputPair === 'if_tss') && (
              <div className="surface-note p-4">
                <Input
                  id="auto-if"
                  type="number"
                  min={0.4}
                  max={1.3}
                  step={0.01}
                  label="Intensity Factor (IF)"
                  value={autoIfInput}
                  onChange={(event) => setAutoIfInput(event.target.value)}
                />
                <p className="mt-3 text-sm leading-6 text-ink-600">
                  IF compares ride intensity to FTP. Around 0.80 is steady endurance; 1.00 is one hour at FTP.
                </p>
              </div>
            )}

            {(autoInputPair === 'duration_tss' || autoInputPair === 'if_tss') && (
              <div className="surface-note p-4">
                <Input
                  id="auto-tss"
                  type="number"
                  min={1}
                  step={1}
                  label="TSS"
                  value={autoTssInput}
                  onChange={(event) => setAutoTssInput(event.target.value)}
                />
                <p className="mt-3 text-sm leading-6 text-ink-600">
                  TSS is total training load. A value near 100 equals roughly one hour at FTP.
                </p>
              </div>
            )}

            <div className="rounded-[1.2rem] border border-brand-700 bg-brand-600 px-4 py-4 text-shell-50 shadow-[0_20px_36px_-24px_rgb(145_66_24_/_0.72)]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-shell-50/75">
                {derivedAutoMetricLabel}
              </p>
              <p className="mt-2 font-sans text-[1.9rem] font-semibold uppercase leading-none">
                {derivedAutoMetric}
              </p>
              <p className="mt-2 text-sm leading-6 text-shell-50/80">
                This value is derived from the other two inputs and your athlete profile.
              </p>
            </div>

            <div className="surface-note p-4">
              <Input
                id="auto-carb-override"
                type="number"
                min={0}
                max={120}
                step={5}
                label="Carb Override (g/h, optional)"
                value={autoCarbOverrideInput}
                onChange={(event) => setAutoCarbOverrideInput(event.target.value)}
                placeholder={
                  autoPreview.result
                    ? `${autoPreview.result.autoMetrics.autoCarbTargetGramsPerHour}`
                    : 'Auto recommendation'
                }
              />
              <p className="mt-3 text-sm leading-6 text-ink-600">
                Use this only when you want to cap or push the auto recommendation manually.
              </p>
            </div>
          </div>

          {autoPreview.result && previewAutoMetrics && (
            <Collapsible
              defaultOpen={false}
              className="rounded-[1.2rem] border border-[color:var(--border-soft)] bg-white"
            >
              <CollapsibleTrigger className="px-4 py-3">
                <div>
                  <p className="section-kicker text-[0.68rem]">Recommendation</p>
                  <p className="mt-2 font-sans text-[1.25rem] font-semibold uppercase leading-none text-ink-900">
                    {autoPreview.result.carbTargetGramsPerHour} g/h carbs
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-600">
                    {autoPreview.result.carbTargetGramsPerHour}g/h carbs •{' '}
                    {previewAutoMetrics.hydrationMlPerHour}ml/h hydration •{' '}
                    {previewAutoMetrics.sodiumMgPerHour}mg/h sodium
                  </p>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 border-t border-[color:var(--border-soft)] p-4 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-ink-800">
                  <span>Duration:</span>
                  <span>{formatDuration(autoPreview.result.durationMinutes)}</span>
                  <span>IF:</span>
                  <span>{previewAutoMetrics.intensityFactor}</span>
                  <span>TSS:</span>
                  <span>{previewAutoMetrics.tss}</span>
                  <span>Intensity:</span>
                  <span className="capitalize">{autoPreview.result.intensity}</span>
                  <span>Carbs:</span>
                  <span>{autoPreview.result.carbTargetGramsPerHour}g/h</span>
                  <span>Carb Baseline:</span>
                  <span>
                    {previewAutoMetrics.baselineAutoCarbTargetGph ??
                      autoPreview.result.carbTargetGramsPerHour}
                    g/h
                  </span>
                  <span>Gut Target:</span>
                  <span>
                    {previewAutoMetrics.gutTrainingTargetGph ??
                      athleteProfile.gutTrainingTargetGph}
                    g/h
                  </span>
                  <span>Hydration:</span>
                  <span>{previewAutoMetrics.hydrationMlPerHour}ml/h</span>
                  <span>Sodium:</span>
                  <span>{previewAutoMetrics.sodiumMgPerHour}mg/h</span>
                </div>

                {previewAutoMetrics.needsScore !== undefined &&
                  previewAutoMetrics.needsLevel && (
                    <NeedsIntensityBar
                      score={previewAutoMetrics.needsScore}
                      level={previewAutoMetrics.needsLevel}
                    />
                  )}

                <p className="text-xs text-gray-600">
                  Stress drivers: IF {previewAutoMetrics.intensityFactor}, TSS/h{' '}
                  {tssPerHour ?? '-'}.
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}

          {autoPreview.error && hasFtp && (
            <p className="text-sm leading-6 text-rose-700">{autoPreview.error}</p>
          )}

          <div className="surface-note p-4">
            <Select
              label="Weather"
              value={heatFactor}
              onChange={(event) =>
                setHeatFactor(event.target.value as RideCharacteristics['heatFactor'])
              }
              options={heatOptions}
            />
            <p className="mt-3 text-sm leading-6 text-ink-600">
              Heat pushes fluid and sodium higher. Adjust this before generating the plan.
            </p>
          </div>
        </div>
      )}

      {effectiveDurationMinutes >= 120 && (
        <div className="surface-note p-4 md:p-5">
          <Select
            label="Bottle Refueling"
            value={String(refuelStops)}
            onChange={(event) => setRefuelStops(Number(event.target.value))}
            options={[
              { value: '0', label: 'No refueling' },
              { value: '1', label: '1 refill' },
              { value: '2', label: '2 refills' },
            ]}
          />
          <p className="mt-3 text-sm leading-6 text-ink-600">
            Add refill stops only when you know you can top up bottles during the ride.
          </p>
        </div>
      )}

      {showCalculateButton && (
        <Button
          className="w-full"
          size="lg"
          disabled={!canCalculate}
          onClick={handleCalculateClick}
        >
          Calculate Fuel Plan
        </Button>
      )}
    </div>
  );
}

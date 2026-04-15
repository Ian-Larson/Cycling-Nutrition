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

const DEFAULT_CARB_PRESET_VALUES = [30, 60, 90, 120];

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
  const carbPresets = useMemo(() => {
    const gutTarget = Math.round(athleteProfile.gutTrainingTargetGph ?? 0);
    const values = new Set(DEFAULT_CARB_PRESET_VALUES);

    if (gutTarget >= 30 && gutTarget <= 120) {
      values.add(gutTarget);
    }

    return [...values]
      .sort((a, b) => a - b)
      .map((value) => ({ label: String(value), value }));
  }, [athleteProfile.gutTrainingTargetGph]);

  const autoPreview = useMemo(() => {
    if (!hasFtp) {
      return {
        error: 'Set FTP in Athlete to use auto mode.',
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
        error: `Enter both selected inputs.`,
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
    <div className="space-y-5 md:space-y-6">
      <div className="space-y-1.5">
        <div className="space-y-1.5">
          <p className="section-kicker text-[0.68rem]">Method</p>
          <div
            className="relative grid min-h-12 w-full grid-cols-2 rounded-full border border-[color:var(--border-soft)] bg-white p-1 shadow-[inset_0_0_0_1px_rgba(34,43,51,0.02)] sm:w-[16rem]"
            role="group"
            aria-label="Planning method"
          >
            <span
              aria-hidden
              className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-brand-500 shadow-[0_10px_22px_-16px_rgba(248,98,46,0.72)] transition-transform duration-200 ease-out ${
                planningMode === 'auto' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
            <button
              type="button"
              aria-pressed={planningMode === 'manual'}
              className={`relative z-10 min-h-10 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                planningMode === 'manual'
                  ? 'text-white'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
              onClick={() => setPlanningMode('manual')}
            >
              Manual
            </button>
            <button
              type="button"
              aria-pressed={planningMode === 'auto'}
              className={`relative z-10 min-h-10 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                planningMode === 'auto'
                  ? 'text-white'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
              onClick={() => setPlanningMode('auto')}
            >
              Auto
            </button>
          </div>
        </div>
      </div>

      {planningMode === 'manual' ? (
        <div className="space-y-5 md:space-y-6">
          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <section className="space-y-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="section-kicker text-[0.68rem]">Duration</p>
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
                        className="min-h-9 w-16 rounded-lg border border-brand-300 bg-white px-2 text-center text-sm font-semibold text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-300 focus:outline-none"
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
                      className="min-h-9 min-w-[6.75rem] rounded-lg border border-brand-200 bg-white px-3 py-1.5 font-sans text-sm font-semibold text-brand-700"
                    >
                      {formatDuration(durationMinutes)}
                    </button>
                  )}
                </div>
                <div>
                  <p className="mt-1 text-sm leading-6 text-ink-600">
                    Use moving time.
                  </p>
                </div>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setManualDuration(preset.value)}
                    className={`min-h-10 shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      durationMinutes === preset.value
                        ? 'border-brand-300 bg-brand-100 text-brand-800'
                        : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="section-kicker text-[0.68rem]">Carbs / hour</p>
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
                        className="min-h-9 w-16 rounded-lg border border-brand-300 bg-white px-2 text-center text-sm font-semibold text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-300 focus:outline-none"
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
                      className="min-h-9 min-w-[6.75rem] rounded-lg border border-brand-200 bg-white px-3 py-1.5 font-sans text-sm font-semibold text-brand-700"
                    >
                      {carbTarget} g/h
                    </button>
                  )}
                </div>
                <div>
                  <p className="mt-1 text-sm leading-6 text-ink-600">
                    Set your intake target.
                  </p>
                </div>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
                {carbPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setManualCarbTarget(preset.value)}
                    className={`min-h-10 shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      carbTarget === preset.value
                        ? 'border-brand-300 bg-brand-100 text-brand-800'
                        : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-4 border-t border-[color:var(--border-soft)] pt-5 lg:grid-cols-2 lg:gap-6">
            <div className="space-y-2.5">
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
              <p className="text-sm leading-6 text-ink-600">
                Affects timing and fluid.
              </p>
            </div>
            <div className="space-y-2.5">
              <Select
                label="Weather"
                value={heatFactor}
                onChange={(event) =>
                  setHeatFactor(event.target.value as RideCharacteristics['heatFactor'])
                }
                options={heatOptions}
              />
              <p className="text-sm leading-6 text-ink-600">
                Affects fluid and sodium.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] lg:gap-8">
          <div className="space-y-5">
            <div className="space-y-2.5">
              <div className="space-y-1">
                <p className="section-kicker text-[0.68rem]">Known values</p>
                <p className="text-sm leading-6 text-ink-600">
                  Enter any two of duration, IF, and TSS.
                </p>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
                {(['duration_if', 'duration_tss', 'if_tss'] as const).map((pair) => (
                  <button
                    key={pair}
                    type="button"
                    onClick={() => setAutoInputPair(pair)}
                    className={`min-h-11 min-w-[8.5rem] rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors sm:min-w-0 ${
                      autoInputPair === pair
                        ? 'border-brand-300 bg-brand-100 text-brand-800'
                        : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                    }`}
                  >
                    {getAutoPairLabel(pair)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
              {(autoInputPair === 'duration_if' || autoInputPair === 'duration_tss') && (
                <div className="space-y-2.5">
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
                  <p className="text-sm leading-6 text-ink-600">Moving time.</p>
                </div>
              )}

              {(autoInputPair === 'duration_if' || autoInputPair === 'if_tss') && (
                <div className="space-y-2.5">
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
                  <p className="text-sm leading-6 text-ink-600">Relative to FTP.</p>
                </div>
              )}

              {(autoInputPair === 'duration_tss' || autoInputPair === 'if_tss') && (
                <div className="space-y-2.5">
                  <Input
                    id="auto-tss"
                    type="number"
                    min={1}
                    step={1}
                    label="TSS"
                    value={autoTssInput}
                    onChange={(event) => setAutoTssInput(event.target.value)}
                  />
                  <p className="text-sm leading-6 text-ink-600">Total ride load.</p>
                </div>
              )}
            </div>

            <div className="grid gap-4 border-t border-[color:var(--border-soft)] pt-5 sm:grid-cols-2 lg:gap-5">
              <div className="space-y-2.5">
                <Select
                  label="Weather"
                  value={heatFactor}
                  onChange={(event) =>
                    setHeatFactor(event.target.value as RideCharacteristics['heatFactor'])
                  }
                  options={heatOptions}
                />
                <p className="text-sm leading-6 text-ink-600">
                  Affects fluid and sodium.
                </p>
              </div>
              <div className="space-y-2.5">
                <Input
                  id="auto-carb-override"
                  type="number"
                  min={0}
                  max={120}
                  step={5}
                  label="Carb override"
                  value={autoCarbOverrideInput}
                  onChange={(event) => setAutoCarbOverrideInput(event.target.value)}
                  placeholder={
                    autoPreview.result
                      ? `${autoPreview.result.autoMetrics.autoCarbTargetGramsPerHour}`
                      : 'Recommended value'
                  }
                />
                <p className="text-sm leading-6 text-ink-600">
                  Leave blank to use the auto target.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:pt-1">
            {!hasFtp ? (
              <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 md:rounded-[1.35rem] md:p-5">
                Add FTP in{' '}
                <Link className="font-medium underline" to="/athlete?return=planner-step2">
                  Athlete
                </Link>{' '}
                to use auto mode.
              </div>
            ) : autoPreview.result && previewAutoMetrics ? (
              <div className="rounded-[1.2rem] border border-brand-300 bg-[color:color-mix(in_oklch,var(--color-brand-100)_72%,white)] p-4 text-brand-900 md:rounded-[1.35rem] md:p-5">
                <p className="section-kicker text-[0.68rem] text-brand-700">
                  Recommended
                </p>
                <p className="mt-2 font-sans text-[1.85rem] font-semibold leading-none">
                  {autoPreview.result.carbTargetGramsPerHour} g/h
                </p>
                <p className="mt-3 text-sm leading-6 text-brand-800">
                  {derivedAutoMetricLabel}: {derivedAutoMetric}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-brand-200/80 pt-4 text-sm">
                  <div>
                    <p className="page-stat-label text-brand-700">Hydration</p>
                    <p className="mt-1 font-medium text-ink-900">
                      {previewAutoMetrics.hydrationMlPerHour} ml/h
                    </p>
                  </div>
                  <div>
                    <p className="page-stat-label text-brand-700">Sodium</p>
                    <p className="mt-1 font-medium text-ink-900">
                      {previewAutoMetrics.sodiumMgPerHour} mg/h
                    </p>
                  </div>
                  <div>
                    <p className="page-stat-label text-brand-700">Duration</p>
                    <p className="mt-1 font-medium text-ink-900">
                      {formatDuration(autoPreview.result.durationMinutes)}
                    </p>
                  </div>
                  <div>
                    <p className="page-stat-label text-brand-700">Intensity</p>
                    <p className="mt-1 font-medium capitalize text-ink-900">
                      {autoPreview.result.intensity}
                    </p>
                  </div>
                </div>

                {previewAutoMetrics.needsScore !== undefined &&
                  previewAutoMetrics.needsLevel && (
                    <div className="mt-4 border-t border-brand-200/80 pt-4">
                      <NeedsIntensityBar
                        score={previewAutoMetrics.needsScore}
                        level={previewAutoMetrics.needsLevel}
                        compact
                      />
                    </div>
                  )}

                <Collapsible defaultOpen={false} className="mt-4 border-t border-brand-200/80 pt-3">
                  <CollapsibleTrigger className="min-h-0 rounded-lg bg-white/55 px-3 py-2.5 text-sm text-ink-800 md:px-3.5">
                    <div>
                      <p className="font-medium text-ink-900">Calculation details</p>
                      <p className="mt-1 text-sm leading-5 text-ink-600">
                        IF {previewAutoMetrics.intensityFactor} • {tssPerHour ?? '-'} TSS/h
                      </p>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 text-sm text-ink-800">
                    <span>IF:</span>
                    <span>{previewAutoMetrics.intensityFactor}</span>
                    <span>TSS:</span>
                    <span>{previewAutoMetrics.tss}</span>
                    <span>Carb baseline:</span>
                    <span>
                      {previewAutoMetrics.baselineAutoCarbTargetGph ??
                        autoPreview.result.carbTargetGramsPerHour}
                      g/h
                    </span>
                    <span>Gut target:</span>
                    <span>
                      {previewAutoMetrics.gutTrainingTargetGph ??
                        athleteProfile.gutTrainingTargetGph}
                      g/h
                    </span>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ) : (
              <div className="rounded-[1.2rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 md:rounded-[1.35rem] md:p-5">
                <p className="section-kicker text-[0.68rem]">Auto result</p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {autoPreview.error ?? 'Enter both selected inputs.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {effectiveDurationMinutes >= 120 && (
        <div className="max-w-sm space-y-2.5 border-t border-[color:var(--border-soft)] pt-5">
          <Select
            label="Refills"
            value={String(refuelStops)}
            onChange={(event) => setRefuelStops(Number(event.target.value))}
            options={[
              { value: '0', label: 'No refueling' },
              { value: '1', label: '1 refill' },
              { value: '2', label: '2 refills' },
            ]}
          />
          <p className="text-sm leading-6 text-ink-600">
            Set this only if you can refill bottles.
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
          Create Plan
        </Button>
      )}
    </div>
  );
}

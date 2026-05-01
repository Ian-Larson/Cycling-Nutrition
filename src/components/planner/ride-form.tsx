import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  PresetButtons,
  SegmentedControl,
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

function DurationHrMinInputInner({
  initialMinutes,
  onChange,
  idHours,
  labelPrefix,
  minMinutes,
  maxMinutes,
}: {
  initialMinutes: number | undefined;
  onChange: (mins: number | undefined) => void;
  idHours?: string;
  labelPrefix: string;
  minMinutes?: number;
  maxMinutes?: number;
}) {
  const [hoursStr, setHoursStr] = useState(
    initialMinutes === undefined ? '' : String(Math.floor(initialMinutes / 60))
  );
  const [minsStr, setMinsStr] = useState(
    initialMinutes === undefined ? '' : String(initialMinutes % 60)
  );

  const commit = () => {
    const hTrim = hoursStr.trim();
    const mTrim = minsStr.trim();
    if (hTrim === '' && mTrim === '') {
      onChange(undefined);
      return;
    }
    const h = hTrim === '' ? 0 : Number(hTrim);
    const m = mTrim === '' ? 0 : Number(mTrim);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    let total = Math.max(0, Math.round(h * 60 + m));
    if (minMinutes !== undefined) total = Math.max(minMinutes, total);
    if (maxMinutes !== undefined) total = Math.min(maxMinutes, total);
    onChange(total);
  };

  const blurOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      (event.target as HTMLInputElement).blur();
    }
  };

  const handleGroupBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    commit();
  };

  const handleDigitsOnly = (
    event: ChangeEvent<HTMLInputElement>,
    setter: (next: string) => void
  ) => {
    setter(event.target.value.replace(/[^0-9]/g, ''));
  };

  const selectOnFocus = (event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select();
  };

  return (
    <div
      className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-brand-200 bg-white px-2 py-1 font-sans text-sm font-semibold text-brand-700 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-300"
      role="group"
      aria-label={`${labelPrefix} in hours and minutes`}
      onBlur={handleGroupBlur}
    >
      <input
        id={idHours}
        type="text"
        inputMode="numeric"
        value={hoursStr}
        onChange={(event) => handleDigitsOnly(event, setHoursStr)}
        onFocus={selectOnFocus}
        onKeyDown={blurOnEnter}
        aria-label={`${labelPrefix} hours`}
        maxLength={2}
        placeholder="0"
        className="w-7 bg-transparent text-right tabular-nums text-ink-900 focus:outline-none"
      />
      <span className="text-xs font-medium text-ink-500">hr</span>
      <input
        type="text"
        inputMode="numeric"
        value={minsStr}
        onChange={(event) => handleDigitsOnly(event, setMinsStr)}
        onFocus={selectOnFocus}
        onKeyDown={blurOnEnter}
        aria-label={`${labelPrefix} minutes`}
        maxLength={2}
        placeholder="00"
        className="ml-1 w-8 bg-transparent text-right tabular-nums text-ink-900 focus:outline-none"
      />
      <span className="text-xs font-medium text-ink-500">min</span>
    </div>
  );
}

function DurationHrMinInput({
  minutes,
  onChange,
  idHours,
  labelPrefix = 'Duration',
  minMinutes,
  maxMinutes,
}: {
  minutes: number | undefined;
  onChange: (mins: number | undefined) => void;
  idHours?: string;
  labelPrefix?: string;
  minMinutes?: number;
  maxMinutes?: number;
}) {
  return (
    <DurationHrMinInputInner
      key={minutes === undefined ? 'empty' : String(minutes)}
      initialMinutes={minutes}
      onChange={onChange}
      idHours={idHours}
      labelPrefix={labelPrefix}
      minMinutes={minMinutes}
      maxMinutes={maxMinutes}
    />
  );
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
  };

  const switchPlanningMode = (
    nextMode: NonNullable<RideCharacteristics['planningMode']>
  ) => {
    if (nextMode === planningMode) return;
    if (nextMode === 'auto') {
      setAutoDurationInput(String(durationMinutes));
    } else {
      const parsed = parseOptionalNumber(autoDurationInput);
      if (parsed !== undefined) {
        const clamped = Math.max(30, Math.min(300, Math.round(parsed)));
        setDuration(clamped);
      }
    }
    setPlanningMode(nextMode);
  };

  const setManualCarbTarget = (nextCarbTarget: number) => {
    setCarbTarget(nextCarbTarget);
    setCarbTargetInput(String(nextCarbTarget));
    setEditingCarbs(false);
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
          <div className="sm:w-[16rem]">
            <SegmentedControl
              label="Planning method"
              value={planningMode}
              onChange={switchPlanningMode}
              options={[
                { value: 'manual', label: 'Manual' },
                { value: 'auto', label: 'Auto' },
              ]}
            />
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
                  <DurationHrMinInput
                    minutes={durationMinutes}
                    minMinutes={30}
                    maxMinutes={300}
                    onChange={(mins) => {
                      if (mins !== undefined) setManualDuration(mins);
                    }}
                  />
                </div>
                <p className="text-sm leading-6 text-ink-600">
                  Use moving time. Tab between hours and minutes.
                </p>
              </div>
              <PresetButtons
                ariaLabel="Duration presets"
                options={[...DURATION_PRESETS]}
                value={durationMinutes}
                onChange={setManualDuration}
              />
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
              <PresetButtons
                ariaLabel="Carbs per hour presets"
                options={carbPresets}
                value={carbTarget}
                onChange={setManualCarbTarget}
              />
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
                  Pick the two you know &mdash; we&rsquo;ll calculate the third.
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
                  <label
                    htmlFor="auto-duration-hours"
                    className="block text-sm font-medium text-ink-800"
                  >
                    Duration
                  </label>
                  <DurationHrMinInput
                    idHours="auto-duration-hours"
                    minutes={
                      autoDurationInput.trim() === ''
                        ? undefined
                        : Number(autoDurationInput)
                    }
                    onChange={(mins) =>
                      setAutoDurationInput(mins === undefined ? '' : String(mins))
                    }
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
              <Alert variant="warning">
                Add FTP in{' '}
                <Link className="font-medium underline" to="/account?return=planner-step2">
                  Athlete
                </Link>{' '}
                to use auto mode.
              </Alert>
            ) : autoPreview.result && previewAutoMetrics ? (
              <div className="rounded-2xl border border-brand-300 bg-[color:color-mix(in_oklch,var(--color-brand-100)_72%,white)] p-4 text-brand-900 md:p-5">
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

                <Collapsible defaultOpen className="mt-4 border-t border-brand-200/80 pt-3">
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
              <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 md:p-5">
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

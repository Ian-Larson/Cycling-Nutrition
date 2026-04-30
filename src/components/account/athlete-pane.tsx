import { clsx } from 'clsx';
import { useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  Input,
  PresetButtons,
  SegmentedControl,
  Toggle,
} from '@/components/ui';
import {
  formatNumberInputValue,
  kilogramsToPounds,
  poundsToKilograms,
  type AnthropometricsUnit,
} from '@/lib/athlete/anthropometrics';
import { useStore, type AthleteProfile, type TemperatureUnit } from '@/store';

type OptionalNumericAthleteField =
  | 'ftpWatts'
  | 'weightKg'
  | 'age'
  | 'sweatRateLph';

type AthleteFieldErrorKey =
  | OptionalNumericAthleteField
  | 'gutTrainingTargetGph';

const GUT_TARGET_PRESETS = [60, 65, 75, 85, 95] as const;
const TEMPERATURE_OPTIONS: { value: TemperatureUnit; label: string }[] = [
  { value: 'celsius', label: '°C' },
  { value: 'fahrenheit', label: '°F' },
];

function roundTo(value: number, decimals: number): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function getGutTargetLabel(value: number): string {
  if (value <= 70) return 'Conservative tolerance';
  if (value <= 85) return 'Progressive tolerance';
  return 'Aggressive tolerance';
}

function parseDraftNumber(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function getWeightDraftFromProfile(
  weightKg: number | undefined,
  unit: AnthropometricsUnit
): string {
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg)) {
    return '';
  }

  return unit === 'imperial'
    ? formatNumberInputValue(kilogramsToPounds(weightKg), 1)
    : formatNumberInputValue(weightKg, 1);
}

export function AthletePane() {
  const athleteProfile = useStore((s) => s.settings.athleteProfile);
  const temperatureUnit = useStore((s) => s.settings.temperatureUnit);
  const engineVersion = useStore((s) => s.settings.engineVersion);
  const updateAthleteProfile = useStore((s) => s.updateAthleteProfile);
  const updateSettings = useStore((s) => s.updateSettings);
  const anthropometricsUnit = athleteProfile.anthropometricsUnit ?? 'metric';
  const ftp = athleteProfile.ftpWatts;
  const weightKg = athleteProfile.weightKg;
  const gutTrainingTargetGph = athleteProfile.gutTrainingTargetGph ?? 65;
  const wKg =
    typeof ftp === 'number' && typeof weightKg === 'number' && weightKg > 0
      ? roundTo(ftp / weightKg, 2)
      : undefined;

  const [ageDraft, setAgeDraft] = useState(() =>
    formatNumberInputValue(athleteProfile.age, 0)
  );
  const [ftpDraft, setFtpDraft] = useState(() =>
    formatNumberInputValue(athleteProfile.ftpWatts, 0)
  );
  const [weightDraft, setWeightDraft] = useState(() =>
    getWeightDraftFromProfile(athleteProfile.weightKg, anthropometricsUnit)
  );
  const [gutTargetDraft, setGutTargetDraft] = useState(() =>
    formatNumberInputValue(gutTrainingTargetGph, 0)
  );
  const [sweatRateDraft, setSweatRateDraft] = useState(() =>
    formatNumberInputValue(athleteProfile.sweatRateLph, 1)
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<AthleteFieldErrorKey, string>>
  >({});

  const setFieldError = (
    key: AthleteFieldErrorKey,
    message: string | undefined
  ) => {
    setFieldErrors((current) => {
      if (!message && !current[key]) return current;
      if (!message) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: message };
    });
  };

  const blurOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  };

  const commitOptionalNumberDraft = (
    key: OptionalNumericAthleteField,
    draftValue: string,
    setDraft: (value: string) => void,
    options: {
      min?: number;
      max?: number;
      integer?: boolean;
      decimals?: number;
      fallbackValue?: number;
      fieldErrorKey?: AthleteFieldErrorKey;
    }
  ) => {
    const parsed = parseDraftNumber(draftValue);
    const decimals = options.integer ? 0 : (options.decimals ?? 1);
    const fallback = formatNumberInputValue(options.fallbackValue, decimals);
    const errorKey = options.fieldErrorKey ?? key;

    if (parsed === null) {
      setDraft(fallback);
      setFieldError(errorKey, 'Enter a valid number.');
      return;
    }

    if (parsed === undefined) {
      updateAthleteProfile({ [key]: undefined } as Partial<AthleteProfile>);
      setDraft('');
      setFieldError(errorKey, undefined);
      return;
    }

    const nextValue = options.integer ? Math.round(parsed) : parsed;
    const outOfRange =
      (options.min !== undefined && nextValue < options.min) ||
      (options.max !== undefined && nextValue > options.max);

    if (outOfRange) {
      setDraft(fallback);
      const minLabel = options.min !== undefined ? `≥ ${options.min}` : undefined;
      const maxLabel = options.max !== undefined ? `≤ ${options.max}` : undefined;
      const rangeLabel =
        minLabel && maxLabel
          ? `${minLabel} and ${maxLabel}`
          : minLabel || maxLabel || 'within range';
      setFieldError(errorKey, `Use a value ${rangeLabel}.`);
      return;
    }

    updateAthleteProfile({ [key]: nextValue } as Partial<AthleteProfile>);
    setDraft(formatNumberInputValue(nextValue, decimals));
    setFieldError(errorKey, undefined);
  };

  const commitAgeDraft = () =>
    commitOptionalNumberDraft('age', ageDraft, setAgeDraft, {
      min: 10,
      max: 120,
      integer: true,
      fallbackValue: athleteProfile.age,
    });

  const commitFtpDraft = () =>
    commitOptionalNumberDraft('ftpWatts', ftpDraft, setFtpDraft, {
      min: 1,
      integer: true,
      fallbackValue: athleteProfile.ftpWatts,
    });

  const commitWeightDraft = () => {
    if (anthropometricsUnit === 'metric') {
      commitOptionalNumberDraft('weightKg', weightDraft, setWeightDraft, {
        min: 1,
        decimals: 1,
        fallbackValue: athleteProfile.weightKg,
        fieldErrorKey: 'weightKg',
      });
      return;
    }

    const parsed = parseDraftNumber(weightDraft);
    const fallback = getWeightDraftFromProfile(athleteProfile.weightKg, 'imperial');

    if (parsed === null) {
      setWeightDraft(fallback);
      setFieldError('weightKg', 'Enter a valid number.');
      return;
    }

    if (parsed === undefined) {
      updateAthleteProfile({ weightKg: undefined });
      setWeightDraft('');
      setFieldError('weightKg', undefined);
      return;
    }

    if (parsed < 1) {
      setWeightDraft(fallback);
      setFieldError('weightKg', 'Use a value ≥ 1.');
      return;
    }

    updateAthleteProfile({ weightKg: poundsToKilograms(parsed) });
    setWeightDraft(formatNumberInputValue(parsed, 1));
    setFieldError('weightKg', undefined);
  };

  const commitGutTargetDraft = () => {
    const parsed = parseDraftNumber(gutTargetDraft);
    const fallback = formatNumberInputValue(gutTrainingTargetGph, 0);

    if (parsed === null || parsed === undefined) {
      setGutTargetDraft(fallback);
      setFieldError('gutTrainingTargetGph', 'Enter a value between 50 and 110.');
      return;
    }

    const nextTarget = Math.round(parsed);
    if (nextTarget < 50 || nextTarget > 110) {
      setGutTargetDraft(fallback);
      setFieldError('gutTrainingTargetGph', 'Use a value between 50 and 110.');
      return;
    }

    updateAthleteProfile({ gutTrainingTargetGph: nextTarget });
    setGutTargetDraft(formatNumberInputValue(nextTarget, 0));
    setFieldError('gutTrainingTargetGph', undefined);
  };

  const applyGutTargetPreset = (targetGph: number) => {
    updateAthleteProfile({ gutTrainingTargetGph: targetGph });
    setGutTargetDraft(formatNumberInputValue(targetGph, 0));
    setFieldError('gutTrainingTargetGph', undefined);
  };

  const commitSweatRateDraft = () =>
    commitOptionalNumberDraft(
      'sweatRateLph',
      sweatRateDraft,
      setSweatRateDraft,
      {
        min: 0.1,
        decimals: 1,
        fallbackValue: athleteProfile.sweatRateLph,
        fieldErrorKey: 'sweatRateLph',
      }
    );

  const handleAnthropometricsUnitChange = (nextUnit: AnthropometricsUnit) => {
    if (nextUnit === anthropometricsUnit) {
      return;
    }

    updateAthleteProfile({ anthropometricsUnit: nextUnit });
    setWeightDraft(getWeightDraftFromProfile(athleteProfile.weightKg, nextUnit));
  };

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1.16fr)_minmax(19rem,0.84fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title text-lg">Profile</h2>
              </div>
              <SegmentedControl<AnthropometricsUnit>
                label="Measurement units"
                value={anthropometricsUnit}
                onChange={handleAnthropometricsUnitChange}
                className="w-full sm:w-auto"
                options={[
                  { value: 'metric', label: 'Metric' },
                  { value: 'imperial', label: 'Imperial' },
                ]}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2 md:gap-3">
              <Input
                id="athlete-name"
                label="Name"
                value={athleteProfile.name ?? ''}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  updateAthleteProfile({
                    name: nextValue.trim().length > 0 ? nextValue : undefined,
                  });
                }}
                placeholder="e.g., Ian"
              />
              <Input
                id="athlete-age"
                label="Age"
                type="text"
                inputMode="numeric"
                value={ageDraft}
                onChange={(event) => setAgeDraft(event.target.value)}
                onBlur={commitAgeDraft}
                onKeyDown={blurOnEnter}
                placeholder="e.g., 34"
                error={fieldErrors.age}
              />
              <Input
                id="athlete-ftp"
                label="FTP (watts)"
                type="text"
                inputMode="numeric"
                value={ftpDraft}
                onChange={(event) => setFtpDraft(event.target.value)}
                onBlur={commitFtpDraft}
                onKeyDown={blurOnEnter}
                placeholder="e.g., 280"
                error={fieldErrors.ftpWatts}
              />
              <Input
                id="athlete-weight"
                label={anthropometricsUnit === 'imperial' ? 'Weight (lb)' : 'Weight (kg)'}
                type="text"
                inputMode="decimal"
                value={weightDraft}
                onChange={(event) => setWeightDraft(event.target.value)}
                onBlur={commitWeightDraft}
                onKeyDown={blurOnEnter}
                placeholder={anthropometricsUnit === 'imperial' ? 'e.g., 160' : 'e.g., 72'}
                error={fieldErrors.weightKg}
              />
            </div>

            <div className="surface-note flex flex-wrap items-center justify-between gap-3 px-3.5 py-3 md:px-4">
              <div>
                <p className="page-stat-label">Current W/kg</p>
                <p className="mt-1 font-sans text-[1.02rem] font-semibold leading-none text-ink-900">
                  {wKg ?? '--'}
                </p>
              </div>
              <p className="hidden text-sm leading-6 text-ink-600 sm:block">
                From FTP and weight
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
            <h2 className="section-title text-lg">Fuel targets</h2>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.9fr)] lg:gap-4 lg:space-y-0">
            <div className="space-y-3 md:space-y-4">
              <div className="grid gap-2.5 sm:grid-cols-2 md:gap-3">
                <Input
                  id="athlete-gut-target"
                  label="Gut target (g/h)"
                  type="text"
                  inputMode="numeric"
                  value={gutTargetDraft}
                  onChange={(event) => setGutTargetDraft(event.target.value)}
                  onBlur={commitGutTargetDraft}
                  onKeyDown={blurOnEnter}
                  placeholder="e.g., 75"
                  error={fieldErrors.gutTrainingTargetGph}
                />
                <Input
                  id="athlete-sweat-rate"
                  label="Sweat rate (L/h)"
                  type="text"
                  inputMode="decimal"
                  value={sweatRateDraft}
                  onChange={(event) => setSweatRateDraft(event.target.value)}
                  onBlur={commitSweatRateDraft}
                  onKeyDown={blurOnEnter}
                  placeholder="Optional, e.g., 0.9"
                  error={fieldErrors.sweatRateLph}
                />
              </div>

              <div className="surface-note flex items-center justify-between gap-3 p-3 md:p-4">
                <div>
                  <p className="font-semibold text-ink-900">Heavy sweater</p>
                  <p className="hidden text-sm leading-6 text-ink-600 md:block">
                    Use higher sodium in auto mode.
                  </p>
                </div>
                <Toggle
                  checked={athleteProfile.heavySweater}
                  onChange={(checked) =>
                    updateAthleteProfile({ heavySweater: checked })
                  }
                  label="Heavy sweater"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5 md:space-y-2">
                <p className="section-kicker text-[0.68rem]">Target presets</p>
                <PresetButtons
                  options={GUT_TARGET_PRESETS.map((target) => ({
                    label: `${target} g/h`,
                    value: target,
                  }))}
                  value={gutTrainingTargetGph}
                  onChange={applyGutTargetPreset}
                />
              </div>

              <p className="text-sm leading-5 text-ink-600 md:leading-6">
                {getGutTargetLabel(gutTrainingTargetGph)}. Auto stays near this value when workload allows.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20">
        <Card id="preferences" className="scroll-mt-24 overflow-hidden">
          <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
            <h2 className="section-title text-lg">Preferences</h2>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink-900">Temperature</p>
              <div className="grid grid-cols-2 gap-2">
                {TEMPERATURE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSettings({ temperatureUnit: option.value })}
                    className={clsx(
                      'min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors md:min-h-10',
                      temperatureUnit === option.value
                        ? 'border-brand-300 bg-brand-100 text-brand-800'
                        : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-sm leading-5 text-ink-600 md:leading-6">
                Used in ride data weather fields.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-ink-900">Fueling engine</p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: 'v2', label: 'v2 (classic)' },
                    { value: 'v3', label: 'v3 (science)' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSettings({ engineVersion: option.value })}
                    className={clsx(
                      'min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors md:min-h-10',
                      engineVersion === option.value
                        ? 'border-brand-300 bg-brand-100 text-brand-800'
                        : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-sm leading-5 text-ink-600 md:leading-6">
                v3 adds pre/post-ride, daily targets, and warnings. Requires
                weight.
              </p>
            </div>

            <Link
              to="/account"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[color:var(--border-soft)] bg-white px-3.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-shell-50 md:min-h-10"
            >
              Account and cloud backup
            </Link>

            <Link
              to="/power-meter-analyzer"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[color:var(--border-soft)] bg-white px-3.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-shell-50 md:min-h-10"
            >
              Open labs
            </Link>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
            <h2 className="section-title text-lg">Connections</h2>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <p className="text-sm leading-5 text-ink-600 md:leading-6">
              Sign in to back up this device and connect Strava.
            </p>

            <Link
              to="/account"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[color:var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:bg-shell-50 md:min-h-10"
            >
              Open account
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

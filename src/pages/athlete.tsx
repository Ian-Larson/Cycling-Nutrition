import { clsx } from 'clsx';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageIntro } from '@/components/layout/page-intro';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  PresetButtons,
  Toggle,
} from '@/components/ui';
import {
  formatNumberInputValue,
  kilogramsToPounds,
  poundsToKilograms,
  type AnthropometricsUnit,
} from '@/lib/athlete/anthropometrics';
import {
  createStravaAuthState,
  createStravaProvider,
} from '@/lib/auth/strava-provider';
import type { AuthStatus } from '@/lib/auth/types';
import { useStore, type AthleteProfile } from '@/store';

type OptionalNumericAthleteField =
  | 'ftpWatts'
  | 'weightKg'
  | 'age'
  | 'sweatRateLph';

type AthleteFieldErrorKey =
  | OptionalNumericAthleteField
  | 'gutTrainingTargetGph';

const GUT_TARGET_PRESETS = [60, 65, 75, 85, 95] as const;

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

export function AthletePage() {
  const [searchParams] = useSearchParams();
  const athleteProfile = useStore((s) => s.settings.athleteProfile);
  const updateAthleteProfile = useStore((s) => s.updateAthleteProfile);
  const profileCompletionPercent = useMemo(() => {
    const checks = [
      typeof athleteProfile.ftpWatts === 'number' && athleteProfile.ftpWatts > 0,
      typeof athleteProfile.weightKg === 'number' && athleteProfile.weightKg > 0,
      typeof athleteProfile.age === 'number' && athleteProfile.age > 0,
      typeof athleteProfile.sweatRateLph === 'number' && athleteProfile.sweatRateLph > 0,
      typeof athleteProfile.gutTrainingTargetGph === 'number' &&
        athleteProfile.gutTrainingTargetGph >= 50 &&
        athleteProfile.gutTrainingTargetGph <= 110,
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [
    athleteProfile.age,
    athleteProfile.ftpWatts,
    athleteProfile.gutTrainingTargetGph,
    athleteProfile.sweatRateLph,
    athleteProfile.weightKg,
  ]);

  const stravaProvider = useMemo(() => createStravaProvider(), []);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    stravaProvider.isConfigured() ? 'disconnected' : 'not_configured'
  );
  const [authMessage, setAuthMessage] = useState<string | null>(null);

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

  const plannerReturnStep = searchParams.get('return') === 'planner-step2' ? '?step=2' : '';

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

  const handleConnectStrava = () => {
    if (!stravaProvider.isConfigured()) {
      setAuthStatus('not_configured');
      setAuthMessage(
        'Set VITE_STRAVA_CLIENT_ID and VITE_STRAVA_REDIRECT_URI to enable OAuth.'
      );
      return;
    }

    const state = createStravaAuthState();
    const authorizeUrl = stravaProvider.getAuthorizeUrl(state);
    if (!authorizeUrl) {
      setAuthStatus('error');
      setAuthMessage('Could not create Strava authorize URL.');
      return;
    }

    setAuthStatus('pending');
    setAuthMessage('Redirecting to Strava...');
    window.location.assign(authorizeUrl);
  };

  return (
    <div className="page-shell space-y-4 md:space-y-5">
      <PageIntro
        eyebrow="Athlete"
        title="Athlete"
        description={
          <>
            Auto mode inputs.
          </>
        }
        actions={
          <Link
            to={`/${plannerReturnStep}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[color:var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-ink-800 sm:w-auto md:min-h-10"
          >
            Back to planner
          </Link>
        }
        meta={
          <div className="page-stat-grid">
            <div className="page-stat">
              <p className="page-stat-label">Completion</p>
              <p className="page-stat-value">{profileCompletionPercent}%</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-shell-200">
                <div
                  className="h-full rounded-full bg-brand-400 transition-all"
                  style={{ width: `${profileCompletionPercent}%` }}
                />
              </div>
            </div>
            <div className="page-stat">
              <p className="page-stat-label">W / Kg</p>
              <p className="page-stat-value">{wKg ?? '--'}</p>
              <p className="page-stat-copy">From FTP and weight</p>
            </div>
            <div className="page-stat">
              <p className="page-stat-label">Gut Target</p>
              <p className="page-stat-value">{gutTrainingTargetGph}g</p>
              <p className="page-stat-copy">{getGutTargetLabel(gutTrainingTargetGph)}</p>
            </div>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title text-lg">Profile</h2>
            </div>
            <div className="inline-flex w-full rounded-full border border-[color:var(--border-soft)] bg-white p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => handleAnthropometricsUnitChange('metric')}
                className={clsx(
                  'flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:flex-none',
                  anthropometricsUnit === 'metric'
                    ? 'bg-brand-100 text-brand-800'
                    : 'text-ink-700 hover:bg-shell-50'
                )}
              >
                Metric
              </button>
              <button
                type="button"
                onClick={() => handleAnthropometricsUnitChange('imperial')}
                className={clsx(
                  'flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:flex-none',
                  anthropometricsUnit === 'imperial'
                    ? 'bg-brand-100 text-brand-800'
                    : 'text-ink-700 hover:bg-shell-50'
                )}
              >
                Imperial
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 md:space-y-3">
          <p className="section-copy hidden md:block">FTP and weight drive auto mode.</p>
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
          <p className="text-sm leading-5 text-ink-600 md:leading-6">
            W/kg: <span className="font-semibold text-ink-900">{wKg ?? '--'}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
          <h2 className="section-title text-lg">Fuel and hydration</h2>
        </CardHeader>
        <CardContent className="space-y-2.5 md:space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-2 md:gap-3">
            <Input
              id="athlete-gut-target"
              label="Gut Training Target (g/h)"
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
              label="Sweat Rate (L/hour)"
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

          <div className="space-y-1.5 md:space-y-2">
            <p className="section-kicker text-[0.68rem]">Presets</p>
            <PresetButtons
              options={GUT_TARGET_PRESETS.map((target) => ({
                label: `${target} g/h`,
                value: target,
              }))}
              value={gutTrainingTargetGph}
              onChange={applyGutTargetPreset}
            />
          </div>

          <p className="hidden text-sm leading-6 text-ink-600 md:block">
            {getGutTargetLabel(gutTrainingTargetGph)}. Auto stays near this value when effort allows.
          </p>

          <div className="surface-note flex items-center justify-between gap-3 p-3 md:p-4">
            <div>
              <p className="font-semibold text-ink-900">Heavy sweater</p>
              <p className="hidden text-sm leading-6 text-ink-600 md:block">
                Raises sodium in auto mode.
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
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
          <h2 className="section-title text-lg">Connections</h2>
        </CardHeader>
        <CardContent className="space-y-2.5 md:space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink-900">Strava</span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                authStatus === 'not_configured'
                  ? 'bg-amber-100 text-amber-800'
                  : authStatus === 'pending'
                    ? 'bg-blue-100 text-blue-800'
                    : authStatus === 'error'
                      ? 'bg-red-100 text-red-800'
                      : authStatus === 'connected'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-700'
              }`}
            >
              {authStatus === 'not_configured'
                ? 'Not configured'
                : authStatus === 'pending'
                  ? 'Connecting'
                  : authStatus === 'error'
                    ? 'Error'
                    : authStatus === 'connected'
                      ? 'Connected'
                      : 'Ready'}
            </span>
          </div>

          <p className="hidden text-sm leading-6 text-ink-600 md:block">Optional. Not required for planning.</p>

          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={handleConnectStrava}
            disabled={authStatus === 'pending'}
          >
            Connect Strava (Experimental)
          </Button>

          {authMessage && (
            <p className="text-sm leading-5 text-ink-600 md:leading-6">
              {authMessage}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

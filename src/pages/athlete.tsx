import { clsx } from 'clsx';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Slider,
  Toggle,
} from '@/components/ui';
import {
  centimetersToFeetInches,
  feetInchesToCentimeters,
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
  | 'heightCm'
  | 'weightKg'
  | 'age'
  | 'sweatRateLph';

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

function getImperialHeightDrafts(heightCm: number | undefined): {
  feet: string;
  inches: string;
} {
  if (typeof heightCm !== 'number' || !Number.isFinite(heightCm)) {
    return { feet: '', inches: '' };
  }

  const converted = centimetersToFeetInches(heightCm);
  return {
    feet: formatNumberInputValue(converted.feet, 0),
    inches: formatNumberInputValue(converted.inches, 1),
  };
}

export function AthletePage() {
  const athleteProfile = useStore((s) => s.settings.athleteProfile);
  const updateAthleteProfile = useStore((s) => s.updateAthleteProfile);

  const stravaProvider = useMemo(() => createStravaProvider(), []);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    stravaProvider.isConfigured() ? 'disconnected' : 'not_configured'
  );
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const anthropometricsUnit = athleteProfile.anthropometricsUnit ?? 'metric';
  const ftp = athleteProfile.ftpWatts;
  const weightKg = athleteProfile.weightKg;
  const wKg =
    typeof ftp === 'number' && typeof weightKg === 'number' && weightKg > 0
      ? roundTo(ftp / weightKg, 2)
      : undefined;
  const gutTrainingTargetGph = athleteProfile.gutTrainingTargetGph ?? 65;

  const [ageDraft, setAgeDraft] = useState(() =>
    formatNumberInputValue(athleteProfile.age, 0)
  );
  const [ftpDraft, setFtpDraft] = useState(() =>
    formatNumberInputValue(athleteProfile.ftpWatts, 0)
  );
  const [weightDraft, setWeightDraft] = useState(() =>
    getWeightDraftFromProfile(athleteProfile.weightKg, anthropometricsUnit)
  );
  const [heightCmDraft, setHeightCmDraft] = useState(() =>
    formatNumberInputValue(athleteProfile.heightCm, 0)
  );
  const initialImperialHeightDrafts = getImperialHeightDrafts(
    athleteProfile.heightCm
  );
  const [heightFeetDraft, setHeightFeetDraft] = useState(
    initialImperialHeightDrafts.feet
  );
  const [heightInchesDraft, setHeightInchesDraft] = useState(
    initialImperialHeightDrafts.inches
  );
  const [sweatRateDraft, setSweatRateDraft] = useState(() =>
    formatNumberInputValue(athleteProfile.sweatRateLph, 1)
  );

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
    }
  ) => {
    const parsed = parseDraftNumber(draftValue);
    const decimals = options.integer ? 0 : (options.decimals ?? 1);
    const fallback = formatNumberInputValue(options.fallbackValue, decimals);

    if (parsed === null) {
      setDraft(fallback);
      return;
    }

    if (parsed === undefined) {
      updateAthleteProfile({ [key]: undefined } as Partial<AthleteProfile>);
      setDraft('');
      return;
    }

    const nextValue = options.integer ? Math.round(parsed) : parsed;
    const outOfRange =
      (options.min !== undefined && nextValue < options.min) ||
      (options.max !== undefined && nextValue > options.max);

    if (outOfRange) {
      setDraft(fallback);
      return;
    }

    updateAthleteProfile({ [key]: nextValue } as Partial<AthleteProfile>);
    setDraft(formatNumberInputValue(nextValue, decimals));
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
      });
      return;
    }

    const parsed = parseDraftNumber(weightDraft);
    const fallback = getWeightDraftFromProfile(athleteProfile.weightKg, 'imperial');

    if (parsed === null) {
      setWeightDraft(fallback);
      return;
    }

    if (parsed === undefined) {
      updateAthleteProfile({ weightKg: undefined });
      setWeightDraft('');
      return;
    }

    if (parsed < 1) {
      setWeightDraft(fallback);
      return;
    }

    updateAthleteProfile({ weightKg: poundsToKilograms(parsed) });
    setWeightDraft(formatNumberInputValue(parsed, 1));
  };

  const commitMetricHeightDraft = () =>
    commitOptionalNumberDraft('heightCm', heightCmDraft, setHeightCmDraft, {
      min: 50,
      integer: true,
      fallbackValue: athleteProfile.heightCm,
    });

  const commitImperialHeightDraft = () => {
    const parsedFeet = parseDraftNumber(heightFeetDraft);
    const parsedInches = parseDraftNumber(heightInchesDraft);
    const fallbackDrafts = getImperialHeightDrafts(athleteProfile.heightCm);

    if (parsedFeet === null || parsedInches === null) {
      setHeightFeetDraft(fallbackDrafts.feet);
      setHeightInchesDraft(fallbackDrafts.inches);
      return;
    }

    if (parsedFeet === undefined && parsedInches === undefined) {
      updateAthleteProfile({ heightCm: undefined });
      setHeightFeetDraft('');
      setHeightInchesDraft('');
      return;
    }

    const feet = parsedFeet ?? 0;
    const inches = parsedInches ?? 0;

    if (!Number.isInteger(feet) || feet < 0 || inches < 0 || inches >= 12) {
      setHeightFeetDraft(fallbackDrafts.feet);
      setHeightInchesDraft(fallbackDrafts.inches);
      return;
    }

    const nextHeightCm = feetInchesToCentimeters(feet, inches);
    if (nextHeightCm < 50) {
      setHeightFeetDraft(fallbackDrafts.feet);
      setHeightInchesDraft(fallbackDrafts.inches);
      return;
    }

    updateAthleteProfile({ heightCm: nextHeightCm });
    const normalizedDrafts = getImperialHeightDrafts(nextHeightCm);
    setHeightFeetDraft(normalizedDrafts.feet);
    setHeightInchesDraft(normalizedDrafts.inches);
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
      }
    );

  const metricStorageDetails = [
    typeof athleteProfile.weightKg === 'number'
      ? `${formatNumberInputValue(athleteProfile.weightKg, 1)} kg`
      : null,
    typeof athleteProfile.heightCm === 'number'
      ? `${formatNumberInputValue(athleteProfile.heightCm, 0)} cm`
      : null,
  ]
    .filter((value): value is string => value !== null)
    .join(' • ');

  const handleAnthropometricsUnitChange = (nextUnit: AnthropometricsUnit) => {
    if (nextUnit === anthropometricsUnit) {
      return;
    }

    updateAthleteProfile({ anthropometricsUnit: nextUnit });
    setWeightDraft(getWeightDraftFromProfile(athleteProfile.weightKg, nextUnit));
    setHeightCmDraft(formatNumberInputValue(athleteProfile.heightCm, 0));
    const imperialDrafts = getImperialHeightDrafts(athleteProfile.heightCm);
    setHeightFeetDraft(imperialDrafts.feet);
    setHeightInchesDraft(imperialDrafts.inches);
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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Athlete Profile</h1>
        <p className="text-sm text-gray-600 mt-1">
          This profile powers auto nutrition planning. Use the{' '}
          <Link to="/" className="underline font-medium text-brand-700">
            Planner
          </Link>{' '}
          to see recommendations update immediately.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Identity</h2>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
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
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Performance Metrics</h2>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <p className="text-sm font-medium text-gray-700">Body Units</p>
            <div className="inline-flex rounded-lg border border-gray-200 p-1">
              <button
                type="button"
                onClick={() => handleAnthropometricsUnitChange('metric')}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  anthropometricsUnit === 'metric'
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                Metric
              </button>
              <button
                type="button"
                onClick={() => handleAnthropometricsUnitChange('imperial')}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  anthropometricsUnit === 'imperial'
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                Imperial
              </button>
            </div>
          </div>

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
          />

          {anthropometricsUnit === 'imperial' ? (
            <>
              <Input
                id="athlete-height-feet"
                label="Height (ft)"
                type="text"
                inputMode="numeric"
                value={heightFeetDraft}
                onChange={(event) => setHeightFeetDraft(event.target.value)}
                onBlur={commitImperialHeightDraft}
                onKeyDown={blurOnEnter}
                placeholder="e.g., 5"
              />
              <Input
                id="athlete-height-inches"
                label="Height (in)"
                type="text"
                inputMode="decimal"
                value={heightInchesDraft}
                onChange={(event) => setHeightInchesDraft(event.target.value)}
                onBlur={commitImperialHeightDraft}
                onKeyDown={blurOnEnter}
                placeholder="e.g., 11"
              />
            </>
          ) : (
            <Input
              id="athlete-height"
              label="Height (cm)"
              type="text"
              inputMode="numeric"
              value={heightCmDraft}
              onChange={(event) => setHeightCmDraft(event.target.value)}
              onBlur={commitMetricHeightDraft}
              onKeyDown={blurOnEnter}
              placeholder="e.g., 178"
            />
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-sm font-medium text-gray-700">W/kg</p>
            <p className="text-xl font-bold text-brand-700 mt-1">
              {wKg !== undefined ? wKg : '--'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Calculated from FTP and weight.
            </p>
            {anthropometricsUnit === 'imperial' && metricStorageDetails && (
              <p className="text-xs text-gray-500 mt-1">
                Stored internally as {metricStorageDetails}.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Fuel Tolerance</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            id="gut-training-target"
            min={50}
            max={110}
            step={5}
            value={gutTrainingTargetGph}
            label="Gut Training Target"
            displayValue={`${gutTrainingTargetGph} g/h`}
            onChange={(event) =>
              updateAthleteProfile({
                gutTrainingTargetGph: Number(event.target.value),
              })
            }
          />
          <p className="text-sm text-gray-600">
            {getGutTargetLabel(gutTrainingTargetGph)}. The recommendation engine
            will bias toward this target while staying within intensity and safety limits.
          </p>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div>
              <p className="font-medium text-sm">Heavy sweater</p>
              <p className="text-xs text-gray-500">
                Adds a higher sodium recommendation in auto mode.
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

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Sweat Profile</h2>
        </CardHeader>
        <CardContent>
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
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Connections</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Strava</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
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

          <p className="text-sm text-gray-600">
            OAuth shell is in place for future backend token exchange.
          </p>

          <Button
            variant="secondary"
            onClick={handleConnectStrava}
            disabled={authStatus === 'pending'}
          >
            Connect Strava (Coming soon)
          </Button>

          {authMessage && <p className="text-sm text-gray-600">{authMessage}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

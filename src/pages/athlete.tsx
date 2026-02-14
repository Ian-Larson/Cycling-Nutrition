import { useMemo, useState } from 'react';
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
  createStravaAuthState,
  createStravaProvider,
} from '@/lib/auth/strava-provider';
import type { AuthStatus } from '@/lib/auth/types';
import { useStore, type AthleteProfile } from '@/store';

function roundTo(value: number, decimals: number): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function getGutTargetLabel(value: number): string {
  if (value <= 70) return 'Conservative tolerance';
  if (value <= 85) return 'Progressive tolerance';
  return 'Aggressive tolerance';
}

export function AthletePage() {
  const athleteProfile = useStore((s) => s.settings.athleteProfile);
  const updateAthleteProfile = useStore((s) => s.updateAthleteProfile);

  const stravaProvider = useMemo(() => createStravaProvider(), []);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    stravaProvider.isConfigured() ? 'disconnected' : 'not_configured'
  );
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const ftp = athleteProfile.ftpWatts;
  const weight = athleteProfile.weightKg;
  const wKg =
    typeof ftp === 'number' && typeof weight === 'number' && weight > 0
      ? roundTo(ftp / weight, 2)
      : undefined;

  const gutTrainingTargetGph = athleteProfile.gutTrainingTargetGph ?? 65;

  const updateOptionalNumber = (
    key:
      | 'ftpWatts'
      | 'heightCm'
      | 'weightKg'
      | 'age'
      | 'sweatRateLph',
    value: string,
    options?: {
      min?: number;
      max?: number;
      integer?: boolean;
    }
  ) => {
    if (value.trim() === '') {
      updateAthleteProfile({ [key]: undefined } as Partial<AthleteProfile>);
      return;
    }

    const parsedRaw = Number(value);
    if (!Number.isFinite(parsedRaw)) {
      return;
    }

    const parsed = options?.integer ? Math.round(parsedRaw) : parsedRaw;

    if (options?.min !== undefined && parsed < options.min) {
      return;
    }

    if (options?.max !== undefined && parsed > options.max) {
      return;
    }

    updateAthleteProfile({ [key]: parsed } as Partial<AthleteProfile>);
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
            type="number"
            min={10}
            max={120}
            step={1}
            value={athleteProfile.age ?? ''}
            onChange={(event) =>
              updateOptionalNumber('age', event.target.value, {
                integer: true,
                min: 10,
                max: 120,
              })
            }
            placeholder="e.g., 34"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Performance Metrics</h2>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Input
            id="athlete-ftp"
            label="FTP (watts)"
            type="number"
            min={1}
            step={1}
            value={athleteProfile.ftpWatts ?? ''}
            onChange={(event) =>
              updateOptionalNumber('ftpWatts', event.target.value, { min: 1 })
            }
            placeholder="e.g., 280"
          />
          <Input
            id="athlete-weight"
            label="Weight (kg)"
            type="number"
            min={1}
            step={0.1}
            value={athleteProfile.weightKg ?? ''}
            onChange={(event) =>
              updateOptionalNumber('weightKg', event.target.value, { min: 1 })
            }
            placeholder="e.g., 72"
          />
          <Input
            id="athlete-height"
            label="Height (cm)"
            type="number"
            min={50}
            step={1}
            value={athleteProfile.heightCm ?? ''}
            onChange={(event) =>
              updateOptionalNumber('heightCm', event.target.value, { min: 50 })
            }
            placeholder="e.g., 178"
          />
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-sm font-medium text-gray-700">W/kg</p>
            <p className="text-xl font-bold text-brand-700 mt-1">
              {wKg !== undefined ? wKg : '--'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Calculated from FTP and weight.
            </p>
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
            type="number"
            min={0.1}
            step={0.1}
            value={athleteProfile.sweatRateLph ?? ''}
            onChange={(event) =>
              updateOptionalNumber('sweatRateLph', event.target.value, {
                min: 0.1,
              })
            }
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

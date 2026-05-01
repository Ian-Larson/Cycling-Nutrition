import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Input,
  SegmentedControl,
  Stepper,
  Toggle,
} from '@/components/ui';
import { DisconnectStravaDialog } from '@/components/account/disconnect-strava-dialog';
import { useAuth } from '@/lib/auth/auth-context';
import {
  formatNumberInputValue,
  type AnthropometricsUnit,
} from '@/lib/athlete/anthropometrics';
import { formatRelativeTime } from '@/lib/format/relative-time';
import { useStore, type AthleteProfile, type TemperatureUnit } from '@/store';

function getGutTargetTone(value: number): string {
  if (value <= 70) return 'Conservative';
  if (value <= 85) return 'Progressive';
  return 'Aggressive';
}

function parseDraftNumber(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

interface RowProps {
  label: ReactNode;
  control: ReactNode;
  helper?: ReactNode;
  id?: string;
  /** Tailwind grid-column override for the row inside a multi-col Section. */
  span?: string;
}

function Row({ label, control, helper, id, span }: RowProps) {
  return (
    <li
      id={id}
      className={`flex scroll-mt-24 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5 md:py-3 ${span ?? ''}`}
    >
      <div className="text-sm font-medium text-ink-800">{label}</div>
      <div className="min-w-0 shrink-0">{control}</div>
      {helper ? (
        <p className="basis-full text-xs leading-5 text-ink-500">{helper}</p>
      ) : null}
    </li>
  );
}

interface SectionProps {
  kicker: string;
  children: ReactNode;
  id?: string;
  /** When true, the section uses a 2-col grid for its rows on sm+. */
  grid?: boolean;
}

function Section({ kicker, children, id, grid }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="section-kicker mb-1 uppercase tracking-[0.08em] text-ink-500">
        {kicker}
      </p>
      <ul
        className={`divide-y divide-[color:var(--border-soft)] ${
          grid ? 'sm:grid sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0' : ''
        }`}
      >
        {children}
      </ul>
    </section>
  );
}

export function Settings() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const updateAthleteProfile = useStore((s) => s.updateAthleteProfile);
  const auth = useAuth();

  const athleteProfile = settings.athleteProfile;
  const unit: AnthropometricsUnit = athleteProfile.anthropometricsUnit ?? 'metric';
  const gutTrainingTargetGph = athleteProfile.gutTrainingTargetGph ?? 65;
  const heavySweater = athleteProfile.heavySweater;

  const [sweatRateDraft, setSweatRateDraft] = useState(() =>
    formatNumberInputValue(athleteProfile.sweatRateLph, 1)
  );
  const [sweatError, setSweatError] = useState<string | undefined>();

  const blurOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  };

  const commitSweatRate = () => {
    const parsed = parseDraftNumber(sweatRateDraft);
    const fallback = formatNumberInputValue(athleteProfile.sweatRateLph, 1);

    if (parsed === null) {
      setSweatRateDraft(fallback);
      setSweatError('Enter a valid number.');
      return;
    }
    if (parsed === undefined) {
      updateAthleteProfile({ sweatRateLph: undefined } as Partial<AthleteProfile>);
      setSweatRateDraft('');
      setSweatError(undefined);
      return;
    }
    if (parsed < 0.1) {
      setSweatRateDraft(fallback);
      setSweatError('Use a value ≥ 0.1.');
      return;
    }
    updateAthleteProfile({ sweatRateLph: parsed });
    setSweatRateDraft(formatNumberInputValue(parsed, 1));
    setSweatError(undefined);
  };

  return (
    <div className="space-y-7 md:space-y-8">
      <Section kicker="Fuel">
        <Row
          label="Gut target"
          helper={`${getGutTargetTone(gutTrainingTargetGph)} tolerance.`}
          control={
            <Stepper
              label="Gut target"
              hideLabel
              value={gutTrainingTargetGph}
              onChange={(next) => updateAthleteProfile({ gutTrainingTargetGph: next })}
              min={50}
              max={110}
              step={5}
              formatValue={(value) => `${value} g/h`}
            />
          }
        />
        <Row
          label="Sweat rate"
          control={
            <div className="flex items-center gap-2">
              <Input
                id="settings-sweat-rate"
                type="text"
                inputMode="decimal"
                value={sweatRateDraft}
                onChange={(event) => setSweatRateDraft(event.target.value)}
                onBlur={commitSweatRate}
                onKeyDown={blurOnEnter}
                className="!min-h-9 !w-20 !py-1 text-right [font-variant-numeric:tabular-nums]"
                placeholder="—"
                aria-label="Sweat rate"
                error={sweatError}
              />
              <span className="text-sm text-ink-600">L/h</span>
            </div>
          }
        />
        <Row
          label="Heavy sweater"
          control={
            <Toggle
              checked={heavySweater}
              onChange={(checked) => updateAthleteProfile({ heavySweater: checked })}
              label="Heavy sweater"
            />
          }
        />
      </Section>

      <Section kicker="Display" id="preferences" grid>
        <Row
          label="Units"
          control={
            <SegmentedControl
              size="sm"
              label="Units"
              options={[
                { value: 'metric', label: 'Metric' },
                { value: 'imperial', label: 'Imperial' },
              ]}
              value={unit}
              onChange={(next) => updateAthleteProfile({ anthropometricsUnit: next })}
              className="w-[11rem]"
            />
          }
        />
        <Row
          label="Temperature"
          control={
            <SegmentedControl
              size="sm"
              label="Temperature"
              options={[
                { value: 'celsius' as TemperatureUnit, label: '°C' },
                { value: 'fahrenheit' as TemperatureUnit, label: '°F' },
              ]}
              value={settings.temperatureUnit}
              onChange={(next) => updateSettings({ temperatureUnit: next })}
              className="w-[7rem]"
            />
          }
        />
        <Row
          label="Fueling engine"
          helper="Adds pre/post-ride targets and warnings. Needs weight."
          span="sm:col-span-2"
          control={
            <SegmentedControl
              size="sm"
              label="Fueling engine"
              options={[
                { value: 'v2' as const, label: 'v2' },
                { value: 'v3' as const, label: 'v3' },
              ]}
              value={settings.engineVersion}
              onChange={(next) => updateSettings({ engineVersion: next })}
              className="w-[7rem]"
            />
          }
        />
      </Section>

      <Section kicker="Connections">
        <ConnectionsRows auth={auth} />
      </Section>
    </div>
  );
}

interface ConnectionsRowsProps {
  auth: ReturnType<typeof useAuth>;
}

function ConnectionsRows({ auth }: ConnectionsRowsProps) {
  const {
    authStatus,
    user,
    stravaConnection,
    isSupabaseReady,
    authMessage,
    syncMessage,
    stravaMessage,
    lastSyncedAt,
    signInWithEmail,
    signOut,
    syncNow,
    connectStrava,
    disconnectStrava,
  } = auth;

  const signedIn = authStatus === 'signedIn' && user !== null;
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!lastSyncedAt) return;
    const id = window.setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [lastSyncedAt]);

  const syncedRelative = formatRelativeTime(lastSyncedAt);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    await signInWithEmail(email);
    setIsSubmitting(false);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await syncNow();
    setIsSyncing(false);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
  };

  const handleDisconnectStrava = async () => {
    setConfirmDisconnect(false);
    setIsDisconnecting(true);
    await disconnectStrava();
    setIsDisconnecting(false);
  };

  if (!isSupabaseReady) {
    return (
      <>
        <li className="py-2.5 md:py-3">
          <Alert variant="warning">
            Add <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>, and{' '}
            <code>VITE_SUPABASE_AUTH_REDIRECT_URL</code> to enable account sign-in.
          </Alert>
        </li>
        <Row label="Sync" control={<MutedAction>Disabled in this build</MutedAction>} />
        <Row label="Strava" control={<MutedAction>Disabled in this build</MutedAction>} />
      </>
    );
  }

  return (
    <>
      <Row
        label="Account"
        helper={authMessage ?? undefined}
        control={
          signedIn ? (
            <div className="flex items-center gap-3">
              <span className="max-w-[14rem] truncate text-sm text-ink-600">
                {user?.email}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
          ) : authStatus === 'loading' ? (
            <span className="text-sm text-ink-500">Checking session…</span>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                id="connections-email"
                type="email"
                autoComplete="email"
                aria-label="Email for magic link"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                disabled={isSubmitting}
                className="!min-h-9 !w-56 !py-1"
              />
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send link'}
              </Button>
            </form>
          )
        }
      />

      <Row
        label="Sync"
        helper={syncMessage ?? undefined}
        control={
          signedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-ink-600 [font-variant-numeric:tabular-nums]">
                {lastSyncedAt ? `Synced ${syncedRelative}` : 'Not synced yet'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSyncNow}
                disabled={isSyncing}
              >
                {isSyncing ? 'Syncing…' : 'Sync now'}
              </Button>
            </div>
          ) : (
            <MutedAction>Sign in to back up</MutedAction>
          )
        }
      />

      <Row
        id="strava"
        label="Strava"
        helper={stravaMessage ?? undefined}
        control={
          stravaConnection ? (
            <div className="flex items-center gap-3">
              <span className="max-w-[12rem] truncate text-sm text-ink-600">
                {stravaConnection.athleteName ||
                  `Athlete ${stravaConnection.athleteId}`}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDisconnect(true)}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
              </Button>
            </div>
          ) : signedIn ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={connectStrava}
            >
              Connect
            </Button>
          ) : (
            <MutedAction>Sign in to connect</MutedAction>
          )
        }
      />

      <DisconnectStravaDialog
        open={confirmDisconnect}
        onCancel={() => setConfirmDisconnect(false)}
        onConfirm={handleDisconnectStrava}
        isDisconnecting={isDisconnecting}
      />
    </>
  );
}

function MutedAction({ children }: { children: ReactNode }) {
  return <span className="text-sm text-ink-400">{children}</span>;
}

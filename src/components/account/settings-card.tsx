import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  PresetButtons,
  SegmentedControl,
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

const GUT_TARGET_PRESETS = [60, 65, 75, 85, 95] as const;

function getGutTargetTone(value: number): string {
  if (value <= 70) return 'Conservative tolerance';
  if (value <= 85) return 'Progressive tolerance';
  return 'Aggressive tolerance';
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
  /** When true, label sits above control on all sizes (used for rows whose control is wide). */
  stack?: boolean;
  id?: string;
}

function Row({ label, control, helper, stack, id }: RowProps) {
  return (
    <li id={id} className="scroll-mt-24 px-4 py-3 md:px-5 md:py-3.5">
      <div
        className={
          stack
            ? 'space-y-2'
            : 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2'
        }
      >
        <div className="text-sm font-medium text-ink-800">{label}</div>
        <div className={stack ? 'w-full' : 'min-w-0 shrink-0'}>{control}</div>
      </div>
      {helper ? (
        <p className="mt-1.5 text-xs leading-5 text-ink-500">{helper}</p>
      ) : null}
    </li>
  );
}

function Section({
  kicker,
  children,
  id,
}: {
  kicker: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="px-4 pb-1 pt-3 md:px-5 md:pt-4">
        <p className="section-kicker uppercase tracking-[0.08em] text-ink-500">
          {kicker}
        </p>
      </div>
      <ul className="divide-y divide-[color:var(--border-soft)]">{children}</ul>
    </div>
  );
}

export function SettingsCard() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const updateAthleteProfile = useStore((s) => s.updateAthleteProfile);
  const auth = useAuth();

  const athleteProfile = settings.athleteProfile;
  const unit: AnthropometricsUnit = athleteProfile.anthropometricsUnit ?? 'metric';
  const gutTrainingTargetGph = athleteProfile.gutTrainingTargetGph ?? 65;
  const heavySweater = athleteProfile.heavySweater;

  const [gutTargetDraft, setGutTargetDraft] = useState(() =>
    formatNumberInputValue(gutTrainingTargetGph, 0)
  );
  const [sweatRateDraft, setSweatRateDraft] = useState(() =>
    formatNumberInputValue(athleteProfile.sweatRateLph, 1)
  );
  const [gutError, setGutError] = useState<string | undefined>();
  const [sweatError, setSweatError] = useState<string | undefined>();

  useEffect(() => {
    setGutTargetDraft(formatNumberInputValue(gutTrainingTargetGph, 0));
  }, [gutTrainingTargetGph]);
  useEffect(() => {
    setSweatRateDraft(formatNumberInputValue(athleteProfile.sweatRateLph, 1));
  }, [athleteProfile.sweatRateLph]);

  const blurOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  };

  const commitGutTarget = () => {
    const parsed = parseDraftNumber(gutTargetDraft);
    const fallback = formatNumberInputValue(gutTrainingTargetGph, 0);

    if (parsed === null || parsed === undefined) {
      setGutTargetDraft(fallback);
      setGutError('Enter a value between 50 and 110.');
      return;
    }
    const next = Math.round(parsed);
    if (next < 50 || next > 110) {
      setGutTargetDraft(fallback);
      setGutError('Use a value between 50 and 110.');
      return;
    }
    updateAthleteProfile({ gutTrainingTargetGph: next });
    setGutTargetDraft(formatNumberInputValue(next, 0));
    setGutError(undefined);
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
    <Card className="overflow-hidden">
      <Section kicker="Fuel">
        <Row
          stack
          label="Gut target"
          helper={`${getGutTargetTone(gutTrainingTargetGph)}. Auto stays near this value when workload allows.`}
          control={
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  id="settings-gut-target"
                  type="text"
                  inputMode="numeric"
                  value={gutTargetDraft}
                  onChange={(event) => setGutTargetDraft(event.target.value)}
                  onBlur={commitGutTarget}
                  onKeyDown={blurOnEnter}
                  className="!min-h-10 max-w-[7rem] !py-1.5"
                  aria-label="Gut target g/h"
                  error={gutError}
                />
                <span className="text-sm font-medium text-ink-600">g/h</span>
              </div>
              <PresetButtons
                ariaLabel="Gut target presets"
                options={GUT_TARGET_PRESETS.map((value) => ({
                  label: `${value}`,
                  value,
                }))}
                value={gutTrainingTargetGph}
                onChange={(value) => {
                  updateAthleteProfile({ gutTrainingTargetGph: value });
                  setGutTargetDraft(formatNumberInputValue(value, 0));
                  setGutError(undefined);
                }}
              />
            </div>
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
                className="!min-h-10 max-w-[7rem] !py-1.5"
                placeholder="Optional"
                aria-label="Sweat rate L/h"
                error={sweatError}
              />
              <span className="text-sm font-medium text-ink-600">L/h</span>
            </div>
          }
        />

        <Row
          label="Heavy sweater"
          helper="Bias auto toward more sodium."
          control={
            <Toggle
              checked={heavySweater}
              onChange={(checked) => updateAthleteProfile({ heavySweater: checked })}
              label="Heavy sweater"
            />
          }
        />
      </Section>

      <div className="border-t border-[color:var(--border-soft)]" aria-hidden />

      <Section kicker="Display" id="preferences">
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
              onChange={(next) =>
                updateAthleteProfile({ anthropometricsUnit: next })
              }
              className="w-[12rem]"
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
              className="w-[8rem]"
            />
          }
        />
        <Row
          label="Fueling engine"
          helper="Adds pre/post-ride targets and warnings. Needs weight."
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
              className="w-[8rem]"
            />
          }
        />
      </Section>

      <div className="border-t border-[color:var(--border-soft)]" aria-hidden />

      <Section kicker="Connections">
        <ConnectionsRows auth={auth} />
      </Section>
    </Card>
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
        <li className="px-4 py-3 md:px-5 md:py-3.5">
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
        stack={!signedIn}
        label="Account"
        helper={authMessage ?? undefined}
        control={
          signedIn ? (
            <div className="flex items-center gap-3">
              <span className="max-w-[16rem] truncate text-sm text-ink-700">
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
            <form
              onSubmit={handleSubmit}
              className="flex w-full flex-col gap-2 sm:flex-row sm:items-start"
            >
              <Input
                id="connections-email"
                type="email"
                autoComplete="email"
                aria-label="Email for magic link"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                disabled={isSubmitting}
                className="flex-1 !min-h-10 !py-1.5"
              />
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send magic link'}
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
              <span className="text-sm text-ink-700 [font-variant-numeric:tabular-nums]">
                {lastSyncedAt ? `Synced ${syncedRelative}` : 'Not synced yet'}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSyncNow}
                disabled={isSyncing}
              >
                {isSyncing ? 'Syncing…' : 'Sync now'}
              </Button>
            </div>
          ) : (
            <MutedAction>Sign in to back up changes</MutedAction>
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
              <span className="max-w-[14rem] truncate text-sm text-ink-700">
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
            <MutedAction>Sign in to connect Strava</MutedAction>
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

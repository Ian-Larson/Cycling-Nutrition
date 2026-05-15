import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Input,
  SegmentedControl,
  Stepper,
  Toggle,
} from '@/components/ui';
import { AthleteSection } from '@/components/account/athlete-section';
import { DisconnectStravaDialog } from '@/components/account/disconnect-strava-dialog';
import { useAuth } from '@/lib/auth/auth-context';
import { type AnthropometricsUnit } from '@/lib/athlete/anthropometrics';
import { formatRelativeTime } from '@/lib/format/relative-time';
import { useStore, type TemperatureUnit } from '@/store';
import { Row, Section } from '@/components/account/section-list';

export function Settings() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const updateAthleteProfile = useStore((s) => s.updateAthleteProfile);
  const auth = useAuth();

  const athleteProfile = settings.athleteProfile;
  const unit: AnthropometricsUnit = athleteProfile.anthropometricsUnit ?? 'metric';
  const gutTrainingTargetGph = athleteProfile.gutTrainingTargetGph ?? 65;
  const heavySweater = athleteProfile.heavySweater;

  return (
    <div className="space-y-7 md:space-y-8">
      <AthleteSection />

      <Section kicker="Fuel">
        <Row
          label="Gut target"
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
    pendingEmailVerification,
    signInWithEmail,
    verifyEmailOtp,
    cancelEmailVerification,
    signOut,
    syncNow,
    connectStrava,
    disconnectStrava,
  } = auth;

  const signedIn = authStatus === 'signedIn' && user !== null;
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
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
  const stravaLabel = stravaConnection
    ? stravaConnection.athleteName ||
      `Athlete ${stravaConnection.athleteId}`
    : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setOtpCode('');
    await signInWithEmail(email);
    setIsSubmitting(false);
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsVerifying(true);
    await verifyEmailOtp(otpCode);
    setIsVerifying(false);
  };

  const handleUseDifferentEmail = () => {
    cancelEmailVerification();
    setOtpCode('');
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
        helperLive="polite"
        control={
          signedIn ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className="min-w-0 truncate text-sm text-ink-600 sm:max-w-[14rem]"
                title={user?.email ?? undefined}
              >
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
          ) : authStatus === 'loading' && !pendingEmailVerification ? (
            <span className="text-sm text-ink-500">Checking session…</span>
          ) : pendingEmailVerification ? (
            <form
              onSubmit={handleVerifyOtp}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <Input
                id="connections-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                aria-label="6-digit code"
                value={otpCode}
                onChange={(event) =>
                  setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="123456"
                disabled={isVerifying}
                className="!min-h-11 !w-full !py-2 sm:!w-32 md:!min-h-10"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isVerifying || otpCode.length !== 6}
              >
                {isVerifying ? 'Verifying…' : 'Verify'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleUseDifferentEmail}
                disabled={isVerifying}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <Input
                id="connections-email"
                type="email"
                autoComplete="email"
                aria-label="Email for sign-in code"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                disabled={isSubmitting}
                className="!min-h-11 !w-full !py-2 sm:!w-56 md:!min-h-10"
              />
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send code'}
              </Button>
            </form>
          )
        }
      />

      <Row
        label="Sync"
        helper={syncMessage ?? undefined}
        helperLive="polite"
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
        helperLive="polite"
        control={
          stravaConnection ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className="min-w-0 truncate text-sm text-ink-600 sm:max-w-[12rem]"
                title={stravaLabel ?? undefined}
              >
                {stravaLabel}
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
  return <span className="text-sm text-ink-500">{children}</span>;
}

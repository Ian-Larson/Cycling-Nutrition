import { useMemo, useState, type FormEvent } from 'react';
import { PageIntro } from '@/components/layout/page-intro';
import { SectionNav } from '@/components/layout/section-nav';
import { Button, Card, CardContent, CardHeader, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '--';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getSyncLabel(status: string): string {
  if (status === 'syncing') return 'Syncing';
  if (status === 'synced') return 'Synced';
  if (status === 'offline') return 'Offline';
  if (status === 'error') return 'Sync error';
  if (status === 'conflict') return 'Conflict';
  return 'Local only';
}

function getSyncBadgeClass(status: string): string {
  if (status === 'synced') return 'bg-emerald-100 text-emerald-800';
  if (status === 'syncing') return 'bg-blue-100 text-blue-800';
  if (status === 'offline') return 'bg-amber-100 text-amber-800';
  if (status === 'error' || status === 'conflict') {
    return 'bg-rose-100 text-rose-800';
  }
  return 'bg-gray-100 text-gray-700';
}

export function AccountPage() {
  const {
    authStatus,
    cloudSyncStatus,
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
  } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const signedIn = authStatus === 'signedIn' && user !== null;
  const statusCopy = useMemo(() => {
    if (!isSupabaseReady) return 'Accounts are not configured in this build.';
    if (signedIn) return `Signed in as ${user.email}`;
    if (authStatus === 'loading') return 'Checking your session...';
    return 'Guest mode is active on this device.';
  }, [authStatus, isSupabaseReady, signedIn, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    await signInWithEmail(email);
    setIsSubmitting(false);
  };

  const handleSyncNow = async () => {
    setIsSyncingNow(true);
    await syncNow();
    setIsSyncingNow(false);
  };

  const handleDisconnectStrava = async () => {
    setIsDisconnecting(true);
    await disconnectStrava();
    setIsDisconnecting(false);
  };

  return (
    <div className="page-shell max-w-6xl space-y-4 md:space-y-6">
      <PageIntro
        title="Account"
        description={
          <>
            Keep planning locally as a guest, or sign in to back up and sync
            this data across devices.
          </>
        }
      />

      <SectionNav section="account" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="section-title text-lg">Sign in</h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                  {signedIn ? 'Signed in' : 'Guest'}
                </span>
              </div>
              <p className="section-copy">{statusCopy}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSupabaseReady && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-6 text-amber-900">
                  Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
                  `VITE_SUPABASE_AUTH_REDIRECT_URL` to enable account sign-in.
                </div>
              )}

              {!signedIn && (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <Input
                    id="account-email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    disabled={!isSupabaseReady || isSubmitting}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!isSupabaseReady || isSubmitting}
                  >
                    {isSubmitting ? 'Sending link...' : 'Send magic link'}
                  </Button>
                </form>
              )}

              {signedIn && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSyncNow}
                    disabled={isSyncingNow}
                  >
                    {isSyncingNow ? 'Syncing...' : 'Sync now'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={signOut}>
                    Sign out
                  </Button>
                </div>
              )}

              {authMessage && (
                <p className="text-sm leading-5 text-ink-600 md:leading-6">
                  {authMessage}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="section-title text-lg">Cloud backup</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${getSyncBadgeClass(
                    cloudSyncStatus
                  )}`}
                >
                  {getSyncLabel(cloudSyncStatus)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-5 text-ink-600 md:leading-6">
                The app still saves immediately on this device. When signed in,
                changes are copied to your account as a versioned backup.
              </p>
              <div className="surface-note grid gap-3 px-3.5 py-3 sm:grid-cols-2">
                <div>
                  <p className="page-stat-label">Last synced</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">
                    {formatDateTime(lastSyncedAt)}
                  </p>
                </div>
                <div>
                  <p className="page-stat-label">Mode</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">
                    {signedIn ? 'Cloud + local' : 'Local only'}
                  </p>
                </div>
              </div>
              {syncMessage && (
                <p className="text-sm leading-5 text-ink-600 md:leading-6">
                  {syncMessage}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card id="strava" className="scroll-mt-24 overflow-hidden">
            <CardHeader className="space-y-2 bg-[var(--surface-soft)]">
              <h2 className="section-title text-lg">Strava</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-5 text-ink-600 md:leading-6">
                Optional connection. This phase stores the connection securely
                but does not import rides.
              </p>

              {stravaConnection ? (
                <div className="space-y-3">
                  <div className="surface-note px-3.5 py-3">
                    <p className="page-stat-label">Connected athlete</p>
                    <p className="mt-1 text-sm font-semibold text-ink-900">
                      {stravaConnection.athleteName ||
                        `Athlete ${stravaConnection.athleteId}`}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-ink-600">
                      Since {formatDateTime(stravaConnection.connectedAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={handleDisconnectStrava}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? 'Disconnecting...' : 'Disconnect Strava'}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={connectStrava}
                  disabled={!signedIn}
                >
                  Connect Strava
                </Button>
              )}

              {!signedIn && (
                <p className="text-sm leading-5 text-ink-600 md:leading-6">
                  Sign in before connecting Strava.
                </p>
              )}

              {stravaMessage && (
                <p className="text-sm leading-5 text-ink-600 md:leading-6">
                  {stravaMessage}
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

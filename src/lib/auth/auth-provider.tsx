import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  createDebouncedCloudWriter,
  initializeUserCloudState,
  saveCloudRestoreBackup,
  SupabaseCloudStateRepository,
} from '@/lib/cloud/sync';
import { serializeAppState, type SerializedAppState } from '@/lib/cloud/app-state';
import {
  getSupabaseClient,
  getSupabaseConfig,
  isSupabaseConfigured,
} from '@/lib/supabase/client';
import { useStore, type AppDataSnapshot } from '@/store';
import {
  createStravaAuthState,
  createStravaProvider,
} from './strava-provider';
import {
  disconnectStrava,
  fetchStravaConnection,
} from './strava-service';
import type {
  AppAuthStatus,
  AuthUser,
  CloudSyncStatus,
  StravaConnection,
} from './types';
import { AuthContext, type AuthContextValue } from './auth-context';

function getAuthUserFromSession(session: Session | null): AuthUser | null {
  const sessionUser = session?.user;
  if (!sessionUser?.id || !sessionUser.email) return null;

  return {
    id: sessionUser.id,
    email: sessionUser.email,
    createdAt: sessionUser.created_at,
  };
}

function isBrowserOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const repository = useMemo(
    () => (supabase ? new SupabaseCloudStateRepository(supabase) : null),
    [supabase]
  );
  const [authStatus, setAuthStatus] = useState<AppAuthStatus>(
    supabase ? 'loading' : 'guest'
  );
  const [cloudSyncStatus, setCloudSyncStatus] =
    useState<CloudSyncStatus>('idle');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(
    supabase ? null : 'Supabase is not configured. Guest mode is active.'
  );
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [stravaMessage, setStravaMessage] = useState<string | null>(null);
  const [stravaConnection, setStravaConnection] =
    useState<StravaConnection | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const applyingCloudSnapshotRef = useRef(false);
  const initializingCloudRef = useRef(false);
  const writerRef = useRef<ReturnType<
    typeof createDebouncedCloudWriter<SerializedAppState>
  > | null>(null);

  const writeSnapshot = useCallback(
    async (userId: string, snapshot: SerializedAppState) => {
      if (!repository) return;

      if (!isBrowserOnline()) {
        setCloudSyncStatus('offline');
        setSyncMessage('Offline. Changes will sync when you reconnect.');
        return;
      }

      setCloudSyncStatus('syncing');
      setSyncMessage('Syncing...');

      try {
        await repository.upsertUserState(userId, snapshot);
        setCloudSyncStatus('synced');
        setLastSyncedAt(new Date().toISOString());
        setSyncMessage('Cloud backup is current.');
      } catch (error) {
        setCloudSyncStatus('error');
        setSyncMessage(
          error instanceof Error ? error.message : 'Cloud sync failed.'
        );
      }
    },
    [repository]
  );

  const refreshStravaConnection = useCallback(async () => {
    if (!supabase || !user) {
      setStravaConnection(null);
      return;
    }

    try {
      setStravaConnection(await fetchStravaConnection(supabase));
      setStravaMessage(null);
    } catch (error) {
      setStravaMessage(
        error instanceof Error
          ? error.message
          : 'Could not load Strava connection.'
      );
    }
  }, [supabase, user]);

  useEffect(() => {
    if (!supabase) {
      setAuthStatus('guest');
      return undefined;
    }

    let mounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        setAuthStatus('error');
        setAuthMessage(error.message);
        return;
      }

      const nextUser = getAuthUserFromSession(data.session);
      setUser(nextUser);
      setAuthStatus(nextUser ? 'signedIn' : 'signedOut');
      setAuthMessage(nextUser ? null : 'Guest mode is active.');
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = getAuthUserFromSession(session);
      setUser(nextUser);
      setAuthStatus(nextUser ? 'signedIn' : 'signedOut');
      setAuthMessage(nextUser ? null : 'Guest mode is active.');
      if (!nextUser) {
        setStravaConnection(null);
        setCloudSyncStatus('idle');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!repository || !user) return undefined;

    let cancelled = false;

    const runInitialSync = async () => {
      initializingCloudRef.current = true;
      setCloudSyncStatus('syncing');
      setSyncMessage('Checking cloud backup...');

      try {
        const result = await initializeUserCloudState({
          userId: user.id,
          repository,
          getLocalState: () => useStore.getState(),
          replaceAppData: (data: AppDataSnapshot) => {
            applyingCloudSnapshotRef.current = true;
            useStore.getState().replaceAppData(data);
            queueMicrotask(() => {
              applyingCloudSnapshotRef.current = false;
            });
          },
          saveBackup: (snapshot) => saveCloudRestoreBackup(user.id, snapshot),
        });

        if (cancelled) return;

        setCloudSyncStatus('synced');
        setLastSyncedAt(new Date().toISOString());
        setSyncMessage(
          result.kind === 'uploaded-local'
            ? 'Local data imported to your account.'
            : 'Cloud backup restored on this device.'
        );
      } catch (error) {
        if (cancelled) return;

        setCloudSyncStatus('error');
        setSyncMessage(
          error instanceof Error
            ? error.message
            : 'Could not initialize cloud sync.'
        );
      } finally {
        initializingCloudRef.current = false;
      }
    };

    void runInitialSync();

    return () => {
      cancelled = true;
    };
  }, [repository, user]);

  useEffect(() => {
    if (!repository || !user) return undefined;

    const writer = createDebouncedCloudWriter<SerializedAppState>({
      delayMs: 1200,
      write: (snapshot) => writeSnapshot(user.id, snapshot),
    });
    writerRef.current = writer;

    const unsubscribe = useStore.subscribe((state) => {
      if (applyingCloudSnapshotRef.current || initializingCloudRef.current) {
        return;
      }

      if (!isBrowserOnline()) {
        setCloudSyncStatus('offline');
        setSyncMessage('Offline. Changes will sync when you reconnect.');
        return;
      }

      setCloudSyncStatus('syncing');
      setSyncMessage('Local changes queued for cloud backup.');
      writer.schedule(serializeAppState(state));
    });

    const handleOnline = () => {
      writer.schedule(serializeAppState(useStore.getState()));
    };
    const handleBeforeUnload = () => {
      void writer.flush();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      writer.cancel();
      writerRef.current = null;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [repository, user, writeSnapshot]);

  useEffect(() => {
    void refreshStravaConnection();
  }, [refreshStravaConnection]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      if (!supabase) {
        setAuthStatus('guest');
        setAuthMessage('Supabase is not configured. Add env vars to enable accounts.');
        return;
      }

      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setAuthMessage('Enter an email address.');
        return;
      }

      setAuthStatus('loading');
      const config = getSupabaseConfig();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: config?.authRedirectUrl,
        },
      });

      if (error) {
        setAuthStatus('error');
        setAuthMessage(error.message);
        return;
      }

      setAuthStatus('signedOut');
      setAuthMessage('Check your email for a sign-in link.');
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;

    await writerRef.current?.flush();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthStatus('error');
      setAuthMessage(error.message);
      return;
    }

    setUser(null);
    setStravaConnection(null);
    setAuthStatus('signedOut');
    setCloudSyncStatus('idle');
    setAuthMessage('Signed out. Local data is still available on this device.');
  }, [supabase]);

  const syncNow = useCallback(async () => {
    if (!repository || !user) return;
    await writerRef.current?.flush();
    await writeSnapshot(user.id, serializeAppState(useStore.getState()));
  }, [repository, user, writeSnapshot]);

  const connectStrava = useCallback(() => {
    if (!user) {
      setStravaMessage('Sign in before connecting Strava.');
      return;
    }

    const provider = createStravaProvider();
    if (!provider.isConfigured()) {
      setStravaMessage('Set VITE_STRAVA_CLIENT_ID to enable Strava.');
      return;
    }

    const state = createStravaAuthState();
    const authorizeUrl = provider.getAuthorizeUrl(state);
    if (!authorizeUrl) {
      setStravaMessage('Could not create the Strava authorization URL.');
      return;
    }

    window.location.assign(authorizeUrl);
  }, [user]);

  const handleDisconnectStrava = useCallback(async () => {
    if (!supabase || !user) return;

    try {
      setStravaMessage('Disconnecting Strava...');
      await disconnectStrava(supabase);
      setStravaConnection(null);
      setStravaMessage('Strava disconnected.');
    } catch (error) {
      setStravaMessage(
        error instanceof Error ? error.message : 'Could not disconnect Strava.'
      );
    }
  }, [supabase, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authStatus,
      cloudSyncStatus,
      user,
      stravaConnection,
      isSupabaseReady: isSupabaseConfigured(),
      authMessage,
      syncMessage,
      stravaMessage,
      lastSyncedAt,
      signInWithEmail,
      signOut,
      syncNow,
      connectStrava,
      disconnectStrava: handleDisconnectStrava,
      refreshStravaConnection,
    }),
    [
      authMessage,
      authStatus,
      cloudSyncStatus,
      connectStrava,
      handleDisconnectStrava,
      lastSyncedAt,
      refreshStravaConnection,
      signInWithEmail,
      signOut,
      stravaConnection,
      stravaMessage,
      syncMessage,
      syncNow,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

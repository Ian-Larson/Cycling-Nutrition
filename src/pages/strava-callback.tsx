import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CallbackCard,
  type CallbackState,
} from '@/components/layout/callback-card';
import { validateStravaAuthState } from '@/lib/auth/strava-provider';
import { exchangeStravaCode } from '@/lib/auth/strava-service';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';

export function StravaCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshStravaConnection } = useAuth();
  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState('Finishing Strava connection...');

  useEffect(() => {
    const run = async () => {
      const oauthError = searchParams.get('error');
      if (oauthError) {
        setState('error');
        setMessage(`Strava returned an error: ${oauthError}`);
        return;
      }

      const code = searchParams.get('code');
      const returnedState = searchParams.get('state');

      if (!code || !returnedState) {
        setState('error');
        setMessage('Missing Strava callback parameters.');
        return;
      }

      if (!validateStravaAuthState(returnedState)) {
        setState('error');
        setMessage('Strava state validation failed. Please try connecting again.');
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        setState('error');
        setMessage('Supabase is not configured in this build.');
        return;
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setState('error');
        setMessage('Sign in before connecting Strava.');
        return;
      }

      try {
        await exchangeStravaCode(supabase, {
          code,
          scope: searchParams.get('scope'),
        });
        await refreshStravaConnection();
        setState('success');
        setMessage('Strava connected successfully.');
      } catch (error) {
        setState('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'Strava connection could not be completed.'
        );
      }
    };

    void run();
  }, [refreshStravaConnection, searchParams]);

  useEffect(() => {
    if (state === 'loading') return;
    const timer = setTimeout(() => {
      navigate('/account');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate, state]);

  return (
    <CallbackCard
      introTitle="Strava"
      introDescription="Finishing connection."
      state={state}
      stateTitles={{
        loading: 'Connecting...',
        success: 'Connected',
        error: 'Connection failed',
      }}
      message={message}
      redirectTo="/account"
      redirectLabel="Account"
    />
  );
}

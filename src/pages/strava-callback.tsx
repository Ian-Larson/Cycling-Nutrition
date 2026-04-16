import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { PageIntro } from '@/components/layout/page-intro';
import { validateStravaAuthState } from '@/lib/auth/strava-provider';
import { exchangeStravaCode } from '@/lib/auth/strava-service';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';

type CallbackState = 'loading' | 'success' | 'error';

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
    <div className="page-shell max-w-3xl space-y-4 md:space-y-6">
      <PageIntro
        title="Strava"
        description={
          <>
            Finishing connection.
          </>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 bg-white/55">
          <h2 className="section-title text-lg">
            {state === 'loading'
              ? 'Connecting...'
              : state === 'success'
                ? 'Connected'
                : 'Connection failed'}
          </h2>
        </CardHeader>
        <CardContent className="space-y-2.5 md:space-y-3">
          <p
            className={
              state === 'error'
                ? 'text-sm leading-5 text-rose-700 md:leading-6'
                : 'text-sm leading-5 text-ink-700 md:leading-6'
            }
          >
            {message}
          </p>

          {state !== 'loading' && (
            <p className="text-sm leading-5 text-ink-600 md:leading-6">
              Redirecting to{' '}
              <Link to="/account" className="underline font-semibold text-brand-700">
                Account
              </Link>{' '}
              now.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

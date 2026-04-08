import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { PageIntro } from '@/components/layout/page-intro';
import {
  createStravaProvider,
  validateStravaAuthState,
} from '@/lib/auth/strava-provider';

type CallbackState = 'loading' | 'success' | 'error';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const provider = useMemo(() => createStravaProvider(), []);
  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState('Validating Strava callback...');

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
        setMessage('Missing OAuth callback parameters (code/state).');
        return;
      }

      if (!validateStravaAuthState(returnedState)) {
        setState('error');
        setMessage('OAuth state validation failed. Please try connecting again.');
        return;
      }

      if (!provider.isConfigured()) {
        setState('error');
        setMessage('Strava OAuth is not configured in environment variables.');
        return;
      }

      try {
        await provider.handleCallback({ code, state: returnedState });
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
  }, [provider, searchParams]);

  useEffect(() => {
    if (state === 'loading') return;
    const timer = setTimeout(() => {
      navigate('/athlete');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate, state]);

  return (
    <div className="page-shell max-w-3xl space-y-4 md:space-y-6">
      <PageIntro
        eyebrow="Connection"
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
                : 'Connection Failed'}
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
              <Link to="/athlete" className="underline font-semibold text-brand-700">
                Athlete
              </Link>{' '}
              now.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

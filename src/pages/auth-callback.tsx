import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui';
import {
  createStravaProvider,
  validateStravaAuthState,
} from '@/lib/auth/strava-provider';

type CallbackState = 'loading' | 'success' | 'error';

export function AuthCallbackPage() {
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Strava Connection</h1>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">
            {state === 'loading'
              ? 'Connecting...'
              : state === 'success'
                ? 'Connected'
                : 'Connection Failed'}
          </h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <p
            className={
              state === 'error' ? 'text-sm text-red-600' : 'text-sm text-gray-700'
            }
          >
            {message}
          </p>

          {state !== 'loading' && (
            <p className="text-sm text-gray-500">
              Return to the{' '}
              <Link to="/athlete" className="underline font-medium text-brand-700">
                Athlete page
              </Link>{' '}
              to continue setup.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

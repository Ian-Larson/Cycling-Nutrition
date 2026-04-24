import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CallbackCard,
  type CallbackState,
} from '@/components/layout/callback-card';
import { getSupabaseClient } from '@/lib/supabase/client';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState('Finishing sign in...');

  useEffect(() => {
    const run = async () => {
      const callbackError = searchParams.get('error');
      if (callbackError) {
        setState('error');
        setMessage(`Sign-in returned an error: ${callbackError}`);
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        setState('error');
        setMessage('Supabase is not configured in this build.');
        return;
      }

      const code = searchParams.get('code');
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) {
            throw new Error('No sign-in session was found.');
          }
        }
        setState('success');
        setMessage('Signed in successfully.');
      } catch (error) {
        setState('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'Sign-in could not be completed.'
        );
      }
    };

    void run();
  }, [searchParams]);

  useEffect(() => {
    if (state === 'loading') return;
    const timer = setTimeout(() => {
      navigate('/account');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate, state]);

  return (
    <CallbackCard
      introTitle="Account"
      introDescription="Finishing account sign-in."
      state={state}
      stateTitles={{
        loading: 'Signing in...',
        success: 'Signed in',
        error: 'Sign-in failed',
      }}
      message={message}
      redirectTo="/account"
      redirectLabel="Account"
    />
  );
}

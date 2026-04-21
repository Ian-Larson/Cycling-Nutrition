import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '@/components/layout/page-intro';
import { Alert, Card, CardContent, CardHeader } from '@/components/ui';

export type CallbackState = 'loading' | 'success' | 'error';

interface CallbackCardProps {
  introTitle: string;
  introDescription: ReactNode;
  state: CallbackState;
  /** Title shown inside the card for each state (Loading / Success / Error). */
  stateTitles: Record<CallbackState, string>;
  message: string;
  /** Path to link back to after the flow resolves. */
  redirectTo: string;
  redirectLabel: string;
}

export function CallbackCard({
  introTitle,
  introDescription,
  state,
  stateTitles,
  message,
  redirectTo,
  redirectLabel,
}: CallbackCardProps) {
  return (
    <div className="page-shell max-w-3xl space-y-4 md:space-y-6">
      <PageIntro title={introTitle} description={introDescription} />

      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 bg-white/55">
          <h2 className="section-title text-lg">{stateTitles[state]}</h2>
        </CardHeader>
        <CardContent className="space-y-2.5 md:space-y-3">
          {state === 'error' ? (
            <Alert variant="error">{message}</Alert>
          ) : (
            <p
              role={state === 'loading' ? 'status' : undefined}
              aria-live={state === 'loading' ? 'polite' : undefined}
              className="text-sm leading-5 text-ink-700 md:leading-6"
            >
              {message}
            </p>
          )}

          {state !== 'loading' && (
            <p className="text-sm leading-5 text-ink-600 md:leading-6">
              Redirecting to{' '}
              <Link
                to={redirectTo}
                className="font-semibold text-brand-700 underline"
              >
                {redirectLabel}
              </Link>{' '}
              now.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

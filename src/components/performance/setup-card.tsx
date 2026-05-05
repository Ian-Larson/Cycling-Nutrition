import { Link } from 'react-router-dom';
import { Button, Card, CardContent } from '@/components/ui';

interface SetupCardProps {
  hasFitness: boolean;
  isStravaConnected: boolean;
  onConnectStrava: () => void;
}

export function SetupCard({
  hasFitness,
  isStravaConnected,
  onConnectStrava,
}: SetupCardProps) {
  return (
    <Card>
      <CardContent className="md:px-5 md:py-5">
        <p className="section-kicker uppercase tracking-wider text-ink-500">
          Set up
        </p>
        <h2 className="section-title mt-1.5">Set up your fitness picture</h2>
        <p className="mt-1.5 max-w-[58ch] text-sm leading-6 text-ink-600">
          Add your FTP and weight to see w/kg and trends. Connect Strava to pull
          ride data and surface power records.
        </p>

        <ul className="mt-4 space-y-3">
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm">
              <StateDot done={hasFitness} />
              <span
                className={
                  hasFitness ? 'text-ink-700 line-through' : 'text-ink-900'
                }
              >
                Add FTP and weight
              </span>
            </span>
            {hasFitness ? (
              <span className="text-xs uppercase tracking-wider text-success-700">
                Done
              </span>
            ) : (
              <Link
                to="/account#athlete"
                className="inline-flex min-h-9 items-center rounded-xl border border-brand-500 bg-brand-500 px-3 text-sm font-medium text-white shadow-[var(--shadow-brand-glow-md)] transition-shadow hover:bg-brand-700 hover:shadow-[var(--shadow-brand-glow-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
              >
                Add in Account →
              </Link>
            )}
          </li>

          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm">
              <StateDot done={isStravaConnected} />
              <span
                className={
                  isStravaConnected
                    ? 'text-ink-700 line-through'
                    : 'text-ink-900'
                }
              >
                Connect Strava
              </span>
            </span>
            {isStravaConnected ? (
              <span className="text-xs uppercase tracking-wider text-success-700">
                Connected
              </span>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={onConnectStrava}
              >
                Connect Strava
              </Button>
            )}
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

function StateDot({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={[
        'inline-flex h-4 w-4 items-center justify-center rounded-full border',
        done
          ? 'border-success-500 bg-success-100 text-success-700'
          : 'border-[color:var(--border-soft)] bg-white text-ink-300',
      ].join(' ')}
    >
      {done ? (
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
          <path
            d="M2.5 6.5 5 9l4.5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 8 8" className="h-2 w-2" aria-hidden>
          <circle cx="4" cy="4" r="3" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}

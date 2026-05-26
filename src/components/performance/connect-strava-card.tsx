import { Button } from '@/components/ui';

interface ConnectStravaCardProps {
  onConnect: () => void;
}

export function ConnectStravaCard({ onConnect }: ConnectStravaCardProps) {
  return (
    <section
      aria-labelledby="power-records-prompt-title"
      className="border-t border-[color:var(--border-soft)] pt-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h2
            id="power-records-prompt-title"
            className="section-kicker uppercase tracking-wider text-ink-500"
          >
            Power records
          </h2>
          <p className="mt-1 max-w-[42ch] text-sm leading-5 text-ink-600">
            Connect Strava to add ride-based records.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onConnect}
          className="w-full sm:w-auto"
        >
          Connect Strava
        </Button>
      </div>
    </section>
  );
}

import { Button, Card, CardContent } from '@/components/ui';

interface ConnectStravaCardProps {
  onConnect: () => void;
}

export function ConnectStravaCard({ onConnect }: ConnectStravaCardProps) {
  return (
    <Card>
      <CardContent className="md:px-5 md:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h2 className="section-kicker uppercase tracking-wider text-ink-500">
              Power records
            </h2>
            <p className="mt-1 max-w-[52ch] text-sm leading-5 text-ink-600">
              Connect Strava to import rides and surface 5-min, 20-min, and 1 h
              power records in this period.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={onConnect}>
            Connect Strava
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

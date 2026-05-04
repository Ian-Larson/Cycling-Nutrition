import { Button } from '@/components/ui';

interface StravaReauthBannerProps {
  onReconnect: () => void;
}

export function StravaReauthBanner({ onReconnect }: StravaReauthBannerProps) {
  return (
    <div className="rounded-md border border-brand-200 bg-brand-50 p-4">
      <p className="text-sm font-medium text-ink-800">
        Reconnect Strava to import rides
      </p>
      <p className="mt-1 text-sm text-ink-600">
        Domestique needs activity-read access to pull your power data.
        Reconnecting takes a single click.
      </p>
      <div className="mt-3">
        <Button variant="secondary" size="sm" onClick={onReconnect}>
          Reconnect Strava
        </Button>
      </div>
    </div>
  );
}

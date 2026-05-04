import { Button } from '@/components/ui';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const PRESETS = [
  { label: '90 days', days: 90 },
  { label: '6 months', days: 180 },
  { label: '1 year', days: 365 },
  { label: 'All', days: null },
] as const;

interface BackfillPromptProps {
  onStart: (options: { since: string }) => void;
}

export function BackfillPrompt({ onStart }: BackfillPromptProps) {
  const handleStart = (days: number | null) => {
    const since =
      days === null
        ? new Date(0).toISOString()
        : new Date(Date.now() - days * MS_PER_DAY).toISOString();
    onStart({ since });
  };

  return (
    <div className="rounded-md border border-dashed border-ink-300 bg-shell-50 p-6">
      <p className="text-sm font-medium text-ink-800">Import your Strava rides</p>
      <p className="mt-1 text-sm text-ink-600">
        Pick a window — Domestique pulls power streams from each ride and
        builds your records.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            variant="secondary"
            size="sm"
            onClick={() => handleStart(p.days)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

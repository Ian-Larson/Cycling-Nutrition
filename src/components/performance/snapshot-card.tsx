import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, Input } from '@/components/ui';
import {
  PERIOD_SHORT_LABELS,
  type PeriodKey,
} from '@/lib/performance/period';
import type { FtpHistoryEntry } from '@/types/performance';

interface SnapshotCardProps {
  currentWkg: number | undefined;
  ftpWatts: number | undefined;
  weightKg: number | undefined;
  ftpHistory: readonly FtpHistoryEntry[];
  period: PeriodKey;
  onRecordFtp: (entry: Omit<FtpHistoryEntry, 'id'>) => void;
}

export function SnapshotCard({
  currentWkg,
  ftpWatts,
  weightKg,
  ftpHistory,
  period,
  onRecordFtp,
}: SnapshotCardProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [watts, setWatts] = useState('');
  const [error, setError] = useState<string | undefined>();

  const sortedHistory = useMemo(
    () => [...ftpHistory].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1)),
    [ftpHistory]
  );
  const latestEntry = sortedHistory[0];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number(watts);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid FTP.');
      return;
    }

    const nextWatts = Math.round(parsed);
    onRecordFtp({ recordedAt: date, ftpWatts: nextWatts });
    setWatts('');
    setError(undefined);
  };

  const currentFtpLabel = ftpWatts ? `${Math.round(ftpWatts)} W` : 'Not set';
  const wkgLabel =
    currentWkg !== undefined ? `${currentWkg.toFixed(2)} w/kg` : 'Add weight';
  const latestDateLabel = latestEntry ? formatDate(latestEntry.recordedAt) : 'No entries';

  return (
    <Card className="h-full">
      <CardContent className="space-y-5 md:px-5 md:py-5">
        <div>
          <p className="section-kicker uppercase tracking-wider text-ink-500">
            Current FTP
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-sans text-[2.25rem] font-bold leading-none tracking-tight text-ink-900 [font-variant-numeric:tabular-nums] md:text-[2.55rem]">
              {ftpWatts ? `${Math.round(ftpWatts)} W` : '—'}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="Power to weight" value={wkgLabel} muted={currentWkg === undefined} />
            <Metric label="Last logged" value={latestDateLabel} muted={!latestEntry} />
          </div>
        </div>

        <form className="surface-note space-y-3 px-3 py-3" onSubmit={handleSubmit}>
          <div>
            <h2 className="section-title">Log FTP</h2>
            <p className="mt-1 text-sm leading-5 text-ink-600">
              Save a test result here; the newest entry becomes your current FTP.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Input
              id="performance-ftp-date"
              label="FTP date"
              type="date"
              value={date}
              max={today}
              onChange={(event) => setDate(event.target.value)}
            />
            <Input
              id="performance-ftp-watts"
              label="FTP watts"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              placeholder={currentFtpLabel === 'Not set' ? '285' : currentFtpLabel.replace(' W', '')}
              value={watts}
              onChange={(event) => setWatts(event.target.value)}
              error={error}
            />
          </div>
          <Button type="submit" className="w-full">
            Save FTP
          </Button>
        </form>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Recent entries</h2>
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              {PERIOD_SHORT_LABELS[period]}
            </span>
          </div>
          {sortedHistory.length === 0 ? (
            <p className="mt-2 text-sm text-ink-600">
              No FTP history yet. Add your latest test to start the line.
            </p>
          ) : (
            <ol className="mt-2 divide-y divide-[color:var(--border-soft)]">
              {sortedHistory.slice(0, 5).map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="text-ink-600">{formatDate(entry.recordedAt)}</span>
                  <span className="font-semibold text-ink-900 [font-variant-numeric:tabular-nums]">
                    {Math.round(entry.ftpWatts)} W
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {weightKg === undefined && (
          <Link
            to="/account#athlete"
            className="inline-flex min-h-9 items-center rounded-xl text-sm font-medium text-brand-700 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
          >
            Add weight for w/kg
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="surface-note px-3 py-2.5">
      <p className="page-stat-label">{label}</p>
      <p
        className={[
          'page-stat-value mt-1',
          muted ? 'text-ink-400' : 'text-ink-900',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

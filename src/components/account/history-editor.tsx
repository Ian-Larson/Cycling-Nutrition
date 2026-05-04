import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import type {
  FtpHistoryEntry,
  WeightHistoryEntry,
} from '@/types/performance';
import { useStore } from '@/store';

export function HistoryEditor() {
  const ftpHistory = useStore((s) => s.ftpHistory);
  const weightHistory = useStore((s) => s.weightHistory);
  const addFtpEntry = useStore((s) => s.addFtpEntry);
  const removeFtpEntry = useStore((s) => s.removeFtpEntry);
  const addWeightEntry = useStore((s) => s.addWeightEntry);
  const removeWeightEntry = useStore((s) => s.removeWeightEntry);

  return (
    <div className="space-y-8">
      <FtpSection
        history={ftpHistory}
        onAdd={addFtpEntry}
        onRemove={removeFtpEntry}
      />
      <WeightSection
        history={weightHistory}
        onAdd={addWeightEntry}
        onRemove={removeWeightEntry}
      />
    </div>
  );
}

interface FtpSectionProps {
  history: FtpHistoryEntry[];
  onAdd: (e: Omit<FtpHistoryEntry, 'id'>) => void;
  onRemove: (id: string) => void;
}

function FtpSection({ history, onAdd, onRemove }: FtpSectionProps) {
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [watts, setWatts] = useState('');

  const sorted = [...history].sort((a, b) =>
    a.recordedAt < b.recordedAt ? 1 : -1
  );

  return (
    <section>
      <h3 className="text-sm font-semibold text-ink-900 mb-2">
        FTP history
      </h3>
      <ul className="space-y-1 mb-3">
        {sorted.map((entry) => (
          <li
            key={entry.id}
            data-testid="ftp-history-row"
            className="flex items-center justify-between text-sm text-ink-700 tabular-nums"
          >
            <span>
              {entry.recordedAt} — {entry.ftpWatts} W
            </span>
            <button
              type="button"
              aria-label={`Delete FTP ${entry.ftpWatts}`}
              onClick={() => onRemove(entry.id)}
              className="text-xs text-ink-500 hover:text-error-700"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = Number(watts);
          if (!parsed || parsed <= 0) return;
          onAdd({ recordedAt: date, ftpWatts: parsed });
          setWatts('');
        }}
      >
        <label className="text-xs text-ink-700">
          FTP date
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="text-xs text-ink-700">
          FTP watts
          <Input
            type="number"
            min={1}
            value={watts}
            onChange={(e) => setWatts(e.target.value)}
          />
        </label>
        <Button type="submit">Add FTP</Button>
      </form>
    </section>
  );
}

interface WeightSectionProps {
  history: WeightHistoryEntry[];
  onAdd: (e: Omit<WeightHistoryEntry, 'id'>) => void;
  onRemove: (id: string) => void;
}

function WeightSection({ history, onAdd, onRemove }: WeightSectionProps) {
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [kg, setKg] = useState('');

  const sorted = [...history].sort((a, b) =>
    a.recordedAt < b.recordedAt ? 1 : -1
  );

  return (
    <section>
      <h3 className="text-sm font-semibold text-ink-900 mb-2">
        Weight history
      </h3>
      <ul className="space-y-1 mb-3">
        {sorted.map((entry) => (
          <li
            key={entry.id}
            data-testid="weight-history-row"
            className="flex items-center justify-between text-sm text-ink-700 tabular-nums"
          >
            <span>
              {entry.recordedAt} — {entry.weightKg} kg
            </span>
            <button
              type="button"
              aria-label={`Delete weight ${entry.weightKg}`}
              onClick={() => onRemove(entry.id)}
              className="text-xs text-ink-500 hover:text-error-700"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = Number(kg);
          if (!parsed || parsed <= 0) return;
          onAdd({ recordedAt: date, weightKg: parsed });
          setKg('');
        }}
      >
        <label className="text-xs text-ink-700">
          Weight date
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="text-xs text-ink-700">
          Weight kg
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={kg}
            onChange={(e) => setKg(e.target.value)}
          />
        </label>
        <Button type="submit">Add weight</Button>
      </form>
    </section>
  );
}

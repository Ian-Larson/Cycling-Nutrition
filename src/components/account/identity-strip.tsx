import { useEffect, useState, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui';
import {
  formatNumberInputValue,
  kilogramsToPounds,
  poundsToKilograms,
  type AnthropometricsUnit,
} from '@/lib/athlete/anthropometrics';
import { useStore, type AthleteProfile } from '@/store';

type EditField = 'name' | 'age' | 'ftpWatts' | 'weightKg';
type FieldErrors = Partial<Record<Exclude<EditField, 'name'>, string>>;

function roundTo(value: number, decimals: number): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function parseDraftNumber(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function getWeightDraft(
  weightKg: number | undefined,
  unit: AnthropometricsUnit
): string {
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg)) return '';
  return unit === 'imperial'
    ? formatNumberInputValue(kilogramsToPounds(weightKg), 1)
    : formatNumberInputValue(weightKg, 1);
}

function formatWeight(
  weightKg: number | undefined,
  unit: AnthropometricsUnit
): string | null {
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg)) return null;
  return unit === 'imperial'
    ? `${formatNumberInputValue(kilogramsToPounds(weightKg), 1)} lb`
    : `${formatNumberInputValue(weightKg, 1)} kg`;
}

const FIELD_INPUT_ID: Record<EditField, string> = {
  name: 'identity-name',
  age: 'identity-age',
  ftpWatts: 'identity-ftp',
  weightKg: 'identity-weight',
};

export function IdentityStrip() {
  const athleteProfile = useStore((s) => s.settings.athleteProfile);
  const updateAthleteProfile = useStore((s) => s.updateAthleteProfile);
  const unit = athleteProfile.anthropometricsUnit ?? 'metric';

  const ftp = athleteProfile.ftpWatts;
  const weightKg = athleteProfile.weightKg;
  const wKg =
    typeof ftp === 'number' && typeof weightKg === 'number' && weightKg > 0
      ? roundTo(ftp / weightKg, 2)
      : undefined;

  const [editing, setEditing] = useState(false);
  const [focusField, setFocusField] = useState<EditField | null>(null);

  const [ageDraft, setAgeDraft] = useState(() =>
    formatNumberInputValue(athleteProfile.age, 0)
  );
  const [ftpDraft, setFtpDraft] = useState(() =>
    formatNumberInputValue(athleteProfile.ftpWatts, 0)
  );
  const [weightDraft, setWeightDraft] = useState(() =>
    getWeightDraft(athleteProfile.weightKg, unit)
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!editing || !focusField) return;
    const id = FIELD_INPUT_ID[focusField];
    const node = document.getElementById(id) as HTMLInputElement | null;
    if (node) {
      node.focus();
      if (focusField !== 'name') node.select?.();
    }
  }, [editing, focusField]);


  const setError = (key: keyof FieldErrors, message: string | undefined) => {
    setErrors((current) => {
      if (!message && !current[key]) return current;
      if (!message) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: message };
    });
  };

  const blurOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') exitEdit();
  };

  const commitInteger = (
    key: 'age' | 'ftpWatts',
    draftValue: string,
    setDraft: (value: string) => void,
    options: { min?: number; max?: number; fallback: number | undefined }
  ) => {
    const parsed = parseDraftNumber(draftValue);
    const fallbackText = formatNumberInputValue(options.fallback, 0);

    if (parsed === null) {
      setDraft(fallbackText);
      setError(key, 'Enter a valid number.');
      return;
    }
    if (parsed === undefined) {
      updateAthleteProfile({ [key]: undefined } as Partial<AthleteProfile>);
      setDraft('');
      setError(key, undefined);
      return;
    }
    const next = Math.round(parsed);
    const { min, max } = options;
    if ((min !== undefined && next < min) || (max !== undefined && next > max)) {
      setDraft(fallbackText);
      const range =
        min !== undefined && max !== undefined
          ? `between ${min} and ${max}`
          : min !== undefined
            ? `≥ ${min}`
            : `≤ ${max}`;
      setError(key, `Use a value ${range}.`);
      return;
    }
    updateAthleteProfile({ [key]: next } as Partial<AthleteProfile>);
    setDraft(formatNumberInputValue(next, 0));
    setError(key, undefined);
  };

  const commitWeight = () => {
    const parsed = parseDraftNumber(weightDraft);
    const fallback = getWeightDraft(athleteProfile.weightKg, unit);

    if (parsed === null) {
      setWeightDraft(fallback);
      setError('weightKg', 'Enter a valid number.');
      return;
    }
    if (parsed === undefined) {
      updateAthleteProfile({ weightKg: undefined });
      setWeightDraft('');
      setError('weightKg', undefined);
      return;
    }
    if (parsed < 1) {
      setWeightDraft(fallback);
      setError('weightKg', 'Use a value ≥ 1.');
      return;
    }
    const nextKg = unit === 'imperial' ? poundsToKilograms(parsed) : parsed;
    updateAthleteProfile({ weightKg: nextKg });
    setWeightDraft(formatNumberInputValue(parsed, 1));
    setError('weightKg', undefined);
  };

  const enterEdit = (field?: EditField) => {
    setAgeDraft(formatNumberInputValue(athleteProfile.age, 0));
    setFtpDraft(formatNumberInputValue(athleteProfile.ftpWatts, 0));
    setWeightDraft(getWeightDraft(athleteProfile.weightKg, unit));
    setErrors({});
    setFocusField(field ?? 'name');
    setEditing(true);
  };

  const exitEdit = () => {
    setEditing(false);
    setFocusField(null);
  };

  const displayName = athleteProfile.name?.trim() || 'Athlete';
  const ageText =
    typeof athleteProfile.age === 'number' ? `${athleteProfile.age} yrs` : null;
  const ftpText =
    typeof athleteProfile.ftpWatts === 'number'
      ? `${athleteProfile.ftpWatts} W`
      : null;
  const weightText = formatWeight(athleteProfile.weightKg, unit);

  const stats: { field: EditField; value: string }[] = [
    ageText ? { field: 'age', value: ageText } : null,
    ftpText ? { field: 'ftpWatts', value: ftpText } : null,
    weightText ? { field: 'weightKg', value: weightText } : null,
  ].filter((entry): entry is { field: EditField; value: string } => entry !== null);

  if (editing) {
    return (
      <section
        aria-label="Edit athlete profile"
        className="border-b border-[color:var(--border-soft)] pb-4 md:pb-5"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            id="identity-name"
            label="Name"
            value={athleteProfile.name ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              updateAthleteProfile({
                name: value.trim().length > 0 ? value : undefined,
              });
            }}
            onKeyDown={blurOnEnter}
            placeholder="e.g., Ian"
          />
          <Input
            id="identity-age"
            label="Age"
            type="text"
            inputMode="numeric"
            value={ageDraft}
            onChange={(event) => setAgeDraft(event.target.value)}
            onBlur={() =>
              commitInteger('age', ageDraft, setAgeDraft, {
                min: 10,
                max: 120,
                fallback: athleteProfile.age,
              })
            }
            onKeyDown={blurOnEnter}
            placeholder="e.g., 34"
            error={errors.age}
          />
          <Input
            id="identity-ftp"
            label="FTP (watts)"
            type="text"
            inputMode="numeric"
            value={ftpDraft}
            onChange={(event) => setFtpDraft(event.target.value)}
            onBlur={() =>
              commitInteger('ftpWatts', ftpDraft, setFtpDraft, {
                min: 1,
                fallback: athleteProfile.ftpWatts,
              })
            }
            onKeyDown={blurOnEnter}
            placeholder="e.g., 280"
            error={errors.ftpWatts}
          />
          <Input
            id="identity-weight"
            label={unit === 'imperial' ? 'Weight (lb)' : 'Weight (kg)'}
            type="text"
            inputMode="decimal"
            value={weightDraft}
            onChange={(event) => setWeightDraft(event.target.value)}
            onBlur={commitWeight}
            onKeyDown={blurOnEnter}
            placeholder={unit === 'imperial' ? 'e.g., 160' : 'e.g., 72'}
            error={errors.weightKg}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={exitEdit}
            className="inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
          >
            Done
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Athlete identity"
      className="border-b border-[color:var(--border-soft)] pb-4 md:pb-5"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-2">
        <div className="min-w-0 space-y-1">
          <button
            type="button"
            onClick={() => enterEdit('name')}
            className="block w-full truncate rounded-sm text-left font-sans text-[1.18rem] font-bold leading-tight tracking-[-0.024em] text-ink-900 transition-colors hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 md:text-[1.28rem]"
          >
            {displayName}
          </button>
          {stats.length > 0 ? (
            <p className="font-sans text-sm leading-snug text-ink-600 [font-variant-numeric:tabular-nums]">
              {stats.map((stat, index) => (
                <span key={stat.field}>
                  {index > 0 ? <span className="px-1.5 text-ink-400">·</span> : null}
                  <button
                    type="button"
                    onClick={() => enterEdit(stat.field)}
                    className="rounded-sm transition-colors hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
                  >
                    {stat.value}
                  </button>
                </span>
              ))}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => enterEdit('age')}
              className="rounded-sm text-sm text-ink-500 transition-colors hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
            >
              Tap to set your stats
            </button>
          )}
        </div>

        <div className="text-right">
          <p className="page-stat-label">Power-to-weight</p>
          <p className="mt-0.5 font-sans text-[1.6rem] font-bold leading-none text-ink-900 [font-variant-numeric:tabular-nums] md:text-[1.75rem]">
            {wKg ?? '—'}
            <span className="ml-1 text-sm font-semibold text-ink-500">W/kg</span>
          </p>
        </div>

        <div className="col-span-2 flex items-center justify-between gap-3">
          {wKg === undefined ? (
            <p className="text-xs leading-5 text-ink-500">
              Set FTP and weight to see W/kg.
            </p>
          ) : (
            <span aria-hidden />
          )}
          <button
            type="button"
            onClick={() => enterEdit()}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-600 transition-colors hover:bg-shell-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
          >
            Edit
            <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-3.5 w-3.5">
              <path
                d="m6 4 4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

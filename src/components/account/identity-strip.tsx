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

const FIELD_INPUT_ID: Record<EditField, string> = {
  name: 'identity-name',
  age: 'identity-age',
  ftpWatts: 'identity-ftp',
  weightKg: 'identity-weight',
};

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

function getWeightDraft(weightKg: number | undefined, unit: AnthropometricsUnit): string {
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg)) return '';
  return unit === 'imperial'
    ? formatNumberInputValue(kilogramsToPounds(weightKg), 1)
    : formatNumberInputValue(weightKg, 1);
}

function formatWeight(weightKg: number | undefined, unit: AnthropometricsUnit): string | null {
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg)) return null;
  return unit === 'imperial'
    ? `${formatNumberInputValue(kilogramsToPounds(weightKg), 1)} lb`
    : `${formatNumberInputValue(weightKg, 1)} kg`;
}

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

  const [ageDraft, setAgeDraft] = useState(() => formatNumberInputValue(athleteProfile.age, 0));
  const [ftpDraft, setFtpDraft] = useState(() => formatNumberInputValue(athleteProfile.ftpWatts, 0));
  const [weightDraft, setWeightDraft] = useState(() =>
    getWeightDraft(athleteProfile.weightKg, unit)
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!editing || !focusField) return;
    const node = document.getElementById(FIELD_INPUT_ID[focusField]) as HTMLInputElement | null;
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

  const enterEdit = () => {
    setAgeDraft(formatNumberInputValue(athleteProfile.age, 0));
    setFtpDraft(formatNumberInputValue(athleteProfile.ftpWatts, 0));
    setWeightDraft(getWeightDraft(athleteProfile.weightKg, unit));
    setErrors({});
    setFocusField('name');
    setEditing(true);
  };

  const exitEdit = () => {
    setEditing(false);
    setFocusField(null);
  };

  const displayName = athleteProfile.name?.trim() || 'Athlete';
  const ageText = typeof athleteProfile.age === 'number' ? `${athleteProfile.age} yrs` : null;
  const ftpText = typeof athleteProfile.ftpWatts === 'number' ? `${athleteProfile.ftpWatts} W` : null;
  const weightText = formatWeight(athleteProfile.weightKg, unit);
  const stats = [ageText, ftpText, weightText].filter((value): value is string => Boolean(value));

  if (editing) {
    return (
      <section aria-label="Edit athlete profile" className="space-y-3">
        <div className="grid gap-2.5 sm:grid-cols-4">
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
            placeholder="Ian"
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
            placeholder="34"
            error={errors.age}
          />
          <Input
            id="identity-ftp"
            label="FTP (W)"
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
            placeholder="280"
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
            placeholder={unit === 'imperial' ? '160' : '72'}
            error={errors.weightKg}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={exitEdit}
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
          >
            Done
          </button>
        </div>
      </section>
    );
  }

  return (
    <button
      type="button"
      onClick={enterEdit}
      aria-label="Edit athlete profile"
      className="group flex w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-shell-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 md:px-4"
    >
      <div className="flex min-w-0 items-baseline gap-x-3">
        <span className="font-sans text-[1.18rem] font-bold leading-tight tracking-[-0.024em] text-ink-900 md:text-[1.28rem]">
          {displayName}
        </span>
        {stats.length > 0 ? (
          <span className="font-sans text-sm text-ink-500 [font-variant-numeric:tabular-nums]">
            {stats.join(' · ')}
          </span>
        ) : (
          <span className="text-sm text-ink-400">Tap to set your stats</span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <div className="flex items-baseline gap-1">
          <span className="font-sans text-[1.35rem] font-bold leading-none text-ink-900 [font-variant-numeric:tabular-nums] md:text-[1.45rem]">
            {wKg ?? '—'}
          </span>
          <span className="text-xs font-semibold tracking-wide text-ink-500">W/kg</span>
        </div>
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="h-3.5 w-3.5 self-center text-ink-300 transition-colors group-hover:text-ink-500"
        >
          <path
            d="m6 4 4 4-4 4"
            stroke="currentColor"
            fill="none"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </button>
  );
}

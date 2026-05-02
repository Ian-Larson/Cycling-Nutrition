import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { clsx } from 'clsx';
import {
  formatNumberInputValue,
  kilogramsToPounds,
  poundsToKilograms,
  type AnthropometricsUnit,
} from '@/lib/athlete/anthropometrics';
import { useStore, type AthleteProfile } from '@/store';
import { Row, Section } from './section-list';

type EditField = 'name' | 'age' | 'ftpWatts' | 'weightKg';
type FieldErrors = Partial<Record<Exclude<EditField, 'name'>, string>>;

const FIELD_INPUT_ID: Record<EditField, string> = {
  name: 'athlete-name',
  age: 'athlete-age',
  ftpWatts: 'athlete-ftp',
  weightKg: 'athlete-weight',
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

function formatWeightDisplay(
  weightKg: number | undefined,
  unit: AnthropometricsUnit
): string | null {
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg)) return null;
  return unit === 'imperial'
    ? `${formatNumberInputValue(kilogramsToPounds(weightKg), 1)} lb`
    : `${formatNumberInputValue(weightKg, 1)} kg`;
}

const EMPTY = '—';

export function AthleteSection() {
  const athleteProfile = useStore((s) => s.settings.athleteProfile);
  const updateAthleteProfile = useStore((s) => s.updateAthleteProfile);
  const unit: AnthropometricsUnit = athleteProfile.anthropometricsUnit ?? 'metric';

  const [editing, setEditing] = useState<EditField | null>(null);
  const [drafts, setDrafts] = useState({
    name: athleteProfile.name ?? '',
    age: formatNumberInputValue(athleteProfile.age, 0),
    ftpWatts: formatNumberInputValue(athleteProfile.ftpWatts, 0),
    weightKg: getWeightDraft(athleteProfile.weightKg, unit),
  });
  const [errors, setErrors] = useState<FieldErrors>({});

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

  const seedDraftsFromStore = () =>
    setDrafts({
      name: athleteProfile.name ?? '',
      age: formatNumberInputValue(athleteProfile.age, 0),
      ftpWatts: formatNumberInputValue(athleteProfile.ftpWatts, 0),
      weightKg: getWeightDraft(athleteProfile.weightKg, unit),
    });

  const enterEdit = (field: EditField) => {
    seedDraftsFromStore();
    setErrors({});
    setEditing(field);
  };

  const cancelEdit = () => {
    seedDraftsFromStore();
    setErrors({});
    setEditing(null);
  };

  const commitName = () => {
    const trimmed = drafts.name.trim();
    updateAthleteProfile({ name: trimmed.length > 0 ? trimmed : undefined });
    setEditing(null);
  };

  const commitInteger = (
    key: 'age' | 'ftpWatts',
    options: { min?: number; max?: number }
  ) => {
    const draftValue = drafts[key];
    const fallback = athleteProfile[key];
    const parsed = parseDraftNumber(draftValue);

    if (parsed === null) {
      setDrafts((d) => ({ ...d, [key]: formatNumberInputValue(fallback, 0) }));
      setError(key, 'Enter a valid number.');
      return;
    }
    if (parsed === undefined) {
      updateAthleteProfile({ [key]: undefined } as Partial<AthleteProfile>);
      setError(key, undefined);
      setEditing(null);
      return;
    }
    const next = Math.round(parsed);
    const { min, max } = options;
    if ((min !== undefined && next < min) || (max !== undefined && next > max)) {
      setDrafts((d) => ({ ...d, [key]: formatNumberInputValue(fallback, 0) }));
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
    setDrafts((d) => ({ ...d, [key]: formatNumberInputValue(next, 0) }));
    setError(key, undefined);
    setEditing(null);
  };

  const commitWeight = () => {
    const parsed = parseDraftNumber(drafts.weightKg);
    const fallback = getWeightDraft(athleteProfile.weightKg, unit);

    if (parsed === null) {
      setDrafts((d) => ({ ...d, weightKg: fallback }));
      setError('weightKg', 'Enter a valid number.');
      return;
    }
    if (parsed === undefined) {
      updateAthleteProfile({ weightKg: undefined });
      setError('weightKg', undefined);
      setEditing(null);
      return;
    }
    if (parsed < 1) {
      setDrafts((d) => ({ ...d, weightKg: fallback }));
      setError('weightKg', 'Use a value ≥ 1.');
      return;
    }
    const nextKg = unit === 'imperial' ? poundsToKilograms(parsed) : parsed;
    updateAthleteProfile({ weightKg: nextKg });
    setDrafts((d) => ({ ...d, weightKg: formatNumberInputValue(parsed, 1) }));
    setError('weightKg', undefined);
    setEditing(null);
  };

  const commitField = (field: EditField) => {
    if (field === 'name') return commitName();
    if (field === 'age') return commitInteger('age', { min: 10, max: 120 });
    if (field === 'ftpWatts') return commitInteger('ftpWatts', { min: 1 });
    if (field === 'weightKg') return commitWeight();
  };

  const liveFtp = useMemo(() => {
    if (editing !== 'ftpWatts') return athleteProfile.ftpWatts;
    const parsed = parseDraftNumber(drafts.ftpWatts);
    if (parsed === null || parsed === undefined) return athleteProfile.ftpWatts;
    return Math.round(parsed);
  }, [editing, drafts.ftpWatts, athleteProfile.ftpWatts]);

  const liveWeightKg = useMemo(() => {
    if (editing !== 'weightKg') return athleteProfile.weightKg;
    const parsed = parseDraftNumber(drafts.weightKg);
    if (parsed === null || parsed === undefined) return athleteProfile.weightKg;
    if (parsed < 1) return athleteProfile.weightKg;
    return unit === 'imperial' ? poundsToKilograms(parsed) : parsed;
  }, [editing, drafts.weightKg, athleteProfile.weightKg, unit]);

  const wKg =
    typeof liveFtp === 'number' && typeof liveWeightKg === 'number' && liveWeightKg > 0
      ? roundTo(liveFtp / liveWeightKg, 2)
      : undefined;

  const nameDisplay = athleteProfile.name?.trim() || EMPTY;
  const ageDisplay = typeof athleteProfile.age === 'number' ? `${athleteProfile.age} yrs` : EMPTY;
  const ftpDisplay =
    typeof athleteProfile.ftpWatts === 'number' ? `${athleteProfile.ftpWatts} W` : EMPTY;
  const weightDisplay = formatWeightDisplay(athleteProfile.weightKg, unit) ?? EMPTY;

  return (
    <Section kicker="Athlete">
      <EditableValueRow
        field="name"
        label="Name"
        inputMode="text"
        placeholder="Ian"
        displayValue={nameDisplay}
        draft={drafts.name}
        onDraftChange={(value) => setDrafts((d) => ({ ...d, name: value }))}
        editing={editing === 'name'}
        onEnterEdit={() => enterEdit('name')}
        onCommit={() => commitField('name')}
        onCancel={cancelEdit}
      />
      <EditableValueRow
        field="age"
        label="Age"
        inputMode="numeric"
        placeholder="34"
        displayValue={ageDisplay}
        draft={drafts.age}
        onDraftChange={(value) => setDrafts((d) => ({ ...d, age: value }))}
        editing={editing === 'age'}
        onEnterEdit={() => enterEdit('age')}
        onCommit={() => commitField('age')}
        onCancel={cancelEdit}
        error={errors.age}
      />
      <EditableValueRow
        field="ftpWatts"
        label="FTP"
        inputMode="numeric"
        placeholder="280"
        displayValue={ftpDisplay}
        draft={drafts.ftpWatts}
        onDraftChange={(value) => setDrafts((d) => ({ ...d, ftpWatts: value }))}
        editing={editing === 'ftpWatts'}
        onEnterEdit={() => enterEdit('ftpWatts')}
        onCommit={() => commitField('ftpWatts')}
        onCancel={cancelEdit}
        error={errors.ftpWatts}
      />
      <EditableValueRow
        field="weightKg"
        label={unit === 'imperial' ? 'Weight (lb)' : 'Weight (kg)'}
        inputMode="decimal"
        placeholder={unit === 'imperial' ? '160' : '72'}
        displayValue={weightDisplay}
        draft={drafts.weightKg}
        onDraftChange={(value) => setDrafts((d) => ({ ...d, weightKg: value }))}
        editing={editing === 'weightKg'}
        onEnterEdit={() => enterEdit('weightKg')}
        onCommit={() => commitField('weightKg')}
        onCancel={cancelEdit}
        error={errors.weightKg}
      />
      <Row
        label="W/kg"
        control={
          <span
            aria-live="polite"
            className="text-base text-ink-900 [font-variant-numeric:tabular-nums]"
          >
            {typeof wKg === 'number' ? wKg.toFixed(2) : EMPTY}
          </span>
        }
      />
    </Section>
  );
}

interface EditableValueRowProps {
  field: EditField;
  label: ReactNode;
  inputMode: 'text' | 'numeric' | 'decimal';
  placeholder: string;
  displayValue: string;
  draft: string;
  onDraftChange: (value: string) => void;
  editing: boolean;
  onEnterEdit: () => void;
  onCommit: () => void;
  onCancel: () => void;
  error?: string;
}

function EditableValueRow({
  field,
  label,
  inputMode,
  placeholder,
  displayValue,
  draft,
  onDraftChange,
  editing,
  onEnterEdit,
  onCommit,
  onCancel,
  error,
}: EditableValueRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = FIELD_INPUT_ID[field];

  useEffect(() => {
    if (!editing) return;
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    if (field !== 'name') node.select?.();
  }, [editing, field]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onCommit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  const isEmpty = displayValue === EMPTY;

  const control = editing ? (
    <input
      ref={inputRef}
      id={inputId}
      type="text"
      inputMode={inputMode === 'text' ? undefined : inputMode}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => onDraftChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={handleKeyDown}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${inputId}-error` : undefined}
      className={clsx(
        'min-h-9 w-44 rounded-lg border bg-white px-2.5 py-1 text-base text-ink-900',
        '[font-variant-numeric:tabular-nums] placeholder:text-ink-400',
        'transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none',
        'focus:outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
        error
          ? 'border-error-500 bg-error-50 focus-visible:border-error-500 focus-visible:ring-error-200'
          : 'border-[color:var(--border-soft)]'
      )}
    />
  ) : (
    <button
      type="button"
      onClick={onEnterEdit}
      aria-label={`Edit ${typeof label === 'string' ? label.toLowerCase() : field}`}
      className={clsx(
        '-mx-2 flex min-h-9 w-44 items-center rounded-lg px-2 text-left text-base',
        '[font-variant-numeric:tabular-nums]',
        'transition-colors duration-150 ease-out motion-reduce:transition-none',
        'hover:bg-shell-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
        isEmpty ? 'text-ink-400' : 'text-ink-900'
      )}
    >
      {displayValue}
    </button>
  );

  return (
    <Row
      label={
        editing ? (
          <label htmlFor={inputId} className="cursor-pointer">
            {label}
          </label>
        ) : (
          label
        )
      }
      control={control}
      helper={
        error ? (
          <span id={`${inputId}-error`} className="text-error-700">
            {error}
          </span>
        ) : undefined
      }
    />
  );
}

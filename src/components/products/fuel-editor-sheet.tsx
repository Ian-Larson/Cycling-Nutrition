import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { clsx } from 'clsx';
import {
  Button,
  Dialog,
  DialogHeader,
  Input,
  Select,
  Toggle,
} from '@/components/ui';
import type { ConcentrationRange, Product, ProductType } from '@/types';

interface FuelEditorSheetProps {
  initialData?: Product;
  onSubmit: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const typeOptions: Array<{ value: ProductType; label: string }> = [
  { value: 'drink_mix', label: 'Drink mix' },
  { value: 'gel', label: 'Gel' },
  { value: 'chews', label: 'Chews' },
  { value: 'bar', label: 'Bar' },
  { value: 'other', label: 'Other' },
];

interface FormState {
  name: string;
  brand: string;
  type: ProductType;
  carbsGrams: string;
  calories: string;
  servingSizeGrams: string;
  scoopSizeGrams: string;
  concMin: string;
  concMax: string;
  isAvailable: boolean;
}

function makeInitialState(initialData: Product | undefined): FormState {
  return {
    name: initialData?.name ?? '',
    brand: initialData?.brand ?? '',
    type: initialData?.type ?? 'drink_mix',
    carbsGrams: initialData ? String(initialData.nutrition.carbsGrams) : '',
    calories: initialData ? String(initialData.nutrition.calories) : '',
    servingSizeGrams: initialData?.serving.servingSizeGrams
      ? String(initialData.serving.servingSizeGrams)
      : '',
    scoopSizeGrams: initialData?.serving.scoopSizeGrams
      ? String(initialData.serving.scoopSizeGrams)
      : '',
    concMin: initialData?.concentration?.minGPerMl
      ? String(initialData.concentration.minGPerMl)
      : '',
    concMax: initialData?.concentration?.maxGPerMl
      ? String(initialData.concentration.maxGPerMl)
      : '',
    isAvailable: initialData?.isAvailable ?? true,
  };
}

function parsePositive(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function suggestedCalories(carbsGrams: string, type: ProductType): number | null {
  const carbs = parsePositive(carbsGrams);
  if (carbs === null || carbs <= 0) return null;
  const ratio = type === 'drink_mix' ? 4 : 3.8;
  return Math.round(carbs * ratio);
}

function statesEqual(a: FormState, b: FormState): boolean {
  return (
    a.name === b.name &&
    a.brand === b.brand &&
    a.type === b.type &&
    a.carbsGrams === b.carbsGrams &&
    a.calories === b.calories &&
    a.servingSizeGrams === b.servingSizeGrams &&
    a.scoopSizeGrams === b.scoopSizeGrams &&
    a.concMin === b.concMin &&
    a.concMax === b.concMax &&
    a.isAvailable === b.isAvailable
  );
}

export function FuelEditorSheet({
  initialData,
  onSubmit,
  onCancel,
  onDelete,
}: FuelEditorSheetProps) {
  const titleId = useId();
  const triggerRef = useRef<Element | null>(null);
  const baseline = useMemo(() => makeInitialState(initialData), [initialData]);

  const [form, setForm] = useState<FormState>(baseline);
  const [errors, setErrors] = useState<{
    name?: string;
    carbs?: string;
    calories?: string;
    concMin?: string;
    concMax?: string;
  }>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showDirtyPrompt, setShowDirtyPrompt] = useState(false);
  const [autoCalApplied, setAutoCalApplied] = useState(false);

  // Capture the trigger element on mount so we can return focus on close.
  // Hand focus to the first field once the native dialog has finished grabbing it.
  useEffect(() => {
    triggerRef.current = document.activeElement;
    const rafId = window.requestAnimationFrame(() => {
      const el = document.getElementById('fuel-name') as HTMLInputElement | null;
      el?.focus();
      el?.select();
    });
    return () => {
      window.cancelAnimationFrame(rafId);
      const target = triggerRef.current;
      if (target instanceof HTMLElement) {
        window.setTimeout(() => target.focus(), 0);
      }
    };
  }, []);

  // Auto-clear delete confirm after 4s
  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = window.setTimeout(() => setConfirmingDelete(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmingDelete]);

  const isDrinkMix = form.type === 'drink_mix';
  const isEditing = initialData !== undefined;
  const isDirty = useMemo(
    () => !statesEqual(form, baseline),
    [form, baseline]
  );
  const calorieGhost = useMemo(
    () => suggestedCalories(form.carbsGrams, form.type),
    [form.carbsGrams, form.type]
  );
  const showAutoUse =
    !autoCalApplied && form.calories.trim() === '' && calorieGhost !== null;
  const showAutoClear =
    autoCalApplied && form.calories.trim() !== '';

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCarbsChange = (value: string) => {
    setForm((prev) => {
      if (autoCalApplied) {
        const next = { ...prev, carbsGrams: value };
        const recomputed = suggestedCalories(value, prev.type);
        next.calories = recomputed !== null ? String(recomputed) : '';
        return next;
      }
      return { ...prev, carbsGrams: value };
    });
    if (errors.carbs) setErrors((e) => ({ ...e, carbs: undefined }));
  };

  const handleTypeChange = (next: ProductType) => {
    setForm((prev) => {
      const updated: FormState = { ...prev, type: next };
      if (autoCalApplied) {
        const recomputed = suggestedCalories(prev.carbsGrams, next);
        updated.calories = recomputed !== null ? String(recomputed) : '';
      }
      if (next !== 'drink_mix') {
        // Clear drink-mix-only fields so they don't silently persist.
        updated.servingSizeGrams = '';
        updated.scoopSizeGrams = '';
        updated.concMin = '';
        updated.concMax = '';
      }
      return updated;
    });
  };

  const handleCaloriesChange = (value: string) => {
    setField('calories', value);
    if (autoCalApplied) setAutoCalApplied(false);
    if (errors.calories) setErrors((e) => ({ ...e, calories: undefined }));
  };

  const acceptAutoCalories = () => {
    if (calorieGhost === null) return;
    setField('calories', String(calorieGhost));
    setAutoCalApplied(true);
    if (errors.calories) setErrors((e) => ({ ...e, calories: undefined }));
  };

  const clearAutoCalories = () => {
    setField('calories', '');
    setAutoCalApplied(false);
  };

  const validate = (): {
    valid: boolean;
    next: typeof errors;
    payload?: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
  } => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Required.';

    const carbs = parsePositive(form.carbsGrams);
    if (carbs === null) next.carbs = 'Enter a number.';
    else if (carbs <= 0) next.carbs = 'Must be greater than 0.';

    const cals = parsePositive(form.calories);
    if (cals === null) next.calories = 'Enter a number.';
    else if (cals < 0) next.calories = 'Must be 0 or greater.';

    let minVal: number | undefined;
    let maxVal: number | undefined;
    if (isDrinkMix) {
      if (form.concMin.trim()) {
        const parsed = parsePositive(form.concMin);
        if (parsed === null || parsed < 0)
          next.concMin = 'Enter a non-negative number.';
        else minVal = parsed;
      }
      if (form.concMax.trim()) {
        const parsed = parsePositive(form.concMax);
        if (parsed === null || parsed < 0)
          next.concMax = 'Enter a non-negative number.';
        else maxVal = parsed;
      }
      if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
        next.concMax = 'Max must be at least min.';
      }
    }

    if (Object.keys(next).length > 0) {
      return { valid: false, next };
    }

    const concentration: ConcentrationRange | undefined =
      isDrinkMix && (minVal !== undefined || maxVal !== undefined)
        ? { minGPerMl: minVal, maxGPerMl: maxVal }
        : undefined;

    return {
      valid: true,
      next,
      payload: {
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        type: form.type,
        isAvailable: form.isAvailable,
        nutrition: {
          carbsGrams: carbs as number,
          calories: cals as number,
        },
        serving: {
          servingSizeGrams: form.servingSizeGrams
            ? Number(form.servingSizeGrams)
            : undefined,
          scoopSizeGrams: form.scoopSizeGrams
            ? Number(form.scoopSizeGrams)
            : undefined,
        },
        ...(concentration ? { concentration } : {}),
      },
    };
  };

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    const result = validate();
    if (!result.valid || !result.payload) {
      setErrors(result.next);
      return;
    }
    setErrors({});
    onSubmit(result.payload);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
  };

  const attemptClose = () => {
    if (!isDirty || showDirtyPrompt) {
      onCancel();
      return;
    }
    setShowDirtyPrompt(true);
  };

  const dialogTitle = isEditing ? `Edit ${initialData!.name}` : 'Add fuel';

  return (
    <Dialog
      open
      onClose={attemptClose}
      size="xl"
      bare
      ariaLabelledBy={titleId}
      className="flex max-h-[88vh] flex-col overflow-hidden md:max-h-[80vh] md:max-w-[34rem]"
    >
      <DialogHeader
        title={dialogTitle}
        titleId={titleId}
        onClose={attemptClose}
        className="shrink-0 border-b border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 md:px-6 md:py-3.5"
      />


      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-5">
          <div className="space-y-3.5 md:space-y-4">
            <div className="grid gap-3 md:grid-cols-2 md:gap-3.5">
              <Input
                id="fuel-name"
                label="Fuel name"
                placeholder="Maurten 320"
                value={form.name}
                onChange={(e) => {
                  setField('name', e.target.value);
                  if (errors.name) setErrors((er) => ({ ...er, name: undefined }));
                }}
                required
                error={errors.name}
              />
              <Input
                id="fuel-brand"
                label="Brand"
                placeholder="Maurten"
                value={form.brand}
                onChange={(e) => setField('brand', e.target.value)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 md:items-end md:gap-3.5">
              <Select
                id="fuel-type"
                label="Type"
                options={typeOptions}
                value={form.type}
                onChange={(e) => handleTypeChange(e.target.value as ProductType)}
              />
              <div className="flex h-12 items-center justify-between gap-3 rounded-xl border border-[color:var(--border-soft)] bg-white px-3.5 md:h-11">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">Available</p>
                  <p className="text-xs leading-4 text-ink-500">Use in planning.</p>
                </div>
                <Toggle
                  checked={form.isAvailable}
                  onChange={(checked) => setField('isAvailable', checked)}
                  label="Fuel availability"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 md:gap-3.5">
              <Input
                id="fuel-carbs"
                label="Carbs (g)"
                type="number"
                inputMode="decimal"
                placeholder="80"
                value={form.carbsGrams}
                onChange={(e) => handleCarbsChange(e.target.value)}
                required
                min="0.1"
                step="0.1"
                error={errors.carbs}
              />
              <div>
                <Input
                  id="fuel-cal"
                  label="Calories"
                  type="number"
                  inputMode="numeric"
                  placeholder="320"
                  value={form.calories}
                  onChange={(e) => handleCaloriesChange(e.target.value)}
                  required
                  min="0"
                  error={errors.calories}
                />
                {showAutoUse && (
                  <button
                    type="button"
                    onClick={acceptAutoCalories}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-shell-200 px-2.5 py-1 text-xs font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 motion-reduce:transition-none"
                  >
                    <span className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-ink-500">
                      auto
                    </span>
                    <span className="tabular-nums">{calorieGhost} kcal</span>
                    <span className="text-ink-500">·</span>
                    <span className="text-brand-700">use</span>
                  </button>
                )}
                {showAutoClear && (
                  <button
                    type="button"
                    onClick={clearAutoCalories}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 transition-colors hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 motion-reduce:transition-none"
                  >
                    <span className="text-[0.66rem] font-semibold uppercase tracking-[0.04em]">
                      auto
                    </span>
                    <span className="text-brand-700">·</span>
                    <span>clear</span>
                  </button>
                )}
              </div>
            </div>

            <div
              className="grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none"
              style={{ gridTemplateRows: isDrinkMix ? '1fr' : '0fr' }}
              aria-hidden={!isDrinkMix}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="surface-note space-y-3 px-3.5 py-3.5 md:px-4 md:py-4">
                  <p className="section-kicker text-[0.66rem]">Drink mix details</p>
                  <div className="grid gap-3 md:grid-cols-2 md:gap-3.5">
                    <Input
                      id="fuel-serving"
                      label="Serving size (g)"
                      type="number"
                      inputMode="decimal"
                      placeholder="80"
                      value={form.servingSizeGrams}
                      onChange={(e) => setField('servingSizeGrams', e.target.value)}
                      min="0"
                      disabled={!isDrinkMix}
                    />
                    <Input
                      id="fuel-scoop"
                      label="Scoop (g)"
                      type="number"
                      inputMode="decimal"
                      placeholder="40"
                      value={form.scoopSizeGrams}
                      onChange={(e) => setField('scoopSizeGrams', e.target.value)}
                      min="0"
                      disabled={!isDrinkMix}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 md:gap-3.5">
                    <Input
                      id="fuel-conc-min"
                      label="Min concentration (g/ml)"
                      type="number"
                      inputMode="decimal"
                      placeholder="0.06"
                      value={form.concMin}
                      onChange={(e) => {
                        setField('concMin', e.target.value);
                        if (errors.concMin)
                          setErrors((er) => ({ ...er, concMin: undefined }));
                      }}
                      min="0"
                      max="0.16"
                      step="0.01"
                      error={errors.concMin}
                      disabled={!isDrinkMix}
                    />
                    <Input
                      id="fuel-conc-max"
                      label="Max concentration (g/ml)"
                      type="number"
                      inputMode="decimal"
                      placeholder="0.10"
                      value={form.concMax}
                      onChange={(e) => {
                        setField('concMax', e.target.value);
                        if (errors.concMax)
                          setErrors((er) => ({ ...er, concMax: undefined }));
                      }}
                      min="0"
                      max="0.16"
                      step="0.01"
                      error={errors.concMax}
                      disabled={!isDrinkMix}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <FuelEditorFooter
          isEditing={isEditing}
          showDirtyPrompt={showDirtyPrompt}
          confirmingDelete={confirmingDelete}
          onSubmit={() => handleSubmit()}
          onCancelClick={attemptClose}
          onDiscard={onCancel}
          onKeepEditing={() => setShowDirtyPrompt(false)}
          onDeleteRequest={() => setConfirmingDelete(true)}
          onDeleteConfirm={onDelete}
        />
      </form>
    </Dialog>
  );
}

interface FuelEditorFooterProps {
  isEditing: boolean;
  showDirtyPrompt: boolean;
  confirmingDelete: boolean;
  onSubmit: () => void;
  onCancelClick: () => void;
  onDiscard: () => void;
  onKeepEditing: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: (() => void) | undefined;
}

function FuelEditorFooter({
  isEditing,
  showDirtyPrompt,
  confirmingDelete,
  onSubmit,
  onCancelClick,
  onDiscard,
  onKeepEditing,
  onDeleteRequest,
  onDeleteConfirm,
}: FuelEditorFooterProps) {
  if (showDirtyPrompt) {
    return (
      <div
        role="alertdialog"
        aria-label="Discard unsaved changes"
        className="shrink-0 border-t border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 md:px-6 md:py-3.5"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-ink-900">
            Discard unsaved changes?
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onKeepEditing}
            >
              Keep editing
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={onDiscard}
            >
              Discard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 md:px-6 md:py-3.5">
      <div
        className={clsx(
          'flex items-center gap-2',
          isEditing ? 'justify-between' : 'justify-end'
        )}
      >
        {isEditing && onDeleteConfirm && (
          <div className="flex">
            {confirmingDelete ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={onDeleteConfirm}
                className="relative overflow-hidden"
              >
                Confirm?
                <span className="absolute bottom-0 left-0 h-0.5 bg-white/50 animate-[shrink_4s_linear_forwards]" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDeleteRequest}
                className="text-error-700 hover:bg-error-50"
              >
                Delete
              </Button>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancelClick}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onSubmit}>
            {isEditing ? 'Save changes' : 'Save fuel'}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { Button, Checkbox, Input, Select } from '@/components/ui';
import { GEAR_PART_CATEGORIES } from '@/lib/gear/constants';
import type {
  GearPartCatalogItem,
  GearPartCategory,
  GearPartAttributes,
} from '@/types/gear';

type CatalogPayload = Omit<
  GearPartCatalogItem,
  'id' | 'createdAt' | 'updatedAt'
>;

interface PartCatalogFormProps {
  onSubmit: (payload: CatalogPayload) => void;
  onCancel: () => void;
  initialCategory?: GearPartCategory;
}

type ErrorKey =
  | 'model'
  | 'weightGrams'
  | 'tireWidthMm'
  | 'chainSpeedCount'
  | 'cassetteRange'
  | 'cassetteSpeedCount'
  | 'chainringToothCount';

type FormErrors = Partial<Record<ErrorKey, string>>;

const categoryOptions = GEAR_PART_CATEGORIES.map((category) => ({
  value: category.key,
  label: category.label,
}));

function parseOptionalNumber(
  value: string,
  key: ErrorKey,
  label: string,
  errors: FormErrors,
  options: { integer?: boolean; positive?: boolean; nonNegative?: boolean } = {}
): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    errors[key] = `${label} must be a number.`;
    return undefined;
  }

  if (options.integer && !Number.isInteger(parsed)) {
    errors[key] = `${label} must be a whole number.`;
    return undefined;
  }

  if (options.positive && parsed <= 0) {
    errors[key] = `${label} must be greater than 0.`;
    return undefined;
  }

  if (options.nonNegative && parsed < 0) {
    errors[key] = `${label} cannot be negative.`;
    return undefined;
  }

  return parsed;
}

function parseRequiredNumber(
  value: string,
  key: ErrorKey,
  label: string,
  errors: FormErrors,
  options: { integer?: boolean; positive?: boolean } = {}
): number | undefined {
  if (!value.trim()) {
    errors[key] = `${label} is required.`;
    return undefined;
  }

  return parseOptionalNumber(value, key, label, errors, options);
}

export function PartCatalogForm({
  onSubmit,
  onCancel,
  initialCategory = 'chain',
}: PartCatalogFormProps) {
  const [category, setCategory] = useState<GearPartCategory>(initialCategory);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [notes, setNotes] = useState('');

  const [tireWidthMm, setTireWidthMm] = useState('');
  const [tireDiameter, setTireDiameter] = useState('');
  const [tireTubelessReady, setTireTubelessReady] = useState(false);

  const [chainSpeedCount, setChainSpeedCount] = useState('');

  const [brakeCompound, setBrakeCompound] = useState('');
  const [brakePadShape, setBrakePadShape] = useState('');

  const [cassetteRange, setCassetteRange] = useState('');
  const [cassetteSpeedCount, setCassetteSpeedCount] = useState('');

  const [chainringToothCount, setChainringToothCount] = useState('');
  const [chainringPosition, setChainringPosition] = useState('');
  const [chainringMount, setChainringMount] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    const trimmedModel = model.trim();
    const parsedWeight = parseOptionalNumber(
      weightGrams,
      'weightGrams',
      'Weight',
      nextErrors,
      { nonNegative: true }
    );

    if (!trimmedModel) {
      nextErrors.model = 'Model is required.';
    }

    let attributes: GearPartAttributes | null = null;

    if (category === 'chain') {
      const speedCount = parseOptionalNumber(
        chainSpeedCount,
        'chainSpeedCount',
        'Speed count',
        nextErrors,
        { integer: true, positive: true }
      );
      attributes = {
        category,
        ...(speedCount ? { speedCount } : {}),
      };
    }

    if (category === 'tire') {
      const widthMm = parseRequiredNumber(
        tireWidthMm,
        'tireWidthMm',
        'Tire width',
        nextErrors,
        { positive: true }
      );
      attributes = {
        category,
        widthMm: widthMm ?? 0,
        ...(tireDiameter.trim() ? { diameter: tireDiameter.trim() } : {}),
        ...(tireTubelessReady ? { tubelessReady: true } : {}),
      };
    }

    if (category === 'brake_pad') {
      attributes = {
        category,
        ...(brakeCompound.trim() ? { compound: brakeCompound.trim() } : {}),
        ...(brakePadShape.trim() ? { padShape: brakePadShape.trim() } : {}),
      };
    }

    if (category === 'cassette') {
      const speedCount = parseOptionalNumber(
        cassetteSpeedCount,
        'cassetteSpeedCount',
        'Speed count',
        nextErrors,
        { integer: true, positive: true }
      );

      if (!cassetteRange.trim()) {
        nextErrors.cassetteRange = 'Range is required.';
      }

      attributes = {
        category,
        range: cassetteRange.trim(),
        ...(speedCount ? { speedCount } : {}),
      };
    }

    if (category === 'chainring') {
      const toothCount = parseRequiredNumber(
        chainringToothCount,
        'chainringToothCount',
        'Tooth count',
        nextErrors,
        { integer: true, positive: true }
      );
      attributes = {
        category,
        toothCount: toothCount ?? 0,
        ...(chainringPosition.trim()
          ? { position: chainringPosition.trim() }
          : {}),
        ...(chainringMount.trim() ? { mount: chainringMount.trim() } : {}),
      };
    }

    if (Object.keys(nextErrors).length > 0 || !attributes) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    onSubmit({
      category,
      model: trimmedModel,
      brand: brand.trim() || undefined,
      weightGrams: parsedWeight,
      attributes,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
      <Select
        id="part-category"
        label="Category"
        options={categoryOptions}
        value={category}
        onChange={(event) => {
          setCategory(event.target.value as GearPartCategory);
          setErrors({});
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
        <Input
          id="part-brand"
          label="Brand"
          placeholder="e.g., Shimano"
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
        />
        <Input
          id="part-model"
          label="Model"
          placeholder="e.g., Ultegra CN-M8100"
          value={model}
          onChange={(event) => setModel(event.target.value)}
          error={errors.model}
          required
        />
      </div>

      <Input
        id="part-weight"
        label="Weight (g)"
        type="number"
        min="0"
        step="0.1"
        placeholder="Optional"
        value={weightGrams}
        onChange={(event) => setWeightGrams(event.target.value)}
        error={errors.weightGrams}
      />

      {category === 'chain' ? (
        <Input
          id="part-chain-speed"
          label="Speed count"
          type="number"
          min="1"
          step="1"
          placeholder="e.g., 12"
          value={chainSpeedCount}
          onChange={(event) => setChainSpeedCount(event.target.value)}
          error={errors.chainSpeedCount}
        />
      ) : null}

      {category === 'tire' ? (
        <div className="space-y-3 md:space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
            <Input
              id="part-tire-width"
              label="Width (mm)"
              type="number"
              min="1"
              step="0.1"
              placeholder="e.g., 28"
              value={tireWidthMm}
              onChange={(event) => setTireWidthMm(event.target.value)}
              error={errors.tireWidthMm}
              required
            />
            <Input
              id="part-tire-diameter"
              label="Diameter"
              placeholder="e.g., 700c"
              value={tireDiameter}
              onChange={(event) => setTireDiameter(event.target.value)}
            />
          </div>
          <label className="surface-note flex items-center justify-between gap-3 px-3.5 py-3 md:px-4">
            <span>
              <span className="block font-semibold text-ink-900">
                Tubeless ready
              </span>
              <span className="block text-sm leading-5 text-ink-600">
                Mark tires that can run tubeless.
              </span>
            </span>
            <Checkbox
              checked={tireTubelessReady}
              onChange={setTireTubelessReady}
              aria-label="Tubeless ready"
            />
          </label>
        </div>
      ) : null}

      {category === 'brake_pad' ? (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
          <Input
            id="part-pad-compound"
            label="Compound"
            placeholder="e.g., resin"
            value={brakeCompound}
            onChange={(event) => setBrakeCompound(event.target.value)}
          />
          <Input
            id="part-pad-shape"
            label="Pad shape"
            placeholder="e.g., K05S"
            value={brakePadShape}
            onChange={(event) => setBrakePadShape(event.target.value)}
          />
        </div>
      ) : null}

      {category === 'cassette' ? (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
          <Input
            id="part-cassette-range"
            label="Range"
            placeholder="e.g., 10-33"
            value={cassetteRange}
            onChange={(event) => setCassetteRange(event.target.value)}
            error={errors.cassetteRange}
            required
          />
          <Input
            id="part-cassette-speed"
            label="Speed count"
            type="number"
            min="1"
            step="1"
            placeholder="e.g., 12"
            value={cassetteSpeedCount}
            onChange={(event) => setCassetteSpeedCount(event.target.value)}
            error={errors.cassetteSpeedCount}
          />
        </div>
      ) : null}

      {category === 'chainring' ? (
        <div className="space-y-3 md:space-y-4">
          <Input
            id="part-chainring-teeth"
            label="Tooth count"
            type="number"
            min="1"
            step="1"
            placeholder="e.g., 50"
            value={chainringToothCount}
            onChange={(event) => setChainringToothCount(event.target.value)}
            error={errors.chainringToothCount}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
            <Input
              id="part-chainring-position"
              label="Position"
              placeholder="e.g., outer"
              value={chainringPosition}
              onChange={(event) => setChainringPosition(event.target.value)}
            />
            <Input
              id="part-chainring-mount"
              label="Mount"
              placeholder="e.g., 110 BCD"
              value={chainringMount}
              onChange={(event) => setChainringMount(event.target.value)}
            />
          </div>
        </div>
      ) : null}

      <Input
        id="part-notes"
        label="Notes"
        placeholder="Optional fit notes or source"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="w-full sm:w-auto">
          Add catalog part
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

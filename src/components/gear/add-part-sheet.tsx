import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { clsx } from 'clsx';
import { Button, Checkbox, Input, Select } from '@/components/ui';
import { GEAR_PART_CATEGORIES } from '@/lib/gear/constants';
import { findCatalogMatch } from '@/lib/gear/catalog-upsert';
import { useStore } from '@/store';
import type {
  GearPartAttributes,
  GearPartCategory,
  GearPartInstanceStatus,
} from '@/types/gear';

interface AddPartSheetProps {
  open: boolean;
  onClose: () => void;
  instanceId?: string | null;
}

type ErrorKey =
  | 'model'
  | 'weightGrams'
  | 'tireWidthMm'
  | 'chainSpeedCount'
  | 'cassetteRange'
  | 'cassetteSpeedCount'
  | 'chainringOuterRing'
  | 'chainringInnerRing'
  | 'quantity'
  | 'initialMileageMi';

type FormErrors = Partial<Record<ErrorKey, string>>;

const categoryOptions = GEAR_PART_CATEGORIES.map((category) => ({
  value: category.key,
  label: category.label,
}));

const statusOptions: Array<{
  value: GearPartInstanceStatus;
  label: string;
}> = [
  { value: 'spare', label: 'Spare' },
  { value: 'installed', label: 'Installed' },
  { value: 'removed', label: 'Removed' },
  { value: 'retired', label: 'Retired' },
];

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

export function AddPartSheet({ open, onClose, instanceId }: AddPartSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={clsx(
        'm-0 mt-auto w-full max-w-none rounded-t-2xl bg-white p-4 shadow-xl',
        'md:m-auto md:max-w-lg md:rounded-2xl md:p-6',
        'backdrop:bg-black/40 backdrop:backdrop-blur-sm'
      )}
    >
      {open ? (
        <AddPartForm key={instanceId ?? 'new'} instanceId={instanceId ?? null} onClose={onClose} />
      ) : null}
    </dialog>
  );
}

interface AddPartFormProps {
  instanceId: string | null;
  onClose: () => void;
}

function AddPartForm({ instanceId, onClose }: AddPartFormProps) {
  const catalog = useStore((s) => s.gearPartCatalog);
  const instances = useStore((s) => s.gearPartInstances);
  const addGearPartCatalogItem = useStore((s) => s.addGearPartCatalogItem);
  const updateGearPartCatalogItem = useStore((s) => s.updateGearPartCatalogItem);
  const addGearPartInstances = useStore((s) => s.addGearPartInstances);
  const updateGearPartInstance = useStore((s) => s.updateGearPartInstance);

  const editing = useMemo(
    () => (instanceId ? instances.find((i) => i.id === instanceId) ?? null : null),
    [instanceId, instances]
  );
  const editingCatalog = useMemo(
    () =>
      editing ? catalog.find((c) => c.id === editing.catalogItemId) ?? null : null,
    [catalog, editing]
  );
  const isEdit = editing !== null && editingCatalog !== null;

  const [category, setCategory] = useState<GearPartCategory>(
    editingCatalog?.category ?? 'chain'
  );
  const [brand, setBrand] = useState(editingCatalog?.brand ?? '');
  const [model, setModel] = useState(editingCatalog?.model ?? '');
  const [weightGrams, setWeightGrams] = useState(
    editingCatalog?.weightGrams !== undefined
      ? String(editingCatalog.weightGrams)
      : ''
  );

  const chainAttrs =
    editingCatalog?.attributes.category === 'chain' ? editingCatalog.attributes : null;
  const [chainSpeedCount, setChainSpeedCount] = useState(
    chainAttrs?.speedCount !== undefined ? String(chainAttrs.speedCount) : ''
  );

  const tireAttrs =
    editingCatalog?.attributes.category === 'tire' ? editingCatalog.attributes : null;
  const [tireWidthMm, setTireWidthMm] = useState(
    tireAttrs?.widthMm !== undefined ? String(tireAttrs.widthMm) : ''
  );
  const [tireDiameter, setTireDiameter] = useState(tireAttrs?.diameter ?? '');
  const [tireTubelessReady, setTireTubelessReady] = useState(
    tireAttrs?.tubelessReady ?? false
  );

  const padAttrs =
    editingCatalog?.attributes.category === 'brake_pad' ? editingCatalog.attributes : null;
  const [brakeCompound, setBrakeCompound] = useState(padAttrs?.compound ?? '');
  const [brakePadShape, setBrakePadShape] = useState(padAttrs?.padShape ?? '');

  const cassetteAttrs =
    editingCatalog?.attributes.category === 'cassette' ? editingCatalog.attributes : null;
  const [cassetteRange, setCassetteRange] = useState(cassetteAttrs?.range ?? '');
  const [cassetteSpeedCount, setCassetteSpeedCount] = useState(
    cassetteAttrs?.speedCount !== undefined ? String(cassetteAttrs.speedCount) : ''
  );

  const chainringAttrs =
    editingCatalog?.attributes.category === 'chainring' ? editingCatalog.attributes : null;
  const [chainringDrivetrainType, setChainringDrivetrainType] = useState<'1x' | '2x'>(
    chainringAttrs?.drivetrainType ?? '1x'
  );
  const [chainringOuterRing, setChainringOuterRing] = useState(
    chainringAttrs?.outerRing !== undefined ? String(chainringAttrs.outerRing) : ''
  );
  const [chainringInnerRing, setChainringInnerRing] = useState(
    chainringAttrs?.innerRing !== undefined ? String(chainringAttrs.innerRing) : ''
  );

  const [quantity, setQuantity] = useState('1');
  const [label, setLabel] = useState(editing?.label ?? '');
  const [acquiredDateIso, setAcquiredDateIso] = useState(
    editing?.acquiredDateIso ?? ''
  );
  const [initialMileageMi, setInitialMileageMi] = useState(
    editing?.initialMileageMi !== undefined
      ? String(editing.initialMileageMi)
      : ''
  );
  const [status, setStatus] = useState<GearPartInstanceStatus>(
    editing?.status ?? 'spare'
  );
  const [notes, setNotes] = useState(editing?.notes ?? editingCatalog?.notes ?? '');
  const [errors, setErrors] = useState<FormErrors>({});

  const brandSuggestions = useMemo(() => {
    if (!brand.trim()) return [];
    const q = brand.trim().toLowerCase();
    return Array.from(
      new Set(
        catalog
          .filter((item) => item.category === category && item.brand)
          .map((item) => item.brand as string)
          .filter((b) => b.toLowerCase().includes(q) && b.toLowerCase() !== q)
      )
    ).slice(0, 5);
  }, [brand, catalog, category]);

  const modelSuggestions = useMemo(() => {
    if (!model.trim()) return [];
    const q = model.trim().toLowerCase();
    return catalog
      .filter(
        (item) =>
          item.category === category &&
          item.model.toLowerCase().includes(q) &&
          item.model.toLowerCase() !== q
      )
      .slice(0, 5);
  }, [model, catalog, category]);

  const applySuggestion = (catalogId: string) => {
    const hit = catalog.find((item) => item.id === catalogId);
    if (!hit) return;
    setBrand(hit.brand ?? '');
    setModel(hit.model);
    setWeightGrams(hit.weightGrams !== undefined ? String(hit.weightGrams) : '');
    if (hit.attributes.category === 'chain') {
      setChainSpeedCount(
        hit.attributes.speedCount !== undefined ? String(hit.attributes.speedCount) : ''
      );
    }
    if (hit.attributes.category === 'tire') {
      setTireWidthMm(String(hit.attributes.widthMm));
      setTireDiameter(hit.attributes.diameter ?? '');
      setTireTubelessReady(hit.attributes.tubelessReady ?? false);
    }
    if (hit.attributes.category === 'brake_pad') {
      setBrakeCompound(hit.attributes.compound ?? '');
      setBrakePadShape(hit.attributes.padShape ?? '');
    }
    if (hit.attributes.category === 'cassette') {
      setCassetteRange(hit.attributes.range);
      setCassetteSpeedCount(
        hit.attributes.speedCount !== undefined ? String(hit.attributes.speedCount) : ''
      );
    }
    if (hit.attributes.category === 'chainring') {
      setChainringDrivetrainType(hit.attributes.drivetrainType);
      setChainringOuterRing(String(hit.attributes.outerRing));
      setChainringInnerRing(hit.attributes.innerRing !== undefined ? String(hit.attributes.innerRing) : '');
    }
  };

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
    if (!trimmedModel) nextErrors.model = 'Model is required.';

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
      const outerRing = parseRequiredNumber(
        chainringOuterRing,
        'chainringOuterRing',
        chainringDrivetrainType === '1x' ? 'Ring size' : 'Outer ring',
        nextErrors,
        { integer: true, positive: true }
      );
      const innerRing =
        chainringDrivetrainType === '2x'
          ? parseRequiredNumber(
              chainringInnerRing,
              'chainringInnerRing',
              'Inner ring',
              nextErrors,
              { integer: true, positive: true }
            )
          : undefined;
      attributes = {
        category,
        drivetrainType: chainringDrivetrainType,
        outerRing: outerRing ?? 0,
        ...(innerRing ? { innerRing } : {}),
      };
    }

    let parsedQuantity = 1;
    if (!isEdit) {
      parsedQuantity = Number(quantity);
      if (
        !quantity.trim() ||
        !Number.isInteger(parsedQuantity) ||
        parsedQuantity <= 0
      ) {
        nextErrors.quantity = 'Quantity must be a positive whole number.';
      }
    }

    const parsedInitialMileageMi = parseOptionalNumber(
      initialMileageMi,
      'initialMileageMi',
      'Starting mileage',
      nextErrors,
      { nonNegative: true }
    );

    if (Object.keys(nextErrors).length > 0 || !attributes) {
      setErrors(nextErrors);
      return;
    }

    const spec = {
      category,
      brand: brand.trim() || undefined,
      model: trimmedModel,
      weightGrams: parsedWeight,
      attributes,
      notes: notes.trim() || undefined,
    };

    if (isEdit && editing && editingCatalog) {
      const sameCatalogRow = findCatalogMatch([editingCatalog], spec);
      if (sameCatalogRow) {
        updateGearPartInstance(editing.id, {
          label: label.trim() || undefined,
          status,
          acquiredDateIso: acquiredDateIso || undefined,
          initialMileageMi: parsedInitialMileageMi,
          notes: notes.trim() || undefined,
        });
      } else {
        const siblings = instances.filter(
          (i) => i.catalogItemId === editingCatalog.id && i.id !== editing.id
        );
        if (siblings.length === 0) {
          updateGearPartCatalogItem(editingCatalog.id, {
            brand: spec.brand,
            model: spec.model,
            weightGrams: spec.weightGrams,
            attributes: spec.attributes,
            notes: spec.notes,
          });
          updateGearPartInstance(editing.id, {
            label: label.trim() || undefined,
            status,
            acquiredDateIso: acquiredDateIso || undefined,
            notes: notes.trim() || undefined,
          });
        } else {
          const match = findCatalogMatch(catalog, spec);
          const targetId = match?.id ?? addGearPartCatalogItem(spec);
          updateGearPartInstance(editing.id, {
            catalogItemId: targetId,
            label: label.trim() || undefined,
            status,
            acquiredDateIso: acquiredDateIso || undefined,
            initialMileageMi: parsedInitialMileageMi,
            notes: notes.trim() || undefined,
          });
        }
      }
      onClose();
      return;
    }

    const match = findCatalogMatch(catalog, spec);
    const targetId = match?.id ?? addGearPartCatalogItem(spec);
    const ids = addGearPartInstances({
      catalogItemId: targetId,
      quantity: parsedQuantity,
      labelPrefix: label.trim() || undefined,
      acquiredDateIso: acquiredDateIso || undefined,
      initialMileageMi: parsedInitialMileageMi,
      notes: notes.trim() || undefined,
    });
    if (status !== 'spare') {
      for (const id of ids) {
        updateGearPartInstance(id, { status });
      }
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            {isEdit ? 'Edit part' : 'Add part'}
          </h2>
          <p className="text-sm leading-5 text-ink-600">
            {isEdit
              ? 'Update spec or physical details. Category is fixed after creation.'
              : 'Log a physical part. Catalog entries are reused automatically.'}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <section className="space-y-3">
        <p className="section-kicker text-[0.68rem] text-ink-500">Category</p>
        <Select
          id="add-part-category"
          label="Category"
          options={categoryOptions}
          value={category}
          disabled={isEdit}
          onChange={(event) => {
            setCategory(event.target.value as GearPartCategory);
            setErrors({});
          }}
        />
      </section>

      <section className="space-y-3">
        <p className="section-kicker text-[0.68rem] text-ink-500">Spec</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Input
              id="add-part-brand"
              label="Brand"
              placeholder="e.g., Shimano"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
            />
            {brandSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {brandSuggestions.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBrand(b)}
                    className="rounded-full border border-[color:var(--border-soft)] bg-shell-50 px-2 py-0.5 text-xs text-ink-700 hover:bg-shell-100"
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Input
              id="add-part-model"
              label="Model"
              placeholder="e.g., Ultegra CN-M8100"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              error={errors.model}
              required
            />
            {modelSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {modelSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applySuggestion(item.id)}
                    className="rounded-full border border-[color:var(--border-soft)] bg-shell-50 px-2 py-0.5 text-xs text-ink-700 hover:bg-shell-100"
                  >
                    {item.brand ? `${item.brand} ${item.model}` : item.model}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <Input
          id="add-part-weight"
          label="Weight (g)"
          type="number"
          min="0"
          step="0.1"
          placeholder="Optional"
          value={weightGrams}
          onChange={(event) => setWeightGrams(event.target.value)}
          error={errors.weightGrams}
        />

        {category === 'chain' && (
          <Input
            id="add-part-chain-speed"
            label="Speed count"
            type="number"
            min="1"
            step="1"
            placeholder="e.g., 12"
            value={chainSpeedCount}
            onChange={(event) => setChainSpeedCount(event.target.value)}
            error={errors.chainSpeedCount}
          />
        )}

        {category === 'tire' && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                id="add-part-tire-width"
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
                id="add-part-tire-diameter"
                label="Diameter"
                placeholder="e.g., 700c"
                value={tireDiameter}
                onChange={(event) => setTireDiameter(event.target.value)}
              />
            </div>
            <label className="surface-note flex items-center justify-between gap-3 px-3.5 py-3">
              <span>
                <span className="block font-semibold text-ink-900">Tubeless ready</span>
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
        )}

        {category === 'brake_pad' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="add-part-pad-compound"
              label="Compound"
              placeholder="e.g., resin"
              value={brakeCompound}
              onChange={(event) => setBrakeCompound(event.target.value)}
            />
            <Input
              id="add-part-pad-shape"
              label="Pad shape"
              placeholder="e.g., K05S"
              value={brakePadShape}
              onChange={(event) => setBrakePadShape(event.target.value)}
            />
          </div>
        )}

        {category === 'cassette' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="add-part-cassette-range"
              label="Range"
              placeholder="e.g., 10-33"
              value={cassetteRange}
              onChange={(event) => setCassetteRange(event.target.value)}
              error={errors.cassetteRange}
              required
            />
            <Input
              id="add-part-cassette-speed"
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
        )}

        {category === 'chainring' && (
          <div className="space-y-3">
            <Select
              id="add-part-chainring-drivetrain"
              label="Drivetrain"
              options={[
                { value: '1x', label: '1× (single ring)' },
                { value: '2x', label: '2× (double ring)' },
              ]}
              value={chainringDrivetrainType}
              onChange={(event) => {
                setChainringDrivetrainType(event.target.value as '1x' | '2x');
                setChainringInnerRing('');
              }}
            />
            {chainringDrivetrainType === '1x' ? (
              <Input
                id="add-part-chainring-outer"
                label="Ring size (T)"
                type="number"
                min="1"
                step="1"
                placeholder="e.g., 40"
                value={chainringOuterRing}
                onChange={(event) => setChainringOuterRing(event.target.value)}
                error={errors.chainringOuterRing}
                required
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="add-part-chainring-outer"
                  label="Outer ring (T)"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g., 48"
                  value={chainringOuterRing}
                  onChange={(event) => setChainringOuterRing(event.target.value)}
                  error={errors.chainringOuterRing}
                  required
                />
                <Input
                  id="add-part-chainring-inner"
                  label="Inner ring (T)"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g., 35"
                  value={chainringInnerRing}
                  onChange={(event) => setChainringInnerRing(event.target.value)}
                  error={errors.chainringInnerRing}
                  required
                />
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <p className="section-kicker text-[0.68rem] text-ink-500">Physical details</p>
        {!isEdit && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="add-part-quantity"
              label="Quantity"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              error={errors.quantity}
              required
            />
            <Input
              id="add-part-acquired"
              label="Acquired date"
              type="date"
              value={acquiredDateIso}
              onChange={(event) => setAcquiredDateIso(event.target.value)}
            />
          </div>
        )}
        {isEdit && (
          <Input
            id="add-part-acquired"
            label="Acquired date"
            type="date"
            value={acquiredDateIso}
            onChange={(event) => setAcquiredDateIso(event.target.value)}
          />
        )}
        <Input
          id="add-part-initial-mileage"
          label="Starting mileage (mi)"
          type="number"
          min="0"
          step="1"
          placeholder="Miles already on the part before tracking"
          value={initialMileageMi}
          onChange={(event) => setInitialMileageMi(event.target.value)}
          error={errors.initialMileageMi}
        />
        <Input
          id="add-part-label"
          label={isEdit ? 'Label' : 'Label prefix'}
          placeholder={isEdit ? 'e.g., Waxed chain #2' : 'e.g., Waxed chain'}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <Select
          id="add-part-status"
          label="Status"
          options={statusOptions.map((o) => ({ value: o.value, label: o.label }))}
          value={status}
          onChange={(event) => setStatus(event.target.value as GearPartInstanceStatus)}
        />
        <Input
          id="add-part-notes"
          label="Notes"
          placeholder="Optional fit or storage notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="w-full sm:w-auto">
          {isEdit ? 'Save changes' : 'Add part'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

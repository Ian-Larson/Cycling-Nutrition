import { useState } from 'react';
import {
  Alert,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  SpecRow,
  Stepper,
} from '@/components/ui';
import {
  formatCarbsGrams,
  formatCarbsPerHour,
  formatFluidMl,
  formatFluidPerHour,
  formatMgPerL,
  formatSodiumPerHour,
} from '@/lib/fueling/format';
import { formatEveryThirtyMinutesCue } from '@/lib/planner/one-sheet';
import type { Product } from '@/types';
import type {
  FuelingPrescription,
  Warning,
  WarningSeverity,
} from '@/lib/fueling/types';

interface FuelResultV3Props {
  prescription: FuelingPrescription;
  products: Product[];
  /** All solids the rider selected, even those allocated zero by the auto-plan. */
  availableSolids?: Product[];
  onSolidQuantityChange?: (productId: string, quantity: number) => void;
  section?: 'all' | 'pack' | 'guide' | 'metrics';
}

const HIDDEN_WARNING_CODES = new Set<Warning['code']>([
  'no-pre-ride-time',
  'carb-load-recommended',
]);

function getDisplayedWarnings(warnings: Warning[]): Warning[] {
  return warnings.filter(
    (warning) =>
      warning.severity !== 'info' && !HIDDEN_WARNING_CODES.has(warning.code)
  );
}

function formatCompactNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function formatBottleFill(
  bottle: NonNullable<FuelingPrescription['packList']>['bottles'][number]
): string {
  if (bottle.isWaterOnly) return 'water';

  if (bottle.mixScoops !== undefined) {
    const scoops = formatCompactNumber(bottle.mixScoops);
    return `${scoops} ${bottle.mixScoops === 1 ? 'scoop' : 'scoops'}`;
  }

  return `${Math.round(bottle.mixGrams)}g mix`;
}

function buildPlanClipboardText(
  prescription: FuelingPrescription,
  products: Product[]
): string {
  const { packList } = prescription;
  const lines = [
    `Target: ${Math.round(prescription.during.carbsGPerHour)}g/carbs per hour`,
  ];

  packList?.bottles.forEach((bottle, index) => {
    lines.push(
      `Bottle ${index + 1}: ${Math.round(bottle.capacityMl)} (${formatBottleFill(
        bottle
      )})`
    );
  });

  packList?.solids
    .filter((solid) => solid.quantity > 0)
    .forEach((solid) => {
      const product = products.find((p) => p.id === solid.productId);
      lines.push(
        `${solid.productName ?? product?.name ?? 'Solid'} x ${solid.quantity}`
      );
    });

  return lines.join('\n');
}

function fallbackCopyText(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Some browser shells deny direct clipboard writes even from click handlers.
  }

  return fallbackCopyText(text);
}

function CopyPlanButton({
  prescription,
  products,
}: {
  prescription: FuelingPrescription;
  products: Product[];
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const didCopy = await copyText(buildPlanClipboardText(prescription, products));
    if (!didCopy) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      aria-label={copied ? 'Plan text copied' : 'Copy plan text'}
      title={copied ? 'Copied' : 'Copy plan text'}
      onClick={handleCopy}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border-soft)] bg-white text-ink-600 transition-[background-color,color,border-color] duration-150 ease-out hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 md:h-8 md:w-8"
    >
      {copied ? (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-3.5 w-3.5">
          <path
            d="M5.25 10.5 8.25 13.5 14.75 6.75"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-3.5 w-3.5">
          <rect
            x="7"
            y="5"
            width="8"
            height="10"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M5 12.75V4.5A1.5 1.5 0 0 1 6.5 3H12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}

function severityClasses(severity: WarningSeverity): {
  border: string;
  bg: string;
  text: string;
  badge: string;
} {
  switch (severity) {
    case 'error':
      return {
        border: 'border-error-200',
        bg: 'bg-error-50',
        text: 'text-error-900',
        badge: 'bg-error-100 text-error-900',
      };
    case 'warn':
      return {
        border: 'border-warning-200',
        bg: 'bg-warning-50',
        text: 'text-warning-700',
        badge: 'bg-warning-100 text-warning-700',
      };
    default:
      return {
        border: 'border-[color:var(--border-soft)]',
        bg: 'bg-[var(--surface-soft)]',
        text: 'text-ink-800',
        badge: 'bg-shell-200 text-ink-800',
      };
  }
}

function WarningsList({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null;

  return (
    <section aria-labelledby="fuel-warnings-title" className="space-y-2">
      <h3 id="fuel-warnings-title" className="section-title">
        Warnings
      </h3>
      <div className="space-y-2">
        {warnings.map((w, i) => {
          const s = severityClasses(w.severity);
          const isError = w.severity === 'error';
          const isWarn = w.severity === 'warn';
          return (
            <div
              key={`${w.code}-${i}`}
              role={isError ? 'alert' : undefined}
              className={`flex items-start gap-2.5 rounded-xl border ${s.border} ${s.bg} ${s.text} px-3 py-2.5 md:px-4 md:py-3`}
            >
              {isError || isWarn ? (
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0"
                >
                  <path
                    d="M8 1.75 14.5 13.5h-13L8 1.75Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 6.5v3.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="8" cy="11.5" r="0.85" fill="currentColor" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M8 5.5v3.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="8" cy="11.5" r="0.85" fill="currentColor" />
                </svg>
              )}
              <span
                className={`mt-0.5 inline-flex shrink-0 items-center rounded-full ${s.badge} px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide`}
              >
                {w.severity}
              </span>
              <div className="min-w-0">
                <p className="text-sm leading-6">{w.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FluidShortfallNote({ shortfallMl }: { shortfallMl: number }) {
  return (
    <Alert
      variant="warning"
      title={`Refill: ~${shortfallMl.toLocaleString()} ml short`}
    >
      Add a refill, carry extra, or lower fluid.
    </Alert>
  );
}

function BringList({
  prescription,
  products,
  availableSolids,
  onSolidQuantityChange,
}: {
  prescription: FuelingPrescription;
  products: Product[];
  availableSolids?: Product[];
  onSolidQuantityChange?: (productId: string, quantity: number) => void;
}) {
  const { packList } = prescription;
  if (!packList) return null;

  const editableSolids = Boolean(onSolidQuantityChange && availableSolids?.length);
  const hasBottles = packList.bottles.length > 0;
  const hasSolids = packList.solids.length > 0 || editableSolids;
  const shortfall = packList.fluidShortfallMl ?? 0;
  const plannedSolidCount = packList.solids.reduce(
    (sum, solid) => sum + solid.quantity,
    0
  );
  const prepSummary = [
    `${packList.bottles.length} ${
      packList.bottles.length === 1 ? 'bottle' : 'bottles'
    }`,
    plannedSolidCount > 0
      ? `${plannedSolidCount} ${plannedSolidCount === 1 ? 'solid' : 'solids'}`
      : '0 solids',
    formatCarbsPerHour(prescription.during.carbsGPerHour),
  ].join(' · ');

  if (!hasBottles && !hasSolids && shortfall <= 0) return null;

  return (
    <section aria-labelledby="prep-and-bring-title" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border-soft)] pb-4">
        <div className="min-w-0">
          <h3 id="prep-and-bring-title" className="section-title">
            Pack
          </h3>
          <p className="mt-1 text-sm leading-5 text-ink-700 tabular-nums">
            {prepSummary}
          </p>
        </div>
        <CopyPlanButton prescription={prescription} products={products} />
      </div>

      {shortfall > 0 ? <FluidShortfallNote shortfallMl={shortfall} /> : null}

      <div className="divide-y divide-[color:var(--border-soft)] border-y border-[color:var(--border-soft)]">
        {hasBottles && (
          <div className="grid gap-2 py-3 md:grid-cols-[7rem_minmax(0,1fr)] md:gap-4">
            <p className="section-kicker text-[0.68rem] md:pt-2">Bottles</p>
            <ul className="divide-y divide-[color:var(--border-soft)]">
              {packList.bottles.map((alloc, i) => {
                const product = alloc.productId
                  ? products.find((p) => p.id === alloc.productId)
                  : null;
                const scoopsLabel = alloc.isWaterOnly
                  ? 'Water'
                  : alloc.mixScoops !== undefined
                    ? `${alloc.mixScoops} ${
                        alloc.mixScoops === 1 ? 'scoop' : 'scoops'
                      }`
                    : `${alloc.mixGrams} g`;
                return (
                  <li
                    key={`bottle-${i}`}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span className="shrink-0 text-sm font-semibold text-ink-900">
                        Bottle {i + 1}
                      </span>
                      <span className="truncate text-xs text-ink-600">
                        {alloc.capacityMl} ml
                        {alloc.isWaterOnly ? '' : ` · ${product?.name ?? 'Mix'}`}
                      </span>
                    </div>
                    <span className="shrink-0 font-sans text-sm font-semibold tabular-nums text-brand-700">
                      {scoopsLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {hasSolids && (
          <div className="grid gap-2 py-3 md:grid-cols-[7rem_minmax(0,1fr)] md:gap-4">
            <div className="md:pt-2">
              <p className="section-kicker text-[0.68rem]">Solids</p>
            </div>

            {editableSolids ? (
              <ul className="divide-y divide-[color:var(--border-soft)]">
                {availableSolids!.map((product) => {
                  const alloc = packList.solids.find(
                    (solid) => solid.productId === product.id
                  );
                  const quantity = alloc?.quantity ?? 0;
                  const isEmpty = quantity === 0;
                  return (
                    <li
                      key={product.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-semibold ${
                            isEmpty ? 'text-ink-700' : 'text-ink-900'
                          }`}
                        >
                          {product.name}
                        </p>
                        <p className="text-xs leading-5 text-ink-500 tabular-nums">
                          {product.nutrition.carbsGrams}g carbs each
                          {isEmpty ? ' • 0 planned' : ''}
                        </p>
                      </div>
                      <Stepper
                        label={product.name}
                        hideLabel
                        value={quantity}
                        onChange={(qty) => onSolidQuantityChange!(product.id, qty)}
                        min={0}
                        max={20}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="divide-y divide-[color:var(--border-soft)]">
                {packList.solids.map((alloc, i) => {
                  const product = products.find((p) => p.id === alloc.productId);
                  return (
                    <li
                      key={`${alloc.productId}-${i}`}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <span className="truncate text-sm font-semibold text-ink-900">
                        {alloc.productName ?? product?.name ?? 'Solid'}
                      </span>
                      <span className="shrink-0 font-sans text-sm font-semibold tabular-nums text-brand-700">
                        ×{alloc.quantity}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function PlanMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 py-1.5">
      <p className="section-kicker text-[0.66rem] text-ink-500">{label}</p>
      <p
        className={`mt-1 font-sans text-xl font-semibold leading-none tabular-nums ${
          accent ? 'text-brand-700' : 'text-ink-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function RideNumbers({ prescription }: { prescription: FuelingPrescription }) {
  const { during } = prescription;

  return (
    <section aria-labelledby="ride-numbers-title" className="space-y-4">
      <div className="border-b border-[color:var(--border-soft)] pb-3">
        <h3 id="ride-numbers-title" className="section-title">
          Targets
        </h3>
      </div>

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        <PlanMetric
          label="Carbs / hour"
          value={formatCarbsPerHour(during.carbsGPerHour)}
          accent
        />
        <PlanMetric
          label="Total carbs"
          value={formatCarbsGrams(during.totalCarbsGrams)}
        />
        <PlanMetric
          label="Fluid / hour"
          value={formatFluidPerHour(during.hydrationMlPerHour)}
        />
      </div>

      <div className="grid gap-x-8 gap-y-1 border-t border-[color:var(--border-soft)] pt-3 md:grid-cols-2">
        <SpecRow label="Total fluid" value={formatFluidMl(during.totalHydrationMl)} />
        <SpecRow label="Sodium / hour" value={formatSodiumPerHour(during.sodiumMgPerHour)} />
        <SpecRow
          label="Bottle sodium"
          value={formatMgPerL(during.sodiumMgPerLiterTargetInBottles)}
        />
        <SpecRow
          label="Mix strength"
          value={`${(during.bottleConcentrationGPerMl * 100).toFixed(1)} g/100ml`}
        />
        {during.caffeineMg !== undefined && during.caffeineMg > 0 && (
          <SpecRow
            label="Caffeine (solids)"
            value={`${Math.round(during.caffeineMg)} mg`}
          />
        )}
      </div>

      {during.usesMultiTransportableCarbs && (
        <p className="text-xs leading-5 text-ink-600">
          Use glucose/fructose above 60 g/h.
        </p>
      )}
    </section>
  );
}

function ThirtyMinuteCue({ prescription }: { prescription: FuelingPrescription }) {
  return (
    <section
      aria-labelledby="thirty-minute-cue-title"
      className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-brand-900"
    >
      <p
        id="thirty-minute-cue-title"
        className="section-kicker text-[0.68rem] text-brand-700"
      >
        Ride cue
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-sans text-lg font-semibold leading-tight tabular-nums">
          {formatEveryThirtyMinutesCue(prescription.during.carbsGPerHour)}
        </p>
      </div>
    </section>
  );
}

function PlanDetails({
  prescription,
  displayedWarnings,
}: {
  prescription: FuelingPrescription;
  displayedWarnings: Warning[];
}) {
  return (
    <Collapsible>
      <div className="rounded-xl border border-[color:var(--border-soft)] bg-white">
        <CollapsibleTrigger className="px-4 py-3 md:px-4 md:py-3">
          <span className="min-w-0">
            <span className="section-title block text-base">Details</span>
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-5 border-t border-[color:var(--border-soft)] px-4 py-4">
          <RideNumbers prescription={prescription} />
          <WarningsList warnings={displayedWarnings} />
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function FuelResultV3({
  prescription,
  products,
  availableSolids,
  onSolidQuantityChange,
  section = 'all',
}: FuelResultV3Props) {
  const showPack = section === 'all' || section === 'pack';
  const showGuide = section === 'all' || section === 'guide';
  const displayedWarnings = getDisplayedWarnings(prescription.warnings);

  return (
    <div className="space-y-5">
      {showPack && (
        <BringList
          prescription={prescription}
          products={products}
          availableSolids={availableSolids}
          onSolidQuantityChange={onSolidQuantityChange}
        />
      )}
      {showGuide && <ThirtyMinuteCue prescription={prescription} />}
      {section === 'all' && (
        <PlanDetails
          prescription={prescription}
          displayedWarnings={displayedWarnings}
        />
      )}
      {section === 'metrics' && <RideNumbers prescription={prescription} />}
      {section === 'metrics' && <WarningsList warnings={displayedWarnings} />}
    </div>
  );
}

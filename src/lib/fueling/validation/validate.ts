import type { FuelingContext } from '../context';
import type { Warning, DuringRidePrescription, PackList } from '../types';

/** Intensity-factor threshold above which train-low is not recommended. */
const TRAIN_LOW_IF_THRESHOLD = 0.82;

/**
 * Run cross-layer validation checks and return a deduplicated array of warnings.
 *
 * Checks:
 *  1. Multi-transport product missing — if the prescription requires
 *     multi-transportable carbs but we have no way to verify pack-list products
 *     contain glucose:fructose blends, emit a reminder warning.
 *  2. Train-low at quality intensity — adaptation purpose with high IF is risky.
 */
export function validatePrescription(
  context: FuelingContext,
  during: DuringRidePrescription,
  _packList?: PackList,
  existingWarnings?: Warning[],
): Warning[] {
  const newWarnings: Warning[] = [];

  // 1. Multi-transport product missing
  // If the during-ride prescription says multi-transportable carbs are needed,
  // we can't verify from the pack list alone (product metadata doesn't include
  // glucose:fructose labeling). Emit an advisory warning.
  if (during.usesMultiTransportableCarbs) {
    newWarnings.push({
      code: 'no-multi-transport-product',
      severity: 'warn',
      message:
        'Multi-transportable carbs recommended — verify your drink mix contains a glucose:fructose blend (typically 2:1 or 1:0.8 ratio).',
    });
  }

  // 2. Train-low at quality intensity
  if (
    context.purpose === 'adaptation' &&
    context.session.intensityFactor >= TRAIN_LOW_IF_THRESHOLD
  ) {
    newWarnings.push({
      code: 'train-low-not-recommended-for-quality',
      severity: 'warn',
      message: `Train-low strategy is not recommended at IF ${context.session.intensityFactor.toFixed(2)} — performance and recovery may suffer.`,
    });
  }

  // Aggregate and deduplicate by warning code
  const all = [...(existingWarnings ?? []), ...newWarnings];
  const seen = new Set<string>();
  const deduped: Warning[] = [];
  for (const w of all) {
    if (!seen.has(w.code)) {
      seen.add(w.code);
      deduped.push(w);
    }
  }

  return deduped;
}

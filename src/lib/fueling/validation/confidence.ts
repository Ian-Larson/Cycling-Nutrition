import type { FuelingContext } from '../context';
import type { Confidence } from '../types';

/**
 * Return the confidence assessment from the fueling context.
 *
 * Confidence is computed upstream in `buildContext` based on the number
 * of missing data points. This function acts as a composability alias
 * so downstream consumers can import from the validation layer.
 */
export function computeConfidence(context: FuelingContext): Confidence {
  return context.confidence;
}

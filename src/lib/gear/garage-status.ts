import type { Bike } from '@/types/gear';
import type { GearDueItem } from './derive-gear-due';
import type { GearUrgency } from './derive-active-setup';

export interface AttentionCounts {
  overdue: number;
  soon: number;
}

/**
 * Worst urgency per bike, plus split counts for the currently selected bike vs.
 * everywhere else. Powers pill-row dots, the Service panel header copy, and the
 * state-aware default-open panel selector on the Garage page.
 */
export interface GarageStatus {
  perBikeUrgency: Record<string, GearUrgency | null>;
  thisBikeCounts: AttentionCounts;
  elsewhereCounts: AttentionCounts;
  garageWideCounts: AttentionCounts;
  worstAcrossGarage: GearUrgency | null;
  hasAttention: boolean;
}

interface DeriveGarageStatusInput {
  bikes: readonly Bike[];
  dueItems: readonly GearDueItem[];
  selectedBikeId: string | null;
}

const ATTENTION_RANK: Record<GearUrgency, number> = {
  overdue: 0,
  soon: 1,
  ok: 2,
  unknown: 3,
};

function emptyCounts(): AttentionCounts {
  return { overdue: 0, soon: 0 };
}

function isAttention(urgency: GearUrgency): boolean {
  return urgency === 'overdue' || urgency === 'soon';
}

function worse(a: GearUrgency | null, b: GearUrgency): GearUrgency {
  if (a === null) return b;
  return ATTENTION_RANK[b] < ATTENTION_RANK[a] ? b : a;
}

export function deriveGarageStatus(input: DeriveGarageStatusInput): GarageStatus {
  const perBikeUrgency: Record<string, GearUrgency | null> = {};
  for (const bike of input.bikes) {
    perBikeUrgency[bike.id] = null;
  }

  const garageWideCounts = emptyCounts();
  const thisBikeCounts = emptyCounts();
  const elsewhereCounts = emptyCounts();
  let worstAcrossGarage: GearUrgency | null = null;

  for (const item of input.dueItems) {
    if (!isAttention(item.urgency)) continue;

    const previous = perBikeUrgency[item.bikeId] ?? null;
    perBikeUrgency[item.bikeId] = worse(previous, item.urgency);

    const bucket: keyof AttentionCounts =
      item.urgency === 'overdue' ? 'overdue' : 'soon';
    garageWideCounts[bucket] += 1;
    worstAcrossGarage = worse(worstAcrossGarage, item.urgency);

    if (input.selectedBikeId !== null) {
      if (item.bikeId === input.selectedBikeId) {
        thisBikeCounts[bucket] += 1;
      } else {
        elsewhereCounts[bucket] += 1;
      }
    }
  }

  return {
    perBikeUrgency,
    thisBikeCounts,
    elsewhereCounts,
    garageWideCounts,
    worstAcrossGarage,
    hasAttention:
      garageWideCounts.overdue > 0 || garageWideCounts.soon > 0,
  };
}

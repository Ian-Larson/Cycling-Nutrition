interface DatedEntry {
  recordedAt: string;
}

/**
 * Returns the latest entry whose `recordedAt` is on or before `targetIsoDate`,
 * or `undefined` if none exists. Input does not need to be pre-sorted.
 */
export function closestPriorEntry<T extends DatedEntry>(
  entries: readonly T[],
  targetIsoDate: string
): T | undefined {
  let winner: T | undefined;
  for (const entry of entries) {
    if (entry.recordedAt > targetIsoDate) continue;
    if (!winner || entry.recordedAt > winner.recordedAt) {
      winner = entry;
    }
  }
  return winner;
}

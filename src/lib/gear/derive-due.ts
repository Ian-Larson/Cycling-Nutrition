import type { Bike, ServiceEntry, ServiceTypeKey } from '@/types/gear';

export interface DueItem {
  bikeId: string;
  typeKey: ServiceTypeKey;
  lastEntry: ServiceEntry;
  remainingMi: number;
  urgency: 'overdue' | 'soon' | 'ok';
}

export function deriveDue(bikes: Bike[], entries: ServiceEntry[]): DueItem[] {
  const items: DueItem[] = [];
  for (const b of bikes) {
    if (b.cachedOdometerMi == null) continue;
    const byType = new Map<ServiceTypeKey, ServiceEntry>();
    for (const e of entries) {
      if (e.bikeId !== b.id) continue;
      const prev = byType.get(e.typeKey);
      if (!prev || e.dateIso > prev.dateIso) byType.set(e.typeKey, e);
    }
    for (const [typeKey, last] of byType) {
      const remainingMi = last.serviceAtMi - b.cachedOdometerMi;
      const soonThreshold = last.intervalMi * 0.1;
      const urgency: DueItem['urgency'] =
        remainingMi < 0 ? 'overdue' : remainingMi <= soonThreshold ? 'soon' : 'ok';
      items.push({ bikeId: b.id, typeKey, lastEntry: last, remainingMi, urgency });
    }
  }
  return items.sort((a, b) => a.remainingMi - b.remainingMi);
}

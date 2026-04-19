import { describe, expect, it } from 'vitest';
import { findCatalogMatch, normalizeSpecKey } from './catalog-upsert';
import type { GearPartCatalogItem } from '@/types/gear';

function item(partial: Partial<GearPartCatalogItem>): GearPartCatalogItem {
  return {
    id: partial.id ?? 'a',
    category: partial.category ?? 'chain',
    model: partial.model ?? 'Dura-Ace',
    brand: partial.brand,
    weightGrams: partial.weightGrams,
    attributes: partial.attributes ?? { category: 'chain', speedCount: 12 },
    notes: partial.notes,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('normalizeSpecKey', () => {
  it('is case and whitespace insensitive', () => {
    const a = normalizeSpecKey({
      category: 'chain',
      brand: '  SHIMANO ',
      model: 'Dura-Ace  ',
      attributes: { category: 'chain', speedCount: 12 },
    });
    const b = normalizeSpecKey({
      category: 'chain',
      brand: 'shimano',
      model: 'dura-ace',
      attributes: { category: 'chain', speedCount: 12 },
    });
    expect(a).toBe(b);
  });

  it('differs when attribute values differ', () => {
    const k11 = normalizeSpecKey({
      category: 'chain',
      model: 'Dura-Ace',
      attributes: { category: 'chain', speedCount: 11 },
    });
    const k12 = normalizeSpecKey({
      category: 'chain',
      model: 'Dura-Ace',
      attributes: { category: 'chain', speedCount: 12 },
    });
    expect(k11).not.toBe(k12);
  });

  it('differs when category differs', () => {
    const chain = normalizeSpecKey({
      category: 'chain',
      model: 'X',
      attributes: { category: 'chain' },
    });
    const tire = normalizeSpecKey({
      category: 'tire',
      model: 'X',
      attributes: { category: 'tire', widthMm: 28 },
    });
    expect(chain).not.toBe(tire);
  });
});

describe('findCatalogMatch', () => {
  it('returns the matching catalog row', () => {
    const existing = item({ id: 'x', brand: 'Shimano', model: 'Dura-Ace' });
    const match = findCatalogMatch([existing], {
      category: 'chain',
      brand: 'shimano',
      model: 'dura-ace',
      attributes: { category: 'chain', speedCount: 12 },
    });
    expect(match?.id).toBe('x');
  });

  it('returns null when no match', () => {
    const existing = item({ id: 'x', model: 'Dura-Ace' });
    const match = findCatalogMatch([existing], {
      category: 'chain',
      model: 'Ultegra',
      attributes: { category: 'chain', speedCount: 12 },
    });
    expect(match).toBeNull();
  });
});

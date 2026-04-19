import type {
  GearPartAttributes,
  GearPartCatalogItem,
  GearPartCategory,
} from '@/types/gear';

export interface CatalogSpec {
  category: GearPartCategory;
  brand?: string;
  model: string;
  weightGrams?: number;
  attributes: GearPartAttributes;
}

function normText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeAttributes(attrs: GearPartAttributes): string {
  const entries = Object.entries(attrs as unknown as Record<string, unknown>)
    .filter(([key]) => key !== 'category')
    .map(
      ([key, value]) =>
        [
          key,
          typeof value === 'string' ? value.trim().toLowerCase() : value,
        ] as const
    )
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

export function normalizeSpecKey(spec: CatalogSpec): string {
  return [
    spec.category,
    normText(spec.brand),
    normText(spec.model),
    normalizeAttributes(spec.attributes),
  ].join('\u0000');
}

export function findCatalogMatch(
  catalog: readonly GearPartCatalogItem[],
  spec: CatalogSpec
): GearPartCatalogItem | null {
  const key = normalizeSpecKey(spec);
  return catalog.find((item) => normalizeSpecKey(item) === key) ?? null;
}

export type BottleSize = 550 | 750 | 950;

export const BOTTLE_SIZES: readonly BottleSize[] = [550, 750, 950] as const;

export type BottleInventory = Record<BottleSize, number>;

export const EMPTY_BOTTLE_INVENTORY: BottleInventory = {
  550: 0,
  750: 0,
  950: 0,
};

export function isBottleSize(value: unknown): value is BottleSize {
  return value === 550 || value === 750 || value === 950;
}

export function totalBottleCount(inventory: BottleInventory): number {
  return BOTTLE_SIZES.reduce((sum, size) => sum + (inventory[size] ?? 0), 0);
}

export function totalBottleCapacityMl(inventory: BottleInventory): number {
  return BOTTLE_SIZES.reduce(
    (sum, size) => sum + size * (inventory[size] ?? 0),
    0
  );
}

export function cloneBottleInventory(
  inventory: BottleInventory
): BottleInventory {
  return { 550: inventory[550], 750: inventory[750], 950: inventory[950] };
}

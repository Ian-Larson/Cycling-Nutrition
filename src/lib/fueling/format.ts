function round(value: number): number {
  return Math.round(value);
}

function thousands(value: number): string {
  return round(value).toLocaleString('en-US');
}

export function formatCarbsGrams(grams: number): string {
  return `${round(grams)} g`;
}

export function formatCarbsPerHour(gramsPerHour: number): string {
  return `${round(gramsPerHour)} g/h`;
}

export function formatFluidMl(ml: number): string {
  return `${thousands(ml)} ml`;
}

export function formatFluidPerHour(mlPerHour: number): string {
  return `${round(mlPerHour)} ml/h`;
}

export function formatSodiumMg(mg: number): string {
  return `${round(mg)} mg`;
}

export function formatSodiumPerHour(mgPerHour: number): string {
  return `${round(mgPerHour)} mg/h`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function formatGPerKg(gPerKg: number): string {
  return `${(Math.round(gPerKg * 10) / 10).toFixed(1)} g/kg`;
}

export function formatMgPerL(mgPerL: number): string {
  return `${round(mgPerL)} mg/L`;
}

export type AnthropometricsUnit = 'metric' | 'imperial';

const KILOGRAMS_PER_POUND = 0.45359237;
const CENTIMETERS_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

export interface FeetInches {
  feet: number;
  inches: number;
}

export function normalizeAnthropometricsUnit(
  value: unknown
): AnthropometricsUnit {
  return value === 'imperial' ? 'imperial' : 'metric';
}

export function poundsToKilograms(pounds: number): number {
  return pounds * KILOGRAMS_PER_POUND;
}

export function kilogramsToPounds(kilograms: number): number {
  return kilograms / KILOGRAMS_PER_POUND;
}

export function feetInchesToCentimeters(feet: number, inches: number): number {
  return (feet * INCHES_PER_FOOT + inches) * CENTIMETERS_PER_INCH;
}

export function centimetersToFeetInches(centimeters: number): FeetInches {
  const totalInchesRounded = Math.round((centimeters / CENTIMETERS_PER_INCH) * 10) / 10;
  let feet = Math.floor(totalInchesRounded / INCHES_PER_FOOT);
  let inches = totalInchesRounded - feet * INCHES_PER_FOOT;

  if (inches >= INCHES_PER_FOOT) {
    feet += 1;
    inches = 0;
  }

  return {
    feet,
    inches,
  };
}

export function formatNumberInputValue(
  value: number | undefined,
  decimals = 1
): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '';
  }

  return Number(value.toFixed(decimals)).toString();
}

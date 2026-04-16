import type { CarbLoadProtocol } from '../types';
import {
  CARB_LOAD_G_PER_KG_PER_DAY,
  CARB_LOAD_DAYS,
  CARB_LOAD_HOURLY_CEILING_G_PER_KG,
} from '../constants/science';

/**
 * Carb-load protocol for events >= 90 min.
 * Returns `undefined` for shorter events where carb loading is unnecessary.
 *
 * Source: Jeukendrup 2014, Murray & Rosenbloom 2018 (Nutr Rev 76:4).
 */
export function carbLoadProtocol(
  _massKg: number,
  eventDurationMinutes: number,
): CarbLoadProtocol | undefined {
  if (eventDurationMinutes < 90) return undefined;

  return {
    days: CARB_LOAD_DAYS,
    targetGPerKgPerDay: (CARB_LOAD_G_PER_KG_PER_DAY.min + CARB_LOAD_G_PER_KG_PER_DAY.max) / 2,
    hourlyCeilingGPerKg: CARB_LOAD_HOURLY_CEILING_G_PER_KG,
  };
}

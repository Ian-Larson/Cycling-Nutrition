import { useMemo } from 'react';
import type { Product, RideCharacteristics } from '@/types';
import type { BottleSlot } from '@/lib/calculator/bottles';
import { useStore } from '@/store';
import { buildPrescription, type FuelingPrescription } from '@/lib/fueling';
import { buildFuelingInputFromV2 } from '@/lib/fueling/adapters/from-v2-inputs';

export interface BuildV3Args {
  ride: RideCharacteristics;
  selectedBottles: BottleSlot[];
  selectedDrinkMix: Product | null;
  selectedSolids: Product[];
  /** Optional manual per-product solid quantities (productId → quantity). */
  solidOverrides?: Record<string, number>;
}

export type BuildV3Fn = (args: BuildV3Args) => FuelingPrescription | null;

export interface UseFuelingEngineResult {
  /** Currently selected engine version (from persisted settings). */
  version: 'v2' | 'v3';
  /**
   * Build a v3 prescription from current UI inputs. Returns null when
   * v3 is not usable (e.g. rider mass missing). Safe to call under v2
   * but will also return null — guards against accidental misuse.
   */
  buildV3: BuildV3Fn;
  /**
   * True when v3 is selected AND the rider profile has enough data
   * (mass) for the engine to produce a result.
   */
  v3Ready: boolean;
}

/**
 * Router hook between the v2 calculator (still called directly from the
 * planner page) and the v3 fueling engine. The hook itself never executes
 * the v2 path; it only exposes whether v3 is selected and a pure builder
 * for v3 results.
 */
export function useFuelingEngine(): UseFuelingEngineResult {
  const engineVersion = useStore((s) => s.settings.engineVersion);
  const athleteProfile = useStore((s) => s.settings.athleteProfile);
  const temperatureUnit = useStore((s) => s.settings.temperatureUnit);

  const massKg = athleteProfile.weightKg;
  const v3Ready =
    engineVersion === 'v3' &&
    typeof massKg === 'number' &&
    Number.isFinite(massKg) &&
    massKg > 0;

  const buildV3 = useMemo<BuildV3Fn>(() => {
    return (args) => {
      if (engineVersion !== 'v3') return null;

      const input = buildFuelingInputFromV2({
        ride: args.ride,
        athleteProfile,
        temperatureUnit,
        selectedBottles: args.selectedBottles,
        selectedDrinkMix: args.selectedDrinkMix,
        selectedSolids: args.selectedSolids,
      });

      if (!input) return null;
      return buildPrescription({
        ...input,
        solidOverrides: args.solidOverrides,
      });
    };
  }, [engineVersion, athleteProfile, temperatureUnit]);

  return { version: engineVersion, buildV3, v3Ready };
}

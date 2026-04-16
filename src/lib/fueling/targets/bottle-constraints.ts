import { MAX_BOTTLE_CONC_G_PER_ML } from '../constants/science';

export type DrinkSolidStrategy = 'drink-only' | 'split-drink-solids' | 'solids-heavy';

export interface BottleConstraintResult {
  bottleConcentrationGPerMl: number;
  strategy: DrinkSolidStrategy;
  extraFluidMlHint?: number;
}

/**
 * Check if the drink can carry the prescribed carbs within concentration limits.
 *
 * Algorithm:
 * 1. concentration = carbsGPerHour / hydrationMlPerHour (g/ml).
 * 2. <= MAX_BOTTLE_CONC → drink-only.
 * 3. <= 1.5x MAX_BOTTLE_CONC → split-drink-solids, with extra fluid hint.
 * 4. > 1.5x → solids-heavy.
 * 5. Round concentration to 3 decimal places.
 */
export function bottleConstraints(
  carbsGPerHour: number,
  hydrationMlPerHour: number,
): BottleConstraintResult {
  if (carbsGPerHour === 0 || hydrationMlPerHour === 0) {
    return {
      bottleConcentrationGPerMl: 0,
      strategy: 'drink-only',
    };
  }

  const rawConcentration = carbsGPerHour / hydrationMlPerHour;
  const splitThreshold = MAX_BOTTLE_CONC_G_PER_ML * 1.5;

  // Round concentration to 3 decimal places
  const bottleConcentrationGPerMl = Math.round(rawConcentration * 1000) / 1000;

  if (rawConcentration <= MAX_BOTTLE_CONC_G_PER_ML) {
    return {
      bottleConcentrationGPerMl,
      strategy: 'drink-only',
    };
  }

  if (rawConcentration <= splitThreshold) {
    // Extra fluid needed to bring concentration within limits
    const extraFluidMlHint = carbsGPerHour / MAX_BOTTLE_CONC_G_PER_ML - hydrationMlPerHour;
    return {
      bottleConcentrationGPerMl,
      strategy: 'split-drink-solids',
      extraFluidMlHint: Math.round(extraFluidMlHint),
    };
  }

  return {
    bottleConcentrationGPerMl,
    strategy: 'solids-heavy',
  };
}

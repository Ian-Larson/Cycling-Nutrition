export const HYDRATION_MULTIPLIERS = {
  heat: {
    cool: 0.8,
    moderate: 1.0,
    warm: 1.3,
    hot: 1.6,
  },
  intensity: {
    recovery: 0.7,
    endurance: 1.0,
    tempo: 1.15,
    threshold: 1.3,
    race: 1.4,
  },
} as const;

export const BASE_HYDRATION_ML_PER_HOUR = 500;

// Max carbs per ml of liquid (80g per 500ml = hydrogel upper bound like Maurten)
export const MAX_CARB_CONCENTRATION_G_PER_ML = 0.16;

// Concentration range for drink mix (g carbs per ml water)
export const DEFAULT_MIN_CONCENTRATION = 0.04;
export const DEFAULT_MAX_CONCENTRATION = 0.10;
export const DEFAULT_TARGET_CONCENTRATION = 0.07;

// Solid fuel pacing limits
export const PREFERRED_SOLIDS_PER_HOUR = 1;
export const MAX_SOLIDS_PER_HOUR = 2;
export const MIN_DURATION_FOR_SOLIDS_MINUTES = 30;

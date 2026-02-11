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

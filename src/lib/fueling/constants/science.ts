/**
 * All numerical constants used by the fueling engine MUST be defined here,
 * each with a JSDoc citation naming its primary source. Engine code imports
 * from this module only; never inline numbers.
 */

/** During-ride CHO by planned duration. Source: Jeukendrup 2011 (J Sports Sci 29) / Jeukendrup 2014 (Sports Med 44) table. */
export const DURATION_CHO_BRACKETS = [
  { maxMinutes: 30,       ceilingGph: 0,   label: 'minimal',         requiresFructoseMix: false },
  { maxMinutes: 75,       ceilingGph: 0,   label: 'mouth-rinse',     requiresFructoseMix: false },
  { maxMinutes: 120,      ceilingGph: 30,  label: 'single-source',   requiresFructoseMix: false },
  { maxMinutes: 180,      ceilingGph: 60,  label: 'single-source',   requiresFructoseMix: false },
  { maxMinutes: 360,      ceilingGph: 90,  label: 'multi-transport', requiresFructoseMix: true  },
  { maxMinutes: Infinity, ceilingGph: 120, label: 'elite',           requiresFructoseMix: true  },
] as const;

export type DurationBracketLabel = typeof DURATION_CHO_BRACKETS[number]['label'];

/** Max CHO concentration safe for most GI systems. Source: Maurten empirical / Jeukendrup 2014. */
export const MAX_BOTTLE_CONC_G_PER_ML = 0.16;

/**
 * Rapid post-exercise recovery window: when the next session is within
 * `maxHours`, drive aggressive CHO intake. Source: Alghannam 2018 (Nutrients 10:2),
 * Ivy 2004 (JSSM 3:3).
 */
export const RAPID_RECOVERY = {
  maxHours: 8,
  choGPerKgPerHour: { min: 1.0, max: 1.2 },
  feedIntervalMinutes: { min: 15, max: 30 },
  proteinRescueGPerKgPerHour: 0.35,
  /** If post-exercise CHO actually consumed falls below this g/kg/h, add protein to rescue glycogen resynthesis (Alghannam 2018). */
  proteinTriggerChoShortfallGPerKgPerHour: 0.8,
} as const;

/** Pre-ride CHO window. Source: Jeukendrup 2011, Arent 2020 (Nutrients 12:7). */
export const PRE_RIDE_WINDOWS = [
  { hoursBeforeStart: 4, choGPerKg: 4.0 },
  { hoursBeforeStart: 2, choGPerKg: 2.0 },
  { hoursBeforeStart: 1, choGPerKg: 1.0 },
] as const;

/** Carb load protocol for events >90 min. Source: Jeukendrup 2014, Murray & Rosenbloom 2018 (Nutr Rev 76:4). */
export const CARB_LOAD_G_PER_KG_PER_DAY = { min: 10, max: 12 };
export const CARB_LOAD_DAYS = 2;
export const CARB_LOAD_HOURLY_CEILING_G_PER_KG = 1.2;

/** Caffeine ergogenic dose. Source: Jeukendrup 2011. */
export const ERGOGENIC_CAFFEINE_MG_PER_KG = 3;
/** Adaptation-session (fasted low-CHO) caffeine dose. Source: Baar 2014 (Sports Med 44). */
export const ADAPTATION_CAFFEINE_MG_FLAT = 200;
/** Daily caffeine ceiling — warn above. Common sports-nutrition consensus. */
export const DAILY_CAFFEINE_CEILING_MG = 400;
/** Caffeine half-life in hours (population mean ~5 h; individual variance 3–10 h due to CYP1A2 genotype and smoking status). Source: Nehlig 2018, "Interindividual differences in caffeine metabolism and factors driving caffeine consumption". */
export const CAFFEINE_HALF_LIFE_HOURS = 5;
/** Pre-ride caffeine timing window. Source: Jeukendrup 2011. */
export const CAFFEINE_PRE_RIDE_WINDOW_MINUTES = { min: 30, max: 60 };

/**
 * Endurance daily protein. Source: Kato et al. 2016 IAAO (PLoS One 11:6) for EAR 1.65 /
 * RDA 1.83. `mastersCeiling` derives from anabolic-resistance literature
 * (Moore 2015, Bauer 2013).
 */
export const DAILY_PROTEIN_G_PER_KG = { ear: 1.65, rda: 1.83, mastersCeiling: 2.0 } as const;
/** Per-meal protein saturation. Source: Atherton & Smith 2012 (J Physiol 590:5), Arent 2020. */
export const PER_MEAL_PROTEIN_G_PER_KG = { min: 0.25, max: 0.40 };
/** Protein meal spacing. Source: Atherton & Smith 2012 "muscle-full" window. */
export const PROTEIN_MEAL_SPACING_HOURS = { min: 3, max: 4 };

/** Daily CHO tiers by training load. Source: Murray & Rosenbloom 2018. */
export const DAILY_CHO_G_PER_KG_BY_LOAD = {
  light:    { min: 3, max: 5 },   // <1 h/day
  moderate: { min: 5, max: 7 },   // ~1 h/day
  high:     { min: 6, max: 10 },  // 1–3 h/day
  veryHigh: { min: 8, max: 12 },  // 3+ h/day
} as const;

/** Max allowable body-mass loss before performance declines. Source: Jeukendrup 2011. */
export const MAX_BM_LOSS_PERCENT = 2.5;

/** Default sweat rate (L/h) by effective-heat band. Source: composite from Jeukendrup 2011 / Murray & Rosenbloom 2018. */
export const DEFAULT_SWEAT_RATE_LPH_BY_HEAT = {
  cold: 0.4, cool: 0.5, moderate: 0.7, warm: 1.0, hot: 1.4, extreme: 1.8,
} as const;

/** Default sweat sodium concentration (mg/L). Source: typical value from Jeukendrup 2011. */
export const DEFAULT_SWEAT_SODIUM_MG_PER_L = 900;
/** Heavy-sweater (salty sweater) default sweat sodium concentration. Source: typical upper range from Jeukendrup 2011. */
export const HEAVY_SWEATER_SODIUM_MG_PER_L = 1400;
/** Typical target sodium concentration for in-bottle fluid. Source: Jeukendrup 2011. */
export const BOTTLE_SODIUM_MG_PER_L_RANGE = { min: 300, max: 800 } as const;
/** Heavy-sweater ceiling for in-bottle sodium (applied only when rider flagged). Source: Jeukendrup 2011. */
export const BOTTLE_SODIUM_MG_PER_L_HEAVY_SWEATER_CEILING = 1000;

/** Age threshold for "masters" protein scaling adjustment. Source: convention; supported by anabolic-resistance literature. */
export const MASTERS_AGE_THRESHOLD = 40;

/** Gut training progression guidance. Source: Jeukendrup 2011, Murray & Rosenbloom 2018. */
export const GUT_TRAINING = {
  startGph: 30,
  ceilingGph: 120,
  incrementGph: 10,
  blockWeeks: 2,
} as const;

/**
 * Coefficients for the Stull 2011 closed-form wet-bulb temperature approximation.
 *
 *   T_wb = T * atan(a * sqrt(RH + b))
 *        + atan(T + RH)
 *        - atan(RH - c)
 *        + d * RH^1.5 * atan(e * RH)
 *        - f
 *
 * where T is dry-bulb air temperature (°C) and RH is relative humidity (%).
 * Source: Stull, R. (2011). Wet-Bulb Temperature from Relative Humidity and Air
 * Temperature. J. Appl. Meteor. Climatol., 50, 2267–2269.
 */
export const WET_BULB_STULL_COEFFICIENTS = {
  a: 0.151977,
  b: 8.313659,
  c: 1.676331,
  d: 0.00391838,
  e: 0.023101,
  f: 4.686035,
} as const;

/**
 * Wet-bulb temperature thresholds (°C) for mapping to EffectiveHeat bands.
 * Calibrated against Stull 2011 outputs for representative conditions:
 *   10°C/40% RH → wb ≈ 4°C  → cold
 *   20°C/50% RH → wb ≈ 14°C → moderate
 *   25°C/50% RH → wb ≈ 18°C → warm
 *   30°C/70% RH → wb ≈ 26°C → hot
 *   35°C/80% RH → wb ≈ 32°C → extreme
 * Source: derived from Stull 2011 formula applied to ACSM exertional heat guidelines.
 */
export const WET_BULB_HEAT_THRESHOLDS = {
  cold: 7,       // wb < 7 → cold
  cool: 13,      // 7 ≤ wb < 13 → cool
  moderate: 20,  // 13 ≤ wb < 20 → moderate
  warm: 25,      // 20 ≤ wb < 25 → warm
  hot: 30,       // 25 ≤ wb < 30 → hot
                  // wb ≥ 30 → extreme
} as const;

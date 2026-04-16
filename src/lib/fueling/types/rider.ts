export type Sex = 'male' | 'female' | 'unspecified';

export type TrainingLoad = 'light' | 'moderate' | 'high' | 'veryHigh';

export type DietaryFlag = 'vegetarian' | 'vegan' | 'gluten-free' | 'lactose-free' | 'low-fodmap';

export interface RiderProfile {
  // Identity
  name?: string;
  sex: Sex;
  age?: number;                       // years
  massKg: number;                     // required — nearly every target scales by mass
  ftpWatts?: number;

  // Training context
  trainingLoad: TrainingLoad;
  weeklyHoursAverage?: number;
  doesConcurrentStrength: boolean;

  // Sweat / fluids (individualized if known)
  sweatRateLph?: number;              // measured or estimated L/h
  sweatSodiumMgPerL?: number;         // measured or estimated mg/L
  heavySweater: boolean;

  // Gut / adaptation
  currentGutCeilingGph: number;       // 30–120, user-adjustable
  gutTrainingStartedAt?: string;      // ISO date; drives progression suggestions

  // Caffeine
  caffeineSensitive: boolean;         // halves ergogenic dose
  avoidsCaffeineAfterHour?: number;   // 0–23 (local clock hour)

  // Dietary constraints
  dietaryFlags: DietaryFlag[];

  // Units preference
  anthropometricsUnit: 'metric' | 'imperial';
}

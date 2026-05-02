import { useMemo } from 'react';
import type {
  Product,
  RideCharacteristics,
  HeatFactor,
  IntensityLevel,
} from '@/types';
import type { BottleSlot } from '@/types/bottle';
import { useStore } from '@/store';
import { buildPrescription, type FuelingPrescription } from '@/lib/fueling';
import type {
  RiderProfile,
  SessionPlan,
  Environment,
  SessionPurpose,
  TrainingLoad,
} from '@/lib/fueling/types';

const INTENSITY_TO_IF: Record<IntensityLevel, number> = {
  recovery: 0.55,
  endurance: 0.7,
  tempo: 0.85,
  threshold: 0.92,
  race: 1.0,
};

const INTENSITY_TO_PURPOSE: Record<IntensityLevel, SessionPurpose> = {
  recovery: 'recovery',
  endurance: 'endurance',
  tempo: 'tempo',
  threshold: 'threshold',
  race: 'race',
};

const HEAT_TO_DRY_BULB_C: Record<HeatFactor, number> = {
  cool: 12,
  moderate: 20,
  warm: 28,
  hot: 34,
};

function inferTrainingLoadFromMinutes(minutes: number): TrainingLoad {
  if (minutes < 60) return 'light';
  if (minutes < 120) return 'moderate';
  if (minutes < 180) return 'high';
  return 'veryHigh';
}

export interface BuildFuelPrescriptionArgs {
  ride: RideCharacteristics;
  bottles: BottleSlot[];
  drinkMix: Product | null;
  solids: Product[];
  solidOverrides?: Record<string, number>;
}

export interface UseFuelPrescriptionResult {
  weightReady: boolean;
  build: (args: BuildFuelPrescriptionArgs) => FuelingPrescription | null;
}

export function useFuelPrescription(): UseFuelPrescriptionResult {
  const athleteProfile = useStore((s) => s.settings.athleteProfile);

  const massKg = athleteProfile.weightKg;
  const weightReady =
    typeof massKg === 'number' && Number.isFinite(massKg) && massKg > 0;

  const build = useMemo(() => {
    return (args: BuildFuelPrescriptionArgs): FuelingPrescription | null => {
      if (!weightReady || typeof massKg !== 'number') return null;

      const rider: RiderProfile = {
        name: athleteProfile.name,
        sex: 'unspecified',
        age: athleteProfile.age,
        massKg,
        ftpWatts: athleteProfile.ftpWatts,
        trainingLoad: inferTrainingLoadFromMinutes(args.ride.durationMinutes),
        doesConcurrentStrength: false,
        heavySweater: athleteProfile.heavySweater,
        currentGutCeilingGph: athleteProfile.gutTrainingTargetGph ?? 65,
        caffeineSensitive: false,
        dietaryFlags: [],
        anthropometricsUnit: athleteProfile.anthropometricsUnit ?? 'metric',
      };

      const measuredIf =
        args.ride.autoMetrics?.intensityFactor &&
        Number.isFinite(args.ride.autoMetrics.intensityFactor)
          ? args.ride.autoMetrics.intensityFactor
          : undefined;

      const intensityFactor = measuredIf ?? INTENSITY_TO_IF[args.ride.intensity];

      const refuelStops = args.ride.refuelStops ?? 0;
      const refuelStopOffsets =
        refuelStops > 0
          ? Array.from({ length: refuelStops }, (_, i) =>
              Math.round((args.ride.durationMinutes * (i + 1)) / (refuelStops + 1)),
            )
          : [];

      const carbsGPerHourOverride =
        typeof args.ride.carbTargetGramsPerHour === 'number' &&
        Number.isFinite(args.ride.carbTargetGramsPerHour) &&
        args.ride.carbTargetGramsPerHour > 0
          ? args.ride.carbTargetGramsPerHour
          : undefined;

      const session: SessionPlan = {
        id: 'planner-session',
        inputMode: {
          kind: 'duration_if',
          durationMinutes: args.ride.durationMinutes,
          intensityFactor,
        },
        purposeOverride: INTENSITY_TO_PURPOSE[args.ride.intensity],
        refuelStopOffsets,
        carbsGPerHourOverride,
      };

      const environment: Environment = {
        dryBulbCelsius: HEAT_TO_DRY_BULB_C[args.ride.heatFactor],
      };

      const markAvailable = <T extends { isAvailable?: boolean }>(item: T): T => ({
        ...item,
        isAvailable: true,
      });

      const productsForEngine: Product[] = [];
      if (args.drinkMix) productsForEngine.push(markAvailable(args.drinkMix));
      for (const solid of args.solids) productsForEngine.push(markAvailable(solid));

      return buildPrescription({
        rider,
        session,
        environment,
        bottles: args.bottles,
        products: productsForEngine,
        todaysTotalSessionMinutes: args.ride.durationMinutes,
        solidOverrides: args.solidOverrides,
      });
    };
  }, [athleteProfile, massKg, weightReady]);

  return { weightReady, build };
}

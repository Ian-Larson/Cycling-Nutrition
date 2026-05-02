import type { Product } from '@/types';
import type { BottleSlot } from '@/types/bottle';
import type {
  RiderProfile,
  SessionPlan,
  Environment,
  FuelingPrescription,
  DuringRidePrescription,
} from './types';
import { buildContext } from './context';
import {
  carbTarget,
  hydrationTarget,
  sodiumTarget,
  bottleConstraints,
  preRideTarget,
  postRideTarget,
  caffeineTarget,
  dailyTargets,
  carbLoadProtocol,
} from './targets';
import {
  selectBottles,
  allocateMix,
  allocateSolids,
  buildSolidAllocationsFromOverrides,
} from './inventory';
import {
  buildPreRideTimeline,
  buildDuringTimeline,
  buildPostRideTimeline,
  mergeTimelines,
} from './timeline';
import { validatePrescription, computeConfidence } from './validation';

export interface FuelingInput {
  rider: RiderProfile;
  session: SessionPlan;
  environment?: Environment;
  bottles: BottleSlot[];
  products: Product[];
  todaysTotalSessionMinutes?: number;
  /**
   * Per-product solid quantities the rider has fixed manually. When present,
   * the engine pins solid carbs to these values and lets drink-mix fill the
   * remaining gap, instead of running the auto-fill solid allocator.
   */
  solidOverrides?: Record<string, number>;
}

export function buildPrescription(input: FuelingInput): FuelingPrescription {
  // 1. Build context
  const context = buildContext({
    rider: input.rider,
    session: input.session,
    environment: input.environment,
  });

  // 2. During-ride targets
  const carbs = carbTarget(context);
  const hydration = hydrationTarget(context);
  const sodium = sodiumTarget(context, hydration.hydrationMlPerHour);
  const constraints = bottleConstraints(
    carbs.carbsGPerHour,
    hydration.hydrationMlPerHour,
  );

  // 3. Pre-ride
  const preResult = preRideTarget(context);

  // 4. Post-ride
  const postResult = postRideTarget(context);

  // 5. Inventory: bottles -> mix -> solids -> caffeine
  const bottleSelection = selectBottles(
    input.bottles,
    hydration.totalHydrationMl,
    input.session.refuelStopOffsets?.length ?? 0,
  );

  const drinkMix =
    input.products.find((p) => p.type === 'drink_mix' && p.isAvailable) ?? null;

  let mixAllocation;
  let solidAllocation;

  if (input.solidOverrides) {
    // Rider has pinned solid quantities. Compute solids first, then let the
    // drink mix cover whatever carbs remain.
    solidAllocation = buildSolidAllocationsFromOverrides(
      input.products,
      input.solidOverrides,
      context.session.durationMinutes,
    );

    const carbsForMix = Math.max(
      0,
      carbs.totalCarbsGrams - solidAllocation.totalCarbsFromSolids,
    );

    mixAllocation = allocateMix(
      bottleSelection.selectedBottles,
      drinkMix,
      carbsForMix,
      sodium.sodiumMgPerLiterTargetInBottles,
    );
  } else {
    // Default: drink mix fills first up to its concentration ceiling, solids fill the gap.
    mixAllocation = allocateMix(
      bottleSelection.selectedBottles,
      drinkMix,
      carbs.totalCarbsGrams,
      sodium.sodiumMgPerLiterTargetInBottles,
    );

    const carbsRemaining = Math.max(
      0,
      carbs.totalCarbsGrams - mixAllocation.totalCarbsFromDrink,
    );

    solidAllocation = allocateSolids(
      input.products,
      carbsRemaining,
      context.session.durationMinutes,
    );
  }

  // 6. Caffeine (needs solid caffeine total from inventory step)
  const caffeineResult = caffeineTarget(
    context,
    solidAllocation.totalCaffeineMgFromSolids,
  );

  // 7. Assemble during-ride prescription
  const during: DuringRidePrescription = {
    carbsGPerHour: carbs.carbsGPerHour,
    totalCarbsGrams: carbs.totalCarbsGrams,
    hydrationMlPerHour: hydration.hydrationMlPerHour,
    totalHydrationMl: hydration.totalHydrationMl,
    sodiumMgPerHour: sodium.sodiumMgPerHour,
    sodiumMgPerLiterTargetInBottles: sodium.sodiumMgPerLiterTargetInBottles,
    bottleConcentrationGPerMl: constraints.bottleConcentrationGPerMl,
    usesMultiTransportableCarbs: carbs.usesMultiTransportableCarbs,
    caffeineMg: caffeineResult.duringRideCaffeineMg || undefined,
    caffeineTimingOffsetMinutes: caffeineResult.caffeineTimingOffsetMinutes,
    strategy: 'steady',
  };

  const packList = {
    bottles: mixAllocation.allocations,
    solids: solidAllocation.allocations,
    fluidShortfallMl: bottleSelection.fluidShortfallMl,
  };

  // 8. Daily targets
  const daily = dailyTargets(
    input.rider,
    input.todaysTotalSessionMinutes ?? context.session.durationMinutes,
  );

  // 9. Carb-load protocol
  const carbLoad = carbLoadProtocol(
    input.rider.massKg,
    context.session.durationMinutes,
  );

  // 10. Timeline
  const timeline = mergeTimelines([
    buildPreRideTimeline(preResult.prescription),
    buildDuringTimeline(
      during,
      packList,
      context.session.durationMinutes,
      context.session.refuelStopOffsets,
    ),
    buildPostRideTimeline(postResult.prescription, context.session.durationMinutes),
  ]);

  // 11. Validation — aggregate all warnings
  const allWarnings = [
    ...carbs.warnings,
    ...hydration.warnings,
    ...sodium.warnings,
    ...preResult.warnings,
    ...postResult.warnings,
    ...caffeineResult.warnings,
    ...mixAllocation.warnings,
    ...solidAllocation.warnings,
  ];

  const validationWarnings = validatePrescription(
    context,
    during,
    packList,
    allWarnings,
  );

  // 12. Confidence
  const confidence = computeConfidence(context);

  // 13. Context summary
  const contextSummary = {
    rider: {
      massKg: context.rider.massKg,
      sex: context.rider.sex,
      age: context.rider.age,
      trainingLoad: context.rider.trainingLoad,
      currentGutCeilingGph: context.rider.currentGutCeilingGph,
    },
    durationMinutes: context.session.durationMinutes,
    intensityFactor: context.session.intensityFactor,
    tss: context.session.tss,
    effectiveHeat: context.environment.effectiveHeat,
    purpose: context.purpose,
  };

  return {
    contextSummary,
    pre: preResult.prescription,
    carbLoad: carbLoad ?? undefined,
    during,
    post: postResult.prescription,
    daily,
    packList,
    timeline,
    warnings: validationWarnings,
    confidence,
    engineVersion: 'v3',
  };
}

// Re-export key types for consumers
export type { FuelingPrescription } from './types';
export type { RiderProfile, SessionPlan, Environment } from './types';

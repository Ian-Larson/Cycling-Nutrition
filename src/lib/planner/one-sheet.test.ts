import { describe, expect, it } from 'vitest';
import {
  buildOneSheetRide,
  formatEveryThirtyMinutesCue,
  getMissingPlanRequirements,
  normalizeSolidOverrides,
} from './one-sheet';

describe('one-sheet planner helpers', () => {
  it('builds a duration plus IF ride with a recommended carb target', () => {
    const ride = buildOneSheetRide({
      durationMinutes: 150,
      intensityFactor: 0.82,
      heatFactor: 'warm',
      ftpWatts: 250,
      heavySweater: false,
      gutTrainingTargetGph: 80,
      carbTargetOverrideGramsPerHour: undefined,
      refuelStops: 1,
    });

    expect(ride.durationMinutes).toBe(150);
    expect(ride.planningMode).toBe('auto');
    expect(ride.autoMetrics?.inputPair).toBe('duration_if');
    expect(ride.autoMetrics?.userProvidedDurationMinutes).toBe(150);
    expect(ride.autoMetrics?.userProvidedIntensityFactor).toBe(0.82);
    expect(ride.carbTargetGramsPerHour).toBe(
      ride.autoMetrics?.autoCarbTargetGramsPerHour
    );
    expect(ride.refuelStops).toBe(1);
  });

  it('marks carb target overrides as custom', () => {
    const ride = buildOneSheetRide({
      durationMinutes: 120,
      intensityFactor: 0.8,
      heatFactor: 'moderate',
      ftpWatts: 250,
      heavySweater: false,
      gutTrainingTargetGph: 65,
      carbTargetOverrideGramsPerHour: 95,
      refuelStops: 0,
    });

    expect(ride.carbTargetGramsPerHour).toBe(95);
    expect(ride.autoMetrics?.carbOverrideApplied).toBe(true);
  });

  it('formats the recurring thirty minute cue from the during target', () => {
    expect(formatEveryThirtyMinutesCue(75)).toBe('Every 30 min: 38 g carbs');
    expect(formatEveryThirtyMinutesCue(60)).toBe('Every 30 min: 30 g carbs');
  });

  it('reports local missing requirements', () => {
    expect(
      getMissingPlanRequirements({
        weightReady: false,
        durationMinutes: 120,
        intensityFactor: 0.8,
        bottleCount: 1,
        hasDrinkMix: true,
      })
    ).toEqual(['Add rider weight']);

    expect(
      getMissingPlanRequirements({
        weightReady: true,
        durationMinutes: 10,
        intensityFactor: 0.8,
        bottleCount: 0,
        hasDrinkMix: false,
      })
    ).toEqual([
      'Enter a duration from 30 to 300 min',
      'Add at least one bottle',
      'Select a drink mix',
    ]);
  });

  it('keeps only finite non-negative solid overrides', () => {
    expect(
      normalizeSolidOverrides({ gel: 2, chew: -1, bar: Number.NaN })
    ).toEqual({ gel: 2 });
  });
});

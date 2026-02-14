import { useState } from 'react';
import { Button } from '@/components/ui';
import { formatTime } from '@/lib/calculator/timing';
import type { FuelPlan, Bottle, Product } from '@/types';

interface DebugCopyButtonProps {
  plan: Omit<FuelPlan, 'id' | 'createdAt'>;
  bottles: Bottle[];
  products: Product[];
  selectedDrinkMixId: string | null;
  selectedSolidIds: string[];
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m (${mins} min)`;
}

function buildDebugText(
  plan: Omit<FuelPlan, 'id' | 'createdAt'>,
  bottles: Bottle[],
  products: Product[],
  selectedDrinkMixId: string | null,
  selectedSolidIds: string[]
): string {
  const ride = plan.rideCharacteristics;
  const lines: string[] = [];

  lines.push('=== Cycling Nutrition Debug ===');
  lines.push('');

  // Ride Settings
  lines.push('--- Ride Settings ---');
  lines.push(`Duration: ${formatDuration(ride.durationMinutes)}`);
  lines.push(`Planning Mode: ${ride.planningMode || 'manual'}`);
  lines.push(`Intensity: ${ride.intensity}`);
  lines.push(`Weather: ${ride.heatFactor}`);
  lines.push(`Carb Target: ${ride.carbTargetGramsPerHour}g/hr`);
  lines.push(`Refuel Stops: ${ride.refuelStops || 0}`);
  if (ride.autoMetrics) {
    lines.push(`Auto Input Mode: ${ride.autoMetrics.inputMode || 'pair'}`);
    if (ride.autoMetrics.inputPair) {
      lines.push(`Auto Input Pair: ${ride.autoMetrics.inputPair}`);
    }
    if (ride.autoMetrics.userProvidedDurationMinutes !== undefined) {
      lines.push(`User Duration: ${ride.autoMetrics.userProvidedDurationMinutes} min`);
    }
    if (ride.autoMetrics.userProvidedIntensityFactor !== undefined) {
      lines.push(`User IF: ${ride.autoMetrics.userProvidedIntensityFactor}`);
    }
    if (ride.autoMetrics.userProvidedTss !== undefined) {
      lines.push(`User TSS: ${ride.autoMetrics.userProvidedTss}`);
    }
    if (ride.autoMetrics.correctedTss !== undefined) {
      lines.push(`Corrected TSS: ${ride.autoMetrics.correctedTss}`);
    }
    if (ride.autoMetrics.tssCorrectionApplied !== undefined) {
      lines.push(
        `TSS Correction Applied: ${ride.autoMetrics.tssCorrectionApplied ? 'yes' : 'no'}`
      );
    }
    if (ride.autoMetrics.tssCorrectionDelta !== undefined) {
      lines.push(`TSS Correction Delta: ${ride.autoMetrics.tssCorrectionDelta}`);
    }
    lines.push(`Derived IF: ${ride.autoMetrics.intensityFactor}`);
    lines.push(`Derived TSS: ${ride.autoMetrics.tss}`);
    lines.push(`NP: ${ride.autoMetrics.normalizedPowerWatts}w`);
    lines.push(`kJ/h: ${ride.autoMetrics.kilojoulesPerHour}`);
    lines.push(
      `Auto Carb Recommendation: ${ride.autoMetrics.autoCarbTargetGramsPerHour}g/hr`
    );
    if (ride.autoMetrics.baselineAutoCarbTargetGph !== undefined) {
      lines.push(
        `Baseline Carb Recommendation: ${ride.autoMetrics.baselineAutoCarbTargetGph}g/hr`
      );
    }
    if (ride.autoMetrics.biasedAutoCarbTargetGph !== undefined) {
      lines.push(
        `Biased Carb Recommendation: ${ride.autoMetrics.biasedAutoCarbTargetGph}g/hr`
      );
    }
    if (ride.autoMetrics.gutTrainingTargetGph !== undefined) {
      lines.push(`Gut Training Target: ${ride.autoMetrics.gutTrainingTargetGph}g/hr`);
    }
    lines.push(`Auto Hydration: ${ride.autoMetrics.hydrationMlPerHour}ml/hr`);
    lines.push(`Auto Sodium: ${ride.autoMetrics.sodiumMgPerHour}mg/hr`);
    if (ride.autoMetrics.needsScore !== undefined) {
      lines.push(`Needs Score: ${ride.autoMetrics.needsScore}/100`);
    }
    if (ride.autoMetrics.needsLevel) {
      lines.push(`Needs Level: ${ride.autoMetrics.needsLevel}`);
    }
    lines.push(
      `Carb Override Applied: ${ride.autoMetrics.carbOverrideApplied ? 'yes' : 'no'}`
    );
  }
  lines.push('');

  // Selections
  lines.push('--- Selections ---');
  const drinkMix = selectedDrinkMixId
    ? products.find((p) => p.id === selectedDrinkMixId)
    : null;
  lines.push(`Selected Drink Mix: ${drinkMix?.name || '(default/none)'}`);
  const selectedSolids = products.filter((p) => selectedSolidIds.includes(p.id));
  lines.push(
    `Selected Solids: ${selectedSolids.length > 0 ? selectedSolids.map((s) => s.name).join(', ') : '(none)'}`
  );
  lines.push('');

  // Available Bottles
  lines.push('--- Available Bottles ---');
  const availableBottles = bottles.filter((b) => b.isAvailable);
  if (availableBottles.length === 0) {
    lines.push('  (none)');
  } else {
    for (const b of availableBottles) {
      lines.push(`  ${b.name}: ${b.capacityMl}ml`);
    }
  }
  lines.push('');

  // Recommended Bottles
  lines.push('--- Recommended Bottles ---');
  if (plan.bottles.length === 0) {
    lines.push('  (none)');
  } else {
    for (const alloc of plan.bottles) {
      const bottle = bottles.find((b) => b.id === alloc.bottleId);
      const product = products.find((p) => p.id === alloc.productId);
      if (alloc.isWaterOnly) {
        lines.push(`  ${bottle?.name || 'Bottle'}: water only`);
      } else {
        const concentration =
          bottle && bottle.capacityMl > 0
            ? alloc.carbsTotal / bottle.capacityMl
            : 0;
        lines.push(
          `  ${bottle?.name || 'Bottle'}: ${alloc.mixGrams}g ${product?.name || '?'} (~${alloc.mixScoops} scoops, ${alloc.carbsTotal}g carbs, ${concentration.toFixed(3)} g/ml)`
        );
      }
    }
  }
  lines.push('');

  // Recommended Solids
  if (plan.solids.length > 0) {
    lines.push('--- Recommended Solids ---');
    for (const alloc of plan.solids) {
      const product = products.find((p) => p.id === alloc.productId);
      lines.push(
        `  ${product?.name || 'Solid'}: x${alloc.quantity} (${alloc.carbsTotal}g carbs, every ~${alloc.timingIntervalMinutes}min)`
      );
    }
    lines.push('');
  }

  // Summary
  lines.push('--- Summary ---');
  lines.push(
    `Total Carbs: ${plan.summary.totalCarbsPlanned}g / ${plan.summary.totalCarbsNeeded}g needed`
  );
  lines.push(`Hydration: ${plan.summary.hydrationMl}ml`);
  if (plan.summary.sodiumMgPerHour !== undefined) {
    lines.push(`Sodium/Hour: ${plan.summary.sodiumMgPerHour}mg`);
  }
  if (plan.summary.sodiumMgTotal !== undefined) {
    lines.push(`Total Sodium: ${plan.summary.sodiumMgTotal}mg`);
  }
  lines.push('');

  // Consumption Guide
  if (plan.consumptionGuide.length > 0) {
    lines.push('--- Consumption Guide ---');
    for (const item of plan.consumptionGuide) {
      lines.push(
        `  ${formatTime(item.timeOffsetMinutes)} | ${item.action} | ${item.carbsConsumed}g | cumulative: ${item.cumulativeCarbs}g`
      );
    }
  }

  return lines.join('\n');
}

export function DebugCopyButton({
  plan,
  bottles,
  products,
  selectedDrinkMixId,
  selectedSolidIds,
}: DebugCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = buildDebugText(plan, bottles, products, selectedDrinkMixId, selectedSolidIds);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      className="w-full mt-2"
      variant="ghost"
      onClick={handleCopy}
    >
      <span className="text-gray-400 text-sm">
        {copied ? 'Copied!' : 'Copy Debug Info'}
      </span>
    </Button>
  );
}

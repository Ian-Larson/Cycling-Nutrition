import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FuelResultV3 } from './fuel-result-v3';
import type { FuelingPrescription } from '@/lib/fueling/types';
import type { Product } from '@/types';

const mix: Product = {
  id: 'mix',
  name: 'Maurten 320',
  type: 'drink_mix',
  isAvailable: true,
  nutrition: { carbsGrams: 80, calories: 320 },
  serving: { servingSizeGrams: 80, scoopSizeGrams: 40 },
  createdAt: 0,
  updatedAt: 0,
};

const prescription: FuelingPrescription = {
  engineVersion: 'v3',
  contextSummary: {
    rider: {
      massKg: 70,
      sex: 'unspecified',
      trainingLoad: 'moderate',
      currentGutCeilingGph: 90,
    },
    durationMinutes: 120,
    intensityFactor: 0.7,
    tss: 98,
    effectiveHeat: 'moderate',
    purpose: 'endurance',
  },
  confidence: { score: 0.9, missing: [] },
  warnings: [],
  during: {
    carbsGPerHour: 75,
    totalCarbsGrams: 150,
    hydrationMlPerHour: 700,
    totalHydrationMl: 1400,
    sodiumMgPerHour: 500,
    sodiumMgPerLiterTargetInBottles: 700,
    bottleConcentrationGPerMl: 0.1,
    usesMultiTransportableCarbs: true,
    strategy: 'steady',
  },
  packList: {
    bottles: [
      {
        capacityMl: 750,
        productId: 'mix',
        mixGrams: 75,
        mixScoops: 2,
        carbsTotal: 75,
        isWaterOnly: false,
      },
      {
        capacityMl: 750,
        productId: 'mix',
        mixGrams: 75,
        mixScoops: 2,
        carbsTotal: 75,
        isWaterOnly: false,
      },
    ],
    solids: [],
    fluidShortfallMl: 0,
  },
};

describe('FuelResultV3', () => {
  it('leads the pack tab with the ride prep answer', () => {
    render(
      <FuelResultV3
        section="pack"
        prescription={prescription}
        products={[mix]}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /Prep and bring/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 bottles/i)).toBeInTheDocument();
    expect(screen.getAllByText(/2 scoops/i)).toHaveLength(2);
  });
});

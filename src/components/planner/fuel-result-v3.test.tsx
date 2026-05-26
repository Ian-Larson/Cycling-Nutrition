import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

const guGel: Product = {
  id: 'gel',
  name: 'GU Energy Gel',
  type: 'gel',
  isAvailable: true,
  nutrition: { carbsGrams: 22, calories: 100 },
  serving: {},
  createdAt: 0,
  updatedAt: 0,
};

const pfChew: Product = {
  id: 'chew',
  name: 'PF 30 Chew',
  type: 'chews',
  isAvailable: true,
  nutrition: { carbsGrams: 30, calories: 120 },
  serving: {},
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
  warnings: [
    {
      code: 'no-pre-ride-time',
      severity: 'info',
      message: 'No start time provided; using pre-ride window as default.',
    },
    {
      code: 'hyponatremia-risk',
      severity: 'warn',
      message: 'Fluid intake exceeds predicted sweat rate.',
    },
  ],
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
  pre: {
    carbsGrams: 90,
    carbsGPerKg: 1.3,
    windowHoursBefore: 3,
    notes: ['Eat a familiar breakfast.'],
  },
  post: {
    mode: 'normal',
    window1: {
      carbsGrams: 70,
      proteinGrams: 24,
    },
    recommendRecoveryDrink: true,
    notes: ['Refuel after the ride.'],
  },
  daily: {
    carbsGramsTotal: 420,
    carbsGPerKg: 6,
    proteinGramsTotal: 112,
    proteinGPerKg: 1.6,
    caffeineMgCeiling: 420,
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
  timeline: [
    {
      offsetMinutesFromStart: -180,
      action: 'Pre-ride meal: ~90g carbs',
      carbsGrams: 90,
      cumulativeCarbs: 90,
      phase: 'pre',
    },
    {
      offsetMinutesFromStart: 30,
      action: 'Sip bottle 1',
      carbsGrams: 35,
      cumulativeCarbs: 35,
      phase: 'during',
    },
    {
      offsetMinutesFromStart: 120,
      action: 'Recovery drink',
      carbsGrams: 70,
      cumulativeCarbs: 220,
      phase: 'post',
    },
  ],
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

  it('labels editable solid controls by product', () => {
    const onSolidQuantityChange = vi.fn();

    render(
      <FuelResultV3
        section="pack"
        prescription={prescription}
        products={[mix, guGel, pfChew]}
        availableSolids={[guGel, pfChew]}
        onSolidQuantityChange={onSolidQuantityChange}
      />,
    );

    expect(screen.getByText('GU Energy Gel')).toBeInTheDocument();
    expect(screen.getByText('PF 30 Chew')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Increase PF 30 Chew/i }),
    );

    expect(
      screen.getByRole('spinbutton', { name: /GU Energy Gel value/i }),
    ).toHaveAttribute('aria-valuenow', '0');
    expect(
      screen.getByRole('spinbutton', { name: /PF 30 Chew value/i }),
    ).toHaveAttribute('aria-valuenow', '0');
    expect(onSolidQuantityChange).toHaveBeenCalledWith('chew', 1);
  });

  it('keeps the plan focused on bring, during cues, and ride targets', () => {
    render(
      <FuelResultV3
        section="all"
        prescription={prescription}
        products={[mix]}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /Prep and bring/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Ride cues/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Ride targets/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Sip bottle 1/)).toHaveLength(2);
    expect(
      screen.getByText(/Fluid intake exceeds predicted sweat rate/i),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('heading', { name: /Pre-ride/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Post-ride/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Daily targets/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Pre-ride meal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pre-ride window/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Recovery drink/i)).not.toBeInTheDocument();
  });
});

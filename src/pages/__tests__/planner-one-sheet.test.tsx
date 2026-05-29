import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlannerPage } from '@/pages/planner';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { buildOneSheetRide } from '@/lib/planner/one-sheet';
import { DEFAULT_SETTINGS, useStore } from '@/store';
import type { BottleInventory } from '@/types/bottle';

function renderPlanner() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <PlannerPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

function getDefaultSetup() {
  const products = useStore.getState().products;
  const mix = products.find((product) => product.type === 'drink_mix');
  const solids = products
    .filter((product) => product.type !== 'drink_mix')
    .map((product) => product.id);

  if (!mix) throw new Error('Expected default drink mix');

  return { mix, solids };
}

function setPlannerReadyState(bottles: BottleInventory) {
  const { mix, solids } = getDefaultSetup();
  const ride = buildOneSheetRide({
    durationMinutes: 120,
    intensityFactor: 0.8,
    heatFactor: 'moderate',
    ftpWatts: 250,
    heavySweater: false,
    gutTrainingTargetGph: 65,
    refuelStops: 0,
  });

  useStore.setState((state) => ({
    ...state,
    settings: {
      ...state.settings,
      athleteProfile: {
        ...DEFAULT_SETTINGS.athleteProfile,
        weightKg: 70,
        ftpWatts: 250,
        gutTrainingTargetGph: 65,
      },
    },
    plannerDraft: {
      ride,
      selectedBottleCounts: bottles,
      selectedDrinkMixId: mix.id,
      selectedSolidIds: solids,
    },
  }));
}

describe('PlannerPage one-sheet flow', () => {
  beforeEach(() => {
    useStore.getState().initializeDefaults();
  });

  afterEach(() => {
    useStore.setState((state) => ({
      ...state,
      settings: DEFAULT_SETTINGS,
      plannerDraft: null,
      fuelPlans: [],
    }));
  });

  it('live-generates a plan from duration, IF, and default carry setup', async () => {
    setPlannerReadyState({ 550: 0, 750: 2, 950: 0 });

    renderPlanner();

    expect(
      screen.queryByRole('button', { name: /Build plan/i })
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /^Plan$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Every 30 min:/i)).toBeInTheDocument();
  });

  it('shows local missing requirement copy instead of a result', () => {
    setPlannerReadyState({ 550: 0, 750: 0, 950: 0 });

    renderPlanner();

    expect(screen.getByText(/Add at least one bottle/i)).toBeInTheDocument();
    expect(screen.queryByText(/Every 30 min:/i)).not.toBeInTheDocument();
  });

  it('surfaces when the effective plan target is capped', () => {
    const { mix, solids } = getDefaultSetup();
    const ride = buildOneSheetRide({
      durationMinutes: 120,
      intensityFactor: 0.8,
      heatFactor: 'moderate',
      ftpWatts: 250,
      heavySweater: false,
      gutTrainingTargetGph: 65,
      carbTargetOverrideGramsPerHour: 90,
      refuelStops: 0,
    });

    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: {
          ...DEFAULT_SETTINGS.athleteProfile,
          weightKg: 70,
          ftpWatts: 250,
          gutTrainingTargetGph: 65,
        },
      },
      plannerDraft: {
        ride,
        selectedBottleCounts: { 550: 0, 750: 2, 950: 0 },
        selectedDrinkMixId: mix.id,
        selectedSolidIds: solids,
      },
    }));

    renderPlanner();

    expect(
      screen.getByText(/Capped at 65 g\/h by gut target/i)
    ).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { OnboardingPage } from '@/pages/onboarding';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { DEFAULT_ONBOARDING, useStore } from '@/store';

function reachRiderDefaults() {
  fireEvent.click(screen.getByRole('button', { name: /Start setup/i }));
  fireEvent.click(screen.getByRole('button', { name: /Do this later/i }));
}

function renderOnboarding() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <OnboardingPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('OnboardingPage', () => {
  afterEach(() => {
    useStore.setState((state) => ({
      ...state,
      onboarding: { ...DEFAULT_ONBOARDING },
      fuelPlans: [],
      plannerDraft: null,
    }));
  });

  it('starts with a concise setup welcome', () => {
    renderOnboarding();

    expect(
      screen.getByRole('heading', { name: /Set up Domestique/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start setup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Skip for now/i })).toBeInTheDocument();
  });

  it('persists skip when the rider opts out', () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: /Skip for now/i }));

    expect(useStore.getState().onboarding.skipped).toBe(true);
  });

  it('labels rider presets so the choices have context', () => {
    renderOnboarding();

    reachRiderDefaults();

    expect(screen.getByText('Carb target style')).toBeInTheDocument();
    expect(screen.getByText('Sweat tendency')).toBeInTheDocument();
  });

  it('lets the rider enter pounds and persists the account unit preference', () => {
    renderOnboarding();

    reachRiderDefaults();
    fireEvent.click(screen.getByRole('radio', { name: 'lb' }));
    fireEvent.change(screen.getByLabelText(/Weight, lb/i), {
      target: { value: '160' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/i }));

    const profile = useStore.getState().settings.athleteProfile;
    expect(profile.anthropometricsUnit).toBe('imperial');
    expect(profile.weightKg).toBeCloseTo(72.57, 1);
  });
});

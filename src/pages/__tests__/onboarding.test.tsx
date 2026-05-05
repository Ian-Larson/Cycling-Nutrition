import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { OnboardingPage } from '@/pages/onboarding';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { DEFAULT_ONBOARDING, useStore } from '@/store';

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
});

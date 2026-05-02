import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { PlannerPage } from '@/pages/planner';
import { useStore } from '@/store';
import { AuthProvider } from '@/lib/auth/auth-provider';

function renderPlanner() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <PlannerPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('PlannerPage weight gate', () => {
  const originalProfile = useStore.getState().settings.athleteProfile;

  afterEach(() => {
    useStore.setState((state) => ({
      ...state,
      settings: { ...state.settings, athleteProfile: originalProfile },
    }));
  });

  it('renders the gate empty state when weightKg is missing', () => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: { ...originalProfile, weightKg: undefined },
      },
    }));

    renderPlanner();
    expect(
      screen.getByRole('heading', { name: /Set your weight to plan/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Set weight in Account/i }),
    ).toBeInTheDocument();
  });

  it('does not render the gate when weightKg is set', () => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: { ...originalProfile, weightKg: 70 },
      },
    }));

    renderPlanner();
    expect(
      screen.queryByRole('heading', { name: /Set your weight to plan/i }),
    ).not.toBeInTheDocument();
  });
});

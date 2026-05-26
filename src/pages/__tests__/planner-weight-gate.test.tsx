import { fireEvent, render, screen } from '@testing-library/react';
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

  it('lets the rider set weight without leaving the planner', () => {
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

    fireEvent.change(screen.getByLabelText(/Weight, kg/i), {
      target: { value: '70' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Use this weight/i }));

    expect(useStore.getState().settings.athleteProfile.weightKg).toBe(70);
    expect(
      screen.queryByRole('heading', { name: /Set your weight to plan/i }),
    ).not.toBeInTheDocument();
  });

  it('supports submitting the quick weight form from the keyboard', () => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: { ...originalProfile, weightKg: undefined },
      },
    }));

    renderPlanner();

    fireEvent.change(screen.getByLabelText(/Weight, kg/i), {
      target: { value: '68' },
    });
    fireEvent.submit(
      screen.getByRole('form', { name: /Set rider weight/i }),
    );

    expect(useStore.getState().settings.athleteProfile.weightKg).toBe(68);
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

  it('does not announce draft saved before the rider changes the planner', () => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: { ...originalProfile, weightKg: 70 },
      },
      plannerDraft: null,
    }));

    renderPlanner();

    expect(screen.queryByText(/Draft saved/i)).not.toBeInTheDocument();
  });
});

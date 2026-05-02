import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { Settings } from '@/components/account/settings';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { useStore } from '@/store';

function renderSettings() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Settings />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const originalProfile = useStore.getState().settings.athleteProfile;

afterEach(() => {
  useStore.setState((state) => ({
    ...state,
    settings: { ...state.settings, athleteProfile: originalProfile },
  }));
});

describe('Settings', () => {
  it('renders Gut target and Heavy sweater rows in the Fuel section', () => {
    renderSettings();
    expect(screen.getByText('Gut target')).toBeInTheDocument();
    // The Toggle uses 'Heavy sweater' both as the row label and as its own
    // accessible name, so multiple matches are expected.
    expect(screen.getAllByText('Heavy sweater').length).toBeGreaterThan(0);
  });

  it('does not render the Sweat rate row', () => {
    renderSettings();
    expect(screen.queryByText('Sweat rate')).not.toBeInTheDocument();
  });

  it('does not render the Fueling engine row', () => {
    renderSettings();
    expect(screen.queryByText('Fueling engine')).not.toBeInTheDocument();
  });

  it('does not render the gut-target tolerance helper', () => {
    renderSettings();
    expect(screen.queryByText(/Progressive tolerance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Conservative tolerance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aggressive tolerance/i)).not.toBeInTheDocument();
  });
});

describe('Settings — Athlete section', () => {
  it('renders Name, Age, FTP, Weight, and W/kg rows with values', () => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: {
          ...originalProfile,
          name: 'Ian',
          age: 34,
          ftpWatts: 280,
          weightKg: 70,
          anthropometricsUnit: 'metric',
        },
      },
    }));

    renderSettings();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('FTP')).toBeInTheDocument();
    expect(screen.getByText('Weight (kg)')).toBeInTheDocument();
    expect(screen.getByText('W/kg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit weight/i })).toHaveTextContent(
      '70 kg',
    );
    expect(screen.getByRole('button', { name: /edit ftp/i })).toHaveTextContent('280 W');
    expect(screen.getByText('4.00')).toBeInTheDocument();
  });

  it('shows em-dash placeholders for unset fields and W/kg', () => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: {
          ...originalProfile,
          name: undefined,
          age: undefined,
          ftpWatts: undefined,
          weightKg: undefined,
        },
      },
    }));

    renderSettings();
    expect(screen.getByRole('button', { name: /edit name/i })).toHaveTextContent('—');
    const wKgRow = screen.getByText('W/kg').closest('li');
    expect(wKgRow).not.toBeNull();
    expect(wKgRow!.textContent).toContain('—');
  });

  it('commits a new weight when the inline editor blurs', () => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: {
          ...originalProfile,
          name: 'Ian',
          age: 34,
          ftpWatts: 280,
          weightKg: 70,
          anthropometricsUnit: 'metric',
        },
      },
    }));

    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /edit weight/i }));
    const input = screen.getByDisplayValue('70') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '72' } });
    fireEvent.blur(input);

    expect(useStore.getState().settings.athleteProfile.weightKg).toBeCloseTo(72, 5);
  });

  it('reverts on Escape and does not write to the store', () => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: {
          ...originalProfile,
          name: 'Ian',
          age: 34,
          ftpWatts: 280,
          weightKg: 70,
          anthropometricsUnit: 'metric',
        },
      },
    }));

    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /edit ftp/i }));
    const input = screen.getByDisplayValue('280') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '300' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(useStore.getState().settings.athleteProfile.ftpWatts).toBe(280);
  });
});
